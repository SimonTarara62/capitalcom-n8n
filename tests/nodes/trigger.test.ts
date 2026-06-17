import { CapitalComTrigger } from '../../nodes/CapitalComTrigger/CapitalComTrigger.node';

it('marks the trigger Unofficial in its name (ending with "Trigger")', () => {
	const node = new CapitalComTrigger();
	expect(node.description.displayName).toBe('Capital.com (Unofficial) Trigger');
	expect(node.description.displayName.endsWith('Trigger')).toBe(true);
	expect(node.description.defaults.name).toBe('Capital.com (Unofficial) Trigger');
});

it('exposes an unofficial notice and a docs link', () => {
	const node = new CapitalComTrigger();
	const notice = node.description.properties.find((p) => p.type === 'notice');
	expect(notice).toBeDefined();
	expect(notice!.displayName.toLowerCase()).toContain('unofficial');
	expect(notice!.displayName.toLowerCase()).toContain('not affiliated');
	expect(node.description.documentationUrl).toContain('github.com/SimonTarara62/capitalcom-n8n');
});

it('still exposes the Prices and Candles streams', () => {
	const node = new CapitalComTrigger();
	const stream = node.description.properties.find((p) => p.name === 'stream');
	const values = (stream?.options ?? []).map((o) => (o as { value: string }).value).sort();
	expect(values).toEqual(['candles', 'prices']);
});
