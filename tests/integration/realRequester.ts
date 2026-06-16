import type { Requester } from '../../transport';

/** A real HTTP Requester (global fetch) for integration tests against the live demo API. */
export const fetchRequester: Requester = async (spec) => {
	const url = new URL(spec.url);
	if (spec.qs) {
		for (const [key, value] of Object.entries(spec.qs)) {
			if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
		}
	}

	const response = await fetch(url.toString(), {
		method: spec.method,
		headers: spec.headers,
		body: spec.body !== undefined ? JSON.stringify(spec.body) : undefined,
	});

	const text = await response.text();
	let body: unknown;
	if (text) {
		try {
			body = JSON.parse(text);
		} catch {
			body = text;
		}
	}

	const headers: Record<string, string> = {};
	response.headers.forEach((value, key) => {
		headers[key] = value;
	});

	return { statusCode: response.status, headers, body };
};
