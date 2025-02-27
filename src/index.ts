/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import Cloudflare from "cloudflare";
import { EmailKeyItem, loadConfig, TokenItem } from "./config.js";

const SUPPORTED_RECORD_TYPES = [ "A", "AAAA" ]

await main();


/**
 * The main function of the script
 */
async function main() {
	const { maxRetries, timeout, items} = await loadConfig();
	const ownIp = getOwnIp();

	const results = await Promise.allSettled(items.map(item => 
		updateEntry(ownIp, item,  maxRetries, timeout)
	));

	results
		.filter(r => r.status === "rejected")
		.forEach(r => {
			const err = r.reason;
			console.error(`Something went wrong: ${err.message}`);
		});
}

/**
 * Updates the IP of a DNS record in Cloudflare
 * @param item The item to update
 */
async function updateEntry(ipp: Promise<string>, item: TokenItem | EmailKeyItem, maxRetries: number, timeout: number): Promise<void> {
	const client = isTokenItem(item) ?
		new Cloudflare({
			apiToken: item.token,
			maxRetries,
			timeout
		}) :
		new Cloudflare({
			apiEmail: item.email,
			apiKey: item.key,
			maxRetries,
			timeout
		});

	// Get current DNS record for zone
	const zone = await client.zones.get({zone_id: item.zone});
	const record = (await client.dns.records.list({ zone_id: zone.id }))
		.result.find(rec => 
			rec.type != null &&
			SUPPORTED_RECORD_TYPES.includes(rec.type) &&
			rec.name === item.record
		);
	
	if (record == null) {
		console.warn(`No record found for ${item.record} in zone ${zone.name}`);
		return;
	}

	// A, AAAA have the IP stored in the 'content' field
	if (record.content == null) {
		throw new Error(`No IP found for ${item.record} in zone ${zone.name}`);
	}
	const ip = await ipp;
	if (record.content === ip) {
		console.info(`IP for ${item.record} in zone ${zone.name} is already up-to-date`);
		return;
	}
	
	// Update the record
	await client.dns.records.update(record.id, {
		zone_id: zone.id,
		content: ip,
		proxied: item.proxied,
	});

	console.info(`Updated IP for ${item.record} in zone ${zone.name} to ${ipp}`);
}

/**
 * Fetches the public IP of the machine from 'https://api.ipify.org'
 * @returns The public IP of the machine
 */
async function getOwnIp(): Promise<string> {
	const response = await fetch("https://api.ipify.org");
	return await response.text();
}

/**
 * Checks whether an item is a TokenItem
 * @param item The item to check
 * @returns Whether the item is a TokenItem
 */
function isTokenItem(item: TokenItem | EmailKeyItem): item is TokenItem {
	return typeof ((item as TokenItem).token) === "string";
}
