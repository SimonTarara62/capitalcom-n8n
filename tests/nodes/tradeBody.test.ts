import { buildStopsLimits, buildTradeBody } from '../../nodes/CapitalCom/tradeBody';
import { fakeExecute } from './helpers';

it('buildStopsLimits emits only the set fields from the collection', () => {
	const ctx = fakeExecute({
		params: { stopsLimits: { guaranteedStop: true, stopLevel: 1900, profitDistance: 50, stopAmount: 0 } },
	});
	expect(buildStopsLimits(ctx, 0)).toEqual({ guaranteedStop: true, stopLevel: 1900, profitDistance: 50 });
});

it('buildStopsLimits is empty when the collection is empty', () => {
	const ctx = fakeExecute({ params: {} });
	expect(buildStopsLimits(ctx, 0)).toEqual({});
});

it('buildTradeBody builds a position body (no order fields)', () => {
	const ctx = fakeExecute({
		params: { epic: 'GOLD', direction: 'BUY', size: 1.5, stopsLimits: { stopDistance: 20 } },
	});
	expect(buildTradeBody(ctx, 0, { includeOrderFields: false })).toEqual({
		epic: 'GOLD',
		direction: 'BUY',
		size: 1.5,
		stopDistance: 20,
	});
});

it('buildTradeBody adds order fields and optional goodTillDate', () => {
	const ctx = fakeExecute({
		params: {
			epic: 'GOLD',
			direction: 'SELL',
			size: 2,
			orderType: 'LIMIT',
			level: 2100,
			goodTillDate: '2026-12-31T00:00:00',
			stopsLimits: {},
		},
	});
	expect(buildTradeBody(ctx, 0, { includeOrderFields: true })).toEqual({
		epic: 'GOLD',
		direction: 'SELL',
		size: 2,
		type: 'LIMIT',
		level: 2100,
		goodTillDate: '2026-12-31T00:00:00',
	});
});
