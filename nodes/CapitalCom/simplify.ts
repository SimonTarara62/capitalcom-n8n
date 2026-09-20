import type { IDataObject } from 'n8n-workflow';

/** Copy only the listed keys that are actually present, so absent fields stay absent. */
function pick(source: IDataObject | undefined, keys: string[]): IDataObject {
	const out: IDataObject = {};
	if (!source) return out;
	for (const key of keys) {
		if (source[key] !== undefined) out[key] = source[key];
	}
	return out;
}

export function simplifyPosition(raw: IDataObject): IDataObject {
	const position = raw.position as IDataObject | undefined;
	const market = raw.market as IDataObject | undefined;
	return {
		...pick(position, [
			'dealId', 'direction', 'size', 'level', 'upl', 'currency',
			'stopLevel', 'profitLevel', 'createdDateUTC',
		]),
		...pick(market, ['epic', 'instrumentName', 'marketStatus']),
	};
}

/**
 * A working order that hasn't triggered yet has no absolute stopLevel/profitLevel — Capital.com's
 * GET /workingorders response carries stopDistance/profitDistance instead (confirmed against the
 * official capital-com-sv/capital-api-postman "All working orders" example response and against
 * tests/integration/trading.test.ts, which reads real demo-API working orders as
 * `{ workingOrderData: { dealId }, marketData: { epic } }`).
 */
export function simplifyOrder(raw: IDataObject): IDataObject {
	const order = raw.workingOrderData as IDataObject | undefined;
	const market = raw.marketData as IDataObject | undefined;
	return {
		...pick(order, [
			'dealId', 'direction', 'orderSize', 'orderLevel', 'orderType',
			'currencyCode', 'stopDistance', 'profitDistance', 'createdDateUTC',
		]),
		...pick(market, ['epic', 'instrumentName', 'marketStatus']),
	};
}

/**
 * Capital.com uses two different shapes for "a market": the flat item shape returned inside
 * GET /markets (search) and GET /positions' embedded `market`, versus the nested
 * { instrument, dealingRules, snapshot } shape returned by GET /markets/{epic} (a single market's
 * full detail — confirmed against the official Postman collection's "Single market details"
 * example, where instrument.name/instrument.type/instrument.epic and snapshot.bid/offer/etc. live
 * under those sub-objects rather than at the top level). Handle both so the same helper serves
 * both `search` and `get`.
 */
export function simplifyMarket(raw: IDataObject): IDataObject {
	const instrument = raw.instrument as IDataObject | undefined;
	const snapshot = raw.snapshot as IDataObject | undefined;
	if (instrument !== undefined || snapshot !== undefined) {
		const out: IDataObject = {};
		if (instrument?.epic !== undefined) out.epic = instrument.epic;
		if (instrument?.name !== undefined) out.instrumentName = instrument.name;
		if (instrument?.type !== undefined) out.instrumentType = instrument.type;
		return {
			...out,
			...pick(snapshot, [
				'marketStatus', 'bid', 'offer', 'percentageChange', 'netChange', 'high', 'low',
			]),
		};
	}
	return pick(raw, [
		'epic', 'instrumentName', 'instrumentType', 'marketStatus',
		'bid', 'offer', 'percentageChange', 'netChange', 'high', 'low',
	]);
}

export function simplifyTransaction(raw: IDataObject): IDataObject {
	return pick(raw, ['date', 'dateUtc', 'instrumentName', 'transactionType', 'size', 'currency']);
}
