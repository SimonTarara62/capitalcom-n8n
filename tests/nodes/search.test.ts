import { searchAccounts, searchWatchlists } from '../../nodes/CapitalCom/search';

jest.mock('../../nodes/CapitalCom/transport', () => ({
	createClient: jest.fn(async () => ({
		request: jest.fn(async (_method: string, path: string) => {
			if (path === '/accounts') {
				return { accounts: [
					{ accountId: '111', accountName: 'USD 4' },
					{ accountId: '222', accountName: 'EUR' },
				] };
			}
			return { watchlists: [{ id: 'w1', name: 'Favourites' }] };
		}),
	})),
}));

const ctx = {} as never;

describe('listSearch handlers', () => {
	it('maps accounts to name/value pairs', async () => {
		const res = await searchAccounts.call(ctx);
		expect(res.results).toEqual([
			{ name: 'USD 4', value: '111' },
			{ name: 'EUR', value: '222' },
		]);
	});

	it('filters case-insensitively on the display name', async () => {
		const res = await searchAccounts.call(ctx, 'eur');
		expect(res.results).toEqual([{ name: 'EUR', value: '222' }]);
	});

	it('maps watchlists to name/value pairs', async () => {
		const res = await searchWatchlists.call(ctx);
		expect(res.results).toEqual([{ name: 'Favourites', value: 'w1' }]);
	});
});
