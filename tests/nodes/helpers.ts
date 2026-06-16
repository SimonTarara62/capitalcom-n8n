import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

/** Stand-in for CapitalClient: records request()/switchAccount() calls, returns scripted bodies. */
export class FakeClient {
	public calls: Array<{ kind: 'request' | 'switchAccount'; args: unknown[] }> = [];

	constructor(private readonly responses: Record<string, unknown> = {}) {}

	async request(method: string, path: string, options?: unknown): Promise<unknown> {
		this.calls.push({ kind: 'request', args: [method, path, options] });
		return this.responses[`${method} ${path}`] ?? {};
	}

	async switchAccount(accountId: string): Promise<unknown> {
		this.calls.push({ kind: 'switchAccount', args: [accountId] });
		return this.responses.switchAccount ?? { accountId };
	}
}

export interface FakeExecuteOptions {
	/** Parameter values by name (single-item simple case). */
	params: Record<string, unknown>;
	itemCount?: number;
	credentials?: Record<string, unknown>;
	staticData?: Record<string, unknown>;
	continueOnFail?: boolean;
	httpRequest?: (opts: Record<string, unknown>) => Promise<unknown>;
}

/** Minimal IExecuteFunctions good enough for the node's execute() path. */
export function fakeExecute(opts: FakeExecuteOptions): IExecuteFunctions {
	const items: INodeExecutionData[] = Array.from({ length: opts.itemCount ?? 1 }, () => ({
		json: {},
	}));
	const staticData = opts.staticData ?? {};

	return {
		getInputData: () => items,
		getNodeParameter: (name: string, _i: number, fallback?: unknown) =>
			name in opts.params ? opts.params[name] : fallback,
		getCredentials: async () => opts.credentials ?? {},
		getWorkflowStaticData: () => staticData,
		continueOnFail: () => opts.continueOnFail ?? false,
		getNode: () => ({ name: 'Capital.com' }),
		helpers: {
			httpRequest:
				opts.httpRequest ??
				(async () => {
					throw new Error('httpRequest not scripted');
				}),
		},
	} as unknown as IExecuteFunctions;
}
