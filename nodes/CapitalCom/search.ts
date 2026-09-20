import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { createClient } from './transport';

/** Case-insensitive contains-match on the display name, matching n8n's searchable list UX. */
function applyFilter(
	results: Array<{ name: string; value: string }>,
	filter?: string,
): INodeListSearchResult {
	if (!filter) return { results };
	const needle = filter.toLowerCase();
	return { results: results.filter((r) => r.name.toLowerCase().includes(needle)) };
}

export async function searchAccounts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const client = await createClient(this);
	const data = (await client.request('GET', '/accounts')) as IDataObject;
	const accounts = (data.accounts ?? []) as IDataObject[];
	return applyFilter(
		accounts.map((a) => ({
			name: (a.accountName as string) ?? (a.accountId as string),
			value: a.accountId as string,
		})),
		filter,
	);
}

export async function searchWatchlists(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const client = await createClient(this);
	const data = (await client.request('GET', '/watchlists')) as IDataObject;
	const watchlists = (data.watchlists ?? []) as IDataObject[];
	return applyFilter(
		watchlists.map((w) => {
			// The list endpoint uses `id` (confirmed against Capital.com's public API
			// reference); the create endpoint's response uses `watchlistId` instead (see
			// tests/integration/readonly.test.ts). Coalesce so this keeps working if a
			// given account/API version ever returns the other shape.
			const id = (w.id ?? w.watchlistId) as string;
			return { name: (w.name as string) ?? id, value: id };
		}),
		filter,
	);
}

export async function searchEpics(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const client = await createClient(this);
	// /markets requires a search term; with none, return nothing rather than the whole universe.
	if (!filter) return { results: [] };
	const data = (await client.request('GET', '/markets', {
		qs: { searchTerm: filter },
	})) as IDataObject;
	const markets = (data.markets ?? []) as IDataObject[];
	return {
		results: markets.map((m) => ({
			name: `${(m.instrumentName as string) ?? (m.epic as string)} (${m.epic as string})`,
			value: m.epic as string,
		})),
	};
}
