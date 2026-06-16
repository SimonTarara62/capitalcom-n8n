import type { CapitalEnvironment } from './types';

export function baseUrl(env: CapitalEnvironment): string {
	return env === 'live'
		? 'https://api-capital.backend-capital.com'
		: 'https://demo-api-capital.backend-capital.com';
}

export function apiBaseUrl(env: CapitalEnvironment): string {
	return `${baseUrl(env)}/api/v1`;
}

export const WS_URL = 'wss://api-streaming-capital.backend-capital.com/connect';
