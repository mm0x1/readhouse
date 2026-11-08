import { json } from '@sveltejs/kit';
import * as v from 'valibot';
import { app } from '#lib/server/app.js';
import { readJson } from '#lib/server/http.js';
import { splitIntoSegments } from '#lib/text/segments.js';
import type { RequestHandler } from './$types';

/** A few pages of a book at a time. */
const MAX_TEXT_CHARS = 20_000;
const PassagesSchema = v.strictObject({
	text: v.pipe(v.string(), v.maxLength(MAX_TEXT_CHARS))
});

/**
 * Splits text into passages with the reader's passage length, so the KOReader plugin speaks in
 * the same pieces as the phone and never has to split sentences itself.
 */
export const POST: RequestHandler = async ({ request }) => {
	const { text } = await readJson(request, PassagesSchema, MAX_TEXT_CHARS * 4 + 1024);
	const voice = app().settings.voice();
	return json({ passages: splitIntoSegments(text, voice.passageChars, voice.language) });
};
