import { NodeOperationError, type INode } from 'n8n-workflow';
import { enforceSafety, readSafety, type SafetySettings } from '../../nodes/CapitalCom/safety';
import { fakeExecute } from './helpers';

const fakeNode = {
	name: 'Capital.com (Unofficial)',
	type: 'n8n-nodes-capitalcom.capitalCom',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
} as INode;

it('readSafety parses the three node params with defaults', () => {
	const ctx = fakeExecute({ params: { dryRun: true, maxSize: 5, allowedEpics: 'GOLD, SILVER' } });
	expect(readSafety(ctx, 0)).toEqual({ dryRun: true, maxSize: 5, allowedEpics: ['GOLD', 'SILVER'] });
});

it('readSafety defaults Dry Run ON and the other guards off when params are absent', () => {
	const ctx = fakeExecute({ params: {} });
	expect(readSafety(ctx, 0)).toEqual({ dryRun: true, maxSize: 0, allowedEpics: [] });
});

it('readSafety respects an explicit Dry Run off', () => {
	const ctx = fakeExecute({ params: { dryRun: false } });
	expect(readSafety(ctx, 0).dryRun).toBe(false);
});

it('enforceSafety throws when size exceeds the max-size guard', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 2, allowedEpics: [] };
	expect(() => enforceSafety(fakeNode, s, { epic: 'GOLD', size: 3 })).toThrow(
		/above the max size guard/i,
	);
});

it('enforceSafety raises the max-size guard as a NodeOperationError, not a bare Error', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 2, allowedEpics: [] };
	try {
		enforceSafety(fakeNode, s, { epic: 'GOLD', size: 3 });
		throw new Error('expected enforceSafety to throw');
	} catch (error) {
		expect(error).toBeInstanceOf(NodeOperationError);
	}
});

it('enforceSafety throws when the epic is not allow-listed', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 0, allowedEpics: ['SILVER'] };
	expect(() => enforceSafety(fakeNode, s, { epic: 'GOLD', size: 1 })).toThrow(
		/not in the allowed epics/i,
	);
});

it('enforceSafety raises the allowed-EPICs guard as a NodeOperationError, not a bare Error', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 0, allowedEpics: ['SILVER'] };
	try {
		enforceSafety(fakeNode, s, { epic: 'GOLD', size: 1 });
		throw new Error('expected enforceSafety to throw');
	} catch (error) {
		expect(error).toBeInstanceOf(NodeOperationError);
	}
});

it('enforceSafety passes when within limits / unrestricted', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 0, allowedEpics: [] };
	expect(() => enforceSafety(fakeNode, s, { epic: 'GOLD', size: 99 })).not.toThrow();
});
