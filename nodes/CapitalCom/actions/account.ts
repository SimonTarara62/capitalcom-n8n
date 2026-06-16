import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';

export const accountOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['account'] } },
	options: [
		{ name: 'Activity History', value: 'activityHistory', action: 'Get account activity history' },
		{ name: 'Demo Top-Up', value: 'demoTopup', action: 'Top up the demo account balance' },
		{ name: 'Get Preferences', value: 'getPreferences', action: 'Get account preferences' },
		{ name: 'List', value: 'list', action: 'List accounts' },
		{ name: 'Set Preferences', value: 'setPreferences', action: 'Set account preferences' },
		{ name: 'Transaction History', value: 'transactionHistory', action: 'Get transaction history' },
	],
	default: 'list',
};

export const accountFields: INodeProperties[] = [
	{
		displayName: 'Hedging Mode',
		name: 'hedgingMode',
		type: 'options',
		options: [
			{ name: 'Disabled', value: 'disabled' },
			{ name: 'Enabled', value: 'enabled' },
			{ name: 'No Change', value: 'noChange' },
		],
		default: 'noChange',
		displayOptions: { show: { resource: ['account'], operation: ['setPreferences'] } },
		description: 'Whether to change the account hedging mode',
	},
	{
		displayName: 'Leverages (JSON)',
		name: 'leverages',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['account'], operation: ['setPreferences'] } },
		description:
			'JSON map of asset class to leverage, e.g. {"CURRENCIES": 20}. Leave empty to not change.',
	},
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1000,
		required: true,
		displayOptions: { show: { resource: ['account'], operation: ['demoTopup'] } },
		description: 'Amount to add to the demo account balance',
	},
	{
		displayName: 'Last Period (Seconds)',
		name: 'lastPeriod',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 600,
		displayOptions: {
			show: { resource: ['account'], operation: ['activityHistory', 'transactionHistory'] },
		},
		description: 'How far back to look, in seconds',
	},
	{
		displayName: 'From Date',
		name: 'fromDate',
		type: 'string',
		default: '',
		displayOptions: {
			show: { resource: ['account'], operation: ['activityHistory', 'transactionHistory'] },
		},
		description: 'Start datetime (e.g. 2026-01-01T00:00:00). Leave empty to omit.',
	},
	{
		displayName: 'To Date',
		name: 'toDate',
		type: 'string',
		default: '',
		displayOptions: {
			show: { resource: ['account'], operation: ['activityHistory', 'transactionHistory'] },
		},
		description: 'End datetime (e.g. 2026-01-02T00:00:00). Leave empty to omit.',
	},
	{
		displayName: 'Detailed',
		name: 'detailed',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: ['account'], operation: ['activityHistory'] } },
		description: 'Whether to return detailed activity records',
	},
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['account'], operation: ['activityHistory'] } },
		description: 'Filter activity to a single deal ID. Leave empty to omit.',
	},
	{
		displayName: 'Transaction Type',
		name: 'transactionType',
		type: 'string',
		default: '',
		displayOptions: { show: { resource: ['account'], operation: ['transactionHistory'] } },
		description: 'Filter by transaction type (e.g. DEPOSIT, WITHDRAWAL). Leave empty to omit.',
	},
];

export async function executeAccount(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;

	switch (operation) {
		case 'list':
			return client.request('GET', '/accounts');
		case 'getPreferences':
			return client.request('GET', '/accounts/preferences');
		case 'setPreferences': {
			const body: IDataObject = {};
			const hedging = ctx.getNodeParameter('hedgingMode', i, 'noChange') as string;
			if (hedging !== 'noChange') body.hedgingMode = hedging === 'enabled';
			const leveragesRaw = (ctx.getNodeParameter('leverages', i, '') as string).trim();
			if (leveragesRaw) {
				try {
					body.leverages = JSON.parse(leveragesRaw);
				} catch {
					throw new Error('Leverages must be valid JSON, e.g. {"CURRENCIES": 20}');
				}
			}
			return client.request('PUT', '/accounts/preferences', { body });
		}
		case 'demoTopup': {
			const creds = await ctx.getCredentials('capitalComApi');
			if (creds.environment !== 'demo') {
				throw new Error('Demo top-up is only available on the demo environment');
			}
			const amount = ctx.getNodeParameter('amount', i) as number;
			return client.request('POST', '/accounts/topUp', { body: { amount } });
		}
		case 'activityHistory': {
			const qs: IDataObject = { lastPeriod: ctx.getNodeParameter('lastPeriod', i, 600) as number };
			const from = ctx.getNodeParameter('fromDate', i, '') as string;
			const to = ctx.getNodeParameter('toDate', i, '') as string;
			if (from) qs.from = from;
			if (to) qs.to = to;
			if (ctx.getNodeParameter('detailed', i, false) as boolean) qs.detailed = 'true';
			const dealId = ctx.getNodeParameter('dealId', i, '') as string;
			if (dealId) qs.dealId = dealId;
			return client.request('GET', '/history/activity', { qs });
		}
		case 'transactionHistory': {
			const qs: IDataObject = { lastPeriod: ctx.getNodeParameter('lastPeriod', i, 600) as number };
			const type = ctx.getNodeParameter('transactionType', i, '') as string;
			const from = ctx.getNodeParameter('fromDate', i, '') as string;
			const to = ctx.getNodeParameter('toDate', i, '') as string;
			if (type) qs.type = type;
			if (from) qs.from = from;
			if (to) qs.to = to;
			return client.request('GET', '/history/transactions', { qs });
		}
		default:
			throw new Error(`Unknown account operation: ${operation}`);
	}
}
