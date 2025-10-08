/*
 * Copyright © 2025 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */
import * as path from "path"
import * as fsp from "fs/promises";

const AUTO_TTL = 1;
const MIN_TTL = 60;
const MAX_TTL = 86400;

export interface Config {
	maxRetries: number;
 	timeout: number;
	items: (TokenItem | EmailKeyItem)[];
}

export interface TokenItem {
	token: string;
	zone: string;
	record: string;
	/// TTL in seconds | 1 = automatic | Value must be between 60 and 86400
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
	validateConfig(json);
	return json;
}

/**
 * Validates a config object.
 * @param config The config object to validate
 * @throws If the config is invalid
 */
function validateConfig(config: Config): void {
	if(typeof(config.maxRetries) !== "number" || config.maxRetries < 0) {
		throw new Error("'maxRetries' must be a non-negative number");
	}
	if(typeof(config.timeout) !== "number" || config.timeout < 0) {
		throw new Error("'timeout' must be a non-negative number");
	}
	if (!Array.isArray(config.items)) {
		throw new Error("'items' must be an array");
	}
	for(const item of config.items) {
		if("token" in item && typeof(item.token) !== "string") {
			throw new Error("'token' must be a string");
		} else if("email" in item && "key" in item &&
			(typeof(item.email) !== "string" || typeof(item.key) !== "string")) {
			throw new Error("'email' and 'key' must be strings");
		}

		if(typeof(item.zone) !== "string") {
			throw new Error("'zone' must be a string");
		}
		if(typeof(item.record) !== "string") {
			throw new Error("'record' must be a string");
		}
		if(typeof(item.ttl) !== "number" || 
			(item.ttl !== AUTO_TTL && (item.ttl < MIN_TTL || item.ttl > MAX_TTL))) {
			throw new Error(`'ttl' must be a number between ${MIN_TTL} and ${MAX_TTL}, or ${AUTO_TTL} for 'auto'`);
		}
		if(typeof(item.proxied) !== "boolean") {
			throw new Error("'proxied' must be a boolean");
		}
	}
}

/**
 * Loads the config from 'config.jsonc' or 'config.json' and parses it.
 * @param cfgPath The path to the config file
 * @returns The parsed config object
 */
export async function loadConfig(cfgPath: string): Promise<Config> {
	let configDir = path.dirname(cfgPath);
	if (cfgPath !== "config.jsonc" && configDir !== ".") {
		configDir = ""
	}
	let rawConfig: string;
	try {
		rawConfig = await fsp.readFile(path.join(configDir, "config.jsonc"), "utf8");
	} catch(e) {
		console.warn("Failed to load 'config.jsonc'. Trying default 'config.json'...");
		try {
			rawConfig = await fsp.readFile(path.join(configDir, "config.json"), "utf8");
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