/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import * as fsp from "fs/promises";

export interface Config {
	maxRetries: number;
	timeout: number;
	items: (TokenItem | EmailKeyItem)[];
}
export interface TokenItem {
	token: string;
	zone: string;
	record: string;
	ttl: number;
	proxied: boolean;
}
export interface EmailKeyItem {
	email: string;
	key: string;
	zone: string;
	record: string;
	ttl: number;
	proxied: boolean;
}

/**
 * Strips comments from a JSONC string
 * @param jsonc The JSONC string
 * @returns The JSON string without comments
 */
function stripComments(jsonc: string): string {
	return jsonc
		.replace(/\/\/.*$/gm, "") // Remove single-line comments
		.replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments
}

/**
 * Strips comments from a JSONC string and parses it into a config object.
 * Performs basic validation of the config structure.
 * @param jsonc The raw jsonc string for the config
 * @returns The parsed config object
 */
function parseConfig(jsonc: string): Config {
	const json = JSON.parse(stripComments(jsonc));
	// TODO: Validate structure of json
	return json;
}

/**
 * Loads the config from 'config.jsonc' or 'config.json' and parses it.
 * @returns The parsed config object
 */
export async function loadConfig(): Promise<Config> {
	let rawConfig: string;
	try {
		rawConfig = await fsp.readFile("config.jsonc", "utf8");
	} catch(e) {
		console.warn("Failed to load 'config.jsonc'. Trying default 'config.json'...");
		try {
			rawConfig = await fsp.readFile("config.json", "utf8");
		} catch(e) {
			console.error("Failed to load 'config.json'. Exiting...");
			process.exit(1);
		}
	}

	try {
		return parseConfig(rawConfig);
	} catch(e) {
		console.error("Failed to parse config. Exiting...");
		process.exit(1);
	}
}