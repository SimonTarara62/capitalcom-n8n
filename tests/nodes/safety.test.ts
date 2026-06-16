import { enforceSafety, readSafety, type SafetySettings } from '../../nodes/CapitalCom/safety';
import { fakeExecute } from './helpers';

it('readSafety parses the three node params with defaults', () => {
	const ctx = fakeExecute({ params: { dryRun: true, maxSize: 5, allowedEpics: 'GOLD, SILVER' } });
	expect(readSafety(ctx, 0)).toEqual({ dryRun: true, maxSize: 5, allowedEpics: ['GOLD', 'SILVER'] });
});

it('readSafety defaults to off when params are absent', () => {
	const ctx = fakeExecute({ params: {} });
	expect(readSafety(ctx, 0)).toEqual({ dryRun: false, maxSize: 0, allowedEpics: [] });
});

it('enforceSafety throws when size exceeds the max-size guard', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 2, allowedEpics: [] };
	expect(() => enforceSafety(s, { epic: 'GOLD', size: 3 })).toThrow(/exceeds the max size guard/i);
});

it('enforceSafety throws when the epic is not allow-listed', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 0, allowedEpics: ['SILVER'] };
	expect(() => enforceSafety(s, { epic: 'GOLD', size: 1 })).toThrow(/not in the allowed epics/i);
});

it('enforceSafety passes when within limits / unrestricted', () => {
	const s: SafetySettings = { dryRun: false, maxSize: 0, allowedEpics: [] };
	expect(() => enforceSafety(s, { epic: 'GOLD', size: 99 })).not.toThrow();
});
