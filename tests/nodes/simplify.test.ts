import { simplifyPosition, simplifyOrder, simplifyMarket, simplifyTransaction } from '../../nodes/CapitalCom/simplify';

describe('simplify', () => {
	it('flattens a position into the useful fields', () => {
		const raw = {
			position: {
				dealId: 'd1', direction: 'BUY', size: 0.05, level: 63190.4, upl: -26.4,
				currency: 'USD', createdDateUTC: '2026-07-04T19:05:30', stopLevel: 62131.7,
				profitLevel: 63402.15, leverage: 2, contractSize: 1, guaranteedStop: false,
				trailingStop: false, dealReference: 'p_d1', workingOrderId: 'w1',
			},
			market: {
				epic: 'BTCUSD', instrumentName: 'Bitcoin/USD', bid: 62662.5, offer: 62712.5,
				marketStatus: 'TRADEABLE', instrumentType: 'CRYPTOCURRENCIES', high: 63372.9,
				low: 62368.15, percentageChange: -0.78, netChange: -25.05, lotSize: 1,
			},
		};
		expect(simplifyPosition(raw)).toEqual({
			dealId: 'd1', epic: 'BTCUSD', instrumentName: 'Bitcoin/USD', direction: 'BUY',
			size: 0.05, level: 63190.4, upl: -26.4, currency: 'USD',
			stopLevel: 62131.7, profitLevel: 63402.15, marketStatus: 'TRADEABLE',
			createdDateUTC: '2026-07-04T19:05:30',
		});
	});

	it('tolerates missing nested objects', () => {
		expect(simplifyPosition({})).toEqual({});
		expect(simplifyMarket({})).toEqual({});
	});

	// Capital.com's real GET /workingorders response (per the official
	// capital-com-sv/capital-api-postman collection, and per
	// tests/integration/trading.test.ts's live-API shape assertion) nests fields under
	// `workingOrderData`/`marketData`, and a working order's stop/limit is expressed as
	// stopDistance/profitDistance — NOT stopLevel/profitLevel, which only exist once a stop is a
	// live position. This guards against silently mapping absent fields to an empty result.
	it('flattens a working order into the useful fields, using distance-based stops', () => {
		const raw = {
			workingOrderData: {
				dealId: 'w1', direction: 'BUY', orderSize: 1, orderLevel: 999999,
				orderType: 'STOP', currencyCode: 'USD', stopDistance: -3, profitDistance: 3,
				createdDateUTC: '2026-07-04T19:05:30', timeInForce: 'GOOD_TILL_CANCELLED',
				guaranteedStop: false, epic: 'SILVER',
			},
			marketData: {
				epic: 'SILVER', instrumentName: 'Silver', marketStatus: 'TRADEABLE',
				instrumentType: 'COMMODITIES', bid: 24.387, offer: 24.407,
			},
		};
		expect(simplifyOrder(raw)).toEqual({
			dealId: 'w1', direction: 'BUY', orderSize: 1, orderLevel: 999999,
			orderType: 'STOP', currencyCode: 'USD', stopDistance: -3, profitDistance: 3,
			createdDateUTC: '2026-07-04T19:05:30',
			epic: 'SILVER', instrumentName: 'Silver', marketStatus: 'TRADEABLE',
		});
	});

	it('order: tolerates missing nested objects', () => {
		expect(simplifyOrder({})).toEqual({});
	});

	// GET /markets (search) and GET /positions' embedded `market` use a flat item shape.
	it('flattens a search-result market (flat shape)', () => {
		const raw = {
			epic: 'SILVER', instrumentName: 'Silver', instrumentType: 'COMMODITIES',
			marketStatus: 'TRADEABLE', bid: 24.366, offer: 24.386, percentageChange: -0.89,
			netChange: -0.219, high: 24.405, low: 24.119, lotSize: 1, delayTime: 0,
			expiry: '-', updateTime: '2026-01-01T00:00:00', updateTimeUTC: '2026-01-01T00:00:00',
			streamingPricesAvailable: true, scalingFactor: 1,
		};
		expect(simplifyMarket(raw)).toEqual({
			epic: 'SILVER', instrumentName: 'Silver', instrumentType: 'COMMODITIES',
			marketStatus: 'TRADEABLE', bid: 24.366, offer: 24.386, percentageChange: -0.89,
			netChange: -0.219, high: 24.405, low: 24.119,
		});
	});

	// GET /markets/{epic} (single market detail) nests fields under instrument/dealingRules/snapshot
	// instead — confirmed against the official Postman collection's "Single market details" example.
	it('flattens a single-market-detail response (nested instrument/snapshot shape)', () => {
		const raw = {
			instrument: {
				epic: 'SILVER', name: 'Silver', type: 'COMMODITIES', lotSize: 1,
				expiry: '-', currency: 'USD', marginFactor: 10, marginFactorUnit: 'PERCENTAGE',
				controlledRiskAllowed: true, streamingPricesAvailable: true,
			},
			dealingRules: {
				minDealSize: { unit: 'POINTS', value: 0.1 },
				minStepDistance: { unit: 'POINTS', value: 0.001 },
			},
			snapshot: {
				marketStatus: 'TRADEABLE', netChange: -0.313, percentageChange: -1.2762,
				updateTime: '2026-01-01T00:00:00', delayTime: 0, bid: 24.203, offer: 24.223,
				high: 24.405, low: 24.193, decimalPlacesFactor: 3, scalingFactor: 1,
			},
		};
		expect(simplifyMarket(raw)).toEqual({
			epic: 'SILVER', instrumentName: 'Silver', instrumentType: 'COMMODITIES',
			marketStatus: 'TRADEABLE', bid: 24.203, offer: 24.223,
			percentageChange: -1.2762, netChange: -0.313, high: 24.405, low: 24.193,
		});
	});

	it('flattens a transaction into the useful fields', () => {
		const raw = {
			date: '2026-07-04T19:05:30', dateUtc: '2026-07-04T16:05:30', instrumentName: 'NATURALGAS',
			transactionType: 'TRADE', note: 'Trade closed', reference: '12345678', size: '1.05',
			currency: 'USD',
		};
		expect(simplifyTransaction(raw)).toEqual({
			date: '2026-07-04T19:05:30', dateUtc: '2026-07-04T16:05:30', instrumentName: 'NATURALGAS',
			transactionType: 'TRADE', size: '1.05', currency: 'USD',
		});
	});

	it('transaction: tolerates an empty object', () => {
		expect(simplifyTransaction({})).toEqual({});
	});
});
