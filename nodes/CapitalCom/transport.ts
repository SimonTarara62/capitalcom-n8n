import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import {
	CapitalClient,
	type CapitalCredentials,
	type CapitalEnvironment,
	type HttpResponse,
	type Requester,
	type SessionStore,
	type SessionTokens,
} from '../../transport';

type N8nContext = IExecuteFunctions | ILoadOptionsFunctions;

/** SessionStore backed by n8n workflowStaticData so the cached login survives executions. */
export class WorkflowStaticDataStore implements SessionStore {
	constructor(
		private readonly backing: Record<string, unknown>,
		private readonly key: string,
	) {}

	get(): SessionTokens | null {
		const value = this.backing[this.key];
		return value ? (value as unknown as SessionTokens) : null;
	}

	set(tokens: SessionTokens): void {
		this.backing[this.key] = tokens as unknown;
	}

	clear(): void {
		delete this.backing[this.key];
	}
}

/** Wraps n8n's httpRequest helper as a transport Requester. */
export function makeRequester(ctx: N8nContext): Requester {
	return async (spec): Promise<HttpResponse> => {
		const response = (await ctx.helpers.httpRequest({
			method: spec.method,
			url: spec.url,
			headers: spec.headers,
			body: spec.body as IDataObject,
			qs: spec.qs as IDataObject,
			json: true,
			returnFullResponse: true,
			ignoreHttpStatusErrors: true,
		})) as { statusCode: number; headers: Record<string, string>; body: unknown };

		return {
			statusCode: response.statusCode,
			headers: response.headers,
			body: response.body,
		};
	};
}

/** Build a CapitalClient from the node's credentials, httpRequest helper, and static data. */
export async function createClient(ctx: IExecuteFunctions): Promise<CapitalClient> {
	const raw = await ctx.getCredentials('capitalComApi');
	const credentials: CapitalCredentials = {
		apiKey: raw.apiKey as string,
		identifier: raw.identifier as string,
		password: raw.password as string,
		environment: (raw.environment as CapitalEnvironment) ?? 'demo',
	};

	const backing = ctx.getWorkflowStaticData('global') as Record<string, unknown>;
	const key = `capitalcom:${credentials.environment}:${credentials.identifier}`;
	const store = new WorkflowStaticDataStore(backing, key);

	return new CapitalClient({ credentials, requester: makeRequester(ctx), store });
}
