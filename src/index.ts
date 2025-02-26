/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import * as fs from "fs";
import Cloudflare from "cloudflare";

const SUPPORTED_RECORD_TYPES = [ "A", "AAAA" ]

interface Config {
	maxRetries: number;
	timeout: number;
	items: (TokenItem | EmailKeyItem)[];
}
interface TokenItem {
	token: string;
	zone: string;
	record: string;
	ttl: number;
	proxied: boolean;
}
interface EmailKeyItem {
	email: string;
	key: string;
	zone: string;
	record: string;
	ttl: number;
	proxied: boolean;
}

const ownIp = await getOwnIp();
const config = loadConfig();


for (const item of config.items) {
	const client: Cloudflare = isTokenItem(item) ?
		new Cloudflare({
			apiToken: item.token
		}) :
		new Cloudflare({
			apiEmail: item.email,
			apiKey: item.key
		});

		// Get current DNS record for zone
		const zone = await client.zones.get({zone_id: item.zone});
		const record = (await client.dns.records.list({ zone_id: zone.id })).result
			.find(rec => 
				rec.type != null &&
				SUPPORTED_RECORD_TYPES.includes(rec.type) &&
				rec.name === item.record
			);
		
		if (record == null) {
			console.warn(`No record found for ${item.record} in zone ${zone.name}`);
			continue;
		}

		// A, AAAA have the IP stored in the 'content' field
		if (record.content == null) {
			console.error(`No IP found for ${item.record} in zone ${zone.name}`);
			continue;
		}
		if (record.content === ownIp) {
			console.info(`IP for ${item.record} in zone ${zone.name} is already up-to-date`);
			continue;
		}
		
		// Update the record
		await client.dns.records.update(record.id, {
			zone_id: zone.id,
			content: ownIp,
			proxied: item.proxied,
		});

		console.info(`Updated IP for ${item.record} in zone ${zone.name} to ${ownIp}`);
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
 * Strips comments from a JSONC string
 * @param jsonc The JSONC string
 * @returns The JSON string without comments
 */
function stripComments(jsonc: string): string {
	return jsonc
    	.replace(/\/\/.*$/gm, "") // Remove single-line comments
    	.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
}

/**
 * Strips comments from a JSONC string and parses it into a config object.
 * Performs basic validation of the config structure.
 * @param jsonc The raw jsonc string for the config
 * @returns The parsed config object
 */
function parseConfig(jsonc: string): Config {
	const json = JSON.parse(stripComments(jsonc));
	// TODO: Validate structure of json
	return json;
}

/**
 * Checks whether an item is a TokenItem
 * @param item The item to check
 * @returns Whether the item is a TokenItem
 */
function isTokenItem(item: TokenItem | EmailKeyItem): item is TokenItem {
	return typeof ((item as TokenItem).token) === "string";
}

/**
 * Loads the config from 'config.jsonc' or 'config.json' and parses it.
 * @returns The parsed config object
 */
function loadConfig(): Config {
	let rawConfig: string;
	try {
		rawConfig = fs.readFileSync("config.jsonc", "utf8");
	} catch(e) {
		console.warn("Failed to load 'config.jsonc'. Trying default 'config.json'...");
		try {
			rawConfig = fs.readFileSync("config.json", "utf8");
		} catch(e) {
			console.error("Failed to load 'config.json'. Exiting...");
			process.exit(1);
		}
	}

	try {
		return parseConfig(rawConfig);
	} catch(e) {
		console.error("Failed to parse config. Exiting...");
		process.exit(1);
	}
}