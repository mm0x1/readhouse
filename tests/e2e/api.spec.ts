/**
 * The HTTP API against a real production build, with the fake AllTalk behind it.
 * Covers the happy paths and the ways a hostile or broken client could misuse each endpoint.
 */

import { expect, test, type APIRequestContext } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';

const LOCKED = 'http://127.0.0.1:4174';

function epub(): Buffer {
	const xhtml = (body: string) =>
		`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head><body>${body}</body></html>`;
	return Buffer.from(
		zipSync({
			mimetype: strToU8('application/epub+zip'),
			'META-INF/container.xml': strToU8(
				'<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>'
			),
			'content.opf':
				strToU8(`<package version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
				<dc:title>Fixture Book</dc:title><dc:creator>Ann Author</dc:creator></metadata>
				<manifest>
					<item id="a" href="a.xhtml" media-type="application/xhtml+xml"/>
					<item id="b" href="b.xhtml" media-type="application/xhtml+xml"/>
					<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
					<item id="cover" href="cover.png" media-type="image/png" properties="cover-image"/>
				</manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>`),
			'nav.xhtml': strToU8(
				xhtml(
					'<nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><ol><li><a href="a.xhtml">First</a></li><li><a href="b.xhtml">Second</a></li></ol></nav>'
				)
			),
			'a.xhtml': strToU8(
				xhtml(
					'<p>The first paragraph is long enough that it has to be split into several segments before it can be spoken by the engine. A second sentence makes quite sure of that, whatever the limit happens to be today.</p><hr/><p>After the break.</p>'
				)
			),
			'b.xhtml': strToU8(xhtml('<p>Second chapter.</p>')),
			'cover.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])
		})
	);
}

async function upload(request: APIRequestContext, body: Buffer, name: string) {
	return request.post('/api/books', {
		data: body,
		headers: { 'content-type': 'application/octet-stream', 'x-filename': encodeURIComponent(name) }
	});
}

test.describe.configure({ mode: 'serial' });

let bookId: string;

test('reports AllTalk status and voices', async ({ request }) => {
	const response = await request.get('/api/status');
	expect(response.ok()).toBe(true);
	const status = await response.json();
	expect(status.alltalk).toMatchObject({ reachable: true, ready: true });
	expect(status.alltalk.voices).toContain('female_01.wav');
});

test('sends security headers', async ({ request }) => {
	const page = await request.get('/');
	const headers = page.headers();
	expect(headers['content-security-policy']).toContain("default-src 'self'");
	expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
	expect(headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-/);
	expect(headers['x-content-type-options']).toBe('nosniff');
	expect(headers['x-frame-options']).toBe('DENY');
	expect(headers['referrer-policy']).toBe('no-referrer');
	expect(headers['access-control-allow-origin']).toBeUndefined();
	const api = await request.get('/api/books');
	expect(api.headers()['cache-control']).toBe('no-store');
});

test('imports an EPUB and serves its chapters and cover', async ({ request }) => {
	const response = await upload(request, epub(), 'fixture.epub');
	expect(response.status()).toBe(201);
	bookId = (await response.json()).id;

	const book = await (await request.get(`/api/books/${bookId}`)).json();
	expect(book).toMatchObject({ title: 'Fixture Book', author: 'Ann Author', chapterCount: 2 });
	expect(book.chapters.map((c: { title: string }) => c.title)).toEqual(['First', 'Second']);

	// With the passage length in the URL the response never changes, so it caches forever.
	const chapter = await request.get(`/api/books/${bookId}/chapters/0?chars=80`);
	expect(chapter.headers()['cache-control']).toContain('immutable');
	const content = await chapter.json();
	expect(content.blocks[1]).toEqual({ type: 'break' });
	expect(content.passageChars).toBe(80);
	// The long first paragraph is several passages; the scene break ends a passage.
	expect(content.passages.length).toBeGreaterThan(2);
	expect(content.passages.at(-1).pieces).toEqual([
		{ block: 2, start: 0, end: 'After the break.'.length }
	]);
	expect((await request.get(`/api/books/${bookId}/chapters/0?chars=5`)).status()).toBe(400);

	const cover = await request.get(`/api/books/${bookId}/cover`);
	expect(cover.headers()['content-type']).toBe('image/png');
	expect(cover.headers()['content-security-policy']).toContain('sandbox');
});

