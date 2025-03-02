/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import axios, { AxiosHeaders, AxiosRequestConfig, AxiosResponse, HttpStatusCode } from "axios";
import type { CloudflareOptions, DnsRecord, RecordData, Zone } from "./CloudflareTypes.js";

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

	private readonly headers;
	private readonly timeout: number;
	private readonly maxRetries: number;

	constructor(options: CloudflareOptions) {
		if (!Cloudflare.verifyOptions(options)) {
			throw new Error("Options invalid! Has to provide either apiToken, or apiEmail and cloudflareTypes");
		}

		this.headers = new AxiosHeaders();
		if(options.apiToken != null) {
			this.headers["Authorization"] = `Bearer ${options.apiToken}`;
		} else if (options.apiEmail != null && options.apiKey != null) {
			this.headers["X-Auth-Email"] = options.apiEmail;
			this.headers["X-Auth-Key"] = options.apiKey;
		}
		this.headers["Content-Type"] = "application/json";

		this.timeout = options.connectionOptions.timeout * 60;
		this.maxRetries = options.connectionOptions.maxRetries;
	}

	/**
	 * Lists zones for the specified account
	 * @param name Zone name to filter for
	 * @returns The zones for the specified account
	 */
	public async getZones(name: string): Promise<Zone> {
		const data = await this.doRequest(RequestType.GET,
			`${Cloudflare.API_BASE_URL}/zones`,
			{ name },
			null
		);

		return (data.result as Zone[])[0];
	}

	/**
	 * Lists DNS records for the specified zone
	 * @param zoneId The zone ID to get the records for
	 * @param recordName The record name to filter for
	 * @returns The DNS records for the specified zone
	 */
	public async getDnsRecords(zoneId: string, recordName: string): Promise<DnsRecord[]> {
		const data = await this.doRequest(RequestType.GET,
			`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records`,
			{ name: recordName },
			null
		);

		return data.result as DnsRecord[];
	}

	/**
	 * Updates a DNS record entry
	 * @param zoneId The zone ID to update the record in
	 * @param recordId The record ID to update
	 * @param recData The data to update the record with
	 */
	public async updateDnsRecord(zoneId: string, recordId: string, recData: RecordData): Promise<void> {
		await this.doRequest(RequestType.PUT,
			`${Cloudflare.API_BASE_URL}/zones/${zoneId}/dns_records/${recordId}`,
			null,
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
	private static verifyOptions(options: CloudflareOptions): boolean {
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
	private async doRequest(type: RequestType, url: string, params: any, dataBody: any): Promise<any> {
		let requestFn: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<AxiosResponse>;
		switch(type) {
			case RequestType.GET:
				requestFn = axios.get;
				break;
			case RequestType.PUT:
				requestFn = axios.put;
				break;
			default:
				throw new Error("Invalid request type");
		}

		axios.interceptors.request.use(request => {
			console.log("📝 Full Request Config Before Sending:", JSON.stringify(request, null, 2));
			return request;
		});
		
		
		let currentTry = 0;
		while(currentTry < this.maxRetries) {
			const response = await requestFn(url, dataBody ?? undefined, {
				params: params ?? undefined,
				headers: this.headers,
				timeout: this.timeout
			});
			if (response.status !== HttpStatusCode.Ok) {
				console.warn(`Request failed with status code ${response.status}. Retrying in ${Cloudflare.RETRY_DELAY}ms...`);
				await new Promise(resolve => setTimeout(resolve, Cloudflare.RETRY_DELAY));
				currentTry++;
			}
			return response.data;
		}
		
		throw new Error("Request failed after maximum retries");
	}
}

enum RequestType {
	GET,
	PUT
}