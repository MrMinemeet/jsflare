/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import axios, { AxiosError, AxiosHeaders, type AxiosRequestConfig } from "axios";

export const AxiosInstance = axios.create({
	timeout: 5000,
	headers: new AxiosHeaders({
		"User-Agent": "JSflare/0.0"
	}),

	// Recommended by Axios 
	// https://axios.rest/pages/misc/security.html#%E2%9A%A0%EF%B8%8F-decompression-bomb-unbounded-response-buffering
	maxContentLength: 10 * 1024 * 1024, // 10 MB
	maxBodyLength: 10 * 1024 * 1024,
});


{
	const MAX_ATTEMPTS = 3;
	// Based on https://axios.rest/pages/advanced/retry#retry-and-error-recovery
	AxiosInstance.interceptors.response.use(
		resp => resp,
		async (error: AxiosError<unknown> | null | undefined) => {
			if (error == null) {
				throw new Error("An unknown error occurred during the HTTP request.");
			}

			const config: (AxiosRequestConfig<unknown> & { _retryCount?: number }) | undefined = error.config;
			if (config == null) {
				return Promise.reject(error);
			}
			const status = error.response?.status;

			const isRetriableError =
				status == null || // Network error (no response)
				(status >= 500 && status < 600) || // Server errors
				status === 429; // Too Many Requests
			if (!isRetriableError) {
				console.error(`Non-retriable error occurred: ${error.message} (status: ${status})`);
				return Promise.reject(error);
			}

			config._retryCount = config._retryCount ?? 0;
			if (config._retryCount >= MAX_ATTEMPTS) {
				return Promise.reject(error);
			}
			config._retryCount += 1;

			const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

			let retryHandled = false;

			const retryAfterHeader = error.response?.headers["retry-after"];
			if (retryAfterHeader != null && status === 429) {
				const retryAfterSeconds = Number.parseInt(retryAfterHeader, 10);
				const retryDate = new Date(retryAfterHeader);
				if (!isNaN(retryAfterSeconds)) {
					// Delay in seconds
					const waitMs = retryAfterSeconds * 1000;
					console.warn(`Received 429 Too Many Requests. Retrying after ${waitMs} ms (Retry-After: ${retryAfterSeconds} seconds)`);
					await delay(waitMs);
					retryHandled = true;
				} else if (!isNaN(retryDate.getTime())) {
					// Retry-After can also be a HTTP-date
					const now = new Date();
					const waitMs = retryDate.getTime() - now.getTime();
					if (waitMs > 0) {
						console.warn(`Received 429 Too Many Requests. Retrying after ${waitMs} ms (Retry-After: ${retryAfterHeader})`);
						await delay(waitMs);
						retryHandled = true;
					}
				}
			}
			if (!retryHandled) {
				// no/malformed retry header -> exponential backoff with jitter
				const backoffTime = 100 * 2 ** config._retryCount; // 200ms, 400ms, 800ms, ...
				const jitter = Math.random() * 100; // Random jitter up to 100ms
				await delay(backoffTime + jitter);
			}

			return AxiosInstance(config);
		}
	);
}