test('imports plain text and AO3 pastes', async ({ request }) => {
	const txt = await upload(
		request,
		Buffer.from('Chapter 1\n\nHello.\n\nChapter 2\n\nBye.'),
		't.txt'
	);
	expect(txt.status()).toBe(201);
	const paste = await request.post('/api/books/paste', {
		data: {
			text: 'Archive of Our Own\nWork Header\nRating:\nChapter 2: Snow\nChapter Text\nIt snowed.\nActions'
		}
	});
	expect(paste.status()).toBe(201);
	const book = await (await request.get(`/api/books/${(await paste.json()).id}`)).json();
	expect(book.title).toBe('Chapter 2: Snow');
});

test('rejects files it cannot read and files that are too large', async ({ request }) => {
	const binary = await upload(request, Buffer.from([0, 1, 2, 0, 0, 3]), 'x.bin');
	expect(binary.status()).toBe(422);
	expect((await binary.json()).message).toContain('EPUB');
	// Over UPLOAD_MAX_MB (1 here): refused by Readhouse itself, with its own message.
	const huge = await upload(request, Buffer.alloc(1.5 * 1024 * 1024, 'a'), 'big.txt');
	expect(huge.status()).toBe(413);
	expect((await huge.json()).message).toContain('the limit is 1 MB');
	// Under it but over adapter-node's 512 KB default: a book this size must get in.
	const big = await upload(
		request,
		Buffer.from('Chapter 1\n\n' + 'The rain kept falling on the roof. '.repeat(20_000)),
		'big.txt'
	);
	expect(big.status()).toBe(201);
	const zip = await upload(request, Buffer.from(zipSync({ 'a.txt': strToU8('x') })), 'x.epub');
	expect(zip.status()).toBe(422);
});

test('blocks cross-site state changes', async ({ request }) => {
	const evil = await request.delete(`/api/books/${bookId}`, {
		headers: { origin: 'http://evil.example' }
	});
	expect(evil.status()).toBe(403);
	const fetchMeta = await request.put(`/api/books/${bookId}/progress`, {
		data: { chapter: 0, block: 0 },
		headers: { 'sec-fetch-site': 'cross-site' }
	});
	expect(fetchMeta.status()).toBe(403);
	expect((await request.get(`/api/books/${bookId}`)).status()).toBe(200);
});

test('validates every input', async ({ request }) => {
	const progress = (data: unknown, headers?: Record<string, string>) =>
		request.put(`/api/books/${bookId}/progress`, { data: data as object, headers });
	expect((await progress({ chapter: 0, block: 2 })).status()).toBe(204);
	expect((await progress({ chapter: 0, block: 99 })).status()).toBe(422);
	expect((await progress({ chapter: -1, block: 0 })).status()).toBe(400);
	expect((await progress({ chapter: 0, block: 0, extra: true })).status()).toBe(400);
	expect((await progress({ chapter: '0', block: 0 })).status()).toBe(400);
	const notJson = await request.put(`/api/books/${bookId}/progress`, {
		data: 'chapter=0',
		headers: { 'content-type': 'text/plain' }
	});
	// SvelteKit's CSRF guard (403) or our JSON check (415): either way, refused.
	expect([403, 415]).toContain(notJson.status());

	expect((await request.get('/api/books/not-a-uuid')).status()).toBe(404);
	expect((await request.get(`/api/books/${bookId}/chapters/01`)).status()).toBe(404);
	expect((await request.get(`/api/books/${bookId}/chapters/9`)).status()).toBe(404);
	expect((await request.get('/api/audio/../../etc/passwd')).status()).toBe(404);

	const voice = await request.put('/api/settings/voice', {
		data: { ...(await (await request.get('/api/settings/voice')).json()), temperature: 5 }
	});
	expect(voice.status()).toBe(400);
});

