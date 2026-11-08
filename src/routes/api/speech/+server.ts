import { error, json } from '@sveltejs/kit';
import * as v from 'valibot';
import { app } from '#lib/server/app.js';
import { readJson } from '#lib/server/http.js';
import { speechFailure } from '#lib/server/speech-errors.js';
import type { SpeechResult } from '#lib/speech.js';
import { PASSAGE_MAX_CHARS, PASSAGE_MIN_CHARS, passageText } from '#lib/text/passages.js';
import type { RequestHandler } from './$types';

const index = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(10_000_000));
const SpeechSchema = v.strictObject({
	bookId: v.pipe(v.string(), v.uuid()),
	chapter: index,
	passage: index,
	/** The passage length the reader's passages were built with. */
	chars: v.pipe(
		v.number(),
		v.integer(),
		v.minValue(PASSAGE_MIN_CHARS),
		v.maxValue(PASSAGE_MAX_CHARS)
	),
	priority: v.picklist(['now', 'soon'])
});

/**
 * Makes sure the audio for one passage exists, generating it if needed. The text comes from
 * the library, never from the request.
 */
export const POST: RequestHandler = async ({ request }) => {
	const input = await readJson(request, SpeechSchema, 1024);
	const { library, settings, speech, preparer } = app();
	// A prepared book is read with what it was prepared with: no need to ask AllTalk.
	const prepared = preparer.voice(input.bookId);

	const chapter = library.chapter(input.bookId, input.chapter, input.chars);
	if (!chapter) error(404, 'No such chapter.');
	const passage = chapter.passages[input.passage];
	if (!passage) error(422, 'Nothing to read there.');
	const text = passageText(chapter.blocks, passage);

	try {
		const hash = await speech.speak(
			text,
			prepared?.settings ?? settings.voice(),
			input.priority,
			request.signal,
			prepared?.snapshot ?? null
		);
		return json({
			audio: `/api/audio/${hash}`,
			passages: chapter.passages.length
		} satisfies SpeechResult);
	} catch (cause) {
		speechFailure(cause);
	}
};
