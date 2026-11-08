/**
 * The server's long-lived services, created on first use so that building the app never
 * opens the database or contacts AllTalk.
 */

import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
	ACCESS_PASSCODE,
	ALLTALK_URL,
	AUDIO_CACHE_MAX_MB,
	AUDIO_FORMAT,
	DATA_DIR,
	UPLOAD_MAX_MB
} from '$app/env/private';
import { Access } from './access.js';
import { AllTalk, type EngineInfo } from './alltalk.js';
import { Database } from './db.js';
import { Library } from './library.js';
import { SettingsStore } from './settings.js';
import { Preparer } from './prepare.js';
import { Speech } from './speech.js';
import { findPcmDecoder, findTranscoder, type PcmDecoder } from './transcode.js';

const ENGINE_INFO_TTL_MS = 30_000;

export interface Config {
	dataDir: string;
	uploadMaxBytes: number;
}

export interface Services {
	config: Config;
	db: Database;
	library: Library;
	settings: SettingsStore;
	alltalk: AllTalk;
	speech: Speech;
	/** Whole books prepared ahead with the settings of that moment. */
	preparer: Preparer;
	access: Access;
	/** Decodes cached audio for the KOReader plugin; null without ffmpeg. */
	pcm: Promise<PcmDecoder | null>;
	/** AllTalk's engine and model, cached briefly; they key the audio cache. */
	engineInfo(): Promise<EngineInfo>;
	/** Drops the cached engine info, after Readhouse changed AllTalk's model or modes. */
	forgetEngine(): void;
}

export function createServices(options: {
	dataDir: string;
	alltalkUrl: string;
	uploadMaxBytes: number;
	audioCacheMaxBytes: number;
	audioFormat: 'auto' | 'original';
	passcode: string | undefined;
	fetch?: typeof fetch;
}): Services {
	const dataDir = resolve(options.dataDir);
	mkdirSync(dataDir, { recursive: true });
	const db = new Database(join(dataDir, 'readhouse.db'));
	const alltalk = new AllTalk(options.alltalkUrl, options.fetch);

	let engineCache: { at: number; value: Promise<EngineInfo> } | null = null;
	const engineInfo = () => {
		if (!engineCache || Date.now() - engineCache.at > ENGINE_INFO_TTL_MS) {
			const value = alltalk.engine();
			engineCache = { at: Date.now(), value };
			value.catch(() => {
				if (engineCache?.value === value) engineCache = null;
			});
		}
		return engineCache.value;
	};

	const library = new Library(db);
	const speech = new Speech({
		db,
		alltalk,
		dir: join(dataDir, 'audio'),
		maxCacheBytes: options.audioCacheMaxBytes,
		engineInfo,
		transcoder: findTranscoder(options.audioFormat)
	});

	return {
		config: {
			dataDir,
			uploadMaxBytes: options.uploadMaxBytes
		},
		db,
		library,
		settings: new SettingsStore(db),
		alltalk,
		speech,
		preparer: new Preparer(db, library, speech),
		access: new Access(options.passcode, dataDir),
		pcm: findPcmDecoder(),
		engineInfo,
		forgetEngine: () => (engineCache = null)
	};
}

let services: Services | undefined;

export function app(): Services {
	if (!services) {
		// adapter-node emits this once in-flight requests have finished after SIGTERM or SIGINT:
		// close the database so its write-ahead log is folded in and nothing is left half done.
		process.once('sveltekit:shutdown', () => {
			services?.db.close();
			services = undefined;
		});
	}
	services ??= createServices({
		dataDir: DATA_DIR,
		alltalkUrl: ALLTALK_URL,
		uploadMaxBytes: UPLOAD_MAX_MB * 1024 * 1024,
		audioCacheMaxBytes: AUDIO_CACHE_MAX_MB * 1024 * 1024,
		audioFormat: AUDIO_FORMAT,
		passcode: ACCESS_PASSCODE
	});
	return services;
}
