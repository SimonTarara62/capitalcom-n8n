export interface WsTokens {
	cst: string;
	securityToken: string;
}

export const MAX_EPICS = 40;

export type StreamKind = 'prices' | 'candles';

export interface StreamMessage {
	destination?: string;
	status?: string;
	payload?: unknown;
	[key: string]: unknown;
}

export function assertEpicCount(epics: string[]): void {
	if (epics.length === 0) throw new Error('At least one EPIC is required');
	if (epics.length > MAX_EPICS) {
		throw new Error(`Cannot subscribe to more than ${MAX_EPICS} EPICs (requested ${epics.length})`);
	}
}

export function buildQuoteSubscribe(epics: string[], tokens: WsTokens, correlationId = '1') {
	return {
		destination: 'marketData.subscribe',
		correlationId,
		cst: tokens.cst,
		securityToken: tokens.securityToken,
		payload: { epics },
	};
}

export function buildOhlcSubscribe(
	epics: string[],
	resolutions: string[],
	tokens: WsTokens,
	barType = 'classic',
	correlationId = '3',
) {
	return {
		destination: 'OHLCMarketData.subscribe',
		correlationId,
		cst: tokens.cst,
		securityToken: tokens.securityToken,
		payload: { epics, resolutions, type: barType },
	};
}

export function buildPing(tokens: WsTokens, correlationId = 'ping') {
	return {
		destination: 'ping',
		correlationId,
		cst: tokens.cst,
		securityToken: tokens.securityToken,
	};
}

export function buildSubscribeForStream(
	stream: StreamKind,
	epics: string[],
	resolutions: string[],
	tokens: WsTokens,
): object {
	return stream === 'candles'
		? buildOhlcSubscribe(epics, resolutions, tokens)
		: buildQuoteSubscribe(epics, tokens);
}

export function parseStreamMessage(raw: string): StreamMessage | null {
	try {
		const data = JSON.parse(raw);
		return data && typeof data === 'object' ? (data as StreamMessage) : null;
	} catch {
		return null;
	}
}

export function isDataMessage(msg: StreamMessage): boolean {
	return msg.destination === 'quote' || msg.destination === 'ohlc.event';
}

/** Decide what (if anything) the trigger should emit for a raw socket message. */
export function selectEmit(raw: string, emitAll: boolean): StreamMessage | null {
	const msg = parseStreamMessage(raw);
	if (!msg) return null;
	if (emitAll) return msg;
	return isDataMessage(msg) ? msg : null;
}