test('finds words in a book, and only in that book', async ({ request }) => {
	const search = (q: string, id = bookId) =>
		request.get(`/api/books/${id}/search?q=${encodeURIComponent(q)}`);
	const response = await search('after the BRE');
	expect(response.ok()).toBe(true);
	expect(response.headers()['cache-control']).toBe('no-store');
	expect(await response.json()).toEqual({
		hits: [
			{
				chapter: 0,
				block: 2,
				parts: [
					{ text: 'After the break', match: true },
					{ text: '.', match: false }
				]
			}
		],
		total: 1,
		chapters: 1
	});
	expect(await (await search('"; DROP TABLE books; --')).json()).toMatchObject({ total: 0 });
	expect(await (await search('')).json()).toEqual({ hits: [], total: 0, chapters: 0 });
	expect((await search('x'.repeat(201))).status()).toBe(400);
	expect((await search('after', '00000000-0000-4000-8000-000000000000')).status()).toBe(404);
	const other = (await (await request.get('/api/books')).json()).find(
		(b: { id: string }) => b.id !== bookId
	);
	expect(await (await search('after the break', other.id)).json()).toMatchObject({ total: 0 });
});

test('speaks a passage and serves the audio with ranges and caching', async ({ request }) => {
	const speech = await request.post('/api/speech', {
		data: { bookId, chapter: 0, passage: 0, chars: 80, priority: 'now' }
	});
	expect(speech.status()).toBe(200);
	const { audio, passages } = await speech.json();
	expect(passages).toBeGreaterThan(2);
	expect(audio).toMatch(/^\/api\/audio\/[0-9a-f]{64}$/);

	const full = await request.get(audio);
	expect(full.status()).toBe(200);
	expect(full.headers()['cache-control']).toContain('immutable');
	const body = await full.body();
	// AAC when ffmpeg is installed (AUDIO_FORMAT=auto), otherwise AllTalk's WAV.
	if (full.headers()['content-type'] === 'audio/mp4') {
		expect(body.subarray(4, 8).toString()).toBe('ftyp');
	} else {
		expect(full.headers()['content-type']).toBe('audio/wav');
		expect(body.subarray(0, 4).toString()).toBe('RIFF');
	}

	const partial = await request.get(audio, { headers: { range: 'bytes=0-9' } });
	expect(partial.status()).toBe(206);
	expect(partial.headers()['content-range']).toBe(`bytes 0-9/${body.length}`);
	expect((await partial.body()).length).toBe(10);

	const suffix = await request.get(audio, { headers: { range: 'bytes=-4' } });
	expect((await suffix.body()).equals(body.subarray(-4))).toBe(true);

	const unsatisfiable = await request.get(audio, { headers: { range: `bytes=${body.length}-` } });
	expect(unsatisfiable.status()).toBe(416);

	const notModified = await request.get(audio, {
		headers: { 'if-none-match': full.headers()['etag'] }
	});
	expect(notModified.status()).toBe(304);
});

