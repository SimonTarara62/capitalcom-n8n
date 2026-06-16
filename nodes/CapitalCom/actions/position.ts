import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';
import { enforceSafety, readSafety, safetyFields } from '../safety';
import { buildStopsLimits, buildTradeBody } from '../tradeBody';
import { waitForConfirmation } from './confirmation';

export const positionOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['position'] } },
	options: [
		{ name: 'Amend', value: 'amend', action: 'Amend a position' },
		{ name: 'Close', value: 'close', action: 'Close a position' },
		{ name: 'Get', value: 'get', action: 'Get a position' },
		{ name: 'List', value: 'list', action: 'List positions' },
		{ name: 'Open', value: 'open', action: 'Open a position' },
		{ name: 'Preview', value: 'preview', action: 'Preview a position without sending' },
	],
	default: 'list',
};

const directionField: INodeProperties = {
	displayName: 'Direction',
	name: 'direction',
	type: 'options',
	options: [
		{ name: 'Buy', value: 'BUY' },
		{ name: 'Sell', value: 'SELL' },
	],
	default: 'BUY',
	displayOptions: { show: { resource: ['position'], operation: ['open', 'preview'] } },
	description: 'Trade direction',
};

const stopsLimitsCollection: INodeProperties = {
	displayName: 'Stops & Limits',
	name: 'stopsLimits',
	type: 'collection',
	placeholder: 'Add Stop / Limit',
	default: {},
	displayOptions: { show: { resource: ['position'], operation: ['open', 'preview', 'amend'] } },
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

export const positionFields: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['position'], operation: ['get', 'amend', 'close'] } },
		description: 'The position deal ID',
	},
	{
		displayName: 'EPIC',
		name: 'epic',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['position'], operation: ['open', 'preview'] } },
		description: 'The market EPIC',
	},
	directionField,
	{
		displayName: 'Size',
		name: 'size',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1,
		displayOptions: { show: { resource: ['position'], operation: ['open', 'preview'] } },
		description: 'Position size',
	},
	stopsLimitsCollection,
	{
		displayName: 'Wait for Confirmation',
		name: 'waitForConfirmation',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['position'], operation: ['open'] } },
		description: 'Whether to poll the deal confirmation and attach it to the result',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['position'], operation: ['list'] } },
		description: 'Max number of results to return',
	},
	...safetyFields(['open']),
];

export async function executePosition(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;

	switch (operation) {
		case 'list': {
			const limit = ctx.getNodeParameter('limit', i, 50) as number;
			const data = (await client.request('GET', '/positions')) as IDataObject;
			const positions = Array.isArray(data.positions) ? data.positions.slice(0, limit) : [];
			return { ...data, positions };
		}
		case 'get': {
			const dealId = ctx.getNodeParameter('dealId', i) as string;
			return client.request('GET', `/positions/${encodeURIComponent(dealId)}`);
		}
		case 'preview': {
			const body = buildTradeBody(ctx, i, { includeOrderFields: false });
			enforceSafety(readSafety(ctx, i), { epic: body.epic as string, size: body.size as number });
			return { preview: true, request: body };
		}
		case 'open': {
			const safety = readSafety(ctx, i);
			const body = buildTradeBody(ctx, i, { includeOrderFields: false });
			enforceSafety(safety, { epic: body.epic as string, size: body.size as number });
			if (safety.dryRun) return { dryRun: true, request: body };
			const result = (await client.request('POST', '/positions', { body })) as IDataObject;
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
			return client.request('PUT', `/positions/${encodeURIComponent(dealId)}`, {
				body: buildStopsLimits(ctx, i),
			});
		}
		case 'close': {
			const dealId = ctx.getNodeParameter('dealId', i) as string;
			return client.request('DELETE', `/positions/${encodeURIComponent(dealId)}`);
		}
		default:
			throw new Error(`Unknown position operation: ${operation}`);
	}
}
