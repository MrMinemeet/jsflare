/*
 * Copyright © 2025-2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

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
	content: string;
	name: string;
	proxied: boolean;
	ttl: number;
	type: RecordType;
	id: string;
	proxiable: boolean;
}

/**
 * Not all record types are supported by this project
 */
export type RecordType = "A" | "AAAA" | undefined;

export interface RecordData {
	ip: string;
	name: string;
	proxied: boolean;
	ttl: number;
}

export interface ARecord {
	comment?: string;
	content?: string;
	name?: string;
	proxied?: boolean;
	/**
	 * The time to live in seconds
	 * 1 = auto | Value must be between 60 and 86400
	 */
	ttl: number;
}
