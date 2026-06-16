import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';

export const marketOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['market'] } },
	options: [
		{ name: 'Get', value: 'get', action: 'Get market details' },
		{ name: 'Get Prices', value: 'getPrices', action: 'Get historical prices' },
		{ name: 'Get Sentiment', value: 'getSentiment', action: 'Get client sentiment' },
		{ name: 'Navigation Node', value: 'navigationNode', action: 'Get a market navigation node' },
		{ name: 'Navigation Root', value: 'navigationRoot', action: 'Get the market navigation root' },
		{ name: 'Search', value: 'search', action: 'Search markets' },
	],
	default: 'search',
};

export const marketFields: INodeProperties[] = [
	{
		displayName: 'Search Term',
		name: 'searchTerm',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['search'] } },
		description: 'Free-text term to search markets by',
	},
	{
		displayName: 'EPICs',
		name: 'epics',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['search'] } },
		description: 'Comma-separated EPICs to filter the search by',
	},
	{
		displayName: 'EPIC',
		name: 'epic',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['get', 'getPrices'] } },
		description: 'The market EPIC, e.g. GOLD',
	},
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		// Price resolutions are ordered shortest→longest on purpose, not alphabetically.
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{ name: 'Minute', value: 'MINUTE' },
			{ name: 'Minute 5', value: 'MINUTE_5' },
			{ name: 'Minute 15', value: 'MINUTE_15' },
			{ name: 'Minute 30', value: 'MINUTE_30' },
			{ name: 'Hour', value: 'HOUR' },
			{ name: 'Hour 4', value: 'HOUR_4' },
			{ name: 'Day', value: 'DAY' },
			{ name: 'Week', value: 'WEEK' },
		],
		default: 'MINUTE_15',
		displayOptions: { show: { resource: ['market'], operation: ['getPrices'] } },
		description: 'Time resolution of each candle',
	},
	{
		displayName: 'Max Candles',
		name: 'maxCandles',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 200,
		displayOptions: { show: { resource: ['market'], operation: ['getPrices'] } },
		description: 'Maximum number of candles to return',
	},
	{
		displayName: 'From',
		name: 'from',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['getPrices'] } },
		description: 'Start datetime (e.g. 2026-01-01T00:00:00). Leave empty to omit.',
	},
	{
		displayName: 'To',
		name: 'to',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['getPrices'] } },
		description: 'End datetime (e.g. 2026-01-02T00:00:00). Leave empty to omit.',
	},
	{
		displayName: 'Market IDs',
		name: 'marketIds',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['getSentiment'] } },
		description: 'One EPIC, or several comma-separated, to fetch client sentiment for',
	},
	{
		displayName: 'Node ID',
		name: 'nodeId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['market'], operation: ['navigationNode'] } },
		description: 'The navigation node ID to expand',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['market'], operation: ['search', 'navigationNode'] } },
		description: 'Max number of results to return',
	},
];

export async function executeMarket(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;

	switch (operation) {
		case 'search': {
			const qs: IDataObject = {};
			const searchTerm = ctx.getNodeParameter('searchTerm', i, '') as string;
			const epics = ctx.getNodeParameter('epics', i, '') as string;
			const limit = ctx.getNodeParameter('limit', i, 50) as number;
			if (searchTerm) qs.searchTerm = searchTerm;
			if (epics) qs.epics = epics;
			const data = (await client.request('GET', '/markets', { qs })) as IDataObject;
			const markets = Array.isArray(data.markets) ? data.markets.slice(0, limit) : [];
			return { ...data, markets };
		}
		case 'get': {
			const epic = ctx.getNodeParameter('epic', i) as string;
			return client.request('GET', `/markets/${encodeURIComponent(epic)}`);
		}
		case 'getPrices': {
			const epic = ctx.getNodeParameter('epic', i) as string;
			const qs: IDataObject = {
				resolution: ctx.getNodeParameter('resolution', i, 'MINUTE_15') as string,
				max: ctx.getNodeParameter('maxCandles', i, 200) as number,
			};
			const from = ctx.getNodeParameter('from', i, '') as string;
			const to = ctx.getNodeParameter('to', i, '') as string;
			if (from) qs.from = from;
			if (to) qs.to = to;
			return client.request('GET', `/prices/${encodeURIComponent(epic)}`, { qs });
		}
		case 'getSentiment': {
			const raw = ctx.getNodeParameter('marketIds', i) as string;
			const ids = raw
				.split(',')
				.map((s) => s.trim())
				.filter(Boolean);
			if (ids.length === 0) {
				throw new Error('At least one market ID is required');
			}
			if (ids.length === 1) {
				return client.request('GET', `/clientsentiment/${encodeURIComponent(ids[0])}`);
			}
			return client.request('GET', '/clientsentiment', { qs: { marketIds: ids.join(',') } });
		}
		case 'navigationRoot':
			return client.request('GET', '/marketnavigation');
		case 'navigationNode': {
			const nodeId = ctx.getNodeParameter('nodeId', i) as string;
			const limit = ctx.getNodeParameter('limit', i, 0) as number;
			const qs: IDataObject = {};
			if (limit) qs.limit = limit;
			return client.request('GET', `/marketnavigation/${encodeURIComponent(nodeId)}`, { qs });
		}
		default:
			throw new Error(`Unknown market operation: ${operation}`);
	}
}
