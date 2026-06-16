import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

const STOP_PROFIT_KEYS = [
	'stopLevel',
	'stopDistance',
	'stopAmount',
	'profitLevel',
	'profitDistance',
	'profitAmount',
] as const;

/** Read the "Stops & Limits" collection into a broker-shaped partial body (set fields only). */
export function buildStopsLimits(ctx: IExecuteFunctions, i: number): IDataObject {
	const c = ctx.getNodeParameter('stopsLimits', i, {}) as IDataObject;
	const body: IDataObject = {};
	if (c.guaranteedStop) body.guaranteedStop = true;
	if (c.trailingStop) body.trailingStop = true;
	for (const key of STOP_PROFIT_KEYS) {
		const v = c[key] as number | undefined;
		if (v) body[key] = v;
	}
	return body;
}

export interface TradeBodyOptions {
	includeOrderFields: boolean;
}

/** Build a POST /positions or POST /workingorders body from node params + stops/limits. */
export function buildTradeBody(
	ctx: IExecuteFunctions,
	i: number,
	opts: TradeBodyOptions,
): IDataObject {
	const body: IDataObject = {
		epic: ctx.getNodeParameter('epic', i) as string,
		direction: ctx.getNodeParameter('direction', i) as string,
		size: ctx.getNodeParameter('size', i) as number,
	};
	if (opts.includeOrderFields) {
		body.type = ctx.getNodeParameter('orderType', i) as string;
		body.level = ctx.getNodeParameter('level', i) as number;
		const gtd = ctx.getNodeParameter('goodTillDate', i, '') as string;
		if (gtd) body.goodTillDate = gtd;
	}
	return { ...body, ...buildStopsLimits(ctx, i) };
}
