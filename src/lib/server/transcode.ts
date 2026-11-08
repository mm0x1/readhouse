/**
 * Optional audio compression with ffmpeg: AllTalk's WAV becomes mono AAC (M4A) at 48 kbps,
 * about eight times smaller, which matters for phones on mobile data and for audio saved for
 * offline listening. AAC in M4A plays in every current browser, Safari included.
 *
 * It also decodes cached audio to raw PCM for the KOReader plugin, whose Kindle can't decode
 * anything itself.
 *
 * ffmpeg is spawned with an argument list (no shell), on file paths Readhouse chose itself.
 */

import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';

const PROBE_TIMEOUT_MS = 5_000;
const TRANSCODE_TIMEOUT_MS = 120_000;

export interface Transcoder {
	readonly mime: string;
	transcode(input: string, output: string): Promise<void>;
}

function run(binary: string, args: string[], timeout: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(binary, args, {
			stdio: ['ignore', 'ignore', 'pipe'],
			timeout,
			killSignal: 'SIGKILL'
		});
		let stderr = '';
		child.stderr.on('data', (chunk: Buffer) => {
			stderr = (stderr + chunk.toString()).slice(-2000);
		});
		child.on('error', reject);
		child.on('close', (code, signal) => {
			if (code === 0) resolve();
			else reject(new Error(`${binary} failed (${signal ?? code}): ${stderr.trim().slice(-500)}`));
		});
	});
}

class FfmpegAac implements Transcoder {
	readonly mime = 'audio/mp4';

	constructor(private readonly binary: string) {}

	transcode(input: string, output: string): Promise<void> {
		return run(
			this.binary,
			[
				'-hide_banner',
				'-loglevel',
				'error',
				'-nostdin',
				'-y',
				'-i',
				input,
				'-vn',
				'-ac',
				'1',
				'-c:a',
				'aac',
				'-b:a',
				'48k',
				'-movflags',
				'+faststart',
				'-f',
				'mp4',
				output
			],
			TRANSCODE_TIMEOUT_MS
		);
	}
}

/**
 * The raw audio a KOReader Kindle can play: its GStreamer has no decoders, so it gets signed
 * 16-bit little-endian mono samples at this rate, with no header.
 */
export const PCM_RATE = 22050;

export interface PcmDecoder {
	/** Streams `input` decoded to raw PCM; aborting `signal` stops ffmpeg. */
	decode(input: string, signal: AbortSignal): ReadableStream<Uint8Array>;
}

class FfmpegPcm implements PcmDecoder {
	constructor(private readonly binary: string) {}

	decode(input: string, signal: AbortSignal): ReadableStream<Uint8Array> {
		const child = spawn(
			this.binary,
			[
				'-hide_banner',
				'-loglevel',
				'error',
				'-nostdin',
				'-i',
				input,
				'-vn',
				'-ac',
				'1',
				'-ar',
				String(PCM_RATE),
				'-f',
				's16le',
				'-'
			],
			{
				stdio: ['ignore', 'pipe', 'ignore'],
				timeout: TRANSCODE_TIMEOUT_MS,
				killSignal: 'SIGKILL',
				signal
			}
		);
		// Aborting (the client hung up) reports an AbortError here; the stream just ends.
		child.on('error', () => {});
		return Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>;
	}
}

async function hasFfmpeg(binary: string): Promise<boolean> {
	try {
		await run(binary, ['-hide_banner', '-loglevel', 'error', '-version'], PROBE_TIMEOUT_MS);
		return true;
	} catch {
		return false;
	}
}

/** An AAC transcoder if `mode` allows it and ffmpeg is installed, otherwise null. */
export async function findTranscoder(
	mode: 'auto' | 'original',
	binary = 'ffmpeg'
): Promise<Transcoder | null> {
	if (mode === 'original') return null;
	return (await hasFfmpeg(binary)) ? new FfmpegAac(binary) : null;
}

/** A PCM decoder if ffmpeg is installed, otherwise null. Independent of `AUDIO_FORMAT`. */
export async function findPcmDecoder(binary = 'ffmpeg'): Promise<PcmDecoder | null> {
	return (await hasFfmpeg(binary)) ? new FfmpegPcm(binary) : null;
}
