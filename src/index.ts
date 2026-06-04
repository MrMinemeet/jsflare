/*
 * Copyright © 2025-2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import path from "path";
import { Cloudflare } from "./CF/Cloudflare.js";
import { EmailKeyItem, loadConfig, TokenItem } from "./Config.js";
import { AxiosInstance } from "./constants.js";
import { AxiosHeaders } from "axios";

// -----------------------------------------------------------------------------
interface IpifyResponse {
	ip: string;
}

interface UpdateWebhookData {
	timestamp: string;
	publicIp: string;
	records: Array<{
		record: string;
		success: boolean;
		error: string | undefined;
	}>;
}

// -----------------------------------------------------------------------------
const SUPPORTED_RECORD_TYPES = ["A", "AAAA"]

await main();

/**
 * The main function of the script
 */
async function main() {
	const { maxRetries, timeout, items, postUpdateWebhook } = await loadConfig(getConfigPath());
	const ownIp = getOwnIp();

	const results = await Promise.allSettled(items.map(item =>
		updateEntry(ownIp, item, maxRetries, timeout)
	));

	const errors = results.filter(r => r.status === "rejected");
	if (errors.length === 0) {
		console.info("All records updated successfully");
	} else {
		console.error(`${errors.length} record(s) failed to update`);
	}

	if (postUpdateWebhook != null) {
		const getErrorMsgFn = (reason: unknown): string => reason instanceof Error
			? reason.message
			: String(reason);

		await updateWebhook(postUpdateWebhook, {
			timestamp: new Date().toISOString(),
			publicIp: await ownIp,
			records: items.map((item, idx) => ({
				record: item.record,
				success: results[idx]?.status === "fulfilled",
				error: results[idx]?.status === "rejected"
					? String(getErrorMsgFn(results[idx]?.reason))
					: undefined
			}))
		});
	}
}

/**
 * Sends a POST request to the specified webhook URL
 * @param url webhook URL to send the request to
 * @param data  data to send in the request body
 * @returns A promise that resolves when the request is complete
 * @remarks Retries up to 3 times if the request fails
 */
async function updateWebhook(url: string, data: UpdateWebhookData): Promise<void> {
	const MAX_ATTEMPTS = 3;

	const requestInit: RequestInit = {
		method: "POST",
		headers: {
			"Content-Type": "application/json"
		},
		body: JSON.stringify(data)
	};

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		try {
			const response = await fetch(url, requestInit);
			if (response.ok) {
				return;
			}
			throw new Error(`Webhook responded with ${response.status} ${response.statusText}`);
		} catch (error) {
			if (attempt === MAX_ATTEMPTS) {
				console.error("Failed to send post-update webhook:", error);
				return;
			}
		}
	}
};

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
			timeout: timeout * 1000
		}
	})

	// Get current DNS record for zone
	const zone = await cf.getZones(item.zone);
	const record = (await cf.getDnsRecords(zone.id, item.record))
		.find(rec => rec.type != null && SUPPORTED_RECORD_TYPES.includes(rec.type))


	if (record == null) {
		const msg = `No record found for ${item.record} in zone ${zone.name}`;
		console.warn(msg);
		throw new Error(msg);
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
		name: record.name,
		proxied: item.proxied,
		ttl: item.ttl,
	});

	console.info(`Updated IP for ${item.record} in zone ${zone.name} to ${ip}`);
}

/**
 * Fetches the public IP of the machine from 'https://ipify.org'
 * @returns The public IP of the machine
 */
async function getOwnIp(): Promise<string> {
	try {
		const response = await AxiosInstance.get<unknown>(
			"https://api64.ipify.org?format=json",
			{
				headers: { "Accept": "application/json" }
			}
		);

		if (response.status !== 200) {
			throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`);
		}

		const respData = response.data;
		if (!isIpifyResponse(respData)) {
			throw new Error("Invalid response from ipify API");
		}
		return respData.ip;
	} catch (error) {
		console.error("Failed to get own IP:", error);
		throw error;
	}
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
 * Gets the path to the config file from command line arguments or defaults to 'config.jsonc' in the current directory.
 * @returns The path to the config file
 */
function getConfigPath(): string {
	const args = process.argv.slice(2);

	const configArgIdx = args.indexOf("--config");
	if (configArgIdx !== -1 && args[configArgIdx + 1] != null) {
		const configPath = args[configArgIdx + 1] as string;
		return path.resolve(configPath);
	}
	return path.resolve("./config.jsonc");
}

/**
 * Checks whether an object is a valid response from the ipify API
 */
function isIpifyResponse(obj: unknown): obj is IpifyResponse {
	return typeof obj === "object" &&
		obj !== null &&
		"ip" in obj &&
		typeof obj.ip === "string";
}