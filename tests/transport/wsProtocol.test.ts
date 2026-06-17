import {
	assertEpicCount,
	buildOhlcSubscribe,
	buildPing,
	buildQuoteSubscribe,
	buildSubscribeForStream,
	isDataMessage,
	MAX_EPICS,
	parseStreamMessage,
	selectEmit,
	type WsTokens,
} from '../../transport/wsProtocol';

const tokens: WsTokens = { cst: 'C', securityToken: 'T' };

it('buildQuoteSubscribe builds the marketData.subscribe message', () => {
	expect(buildQuoteSubscribe(['GOLD', 'SILVER'], tokens)).toEqual({
		destination: 'marketData.subscribe',
		correlationId: '1',
		cst: 'C',
		securityToken: 'T',
		payload: { epics: ['GOLD', 'SILVER'] },
	});
});

it('buildOhlcSubscribe builds the OHLCMarketData.subscribe message', () => {
	expect(buildOhlcSubscribe(['GOLD'], ['MINUTE'], tokens)).toEqual({
		destination: 'OHLCMarketData.subscribe',
		correlationId: '3',
		cst: 'C',
		securityToken: 'T',
		payload: { epics: ['GOLD'], resolutions: ['MINUTE'], type: 'classic' },
	});
});

it('buildPing builds the keep-alive message', () => {
	expect(buildPing(tokens)).toEqual({
		destination: 'ping',
		correlationId: 'ping',
		cst: 'C',
		securityToken: 'T',
	});
});

it('buildSubscribeForStream picks quote vs ohlc', () => {
	expect((buildSubscribeForStream('prices', ['GOLD'], [], tokens) as { destination: string }).destination).toBe(
		'marketData.subscribe',
	);
	expect(
		(buildSubscribeForStream('candles', ['GOLD'], ['MINUTE'], tokens) as { destination: string }).destination,
	).toBe('OHLCMarketData.subscribe');
});

it('assertEpicCount enforces 1..MAX_EPICS', () => {
	expect(() => assertEpicCount([])).toThrow(/at least one epic/i);
	expect(() => assertEpicCount(Array(MAX_EPICS + 1).fill('X'))).toThrow(/more than 40/i);
	expect(() => assertEpicCount(['GOLD'])).not.toThrow();
});

it('parseStreamMessage returns null for non-JSON', () => {
	expect(parseStreamMessage('not json')).toBeNull();
	expect(parseStreamMessage('{"destination":"quote"}')).toEqual({ destination: 'quote' });
});

it('isDataMessage recognises quote and ohlc.event only', () => {
	expect(isDataMessage({ destination: 'quote' })).toBe(true);
	expect(isDataMessage({ destination: 'ohlc.event' })).toBe(true);
	expect(isDataMessage({ destination: 'marketData.subscribe', status: 'OK' })).toBe(false);
	expect(isDataMessage({ destination: 'ping' })).toBe(false);
});

it('selectEmit returns data messages, drops control messages, honours emitAll', () => {
	expect(selectEmit('{"destination":"quote","payload":{"bid":1}}', false)).toEqual({
		destination: 'quote',
		payload: { bid: 1 },
	});
	expect(selectEmit('{"destination":"ping","status":"OK"}', false)).toBeNull();
	expect(selectEmit('{"destination":"ping","status":"OK"}', true)).toEqual({
		destination: 'ping',
		status: 'OK',
	});
	expect(selectEmit('garbage', true)).toBeNull();
});
