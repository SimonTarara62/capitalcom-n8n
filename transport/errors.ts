export class CapitalApiError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number,
		public readonly errorCode?: string,
		public readonly body?: unknown,
	) {
		super(message);
		this.name = 'CapitalApiError';
	}
}

export class CapitalAuthError extends CapitalApiError {
	constructor(message: string, statusCode: number, body?: unknown) {
		super(message, statusCode, 'AUTH_FAILED', body);
		this.name = 'CapitalAuthError';
	}
}

/** Port of the CLI's error-body parsing: errorCode > message > error > stringified > raw. */
export function extractErrorMessage(status: number, body: unknown): string {
	if (body && typeof body === 'object') {
		const obj = body as Record<string, unknown>;
		if (typeof obj.errorCode === 'string') return obj.errorCode;
		if (typeof obj.message === 'string') return obj.message;
		if (typeof obj.error === 'string') return obj.error;
		return JSON.stringify(obj);
	}
	if (typeof body === 'string' && body.length > 0) {
		return body.length > 200 ? `${body.slice(0, 200)}...` : body;
	}
	return `HTTP ${status}`;
}
