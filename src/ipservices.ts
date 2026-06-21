/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import net from "node:net";
import { AxiosInstance } from "./WebReq.ts";

// -------------------------------------------------------------
/**
 * Addresses of services that return the public IP of the machine as a raw string.
 */
const rawIpServices = [
	"https://api64.ipify.org",
	"https://icanhazip.com"
] as const;

// -------------------------------------------------------------
/**
 * Gets the public IP of the machine by trying multiple sources.
 * @returns The public IP of the machine
 */
export async function getPublicIp(): Promise<string> {
	for (const url of rawIpServices) {
		try {
			console.info(`Attempting to get public IP from '${url}'...`);
			return await fetchPublicIp(url);
		} catch {
			console.warn(`Failed to get IP from '${url}'`);
		}
	}
	throw new Error("Failed to get public IP from all supported sources");
}

/**
 * Fetches the public IP of the machine from a given URL that returns it as a raw string.
 * @param url The URL to fetch the public IP from
 * @returns The public IP of the machine
 */
async function fetchPublicIp(url: string): Promise<string> {
	const response = await AxiosInstance.get<unknown>(url, {
		headers: { "Accept": "text/plain" }
	});

	if (response.status !== 200) {
		throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`);
	}

	const respData = response.data;
	if (typeof respData !== "string" || net.isIP(respData.trim()) === 0) {
		throw new Error(`Invalid response from ${url}`);
	}
	return respData.trim();
}