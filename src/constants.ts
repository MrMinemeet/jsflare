/*
 * Copyright © 2026 Alexander Voglsperger. Licensed under the MIT License.
 * See LICENSE in the project root for license information.
 */

import axios, { AxiosHeaders } from "axios";

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