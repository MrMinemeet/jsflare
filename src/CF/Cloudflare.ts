/*
 * Copyright © 2025-2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import { AxiosHeaders } from "axios";

import { AxiosInstance } from "../WebReq.ts";
import type * as CF_T from "./CloudflareTypes.ts";

// -----------------------------------------------------------------------------
/**
 * Options for the Cloudflare class
 * @param apiToken The API token to use
 * @param apiEmail The API email to use in combination with the API key
 * @param apiKey The API key to use in combination with the API email
 */
interface CloudflareOptions {
	apiToken?: string;
	apiEmail?: string;
	apiKey?: string;
}

// -----------------------------------------------------------------------------
/**
 * Basic class for interacting with the Cloudflare API
 *
 * Own implementaton to reduce size, as the official "cloudflare" package provides a lot of things
 * that are not necesary for this project, and this reflects in package size.
 *
 * @param options The options to use
 */
export class Cloudflare {
	private static readonly API_BASE_URL = "https://api.cloudflare.com/client/v4";
	private readonly cfHeaders: AxiosHeaders;

	constructor(options: CloudflareOptions) {
		if (!Cloudflare.verifyOptions(options)) {
			throw new Error("Options invalid! Has to provide either apiToken, or apiEmail and apiKey");
		}

		const headers = new AxiosHeaders();
		if (options.apiToken != null) {
			headers.setAuthorization(`Bearer ${options.apiToken}`);
		} else if (options.apiEmail != null && options.apiKey != null) {
			headers.set("X-Auth-Email", options.apiEmail);
			headers.set("X-Auth-Key", options.apiKey);
		}
		this.cfHeaders = headers;
	}

	/**
	 * Lists zones for the specified account.
	 * If multiple zones with the same name exist, the first exact match will be returned.
	 * If no zone with the specified name exists, an error will be thrown.
	 * @param name Zone name to filter for
	 * @returns The zones for the specified account
	 */
	public async getZones(name: string): Promise<CF_T.Zone> {
		const response = await AxiosInstance.get(`${Cloudflare.API_BASE_URL}/zones`, {
			headers: this.cfHeaders,
			params: {
				name,
			},
		});

		const zones = response.data.result as CF_T.Zone[];
		const exactMatch = zones.find(zone => zone.name.toLowerCase() === name.toLowerCase());

		if (exactMatch == null) {
			throw new Error(`Zone with name "${name}" not found.`);
		}
		if (zones.length > 1) {
			console.warn(`Found multiple zones with name "${name}". Using the first exact match.`);
		}
		return exactMatch;
	}

	/**
	 * Lists DNS records for the specified zone
	 * @param zoneId The zone ID to get the records for
	 * @param recordName The record name to filter for
	 * @returns The DNS records for the specified zone
	 */
	public async getDnsRecords(zoneId: string, recordName: string): Promise<CF_T.DnsRecord[]> {
		const response = await AxiosInstance.get(`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records`, {
			headers: this.cfHeaders,
			params: {
				name: recordName,
			},
		});

		return response.data.result as CF_T.DnsRecord[];
	}

	/**
	 * Updates a DNS record entry
	 * @param zoneId The zone ID to update the record in
	 * @param recordId The record ID to update
	 * @param recData The data to update the record with
	 */
	public async updateDnsRecord(zoneId: string, recordId: string, recData: CF_T.RecordData): Promise<void> {
		await AxiosInstance.put(
			`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records/${recordId}`,
			{
				comment: `Last updated at ${new Date().toISOString()} by JSflare`,
				content: recData.ip,
				type: recData.ip.includes(":") ? "AAAA" : "A",
				name: recData.name,
				ttl: recData.ttl,
				proxied: recData.proxied,
			},
			{
				headers: this.cfHeaders,
			},
		);
	}

	/**
	 * Verifies the options
	 * @param options The options to verify
	 * @returns True if the options are valid, false otherwise
	 */
	private static verifyOptions(options: CloudflareOptions): boolean {
		return (
			(options.apiToken != null && options.apiToken.length > 0) ||
			(options.apiEmail != null &&
				options.apiKey != null &&
				options.apiKey.length > 0 &&
				options.apiEmail.length > 0)
		);
	}
}
