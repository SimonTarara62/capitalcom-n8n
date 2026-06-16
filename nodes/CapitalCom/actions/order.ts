import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';
import { enforceSafety, readSafety, safetyFields } from '../safety';
import { buildStopsLimits, buildTradeBody } from '../tradeBody';
import { waitForConfirmation } from './confirmation';

export const orderOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['order'] } },
	options: [
		{ name: 'Amend', value: 'amend', action: 'Amend a working order' },
		{ name: 'Cancel', value: 'cancel', action: 'Cancel a working order' },
		{ name: 'Create', value: 'create', action: 'Create a working order' },
		{ name: 'List', value: 'list', action: 'List working orders' },
		{ name: 'Preview', value: 'preview', action: 'Preview a working order without sending' },
	],
	default: 'list',
};

const stopsLimitsCollection: INodeProperties = {
	displayName: 'Stops & Limits',
	name: 'stopsLimits',
	type: 'collection',
	placeholder: 'Add Stop / Limit',
	default: {},
	displayOptions: { show: { resource: ['order'], operation: ['create', 'preview', 'amend'] } },
	options: [
		{ displayName: 'Guaranteed Stop', name: 'guaranteedStop', type: 'boolean', default: false },
		{ displayName: 'Profit Amount', name: 'profitAmount', type: 'number', default: 0 },
		{ displayName: 'Profit Distance', name: 'profitDistance', type: 'number', default: 0 },
		{ displayName: 'Profit Level', name: 'profitLevel', type: 'number', default: 0 },
		{ displayName: 'Stop Amount', name: 'stopAmount', type: 'number', default: 0 },
		{ displayName: 'Stop Distance', name: 'stopDistance', type: 'number', default: 0 },
		{ displayName: 'Stop Level', name: 'stopLevel', type: 'number', default: 0 },
		{ displayName: 'Trailing Stop', name: 'trailingStop', type: 'boolean', default: false },
	],
};

export const orderFields: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['order'], operation: ['amend', 'cancel'] } },
		description: 'The working order deal ID',
	},
	{
		displayName: 'EPIC',
		name: 'epic',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview'] } },
		description: 'The market EPIC',
	},
	{
		displayName: 'Direction',
		name: 'direction',
		type: 'options',
		options: [
			{ name: 'Buy', value: 'BUY' },
			{ name: 'Sell', value: 'SELL' },
		],
		default: 'BUY',
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview'] } },
		description: 'Trade direction',
	},
	{
		displayName: 'Order Type',
		name: 'orderType',
		type: 'options',
		options: [
			{ name: 'Limit', value: 'LIMIT' },
			{ name: 'Stop', value: 'STOP' },
		],
		default: 'LIMIT',
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview'] } },
		description: 'Working order type',
	},
	{
		displayName: 'Size',
		name: 'size',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1,
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview'] } },
		description: 'Order size',
	},
	{
		displayName: 'Level',
		name: 'level',
		type: 'number',
		default: 0,
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview', 'amend'] } },
		description: 'Order trigger level',
	},
	{
		displayName: 'Good Till Date',
		name: 'goodTillDate',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['order'], operation: ['create', 'preview', 'amend'] } },
		description: 'ISO 8601 expiry (e.g. 2026-12-31T00:00:00). Leave empty to omit.',
	},
	stopsLimitsCollection,
	{
		displayName: 'Wait for Confirmation',
		name: 'waitForConfirmation',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['order'], operation: ['create'] } },
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'Poll the deal confirmation and attach it to the result',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['order'], operation: ['list'] } },
		description: 'Max number of results to return',
	},
	...safetyFields(['create']),
];

export async function executeOrder(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;

	switch (operation) {
		case 'list': {
			const limit = ctx.getNodeParameter('limit', i, 50) as number;
			const data = (await client.request('GET', '/workingorders')) as IDataObject;
			const workingOrders = Array.isArray(data.workingOrders)
				? data.workingOrders.slice(0, limit)
				: [];
			return { ...data, workingOrders };
		}
		case 'preview': {
			const body = buildTradeBody(ctx, i, { includeOrderFields: true });
			enforceSafety(readSafety(ctx, i), { epic: body.epic as string, size: body.size as number });
			return { preview: true, request: body };
		}
		case 'create': {
			const safety = readSafety(ctx, i);
			const body = buildTradeBody(ctx, i, { includeOrderFields: true });
			enforceSafety(safety, { epic: body.epic as string, size: body.size as number });
			if (safety.dryRun) return { dryRun: true, request: body };
			const result = (await client.request('POST', '/workingorders', { body })) as IDataObject;
			if (
				(ctx.getNodeParameter('waitForConfirmation', i, false) as boolean) &&
				typeof result.dealReference === 'string'
			) {
				result.confirmation = await waitForConfirmation(client, result.dealReference);
			}
			return result;
		}
		case 'amend': {
			const dealId = ctx.getNodeParameter('dealId', i) as string;
			const body = buildStopsLimits(ctx, i);
			const level = ctx.getNodeParameter('level', i, 0) as number;
			const gtd = ctx.getNodeParameter('goodTillDate', i, '') as string;
			if (level) body.level = level;
			if (gtd) body.goodTillDate = gtd;
			return client.request('PUT', `/workingorders/${encodeURIComponent(dealId)}`, { body });
		}
		case 'cancel': {
			const dealId = ctx.getNodeParameter('dealId', i) as string;
			return client.request('DELETE', `/workingorders/${encodeURIComponent(dealId)}`);
		}
		default:
			throw new Error(`Unknown order operation: ${operation}`);
	}
}
