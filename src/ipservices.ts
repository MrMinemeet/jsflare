/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import { AxiosInstance } from "./WebReq.ts";

interface IpifyResponse {
	ip: string;
}

/**
 * Fetches the public IP of the machine from 'https://ipify.org'
 * @returns The public IP of the machine
 */
export async function getFromIpify(): Promise<string> {
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
 * Checks whether an object is a valid response from the ipify API
 */
function isIpifyResponse(obj: unknown): obj is IpifyResponse {
	return typeof obj === "object" &&
		obj !== null &&
		"ip" in obj &&
		typeof obj.ip === "string";
}