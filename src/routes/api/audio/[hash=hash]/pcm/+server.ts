import { error } from '@sveltejs/kit';
import { app } from '#lib/server/app.js';
import { PCM_RATE } from '#lib/server/transcode.js';
import type { RequestHandler } from './$types';

/**
 * Cached audio decoded to raw PCM (signed 16-bit little-endian, mono, `PCM_RATE` Hz, no
 * header) for the KOReader plugin: a Kindle's GStreamer has no decoders. Streamed while ffmpeg
 * decodes, so playback can start at once; nothing is stored.
 */
export const GET: RequestHandler = async ({ params, request }) => {
	const { speech, pcm } = app();
	const audio = speech.cached(params.hash);
	if (!audio) error(404, 'No such audio.');
	const decoder = await pcm;
	if (!decoder) error(501, 'Playing on a Kindle needs ffmpeg on the Readhouse computer.');
	return new Response(decoder.decode(audio.path, request.signal), {
		headers: {
			'content-type': 'application/octet-stream',
			'x-pcm-format': `s16le;rate=${PCM_RATE};channels=1`,
			'cache-control': 'no-store'
		}
	});
};
