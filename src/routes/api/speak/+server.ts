import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { app } from '#lib/server/app.js';
import { readJson } from '#lib/server/http.js';
import { speechFailure } from '#lib/server/speech-errors.js';
import { collapseWhitespace } from '#lib/text/normalize.js';
import { PASSAGE_MAX_CHARS } from '#lib/text/passages.js';
import type { RequestHandler } from './$types';

const SpeakSchema = v.strictObject({
	/** One passage, as `/api/speak/passages` split it. */
	text: v.pipe(v.string(), v.maxLength(PASSAGE_MAX_CHARS * 2)),
	priority: v.picklist(['now', 'soon'])
});

/**
 * Speaks text the client sends: for the KOReader plugin, whose books live on the e-reader and
 * not in the library. Same queue, cache and voice settings as the reader's `/api/speech`.
 * Answers once the audio is ready; the URL serves it as stored, `<url>/pcm` as raw PCM.
 */
export const POST: RequestHandler = async ({ request }) => {
	const input = await readJson(request, SpeakSchema, 16 * 1024);
	const text = collapseWhitespace(input.text);
	if (!text) error(422, 'Nothing to read.');
	if (text.length > PASSAGE_MAX_CHARS) error(422, 'Too long for one passage.');

	const { settings, speech } = app();
	try {
		const hash = await speech.speak(text, settings.voice(), input.priority, request.signal);
		return json({ audio: `/api/audio/${hash}` });
	} catch (cause) {
		speechFailure(cause);
	}
};
