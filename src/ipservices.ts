/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import { AxiosInstance } from "./WebReq.ts";

/**
 * Fetches the public IP of the machine from 'https://ipify.org'
 * @returns The public IP of the machine
 */
export async function getFromIpify(): Promise<string> {
	try {
		const response = await AxiosInstance.get<unknown>(
			"https://api64.ipify.org",
			{
				headers: { "Accept": "text/plain" }
			}
		);

		if (response.status !== 200) {
			throw new Error(`Failed to fetch IP: ${response.status} ${response.statusText}`);
		}

		const respData = response.data;
		if (typeof respData !== "string" || respData.trim().length === 0) {
			throw new Error("Invalid response from ipify API");
		}
		return respData.trim();
	} catch (error) {
		console.error("Failed to get own IP:", error);
		throw error;
	}
}