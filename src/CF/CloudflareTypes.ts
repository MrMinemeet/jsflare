/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

/**
 * Options for the connection
 * @param maxRetries The maximum number of retries
 * @param timeout The timeout in milliseconds (between 60 and 86400)
 */
export interface ConnectionOptions {
	maxRetries: number;
	timeout: number;
}

/**
 * Options for the Cloudflare class
 * @param apiToken The API token to use
 * @param apiEmail The API email to use in combination with the API key
 * @param apiKey The API key to use in combination with the API email
 * @param connectionOptions The connection options to use
 */
export interface CloudflareOptions {
	apiToken?: string;
	apiEmail?: string;
	apiKey?: string;
	connectionOptions: ConnectionOptions;
}

/**
 * A zone entry in Cloudflare according to the API
 * Not all fields are included here, only the ones that are relevant for this project
 */
export interface Zone {
	id: string;
	name: string;
}

/**
 * A DNS record entry in Cloudflare according to the API
 * Not all fields are included here, only the ones that are relevant for this project
 */
export interface DnsRecord {
	comment: string;
	content: string,
	name: string;
	proxied: boolean;
	ttl: number;
	type: RecordType;
	id: string;
	proxiable: boolean;
};

/**
 * Not all record types are supported by this project
 */
export type RecordType = "A" | "AAAA" | undefined;

export interface RecordData {
	ip: string;
	proxied: boolean;
	ttl: number;
}

export interface ARecord {
	comment?: string;
	content?: string;
	name?: string;
	proxied?: boolean,
	/**
	 * The time to live in seconds
	 * 1 = auto | Value must be between 60 and 86400
	 */
	ttl: number
} 