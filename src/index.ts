/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import { Cloudflare } from "./CF/Cloudflare.js";
import { EmailKeyItem, loadConfig, TokenItem } from "./Config.js";

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
			console.error("Something went wrong:", r.status, r.reason);
		});
}

/**
 * Updates the IP of a DNS record in Cloudflare
 * @param item The item to update
 */
async function updateEntry(ipPromise: Promise<string>, item: TokenItem | EmailKeyItem, maxRetries: number, timeout: number): Promise<void> {
	const cf = new Cloudflare({
		apiToken: isTokenItem(item) ? item.token : undefined,
		apiEmail: isTokenItem(item) ? undefined : item.email,
		apiKey: isTokenItem(item) ? undefined : item.key,
		connectionOptions: {
			maxRetries,
			timeout,
		}
	})

	// Get current DNS record for zone
	const zone = await cf.getZones(item.zone);
	const record = (await cf.getDnsRecords(zone.id, item.record))
		.find(rec => rec.type != null && SUPPORTED_RECORD_TYPES.includes(rec.type))

	
	if (record == null) {
		console.warn(`No record found for ${item.record} in zone ${zone.name}`);
		return;
	}

	// A, AAAA have the IP stored in the 'content' field
	if (record.content == null) {
		throw new Error(`No IP found for ${item.record} in zone ${zone.name}`);
	}
	const ip = await ipPromise;
	if (record.content === ip) {
		console.info(`IP for ${item.record} in zone ${zone.name} is already up-to-date`);
		return;
	}
	
	// Update the record
	await cf.updateDnsRecord(zone.id, record.id, {
			ip: ip,
			proxied: record.proxied,
			ttl: record.ttl,
		});

	console.info(`Updated IP for ${item.record} in zone ${zone.name} to ${ip}`);
}

/**
 * Fetches the public IP of the machine from 'https://ipify.org'
 * @returns The public IP of the machine
 */
async function getOwnIp(): Promise<string> {
	const response = await fetch("https://api64.ipify.org");
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
