import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClient } from '../../../transport';

/** The slice of CapitalClient the resource dispatchers need (keeps them test-fakeable). */
export type CapitalClientLike = Pick<CapitalClient, 'request' | 'switchAccount'>;

export const sessionOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['session'] } },
	options: [
		{ name: 'Get Details', value: 'getDetails', action: 'Get session details' },
		{ name: 'Get Server Time', value: 'getServerTime', action: 'Get server time' },
		{ name: 'Ping', value: 'ping', action: 'Ping the session' },
		{ name: 'Switch Account', value: 'switchAccount', action: 'Switch the active account' },
	],
	default: 'getDetails',
};

export const sessionFields: INodeProperties[] = [
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['session'], operation: ['switchAccount'] } },
		description: 'The account ID to switch to',
	},
];

export async function executeSession(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;
	switch (operation) {
		case 'getServerTime':
			return client.request('GET', '/time');
		case 'ping':
			return client.request('GET', '/ping');
		case 'getDetails':
			return client.request('GET', '/session');
		case 'switchAccount':
			return client.switchAccount(ctx.getNodeParameter('accountId', i) as string);
		default:
			throw new Error(`Unknown session operation: ${operation}`);
	}
}