test('splits and speaks text from KOReader, and serves it as raw PCM', async ({ request }) => {
	const text = 'The rain kept on all evening. '.repeat(20);
	const split = await request.post('/api/speak/passages', { data: { text } });
	expect(split.status()).toBe(200);
	const { passages } = await split.json();
	expect(passages.length).toBeGreaterThan(2);
	expect(passages.join(' ')).toBe(text.trim());

	const speak = await request.post('/api/speak', {
		data: { text: passages[0], priority: 'now' }
	});
	expect(speak.status()).toBe(200);
	const { audio } = await speak.json();
	expect(audio).toMatch(/^\/api\/audio\/[0-9a-f]{64}$/);
	// The same text again comes from the cache, at the same address.
	const again = await request.post('/api/speak', { data: { text: passages[0], priority: 'soon' } });
	expect((await again.json()).audio).toBe(audio);

	const pcm = await request.get(`${audio}/pcm`, { headers: { 'accept-encoding': 'gzip, br' } });
	// Decoding needs ffmpeg, like AAC compression: stored audio is AAC exactly when it is there
	// (AUDIO_FORMAT=auto). Without it the Kindle gets a clear refusal instead of noise.
	const stored = await request.get(audio);
	if (stored.headers()['content-type'] !== 'audio/mp4') {
		expect(pcm.status()).toBe(501);
		expect((await pcm.json()).message).toContain('ffmpeg');
		return;
	}
	expect(pcm.status()).toBe(200);
	expect(pcm.headers()['x-pcm-format']).toBe('s16le;rate=22050;channels=1');
	expect(pcm.headers()['content-encoding']).toBeUndefined();
	const samples = await pcm.body();
	expect(samples.length).toBeGreaterThan(0);
	expect(samples.length % 2).toBe(0);
	expect(samples.subarray(0, 4).toString()).not.toBe('RIFF');
});

test('refuses KOReader text it should not speak', async ({ request }) => {
	const speak = (data: object) => request.post('/api/speak', { data });
	expect((await speak({ text: '  \n ', priority: 'now' })).status()).toBe(422);
	expect((await speak({ text: 'word '.repeat(300), priority: 'now' })).status()).toBe(422);
	expect((await speak({ text: 'x'.repeat(5000), priority: 'now' })).status()).toBe(400);
	expect((await speak({ text: 'Hello.', priority: 'later' })).status()).toBe(400);
	expect((await speak({ text: 'Hello.', priority: 'now', voice: 'x.wav' })).status()).toBe(400);

	const split = (data: object) => request.post('/api/speak/passages', { data });
	expect((await split({ text: 'a'.repeat(20_001) })).status()).toBe(400);
	expect((await split({ text: 42 })).status()).toBe(400);
	expect((await split({ text: '' })).status()).toBe(200);

	expect((await request.get(`/api/audio/${'0'.repeat(64)}/pcm`)).status()).toBe(404);
});

test('compresses pages and JSON, never audio', async ({ request }) => {
	const page = await request.get(`/book/${bookId}`, { headers: { 'accept-encoding': 'gzip, br' } });
	expect(page.headers()['content-encoding']).toBe('br');
	expect(page.headers()['vary']).toContain('Accept-Encoding');
	expect(await page.text()).toContain('<!doctype html>');

	const long = await request.post('/api/books/paste', {
		data: { text: 'The rain kept on all evening. '.repeat(200) }
	});
	const chapter = await request.get(`/api/books/${(await long.json()).id}/chapters/0?chars=125`, {
		headers: { 'accept-encoding': 'gzip' }
	});
	expect(chapter.headers()['content-encoding']).toBe('gzip');
	expect((await chapter.json()).passages.length).toBeGreaterThan(10);

	const speech = await request.post('/api/speech', {
		data: { bookId, chapter: 0, passage: 0, chars: 80, priority: 'now' }
	});
	const { audio } = await speech.json();
	const sound = await request.get(audio, { headers: { 'accept-encoding': 'gzip, br' } });
	expect(sound.headers()['content-encoding']).toBeUndefined();
});

test('refuses to speak what is not there', async ({ request }) => {
	const speak = (data: object) => request.post('/api/speech', { data });
	const base = { bookId, chapter: 0, passage: 0, chars: 80, priority: 'soon' };
	expect((await speak({ ...base, passage: 50 })).status()).toBe(422);
	expect((await speak({ ...base, chars: 10 })).status()).toBe(400);
	expect((await speak({ ...base, chapter: 7 })).status()).toBe(404);
	expect((await speak({ ...base, priority: 'urgent' })).status()).toBe(400);
	expect((await speak({ ...base, text: 'arbitrary text' })).status()).toBe(400);
});

