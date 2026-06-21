/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getPublicIp } from "../src/ipservices.ts";
import { AxiosInstance } from "../src/WebReq.ts";

describe("ipservices - getPublicIp", () => {
	beforeEach(() => {
		// Mock console output to keep test runner output clean
		mock.method(console, "info", () => {});
		mock.method(console, "warn", () => {});
		mock.method(console, "error", () => {});
	});

	afterEach(() => {
		// Restore all mocks after each test to prevent cross-test leakage
		mock.restoreAll();
	});

	it("should return a valid IPv4 address from the first service", async () => {
		const fakeIp = "192.168.1.1";
		
		// Directly supply the mock implementation to guarantee it overrides Axios
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return { status: 200, data: fakeIp };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		
		assert.strictEqual(result, fakeIp);
		assert.strictEqual(getMock.mock.calls.length, 1);
		assert.deepEqual(getMock.mock.calls[0]!.arguments[1], { headers: { Accept: "text/plain" } });
	});

	it("should return a valid IPv6 address", async () => {
		const fakeIpv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
		
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return { status: 200, data: fakeIpv6 };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		assert.strictEqual(result, fakeIpv6);
		assert.strictEqual(getMock.mock.calls.length, 1);
	});

	it("should trim whitespace from the returned IP address", async () => {
		const rawResponse = "  203.0.113.50  \n";
		
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return { status: 200, data: rawResponse };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		assert.strictEqual(result, "203.0.113.50");
		assert.strictEqual(getMock.mock.calls.length, 1);
	});

	it("should fallback to the second service if the first one throws a network error", async () => {
		const fakeIp = "10.0.0.1";
		
		// Map the exact behaviors directly to the URLs
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				throw new Error("Network timeout"); // First URL throws
			}
			if (url === "https://icanhazip.com") {
				return { status: 200, data: fakeIp }; // Second URL succeeds
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		
		assert.strictEqual(result, fakeIp);
		assert.strictEqual(getMock.mock.calls.length, 2);
		assert.strictEqual(getMock.mock.calls[0]!.arguments[0], "https://api64.ipify.org");
		assert.strictEqual(getMock.mock.calls[1]!.arguments[0], "https://icanhazip.com");
	});

	it("should fallback to the second service if the first one returns a non-200 status", async () => {
		const fakeIp = "172.16.254.1";
		
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return {
					status: 500,
					statusText: "Internal Server Error",
					data: "Server overloaded"
				};
			}
			if (url === "https://icanhazip.com") {
				return { status: 200, data: fakeIp };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		
		assert.strictEqual(result, fakeIp);
		assert.strictEqual(getMock.mock.calls.length, 2);
	});

	it("should fallback to the second service if the first returns an invalid IP format", async () => {
		const fakeIp = "1.1.1.1";
		
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return { status: 200, data: "<html>Cloudflare error page</html>" };
			}
			if (url === "https://icanhazip.com") {
				return { status: 200, data: fakeIp };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		assert.strictEqual(result, fakeIp);
		assert.strictEqual(getMock.mock.calls.length, 2);
	});

	it("should fallback to the second service if the first returns non-string data", async () => {
		const fakeIp = "8.8.8.8";
		
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			if (url === "https://api64.ipify.org") {
				return { status: 200, data: { ip: "8.8.8.8" } };
			}
			if (url === "https://icanhazip.com") {
				return { status: 200, data: fakeIp };
			}
			throw new Error(`Unexpected URL called: ${url}`);
		});

		const result = await getPublicIp();
		assert.strictEqual(result, fakeIp);
		assert.strictEqual(getMock.mock.calls.length, 2);
	});

	it("should throw an error if all services fail", async () => {
		const getMock = mock.method(AxiosInstance, "get", async (url: string) => {
			throw new Error(`Connection refused for ${url}`);
		});

		await assert.rejects(
			() => getPublicIp(),
			{ message: "Failed to get public IP from all supported sources" }
		);
		
		// Ensures it attempted both URLs in the `rawIpServices` array
		assert.strictEqual(getMock.mock.calls.length, 2);
	});
});