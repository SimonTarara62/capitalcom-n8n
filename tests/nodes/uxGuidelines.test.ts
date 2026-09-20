import { CapitalCom } from '../../nodes/CapitalCom/CapitalCom.node';
import { executeWatchlist } from '../../nodes/CapitalCom/actions/watchlist';

type Option = { name: string; value: string };

function operationOptions(resource: string): Option[] {
	const node = new CapitalCom();
	const prop = node.description.properties.find(
		(p) =>
			p.name === 'operation' &&
			(p.displayOptions?.show?.resource as string[] | undefined)?.includes(resource),
	);
	return (prop?.options ?? []) as Option[];
}

describe('UX guidelines: operation naming', () => {
	it.each(['account', 'order', 'position', 'watchlist'])(
		'%s uses "Get Many" rather than "List"',
		(resource) => {
			const options = operationOptions(resource);
			expect(options.length).toBeGreaterThan(0);
			expect(options.map((o) => o.name)).not.toContain('List');
			expect(options.find((o) => o.value === 'list')?.name).toBe('Get Many');
		},
	);

	it.each(['account', 'order', 'position', 'watchlist'])(
		'%s keeps the internal value "list" so existing workflows do not break',
		(resource) => {
			expect(operationOptions(resource).map((o) => o.value)).toContain('list');
		},
	);
});

describe('UX guidelines: delete output', () => {
	it('watchlist delete returns { deleted: true }', async () => {
		const client = { request: jest.fn().mockResolvedValue({}) } as never;
		// executeWatchlist(client, ctx, i) reads the operation from ctx, not from an argument.
		const ctx = {
			getNodeParameter: (name: string) => (name === 'operation' ? 'delete' : 'wl-1'),
			getNode: () => ({ name: 'Capital.com (Unofficial)' }),
		} as never;
		await expect(executeWatchlist(client, ctx, 0)).resolves.toEqual({ deleted: true });
	});

	it('watchlist removeMarket returns { deleted: true }', async () => {
		const client = { request: jest.fn().mockResolvedValue({}) } as never;
		const ctx = {
			getNodeParameter: (name: string) =>
				name === 'operation' ? 'removeMarket' : name === 'epic' ? 'GOLD' : 'wl-1',
			getNode: () => ({ name: 'Capital.com (Unofficial)' }),
		} as never;
		await expect(executeWatchlist(client, ctx, 0)).resolves.toEqual({ deleted: true });
	});
});

import type { INodeProperties } from 'n8n-workflow';

function allProperties(): INodeProperties[] {
	const node = new CapitalCom();
	const out: INodeProperties[] = [];
	const walk = (props: INodeProperties[]) => {
		for (const p of props) {
			out.push(p);
			for (const opt of (p.options ?? []) as INodeProperties[]) {
				if (opt && typeof opt === 'object' && 'name' in opt && 'type' in opt) walk([opt]);
			}
		}
	};
	walk(node.description.properties);
	return out;
}

describe('UX guidelines: field copy', () => {
	it('every placeholder starts with "e.g. "', () => {
		const bad = allProperties()
			.filter((p) => typeof p.placeholder === 'string' && p.placeholder.length > 0)
			.filter((p) => !p.placeholder!.startsWith('e.g. '))
			.map((p) => `${p.name}: ${p.placeholder}`);
		expect(bad).toEqual([]);
	});

	it('every boolean description starts with "Whether "', () => {
		const bad = allProperties()
			.filter((p) => p.type === 'boolean' && typeof p.description === 'string' && p.description)
			.filter((p) => !p.description!.startsWith('Whether '))
			.map((p) => `${p.name}: ${p.description}`);
		expect(bad).toEqual([]);
	});
});
