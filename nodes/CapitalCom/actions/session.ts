import { NodeOperationError, type IExecuteFunctions, type INodeProperties } from 'n8n-workflow';
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
		displayName: 'Account',
		name: 'accountId',
		type: 'resourceLocator',
		required: true,
		default: { mode: 'list', value: '' },
		displayOptions: { show: { resource: ['session'], operation: ['switchAccount'] } },
		description: 'The account ID to switch to',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: { searchListMethod: 'searchAccounts', searchable: true },
			},
			{ displayName: 'By ID', name: 'id', type: 'string', placeholder: 'e.g. 123456789' },
		],
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
			return client.switchAccount(
				ctx.getNodeParameter('accountId', i, '', { extractValue: true }) as string,
			);
		default:
			throw new NodeOperationError(ctx.getNode(), `Unsupported session operation: ${operation}`, {
				description: 'Pick one of the operations offered in the Operation dropdown.',
			});
	}
}