// The reader always sends JSON, even without a body: SvelteKit's own CSRF guard compares full
// origins (scheme included) for body-less requests, which fails behind an HTTPS proxy such as
// `tailscale serve`. Our hook checks those requests by host instead.
const JSON_HEADERS = { 'content-type': 'application/json' };

test('deletes a book completely', async ({ request }) => {
	expect((await request.delete(`/api/books/${bookId}`, { headers: JSON_HEADERS })).status()).toBe(
		204
	);
	expect((await request.get(`/api/books/${bookId}`)).status()).toBe(404);
	expect((await request.get(`/api/books/${bookId}/chapters/0`)).status()).toBe(404);
	expect((await request.get(`/api/books/${bookId}/cover`)).status()).toBe(404);
	expect((await request.delete(`/api/books/${bookId}`, { headers: JSON_HEADERS })).status()).toBe(
		404
	);
});

test('accepts same-host requests through an HTTPS proxy', async ({ request }) => {
	const response = await request.post('/api/speech/stop', {
		headers: { ...JSON_HEADERS, origin: 'https://127.0.0.1:4173' }
	});
	expect(response.status()).toBe(204);
});

test('the reference sheet is not served unless asked for', async ({ request }) => {
	expect((await request.get('/reference')).status()).toBe(404);
});

test('prepare checks the book and the action', async ({ request }) => {
	const book = await upload(request, Buffer.from('Chapter 1\n\nShort.'), 'p.txt');
	const { id } = await book.json();
	const prepare = (target: string, action: unknown) =>
		request.post(`/api/books/${target}/prepare`, { data: { action } });
	expect((await prepare(id, 'explode')).status()).toBe(400);
	expect((await prepare('00000000-0000-4000-8000-000000000000', 'start')).status()).toBe(404);
	const status = await request.get(`/api/books/${id}/prepare`);
	expect(status.status()).toBe(200);
	expect(await status.json()).toBeNull();
});

test.describe('with a passcode', () => {
	test('locks the API and pages until unlocked', async ({ playwright }) => {
		const request = await playwright.request.newContext({ baseURL: LOCKED });
		expect((await request.get('/api/books')).status()).toBe(401);
		const speak = await request.post('/api/speak', {
			data: { text: 'Hello.', priority: 'now' },
			headers: { origin: LOCKED }
		});
		expect(speak.status()).toBe(401);
		const page = await request.get('/', { maxRedirects: 0 });
		expect(page.status()).toBe(303);
		expect(page.headers()['location']).toBe('/unlock?next=%2F');

		const wrong = await request.post('/api/unlock', { data: { passcode: 'nope' } });
		expect(wrong.status()).toBe(401);
		const right = await request.post('/api/unlock', {
			data: { passcode: 'correct horse' },
			headers: { origin: LOCKED }
		});
		expect(right.status()).toBe(204);
		const cookie = right.headers()['set-cookie'];
		expect(cookie).toContain('HttpOnly');
		expect(cookie).toContain('SameSite=Strict');
		// Over plain http a Secure cookie would be dropped (Safari, and Chrome on a LAN address).
		expect(cookie).not.toContain('Secure');
		expect((await request.get('/api/books')).status()).toBe(200);

		await request.post('/api/lock', { headers: { ...JSON_HEADERS, origin: LOCKED } });
		expect((await request.get('/api/books')).status()).toBe(401);
		await request.dispose();
	});

	test('rejects forged and expired session cookies', async ({ playwright }) => {
		const forged = await playwright.request.newContext({
			baseURL: LOCKED,
			extraHTTPHeaders: { cookie: `readhouse_session=${Date.now()}.AAAA` }
		});
		expect((await forged.get('/api/books')).status()).toBe(401);
		await forged.dispose();
	});
});
