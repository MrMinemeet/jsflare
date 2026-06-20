/*
 * Copyright © 2025-2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import path from "node:path";
import { Cloudflare } from "./CF/Cloudflare.ts";
import { type EmailKeyItem, loadConfig, type TokenItem } from "./Config.ts";
import { AxiosInstance } from "./WebReq.ts";
import { getFromIpify } from "./ipservices.ts";

// -----------------------------------------------------------------------------

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
const SUPPORTED_RECORD_TYPES = ["A", "AAAA"];

await main();

/**
 * The main function of the script
 */
async function main() {
	const { items, postUpdateWebhook } = await loadConfig(getConfigPath());
	const ownIp = getFromIpify();

	const results = await Promise.allSettled(items.map(item =>
		updateEntry(ownIp, item)
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
	try {
		await AxiosInstance.post(url, data, {
			headers: { "Accept": "application/json" }
		});
	} catch (error) {
		console.error("Failed to send post-update webhook:", error);
	}
};

/**
 * Updates the IP of a DNS record in Cloudflare
 * @param item The item to update
 */
async function updateEntry(ipPromise: Promise<string>, item: TokenItem | EmailKeyItem): Promise<void> {
	const isTokenItemFn = (item: TokenItem | EmailKeyItem): item is TokenItem => {
		return typeof ((item as TokenItem).token) === "string";
	};
	const isTokenItem = isTokenItemFn(item);

	const cf = new Cloudflare({
		apiToken: isTokenItem ? item.token : undefined,
		apiEmail: isTokenItem ? undefined : item.email,
		apiKey: isTokenItem ? undefined : item.key
	});

	// Get current DNS record for zone
	const zone = await cf.getZones(item.zone);
	const record = (await cf.getDnsRecords(zone.id, item.record))
		.find(rec => rec.type != null && SUPPORTED_RECORD_TYPES.includes(rec.type));


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
		ip,
		name: record.name,
		proxied: item.proxied,
		ttl: item.ttl,
	});

	console.info(`Updated IP for ${item.record} in zone ${zone.name} to ${ip}`);
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