/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import type * as CF_T from "./CloudflareTypes.js";

export type Parameters = Record<string, string>;

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
	private static readonly RETRY_DELAY = 5000;

	private readonly headers: Record<string, string> = {
		"User-Agent": "JSflare/0.0",
		"Accept": "application/json"
	};
	private readonly timeoutMs: number;
	private readonly maxRetries: number;

	constructor(options: CF_T.CloudflareOptions) {
		if (!Cloudflare.verifyOptions(options)) {
			throw new Error("Options invalid! Has to provide either apiToken, or apiEmail and cloudflareTypes");
		}

		if (options.apiToken != null) {
			this.headers["Authorization"] = `Bearer ${options.apiToken}`;
		} else if (options.apiEmail != null && options.apiKey != null) {
			this.headers["X-Auth-Email"] = options.apiEmail;
			this.headers["X-Auth-Key"] = options.apiKey;
		}

		this.timeoutMs = options.connectionOptions.timeout * 60;
		this.maxRetries = options.connectionOptions.maxRetries;
	}

	/**
	 * Lists zones for the specified account.
	 * If multiple zones with the same name exist, the first exact match will be returned.
	 * If no zone with the specified name exists, an error will be thrown.
	 * @param name Zone name to filter for
	 * @returns The zones for the specified account
	 */
	public async getZones(
		name: string
	): Promise<CF_T.Zone> {
		const data = await this.doRequest(RequestType.GET,
			`${Cloudflare.API_BASE_URL}/zones`,
			{
				name: name
			},
			null
		);

		const zones = data.result as CF_T.Zone[];
		const exactMatch = zones
			.find(zone => zone.name.toLowerCase() === name.toLowerCase());

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
	public async getDnsRecords(
		zoneId: string,
		recordName: string
	): Promise<CF_T.DnsRecord[]> {
		const data = await this.doRequest(RequestType.GET,
			`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records`,
			{
				name: recordName
			},
			null
		);

		return data.result as CF_T.DnsRecord[];
	}

	/**
	 * Updates a DNS record entry
	 * @param zoneId The zone ID to update the record in
	 * @param recordId The record ID to update
	 * @param recData The data to update the record with
	 */
	public async updateDnsRecord(
		zoneId: string,
		recordId: string,
		recData: CF_T.RecordData
	): Promise<void> {
		await this.doRequest(RequestType.PUT,
			`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records/${recordId}`,
			undefined,
			{
				comment: `Last updated at ${new Date().toISOString()} by JSflare`,
				content: recData.ip,
				type: (recData.ip.includes(":") ? "AAAA" : "A"),
				name: recData.name,
				ttl: recData.ttl,
				proxied: recData.proxied,
			});
	}

	/**
	 * Verifies the options
	 * @param options The options to verify
	 * @returns True if the options are valid, false otherwise
	 */
	private static verifyOptions(
		options: CF_T.CloudflareOptions
	): boolean {
		return (options.apiToken != null && options.apiToken.length > 0) ||
			(options.apiEmail != null && options.apiKey != null &&
				options.apiKey.length > 0 && options.apiEmail.length > 0);
	}

	/**
	 * Performs a request to the Cloudflare API
	 * @param type The request type
	 * @param url The URL to request
	 * @param params URL parameters
	 * @param dataBody Body data
	 * @returns The response data
	 */
	private async doRequest(
		type: RequestType,
		url: string,
		params: Parameters | undefined,
		dataBody: unknown
	): Promise<any> {
		let currentTry = 1;
		while (currentTry <= this.maxRetries) {
			try {
				const urlWithParams = new URL(url);
				if (params != null) {
					Object.entries(params).forEach(([key, value]) => {
						urlWithParams.searchParams.append(key, value);
					});
				}

				let init: RequestInit;
				// TODO: Somehow add timeout to fetch
				switch (type) {
					case RequestType.GET:
						console.debug(`GET request to '${urlWithParams}'`);
						init = {
							method: "GET",
							headers: this.headers
						};
						break;

					case RequestType.PUT:
						console.debug(`PUT request to '${urlWithParams}'`);
						init = {
							method: "PUT",
							headers: this.headers,
							body: JSON.stringify(dataBody)
						};
						break;

					default:
						throw new Error("Invalid request type");
				}
				const response = await fetch(urlWithParams, init);

				if (response == null || !response.ok) {
					throw new Error(`Request failed with status code ${response?.status}`);
				}

				return await response.json();
			} catch (error) {
				console.warn(`${error} (Retrying in ${Cloudflare.RETRY_DELAY}ms...)`);
				await new Promise(resolve => setTimeout(resolve, Cloudflare.RETRY_DELAY));
				currentTry++;
				continue;
			}
		}

		throw new Error("Request failed after maximum retries");
	}
}

enum RequestType {
	GET,
	PUT
}