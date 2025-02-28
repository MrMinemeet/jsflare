/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import axios, { HttpStatusCode } from "axios";
import type { CloudflareOptions, ConnectionOptions, DnsRecord, RecordData, Zone } from "./CloudflareTypes.js";

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

	private readonly connectionOptions: ConnectionOptions;
	private readonly headers: Record<string, string> = {};

	constructor(options: CloudflareOptions) {
		if (!Cloudflare.verifyOptions(options)) {
			throw new Error("Options invalid! Has to provide either apiToken, or apiEmail and cloudflareTypes");
		}
		this.connectionOptions = options.connectionOptions;

		if(options.apiToken != null) {
			this.headers["Authorization"] = `Bearer ${options.apiToken}`;
		} else if (options.apiEmail != null && options.apiKey != null) {
			this.headers["X-Auth-Email"] = options.apiEmail;
			this.headers["X-Auth-Key"] = options.apiKey;
		}
		this.headers["Content-Type"] = "application/json";
	}

	/**
	 * Lists zones for the specified account
	 * @param name Zone name to filter for
	 * @returns The zones for the specified account
	 */
	public async getZones(name: string): Promise<Zone> {
		const response = await axios.get(`${Cloudflare.API_BASE_URL}/zones`, {
			headers: this.headers,
			params: {
				name
			},
			timeout: this.connectionOptions.timeout * 60
		});
		if (response.status !== HttpStatusCode.Ok) {
			Promise.reject(new Error(`Failed to get zones: ${response.statusText}`));
		}
		
		return (response.data.result as Zone[])[0];
	}

	/**
	 * Lists DNS records for the specified zone
	 * @param zoneId The zone ID to get the records for
	 * @param recordName The record name to filter for
	 * @returns The DNS records for the specified zone
	 */
	public async getDnsRecords(zoneId: string, recordName: string): Promise<DnsRecord[]> {
		const response = await axios.get(`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records`, {
			headers: this.headers,
			params: {
				name: recordName
			},
			timeout: this.connectionOptions.timeout * 60
		});
		if (response.status !== HttpStatusCode.Ok) {
			Promise.reject(new Error(`Failed to get DNS records: ${response.statusText}`))
		}
		return response.data.result as DnsRecord[];
	}

	/**
	 * Updates a DNS record entry
	 * @param zoneId The zone ID to update the record in
	 * @param recordId The record ID to update
	 * @param data The data to update the record with
	 */
	public async updateDnsRecord(zoneId: string, recordId: string, data: RecordData): Promise<void> {
		const response = await axios.get(`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records/${recordId}`, {
			headers: this.headers,
			params: {
				content: data.ip,
				ttl: data.ttl,
				proxied: data.proxied,
				type: (data.ip.includes(":") ? "AAAA" : "A")
			},
			timeout: this.connectionOptions.timeout * 60
		});
		if (response.status !== HttpStatusCode.Ok) {
			Promise.reject(new Error(`Failed to get DNS records: ${response.statusText}`))
		}
	}

	/**
	 * Verifies the options
	 * @param options The options to verify
	 * @returns True if the options are valid, false otherwise
	 */
	private static verifyOptions(options: CloudflareOptions): boolean {
		return (options.apiToken != null && options.apiToken.length > 0) ||
				(options.apiEmail != null && options.apiKey != null &&
				options.apiKey.length > 0 && options.apiEmail.length > 0);
	}
}