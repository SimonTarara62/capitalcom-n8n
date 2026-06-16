import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { createClient } from './transport';
import { executeMarket, marketFields, marketOperations } from './actions/market';
import { executeSession, sessionFields, sessionOperations } from './actions/session';

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
					{ name: 'Market', value: 'market' },
					{ name: 'Session', value: 'session' },
				],
				default: 'market',
			},
			marketOperations,
			...marketFields,
			sessionOperations,
			...sessionFields,
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
