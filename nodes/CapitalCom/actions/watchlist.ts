import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';

export const watchlistOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['watchlist'] } },
	options: [
		{ name: 'Add Market', value: 'addMarket', action: 'Add a market to a watchlist' },
		{ name: 'Create', value: 'create', action: 'Create a watchlist' },
		{ name: 'Delete', value: 'delete', action: 'Delete a watchlist' },
		{ name: 'Get', value: 'get', action: 'Get a watchlist' },
		{ name: 'List', value: 'list', action: 'List watchlists' },
		{ name: 'Remove Market', value: 'removeMarket', action: 'Remove a market from a watchlist' },
	],
	default: 'list',
};

export const watchlistFields: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['watchlist'], operation: ['create'] } },
		description: 'Name of the new watchlist',
	},
	{
		displayName: 'Watchlist ID',
		name: 'watchlistId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: { resource: ['watchlist'], operation: ['get', 'addMarket', 'removeMarket', 'delete'] },
		},
		description: 'The watchlist to act on',
	},
	{
		displayName: 'EPIC',
		name: 'epic',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['watchlist'], operation: ['addMarket', 'removeMarket'] } },
		description: 'The market EPIC to add or remove',
	},
];

export async function executeWatchlist(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;

	switch (operation) {
		case 'list':
			return client.request('GET', '/watchlists');
		case 'get': {
			const id = ctx.getNodeParameter('watchlistId', i) as string;
			return client.request('GET', `/watchlists/${encodeURIComponent(id)}`);
		}
		case 'create': {
			const name = ctx.getNodeParameter('name', i) as string;
			return client.request('POST', '/watchlists', { body: { name } });
		}
		case 'addMarket': {
			const id = ctx.getNodeParameter('watchlistId', i) as string;
			const epic = ctx.getNodeParameter('epic', i) as string;
			return client.request('PUT', `/watchlists/${encodeURIComponent(id)}`, { body: { epic } });
		}
		case 'removeMarket': {
			const id = ctx.getNodeParameter('watchlistId', i) as string;
			const epic = ctx.getNodeParameter('epic', i) as string;
			const body = await client.request(
				'DELETE',
				`/watchlists/${encodeURIComponent(id)}/${encodeURIComponent(epic)}`,
			);
			return body || { status: 'removed' };
		}
		case 'delete': {
			const id = ctx.getNodeParameter('watchlistId', i) as string;
			const body = await client.request('DELETE', `/watchlists/${encodeURIComponent(id)}`);
			return body || { status: 'deleted' };
		}
		default:
			throw new Error(`Unknown watchlist operation: ${operation}`);
	}
}
