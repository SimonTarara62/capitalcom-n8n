import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import type { CapitalClientLike } from './session';

export const confirmationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: ['confirmation'] } },
	options: [
		{ name: 'Get', value: 'get', action: 'Get a deal confirmation' },
		{ name: 'Wait For', value: 'waitFor', action: 'Wait for a deal confirmation' },
	],
	default: 'get',
};

export const confirmationFields: INodeProperties[] = [
	{
		displayName: 'Deal Reference',
		name: 'dealReference',
		type: 'string',
		required: true,
		default: '',
		displayOptions: { show: { resource: ['confirmation'] } },
		description: 'The deal reference returned when opening/creating a deal',
	},
	{
		displayName: 'Timeout (Seconds)',
		name: 'timeout',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 15,
		displayOptions: { show: { resource: ['confirmation'], operation: ['waitFor'] } },
		description: 'How long to poll before returning a TIMEOUT status',
	},
];

export interface WaitOptions {
	timeoutMs?: number;
	intervalMs?: number;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
}

/** Poll GET /confirms/{ref} until the broker accepts/rejects, or the timeout elapses. */
export async function waitForConfirmation(
	client: CapitalClientLike,
	dealReference: string,
	opts: WaitOptions = {},
): Promise<IDataObject> {
	const timeoutMs = opts.timeoutMs ?? 15_000;
	const intervalMs = opts.intervalMs ?? 500;
	const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const now = opts.now ?? (() => Date.now());
	const deadline = now() + timeoutMs;

	for (;;) {
		const data = (await client.request(
			'GET',
			`/confirms/${encodeURIComponent(dealReference)}`,
		)) as IDataObject;
		const dealStatus = data.dealStatus as string | undefined;
		if (dealStatus === 'ACCEPTED' || dealStatus === 'REJECTED') {
			return { ...data, status: dealStatus };
		}
		if (now() >= deadline) {
			return { status: 'TIMEOUT', message: `Confirmation timed out after ${timeoutMs}ms` };
		}
		await sleep(intervalMs);
	}
}

export async function executeConfirmation(
	client: CapitalClientLike,
	ctx: IExecuteFunctions,
	i: number,
): Promise<unknown> {
	const operation = ctx.getNodeParameter('operation', i) as string;
	const dealReference = ctx.getNodeParameter('dealReference', i) as string;
	switch (operation) {
		case 'get':
			return client.request('GET', `/confirms/${encodeURIComponent(dealReference)}`);
		case 'waitFor': {
			const timeoutMs = (ctx.getNodeParameter('timeout', i, 15) as number) * 1000;
			return waitForConfirmation(client, dealReference, { timeoutMs });
		}
		default:
			throw new Error(`Unknown confirmation operation: ${operation}`);
	}
}
