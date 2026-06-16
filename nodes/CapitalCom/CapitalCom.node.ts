import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { createClient } from './transport';
import { executeAccount, accountFields, accountOperations } from './actions/account';
import { executeMarket, marketFields, marketOperations } from './actions/market';
import { executeSession, sessionFields, sessionOperations } from './actions/session';
import { executeWatchlist, watchlistFields, watchlistOperations } from './actions/watchlist';
import { executePosition, positionFields, positionOperations } from './actions/position';
import { executeOrder, orderFields, orderOperations } from './actions/order';
import { executeConfirmation, confirmationFields, confirmationOperations } from './actions/confirmation';

export class CapitalCom implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Capital.com',
		name: 'capitalCom',
		icon: 'file:capitalcom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Capital.com Open API',
		defaults: { name: 'Capital.com' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [{ name: 'capitalComApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Confirmation', value: 'confirmation' },
					{ name: 'Market', value: 'market' },
					{ name: 'Order', value: 'order' },
					{ name: 'Position', value: 'position' },
					{ name: 'Session', value: 'session' },
					{ name: 'Watchlist', value: 'watchlist' },
				],
				default: 'market',
			},
			accountOperations,
			...accountFields,
			marketOperations,
			...marketFields,
			sessionOperations,
			...sessionFields,
			watchlistOperations,
			...watchlistFields,
			positionOperations,
			...positionFields,
			orderOperations,
			...orderFields,
			confirmationOperations,
			...confirmationFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const client = await createClient(this);

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				let result: unknown;
				if (resource === 'session') {
					result = await executeSession(client, this, i);
				} else if (resource === 'market') {
					result = await executeMarket(client, this, i);
				} else if (resource === 'account') {
					result = await executeAccount(client, this, i);
				} else if (resource === 'watchlist') {
					result = await executeWatchlist(client, this, i);
				} else if (resource === 'position') {
					result = await executePosition(client, this, i);
				} else if (resource === 'order') {
					result = await executeOrder(client, this, i);
				} else if (resource === 'confirmation') {
					result = await executeConfirmation(client, this, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				const rows = Array.isArray(result) ? result : [result];
				for (const row of rows) {
					returnData.push({ json: row as IDataObject, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
