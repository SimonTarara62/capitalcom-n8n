import type { IExecuteFunctions, INodeProperties } from 'n8n-workflow';

export interface SafetySettings {
	dryRun: boolean;
	/** 0 = no limit. */
	maxSize: number;
	/** empty = unrestricted. */
	allowedEpics: string[];
}

/** Node properties for the safety controls, shown on Open Position / Create Order. */
export function safetyFields(operations: string[]): INodeProperties[] {
	const show = { resource: ['position', 'order'], operation: operations };
	return [
		{
			displayName: 'Dry Run',
			name: 'dryRun',
			type: 'boolean',
			default: true,
			displayOptions: { show },
			description:
				'Whether to validate and return the request WITHOUT sending it to the broker. Defaults ON for safety — turn off to place real orders.',
		},
		{
			displayName: 'Max Size Guard',
			name: 'maxSize',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: { show },
			description: 'Reject the order if size exceeds this. 0 disables the guard.',
		},
		{
			displayName: 'Allowed EPICs',
			name: 'allowedEpics',
			type: 'string',
			default: '',
			displayOptions: { show },
			description: 'Comma-separated EPIC allow-list. Empty allows any EPIC.',
		},
	];
}

export function readSafety(ctx: IExecuteFunctions, i: number): SafetySettings {
	const dryRun = ctx.getNodeParameter('dryRun', i, true) as boolean;
	const maxSize = ctx.getNodeParameter('maxSize', i, 0) as number;
	const allowedEpics = (ctx.getNodeParameter('allowedEpics', i, '') as string)
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return { dryRun, maxSize, allowedEpics };
}

export function enforceSafety(safety: SafetySettings, target: { epic: string; size: number }): void {
	if (safety.maxSize > 0 && target.size > safety.maxSize) {
		throw new Error(`Size ${target.size} exceeds the Max Size Guard of ${safety.maxSize}`);
	}
	if (safety.allowedEpics.length > 0 && !safety.allowedEpics.includes(target.epic)) {
		throw new Error(`EPIC ${target.epic} is not in the Allowed EPICs list`);
	}
}
