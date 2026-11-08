/** How speech failures become HTTP errors, for every endpoint that speaks. */

import { error } from '@sveltejs/kit';
import { AllTalkError } from './alltalk.js';
import { ModelChanged, SpeechCancelled } from './speech.js';

export function speechFailure(cause: unknown): never {
	if (cause instanceof SpeechCancelled) error(409, 'Cancelled.');
	if (cause instanceof ModelChanged) error(409, cause.message);
	if (cause instanceof AllTalkError) {
		error(cause.kind === 'unreachable' ? 503 : 502, cause.message);
	}
	throw cause;
}
