# Backlog

The upgrade from "AllTalk Reader" to **Readhouse**, a Motherhouse app. Nothing here is started
unless marked.

**Status (2026-11-02):** an open-source project with no deadline. The original
[demo-critical path](#demo-critical-path) is done and every section of the device checklist has
passed on real phones (including https over Tailscale). Work now is development and polish.

**How the app is used:** it runs on a computer (next to the AllTalk server) and is opened on a
phone over the LAN or Tailscale. Mobile is the primary target, desktop has to be good too, and
every decision below assumes the page is served from another machine, often over plain http.

## How we work (read first, every session)

- **Work through this backlog** in the demo-critical-path order. Only stop to ask the user
  when an answer is genuinely theirs to give; otherwise use best judgement and note the
  decision here.
- **Track progress here.** Tick items when done and verified; mark started items with
  *(in progress)* and a short note of where things stand. The [Progress log](#progress-log)
  at the bottom gets one line per work session.
- **Verify every change.** Run the check gate (types, lint, unit, e2e) and look the diff over
  before committing. Never claim something works without having run it.
- **After every change, review security and performance.** Ask: what input does this trust?
  what does it expose on the network? what does it cost on a mid-range phone (bundle size,
  main-thread work, memory, battery, requests)? Both are first-class requirements, not
  polish. See the Security and Performance sections.
- **Commit and push periodically** to the `readhouse` branch, in small, reviewed commits.
- **Modern web platform, but only what modern devices support.** Prefer native platform
  features (View Transitions, popover, `<dialog>`, container queries, `:has()`, anchor
  positioning, `content-visibility`, scroll-driven animations, Media Session, OPFS) when they
  work in current iOS Safari *and* Android Chrome, with graceful fallback otherwise.
  Experimental APIs (e.g. HTML-in-canvas, still behind a flag/origin trial and absent from
  Safari) are out until they ship broadly.
- **UI design options as artifacts.** For any UI design decision, make side-by-side artifact
  variants for the user to compare before building it into the app.
- **Core before UI design.** Rewrite the app's core (server, storage, parsing, AllTalk
  pipeline, tests) first; the visual design waits, because the user keeps adding inspiration
  to `design-inspo.md`.
- **Design inspiration lives in `design-inspo.md`** (repo root, plus images in
  `design-inspo/`), excluded via `.git/info/exclude` and never committed. Re-read it before
  any UI design work; it changes between sessions.
- **UI work method** (from the inspiration notes): present interfaces at the noun/verb level
  (book, chapter, passage, voice; read, listen, resume, import) and justify every container
  before drawing it; try to break what we build (worst-case data); model states explicitly
  (loading, success, error, offline, empty); make before/after screenshots; offer variants.

## Decisions

- [x] **Name: Readhouse.** Joins Ditherhouse in the Motherhouse suite. Rename everywhere:
  wordmark, `package.json` name (still `tanstack-start-example-basic-react-query`), page
  titles, PWA manifest, README, docs, GitHub repo (`alltalk_reader` → `readhouse`). Check
  domain/handle availability.
  *Repo renamed (2026-11-03):* https://github.com/mm0x1/readhouse; the old address redirects.
- [x] **Stack: SvelteKit full-stack (Svelte 5, TypeScript).** Chosen from scratch as the best
  fit for this app on its own: one language, one project, one test toolchain, types shared
  between UI and server without codegen, and the strongest library ecosystem for EPUB/HTML
  work. Replaces TanStack Start + React + Zustand + XState and the separate Express server.
  - *One origin, one port.* The SvelteKit server (`adapter-node`, Node LTS pinned in
    `mise.toml`) serves the UI, stores the library and proxies AllTalk, so there's no CORS or
    mixed content, and `tailscale serve` (HTTPS) is a one-liner.
  - *Client-rendered reader.* SSR off (or prerendered shell) for the app routes; it's a
    personal tool behind the network, not a public site.
  - *Storage:* SQLite (books, chapters, progress, settings) with generated audio as files on
    disk next to it; no base64 in JSON.
  - *Offline:* SvelteKit service worker + installable PWA.
  - *Layout:* server-only logic in `$lib/server`, shared logic in `$lib` as plain TS modules
    tested with Vitest; routes stay thin.
  - Rewrite onto the new design system rather than port the old components; carry over the
    logic worth keeping (text processing, AO3 parser, Safari audio handling, export format).
- [x] **Dithering: yes, as an accent.** A few dithered touches give Readhouse its
  Motherhouse character; the text and controls stay clean. Rules:
  - *Restraint.* At most one dithered element per screen, and never behind body text or
    over controls. Reading comfort beats style.
  - *Ahead of time, committed.* Assets are made with Ditherhouse (app or `crates/cli`) and
    committed to the repo as static files; no runtime dithering and no wasm. Keep the source
    images and the Ditherhouse settings next to the outputs so assets can be regenerated
    when tokens change.
  - *Where it fits:* the wordmark/splash, cover placeholders for books without a cover,
    empty states (empty library, no chapter selected), and possibly the playback progress
    track. Not on the reading surface.
  - Light on phones (small PNG/WebP, lossless so the pattern isn't smeared) and right in
    every theme (one asset per theme where needed).
  Whether dithering becomes a suite-wide house style is still open.
- [x] **AllTalk is third-party (user, 2026-10-31; clarified 2026-11-01).** Users install and
  set AllTalk up themselves; Readhouse gives no support for its setup (ports, interfaces,
  exposure, config files) and only documents which values to enter in Readhouse
  (`ALLTALK_URL`). But Readhouse **does** let users choose what they hear from inside the app:
  model (XTTS and APITTS models are switched often), voices, voice preview, low VRAM mode and
  similar. Speed stays client side (playback rate).
- [x] **AllTalk: v2, the `alltalkbeta` branch.**
  (https://github.com/erew123/alltalk_tts/tree/alltalkbeta), not `main` (v1, last updated
  2025-03). `../alltalk_tts` is already on `alltalkbeta` and up to date with the remote
  (last commit 2026-01-09), with uncommitted local edits to `atsetup.sh` and
  `confignew.json`. **Decided (2026-10-31): keep the local edits** in `../alltalk_tts`.
- [x] **Visual direction: A, Engraved.** Picked from https://claude.ai/artifact/M9ED11TvLfXVz5XKGhX32P.
  Ink-blue on pale paper, bone on navy in dark, a sepia engraving as the third theme;
  EB Garamond throughout (self-hosted); a ruled double frame around every page; drop caps;
  one dithered band per chapter opening with its roman numeral in a cartouche (Bayer 8×8
  crosshatch at 1×, the user's preference over blue-noise stipple; Floyd–Steinberg is the
  alternative); the sentence
  being spoken in reverse ink. Decided while building it: prose is ragged right (with
  hyphenation) on phones and justified only from 40rem up, since a ~35-character justified
  line opens rivers; a paused passage is tinted, reverse ink only while the voice reads.

## Demo-critical path

Original order of work (done; there is no presentation, the project is open source):

1. Scaffold the SvelteKit app (tooling, check gate, SQLite, AllTalk proxy).
2. Design system foundation (tokens + core components).
3. New reading UI on mobile, then desktop.
4. EPUB/TXT import with chapter picker.
5. Feature audit fixes and trims, so everything still on screen works.
6. Stability tests over the core flows.
7. Security basics for LAN/Tailscale exposure.

## Design system

- [x] **One design system, always used.** Every color, font, size, spacing step, radius,
  shadow, duration and z-index is a token; every UI element is a design-system component. No
  ad-hoc components, values or one-off Tailwind classes, so a change in one place reaches the
  whole app. Today there's a start (`src/design-system/`: Button, Icon, Loading, Modal,
  Progress) but only 12 imports of it, while the code has ~200 raw palette classes
  (`bg-gray-*`, `text-blue-*`, …) and arbitrary values.
  *Stragglers (2026-11-02):* a sweep for values stylelint lets through (it allows 1px and 2px
  and doesn't read opacity) found the focus ring's width and offset written out twice and the
  disabled opacity (0.45) in four components; now `--focus-width`, `--focus-offset` and
  `--opacity-disabled`. Left on purpose: `theme-color` meta tags (HTML, can't read CSS
  variables; they repeat the paper colours), the frame's inner rule at half opacity (one use),
  `style:` bindings for progress widths and the reference sheet's swatches (values, not
  styling). No raw controls or one-off components left.
  *Closed (2026-11-03):* every value is a token (stylelint), every control a component (ESLint), the straggler sweep found nothing left but the deliberate exceptions above.
- [x] **Token layer.** CSS custom properties as the single source (light/dark/sepia themes
  switch by swapping values), mapped into Tailwind (or the chosen styling) so only tokens are
  expressible. Remove Tailwind's default palette from the config so raw colors don't compile.
  *Done:* Engraved values in `src/lib/design/tokens.css` (light, dark, sepia; text colours checked for WCAG AA); no Tailwind, stylelint enforces the tokens; every token is on `/reference`.
- [x] **Enforce it.** Lint rules that fail the build on raw colors, arbitrary values
  (`p-[13px]`), inline styles and HTML controls used outside the design system. Part of the
  check gate, not a guideline.
  *Done:* Stylelint (`stylelint.config.js`) fails the build on raw colours, sizes, spacing, type, radii, shadows, z-index and durations outside `tokens.css`. ESLint (`svelte/no-restricted-html-elements`) fails the build on raw `<button>`, `<input>`, `<select>` and `<textarea>` outside `src/lib/ui/`.
- [x] **Component inventory.** Button, IconButton, Slider (dithered track if it passes the restraint rule), Toggle,
  Select, Sheet (mobile bottom sheet), Dialog, Popover, Tabs/Segmented, List/ListItem, Toast,
  Progress, Spinner, EmptyState, Field/Label, Badge. Each with states (hover, focus-visible,
  active, disabled, loading) and touch targets ≥ 44 px.
  *(in progress)* Button (primary, quiet, outline, danger, text; also renders links), Icon,
  Sheet, and in style **B, Plate** (picked from https://claude.ai/artifact/M3AtEFvzbkEYY2rC6BhEeA):
  Field, Select, TextField, Checkbox (ballot box), Radio, Slider, FilePicker, ListRow (dot
  leaders), Badge, and from the feedback canvas (user's picks, 2026-10-31): **Confirm**
  (Sheet in `alert` mode: full-width buttons, the filled `danger-solid` answer on top, focus
  on "Keep it"; replaces both `confirm()` calls), **Toast** (reverse-ink slug above the player,
  the mini player or the foot of the page; problems stay and are announced at once; used when a
  chapter saves or fails), **Progress** (hairline rule under the saving row), **Spinner** (a
  printer's flower turning once every 4 s beside the words that say what is happening: the
  player, Add a book, Settings; still under reduced motion, where endless animations now stop
  after their one instant run), **EmptyState** (the empty shelf, and a new error page: a
  missing book or link says so plainly with a way back to the shelf, instead of SvelteKit's
  bare default). The inventory is complete for what the app uses; a dithered empty-state
  picture stays an option for later (it would need variants first). Variants were published for a pick (2026-10-31):
  https://claude.ai/artifact/Dvyyv4k4ZwhK7nzkq61yeF (Dialog for removing a book: centred
  plate, bottom sheet, or no question with Undo; loading: breathing ellipsis, engraved rule,
  turning fleuron; toast: slip above the player, reverse-ink slug, notice under the header;
  chapter-saving progress: rule under the row, filling leader, one line atop Contents).
  Popover and Tabs/Segmented are left out: nothing in the app needs them yet (the sleep timer
  is a sheet, the theme is a radio group).
- [x] **Living reference page.** A dev-only route (or Storybook/Histoire) showing every token
  and component in every theme; also the target for visual regression tests.
  *Done:* `/reference`, served in dev or with `REFERENCE_PAGE=1` (the visual server sets it;
  404 otherwise, API-tested). Token names are read from `tokens.css` itself, so the sheet can't
  fall behind; every component with its states. Photographed whole in light, dark and sepia on
  all three devices. Sheets and dialogs are photographed where they are used (Add a book,
  Contents, Remove a book).
- [ ] **Share with the suite.** If a suite-wide house style is adopted, publish the tokens (and,
  with a shared framework, the components) as a package Ditherhouse can use too.
  *Open on purpose (2026-11-02):* waits on the user's call whether dithering and the Engraved
  tokens become the suite's house style. Ditherhouse's UI is Svelte 5 too (Tauri, Vite), so
  both the tokens and the `src/lib/ui/` components could be shared as one package.

## UI rework

- [x] **Book-themed visual identity.** Direction A, Engraved (see Decisions).
  *Done:* tokens, EB Garamond, frame, icon and manifest colours, dithered bands
  (`scripts/dither-assets.sh` with Ditherhouse's CLI), library (continue plate, shelf), reader
  (band, drop cap, reverse-ink sentence), player bar, mini player, Button, Sheet. Screenshots
  reviewed on iPhone, Pixel and desktop in all three themes, with simulated safe-area insets.
  Settings, Add a book, Unlock and Contents use the Plate controls.
  Originally: Replace the generic look with one that has personality
  and evokes books: paper and ink palette, a proper reading serif for body text (e.g.
  Literata, Source Serif, Newsreader) with a contrasting UI face, restrained ornament,
  page-like surfaces. Light, dark and sepia themes. Readhouse wordmark.
- [x] **Made for reading.** Comfortable measure (~60–75 characters), generous line height,
  adjustable font size/face/line spacing/theme, the currently spoken paragraph highlighted
  without jumping, auto-scroll that follows playback but stops while the user scrolls, and a
  "jump back to current" button.
  *(in progress)* Measure, line height, theme, sentence highlight, follow-along with "Back to
  the voice" done. *Reading text size* (2026-10-31): Standard, Large, Larger (20, 23, 26 px)
  per device in Settings (since 2026-11-01: Text size, Tiny to Extra large, scales the whole
  app), applied before first paint, drop cap scales with it; e2e and visual
  tested. Font face and line spacing choices left out: EB Garamond is the identity, and the
  size covers the accessibility need.
  *Closed (2026-11-03):* measure, line height, theme, text size, highlight and follow-along done; font face and line-spacing choices left out on purpose (EB Garamond is the identity; text size covers the need). Extra typographic details were shown on a canvas and not wanted.
- [x] **Rework layout and placement of controls.** Today settings, server config, batch,
  export, cache status and playback all compete on one page (`reader.tsx`, 800+ lines). New
  structure:
  - *Library*: books/sessions, import (EPUB, TXT, paste, AO3), resume where you left off.
  - *Reader*: text first; a compact player docked at the bottom (thumb reach on phones) with
    play/pause, skip ±paragraph, speed, sleep timer.
  - *Settings*: voice, TTS options, appearance, server; rarely used items behind
    "Advanced".
  *Done:* Library (shelf, continue plate, Add a book), reader (text first, docked player with
  speed, passage skip, sleep timer), Settings (AllTalk, voice with Advanced, this device).
- [x] **Mobile first.** Designed at 360–430 px wide before desktop. Bottom sheets instead of
  modals, safe-area insets (notch, home bar), no horizontal scroll, no hover-only UI, `dvh`
  units so the browser bar doesn't hide the player, works in iOS Safari and Android Chrome.
  *Done:* Sheets from below, safe-area insets, `dvh`, no hover-only controls; e2e on WebKit
  iPhone and Chromium Android, including a no-sideways-scroll check on every page. Real phones:
  device checklist.
- [x] **Good on desktop.** *(in progress)* Layout **A, Folio** picked from
  https://claude.ai/artifact/CRE9N4gB9Wv3iH78j427no and built for the reader: from 64rem a
  ruled sidebar (book, contents with save buttons, back to the shelf) and the player docked
  under the text column; CSS-only switch, so the server-rendered page is right on first load.
  The library is layout **C, Printed index** (user's pick from
  https://claude.ai/artifact/LBYFHjcubQh5NempCXNpTc, without the roman numerals, Settings
  keeps its label): from 64rem one centred column, the continue plate as a ruled band, each
  book a title over author with dot leaders to its place. Keyboard (2026-11-02): Space plays and
  pauses, arrows move by passage, never in a field or a sheet; after a click on a player
  button the arrows still work and Space still plays (a button focused from the keyboard keeps
  Space); e2e-tested. `/` opens Find in the book (2026-11-02). A layout that uses the width (library/chapter sidebar + reading
  column + player), keyboard shortcuts (space, arrows, `/` to search), not just a stretched
  phone UI.
  *Closed (2026-11-03):* Folio reader, printed-index library, keyboard (Space, arrows, `/` for Find in the book).
- [x] **Installable PWA.** Manifest, icons, home-screen install, Media Session API (lock-screen
  controls, title/chapter, artwork) so playback can be controlled with the screen off.
  *Done:* Manifest, interim icons, Media Session (lock screen, next/previous), offline service worker.
- [x] **Book progress in the player (user, 2026-11-03).** "Ch. 7 of 64" counted the EPUB's
  sections, so Dune's Chapter 1 showed as 7 (praise, copyright and part-title pages count).
  Picked from https://claude.ai/artifact/75J7V1gPpMhYuL7QfL8dw5 (A): "12%" and "of the book",
  the rule filled to match, by words read (`src/lib/reader/progress.ts`, unit-tested), 100% only
  at the last passage. Settings > On this device > "Show how far into the book I am" (on by
  default, per device) hides the whole line: some readers would rather not know. E2e-tested.
- [x] **In-book search (2026-11-02).** Find a passage and read or play from there; `/` on
  desktop. *Built (user's picks B, R2, T1 from the canvas):* a magnifier in the reader header
  (phone) and *Find* in the sidebar (desktop), or `/`, open **Find in the book**, a sheet (a
  centred plate on desktop) with the field focused. Results ask 200 ms after typing stops,
  older answers are dropped; each place is a `SnippetRow` (new in `src/lib/ui/`, on
  `/reference`): the chapter in spaced capitals over a few words with the match bold and
  underlined (not tinted: a tint is the passage being read), drawn from plain parts. "41
  places in 23 chapters", "Nothing found for ...", a line when only the first 50 are shown, and
  a plain message when the computer can't be reached; the count is a live region. Tapping a
  place pauses the voice if it was reading, moves the place to that paragraph (Play reads from
  there), scrolls it to the middle and marks the words with a CSS highlight (the page's text
  isn't touched; the mark goes when reading starts), with a notice "Your place is now here".
  *Moved into Contents (user, 2026-11-03, from https://claude.ai/artifact/FdMBt9N8pLqVPKnuuauRhy):*
  the header's magnifier and the separate sheet are gone; a "Find in the book" field heads
  Contents (phone sheet and desktop sidebar, widened to 20rem). It isn't focused when Contents
  opens, so the keyboard stays down for a chapter tap; while it has words the places replace
  Make the audiobook and the chapters, and clearing it brings them back. Going to a place
  clears it, so Contents opens as contents next time. `/` goes to the field (on a phone with a
  keyboard it opens Contents first). Caught with Dune: a jump deep into a
  long chapter landed short and drifted, because off-screen paragraphs sit at an estimated
  height (`content-visibility`) that changes as they render; the chapter is now laid out once,
  for one frame, before the jump, after which each paragraph keeps its real height (e2e-tested
  with a 400-paragraph chapter). E2e on all three devices, axe in
  every theme, visual baselines. Shelf search (canvas L) not built: not picked.
  Server: SQLite FTS5 (`block_search`, unicode61 with accents
  folded) holds every paragraph and heading, filled on import and by a migration for books
  already in the library (`json_each` over the stored blocks), emptied with the book by a
  trigger. `GET /api/books/:id/search?q=` (at most 200 characters, 50 hits, `no-store`, never
  cached by the service worker) treats the words as one phrase whose last word may be unfinished
  (from 3 letters: a one-letter prefix walks most of the book, 125 ms against 15 ms whole), in
  reading order, with a total and chapter count. Hits come back as plain-text parts with the
  match flagged, never HTML. Measured with five copies of Dune in the library: 2 ms for "spice"
  (199 places), under 1 ms for a phrase, 42 ms for "the" (6,158 places); import 95 to 130 ms
  slower for Dune; about 2.5 MB of index per Dune. Words match from their start (a search for
  "field" doesn't find "Netherfield"); a trigram index would match inside words but triples the
  index and can't find words under three letters. UI variants on
  https://claude.ai/artifact/2izQajy9AjuiZhQsiNSVUv (where it lives, how results show, what a
  tap does, optional shelf search); waiting on the user's pick.
- [x] **Pleasant details.** Calm transitions (respecting `prefers-reduced-motion`), clear
  loading and error states, empty states that say what to do next, helpful copy, no
  developer jargon in the UI ("buffered mode", "session server").
  *From use with Dune (2026-11-02):* a chapter name that wraps in Contents had its word count
  beside its first line and one stray leader dot on the next; figures and leaders now sit on
  the last line, as in a printed contents, and one-line rows are now truly centred (they sat
  2 px high). The desktop sidebar scrolled the current chapter to its bottom edge before the
  book face loaded, so it showed half cut off; it's now centred once fonts are ready, scrolling
  only the list (e2e-tested). At Extra large text the player's five controls needed more room
  than a phone has, so the bar grew and "of 3" slid under the page frame (it was in the
  baseline, unnoticed); the speed and sleep buttons now give way down to the usual tap size
  (e2e-tested). *Flaky test found (2026-11-02):* a pre-push run failed once
  in "theme choice applies immediately" on WebKit: the Sepia radio was clicked before Settings
  hydrated and hydration put the stored choice back ("Clicking the checkbox did not change its
  state"). Likely the earlier unreproducible failure too. Every Settings test now waits for the
  page to be live (the AllTalk check, which only runs after hydration); 90 repeated WebKit runs
  clean. A real tap in that window is a few milliseconds on a cold load, not worth app code.
  The drop cap went on the first paragraph whatever it was, so an AO3
  chapter opening "1. At a meeting" got a giant "1." beside three words; it now goes on the first
  of the opening three paragraphs that starts with a letter (quotes allowed) and runs at least
  two phone lines, else none (`src/lib/reader/drop-cap.ts`, unit-tested). On the desktop shelf a
  wrapping title pushed the author's leader far right; the leader now starts after the author.
  House rule enforced: seven `.ts` files had typographic quotes, dashes and a U+FFFF written
  literally (the rule says `\uXXXX`); fixed, and ESLint now fails on any non-ASCII string,
  regex or template literal in TypeScript.
  *Reduced motion (2026-11-02):* CSS motion was already off under reduced motion, but
  following the voice called `scrollIntoView({ behavior: 'smooth' })`, which overrides the CSS
  rule, so the page still glided with Reduce Motion on; it now jumps (e2e-tested).
  *(in progress, 2026-10-31)* Loading (printer's flower), problems and notices (toasts),
  empty and error pages are in. Jargon pass: "Stop generating audio" now says what it does and
  confirms; repetition penalty is labelled in plain words like temperature. RVC keeps AllTalk's
  name behind Advanced.
  *Copy pass (2026-11-02):* "Engine default" now says "AllTalk's default"; RVC is "Voice
  conversion (RVC)" (AllTalk's term in brackets, like temperature); "Stop generating audio" is
  "Stop preparing audio", the word used everywhere else; import errors no longer say "OPF" or
  "archive" ("This EPUB is incomplete (its list of contents is missing)...", "This file unpacks
  to more than a book should..."). Kept on purpose: `ALLTALK_URL` in the can't-reach message
  (whoever set Readhouse up needs it), "Low VRAM mode" and "DeepSpeed" (AllTalk's own names,
  each with a plain hint).
  *Closed (2026-11-03):* loading, empty, error and offline states, plain copy, toasts, reduced motion (CSS and the follow-along scroll).
- [ ] **Accessibility.** WCAG AA contrast in every theme, focus-visible styles, labelled
  controls, screen-reader announcements for playback state, respects system font size.
  *Type sizes raised (2026-10-31, user asked for accessible font sizes):* EB Garamond has a
  small x-height, so the floor is now 14 px for spaced capitals (`--text-xs`), 16 px for
  secondary text (`--text-s`) and 18 px for UI text (`--text-m`); reading text stays 20 px.
  All in rem, so the system font size scales them. Settings has a visible label, not only an
  icon.
  *Playback announcements (2026-10-31):* a polite live region in the player says "Reading
  Chapter 2" when reading starts or moves to a new chapter and "Paused" when it stops (also
  from the lock screen or sleep timer), never each passage; problems and notices were already
  announced (player message, toasts). Book text size is a Settings choice (see Made for
  reading). Still to do: a pass with VoiceOver and TalkBack on real phones (device checklist).
  *Automated pass (2026-11-02):* `tests/e2e/a11y.spec.ts` runs axe (WCAG 2.2 A and AA plus axe's
  best practices) on the library, Add a book, the reader paused and playing, Contents, Settings
  and the error page, in all three themes, on iPhone and desktop; part of the gate. Two catches
  on the way: the ruled page frame lies over the whole page, so axe had silently skipped every
  contrast check (the test now hides it and fails on any contrast it can't finish); and the
  reader had no `main` landmark, so the book text was outside every landmark and "skip to main"
  went nowhere (fixed). Known limit: beside the opening drop cap axe can't place the marked
  sentence's background, so that state is checked on the next paragraph (same tokens). A
  desktop VoiceOver pass isn't something I can do from here (it needs a person listening);
  it's on the device checklist with the phone passes.

## Books: EPUB and TXT

- [x] **Load EPUB files.** Parse in the browser (zip via the existing `fflate` + OPF/NCX/nav),
  get title, author, cover, chapter list in spine order. Turn chapter XHTML into
  paragraphs. Sanitize all EPUB HTML (it is untrusted; never inject it as HTML).
  *Done:* On the server (fflate + htmlparser2): spine, nav/NCX titles incl. anchor-split chapters, covers, Gutenberg cleanup; tested on real Gutenberg books.
- [x] **"Stave" chapter headings.** Gutenberg's *A Christmas Carol* uses "STAVE ONE"; TXT
  chapter detection doesn't know it yet, so the book imports as one chapter. Also consider
  smart quotes for TXT with straight ASCII quotes (display only; speech is unaffected).
  *Done:* "Stave" is a chapter label; the real Gutenberg text (#46) now imports as Preface and
  five staves. Smart quotes left out for now: display-only curling must keep the spoken
  segments and the sentence highlight in step, and narrator mode splits on straight quotes, so
  it isn't worth the risk before the demo.
- [x] **Load TXT files.** Detect encoding (UTF-8/UTF-16/Latin-1), detect chapters by common
  headings ("Chapter 1", "CHAPTER ONE", "Part II", `***`), fall back to one chapter.
  *Done:* BOM/UTF-8/Windows-1252, Gutenberg header/footer, chapter headings, contents lists and subtitles.
- [x] **Chapter picker.** A table of contents sheet/sidebar: chapters with progress per chapter,
  tap to read from there, select a range to pre-generate audio, resume where you stopped.
  Long books stay fast (virtualized list, chapters loaded on demand).
  *Done:* Contents sheet with current chapter, word counts, tap to jump, save for offline per chapter. Range selection dropped: saving per chapter covers it.
- [x] **Library.** Imported books are kept on the server in SQLite, so the phone and the
  computer share them, with cover, progress and last read; the service worker caches what's
  needed offline. Delete and re-import.
  *Done:* Server-side SQLite, shared by all devices; cover, progress, last opened; delete.
- [x] **Open from anywhere.** File picker, drag and drop on desktop, Share-to/Open-with on
  mobile via PWA share target if feasible.
  *Done:* File picker, desktop drag and drop, and an Android share target (installed PWA):
  the service worker receives the POST on the device and the library offers the file or text
  in Add a book; it is never added without a tap, since any website can POST to `/share`.
  Shared links get an explanation (Readhouse never fetches URLs). A share to a locked device
  waits through unlocking (e2e-tested on all three profiles); the gap noted earlier was the
  Secure-cookie bug below. Not on iOS (no share target).
- [ ] **AO3 still first-class.** Keep the AO3 parser (paste/HTML download) and give AO3 works
  the same chapter UI as EPUB; AO3's own EPUB downloads should import cleanly. Test with AO3
  downloads.
  *(in progress, 2026-11-01)* Tested with the user's AO3 EPUB (a Calibre-converted download,
  4 sections, 12,000 words) and a commercial EPUB (Dune, 64 sections): both import with the
  right titles, authors and chapters. Fixed what listening would have exposed: new books open
  where the story starts (EPUB guide `text` / `bodymatter` landmark when present, else leading
  praise, copyright, contents, "also by" and AO3 preface pages are skipped; they stay in
  Contents); AO3's own lines ("See the end of the chapter for more notes", "Please drop by the
  Archive and comment...") are dropped, the author's notes kept; web addresses are spoken as
  "a link". Found and fixed a real bug: adapter-node's 512 KB body limit refused any book over
  half a megabyte (Dune, 1.7 MB) before Readhouse's own `UPLOAD_MAX_MB` applied;
  `mise run start` now sets `BODY_SIZE_LIMIT=Infinity` (Readhouse caps every body itself) and an
  e2e test uploads a 700 KB book. Still to do: AO3 pages pasted once AO3 is back.

## AllTalk integration

- [x] **Passage length (user, 2026-11-01).** The old app's "max characters", reworked: one
  library setting stored on the server, under Voice. Passages are built by size within a
  chapter: sentences packed up to N characters **across paragraphs** (so runs of short dialogue
  become one request), long sentences cut at clauses then spaces, paragraph ends preferred as
  breaks once a passage is half full (soft breaks), hard breaks at headings, scene breaks and
  chapter ends. Default about 7 s of speech (~125 characters). Speech API takes the passage
  index and N; saved places stay chapter + paragraph; offline copies are keyed by N; the
  highlight spans every part of a passage; buffer shows approximate seconds.
  *Done:* `src/lib/text/passages.ts` (unit-tested: dialogue joins, walls of text split at
  sentence ends, clauses, soft paragraph breaks, hard breaks, verse offsets). The server builds
  a chapter's passages and sends them with it (`?chars=` in the URL, so cached and offline
  copies always match), so the phone never has to agree with Node's sentence splitter. Speech
  takes `{chapter, passage, chars}`; places are saved as chapter + paragraph; offline keys and
  saved chapters include the length. Settings: "Passage length" (60 to 1,000, default 125,
  about 7 s) under Voice; the buffer shows seconds too. `SEGMENT_MAX_CHARS` retired.
  E2e: four dialogue lines read as one passage and highlighted together; a new length reaches
  the speech requests. Visual baseline for the dialogue highlight.
- [x] **Prepare the whole book (user, 2026-11-01).** The old app's "download entire book
  audio", reworked for a server library. Contents > Whole book: every passage generated on the
  computer in the background ("later" priority, behind listening and prefetching), with the
  library's voice settings, passage length, engine and model of that moment saved with the book
  (its snapshot); the book is read with them from then on, whatever the settings become. Its
  audio is pinned (never evicted, not counted in `AUDIO_CACHE_MAX_MB`), and because the snapshot
  names the engine and model, the cache key needs no AllTalk: **a prepared book plays with
  AllTalk switched off**, over plain http, on any device. If AllTalk switches model mid-way it
  pauses with the reason (never mixes models); also Stop, Continue, Prepare again with current
  settings, Forget. Restarts leave it paused. Unit tests (whole book pinned, plays with AllTalk
  closed, snapshot survives settings change, model switch pauses, pins survive a 1-byte budget,
  queue order) and e2e. Export/import file not needed for now (user).
  *Renamed (user's pick D, 2026-11-02, from https://claude.ai/artifact/R3mSgoJHpa4JgE1oQDqpsc):*
  "Make the audiobook" (the old label wrapped in the desktop sidebar); "Making the audiobook",
  "Audiobook made with...", "Make it again", "Forget". The code keeps the name "prepare".
  Correction recorded: before this, cached audio could NOT play with AllTalk off (the cache key
  asked AllTalk for its model); only prepared books can.
- [x] **AllTalk listening controls in Settings (user, 2026-11-01).** Model switch (`/api/reload`;
  XTTS and APITTS), voice preview (`/api/previewvoice`), low VRAM (`/api/lowvramsetting`),
  DeepSpeed where available, pitch for engines that support it, RVC for the narrator, "silent"
  for text outside quotes; each shown only when the engine reports the capability, advanced
  ones under Advanced. Speed stays the client-side playback rate.
  *Done:* Settings → AllTalk: **Model** (applies at once, for every device; flower while
  loading; a notice when done), Advanced: **Low VRAM mode**, **DeepSpeed** (only when AllTalk
  reports them). Voice: **Hear this voice** under the voice and narrator voice (pauses the
  book), "nobody (skip it)" for text outside quotes; Advanced: **Pitch** (engines with
  `pitch_capable`), **Narrator RVC voice and pitch**. Endpoints `/api/alltalk/model`,
  `/api/alltalk/modes`, `/api/alltalk/preview`, validated (models must be ones AllTalk lists);
  the engine cache is dropped after a switch so the audio cache follows the model; cache keys of
  existing settings unchanged. Verified on the real AllTalk (XTTS and APITTS, 19 voices):
  switching both ways (about 14 s on this CPU), previews under both models, reading under APITTS.
  Found two AllTalk bugs and worked around them: its preview endpoint fails under APITTS
  ("penalty ... is 10"), so Readhouse previews with the normal generation call; and without CUDA
  its low VRAM switch unloads the model while answering "success", so Readhouse checks the
  result, reloads the model and explains. **Engine switching left out:** AllTalk restarts itself
  with the new engine and lists engines that aren't installed (piper on this Mac), so a wrong
  pick can leave it down; revisit with a check that the engine is installed.
  *Investigated (2026-11-02), still out:* AllTalk can't say which engines are installed.
  `currentsettings.engines_available` comes from its `tts_engines.json`, which lists every
  bundled engine (parler, piper, vits, xtts, f5tts here) whether or not its packages or models
  are present. `/api/enginereload` checks only that list, **saves** the pick and restarts the
  process; at start-up AllTalk imports the engine and raises if it can't, so a wrong pick leaves
  it crashing on every start until someone edits its config by hand. Readhouse can't check
  installation itself (AllTalk may be on another machine). Revisit if AllTalk gains an
  installed-engines check or a start-up fallback.

- [x] **Pin the AllTalk version.** Keep `../alltalk_tts` on the latest `alltalkbeta`; decide
  whether the local `atsetup.sh` / `confignew.json` edits are kept or discarded. Record the tested AllTalk version in the docs and show a warning
  in the app when the server reports something older.
  *(in progress)* Built and tested against `alltalkbeta` at f16117e (2026-01-09). AllTalk has no version endpoint, so no in-app warning. Local edits in `../alltalk_tts` kept (see Decisions).
  *Closed (2026-11-02):* upstream `alltalkbeta` is still at f16117e; the README names it as the
  tested version. No in-app warning is possible without a version endpoint; re-test and update
  the README when `alltalkbeta` moves.
  *Verified live (2026-10-31)* against f16117e with XTTS `xttsv2_2.0.3` on CPU (Python 3.11.9,
  torch 2.2.1, coqui-tts 0.24.3, gradio 6.3.0 with huggingface-hub < 1.0; the installer's
  unpinned `gradio>=4.50` pulls a huggingface-hub that breaks transformers 4.46). Readhouse
  read engine, model, capabilities and 19 voices; a 120-character passage took 4.2 s to
  generate and came back as 6.7 s of AAC; the repeat came from the cache in 20 ms; WebKit
  (iPhone profile) played it and advanced to the next passage by itself. Run notes:
  `../alltalk_tts/READHOUSE-RUN.md`.
- [x] **Re-read the API and use it fully.** Endpoints in `docs/alltalk-api-full.md`: `ready`,
  `voices`, `rvcvoices`, `currentsettings`, `reload`, `tts-generate`,
  `tts-generate-streaming`, `stop-generation`, `openai-voicemap`, `deepspeed`,
  `lowvramsetting`, `reload_config`. Not used today: `stop-generation` (wire it to
  pause/skip/cancel so the GPU isn't busy with paragraphs nobody will hear), and the
  engine-capability fields in `currentsettings` should drive which controls are shown.
  *Done:* Verified against `tts_server.py` on `alltalkbeta`. Used: `ready`, `currentsettings` (engine, model, capabilities drive which settings show and key the audio cache), `voices`, `rvcvoices`, `tts-generate` (voice, narrator, unquoted text, language, temperature, repetition penalty, RVC), `/audio/<file>`, `stop-generation`. Not used on purpose: `reload`/`deepspeed`/`lowvramsetting` (server administration belongs in AllTalk's own UI), OpenAI endpoint (no gain).
- [x] **Narrator mode for fiction.** AllTalk v2 can voice narration and quoted dialogue with
  different voices. `services/api/tts.ts` already sends `narrator_enabled` /
  `narrator_voice_gen`, but no UI sets them. Expose narrator/character voice choice; it suits
  novels and fanfic well.
  *Done:* Narrator on/off, narrator voice, and who reads unquoted text, in Settings.
  Off by default and marked Experimental, with a warning that it often doesn't work well yet
  (user's call, 2026-10-31).
  *Set aside (user, 2026-11-01):* hidden and always off for now (`NARRATOR_AVAILABLE` in
  `src/lib/settings.ts`). Stored narrator settings are kept but never applied; the AllTalk
  client still supports it, so bringing it back is one flag.
- [x] **Streaming for faster first audio.** Use `tts-generate-streaming` where the engine
  supports it so playback starts sooner, with fallback to `tts-generate`.
  *Decided: not now.* The streaming endpoint ignores narrator, RVC and temperature, can't go through the cache, and Safari plays progressive WAV poorly. Start-up time is handled by short segments (`SEGMENT_MAX_CHARS`) and prefetching. Revisit if real-device latency is a problem.
- [x] **Generation pipeline.** One queue/controller for live, buffered and batch generation
  (today three paths: `useAudioPlayer`, `useBufferedPlayback`, batch). Cancel on seek,
  prefetch N paragraphs ahead, retries with backoff, clear errors when AllTalk is down.
  *Done:* One server queue (now before prefetch, dedupe, cancel abandoned), reader prefetches 3 passages ahead and warms the cache; "save chapter" replaces batch generation.
- [x] **Proxy AllTalk through the app server.** The phone talks only to the app's origin; the
  server forwards to AllTalk on localhost. AllTalk no longer needs to listen on the LAN, and
  audio URLs stop breaking when the host's address differs between LAN and Tailscale.
  *Done:* The browser only talks to Readhouse; audio is cached and served by hash.

- [x] **Read on a Kindle through KOReader (user, 2026-11-07).** A KOReader plugin
  ([readhouse.koplugin](https://github.com/mm0x1/readhouse.koplugin)) reads the open book aloud
  with Readhouse's voices; Readhouse does all the speech work, the Kindle only sends text and
  plays audio. Three endpoints: `POST /api/speak/passages` splits text with the library's
  passage length (`splitIntoSegments`), `POST /api/speak` speaks one passage through the same
  queue, cache and voice settings as `/api/speech`, and `GET /api/audio/<hash>/pcm` streams
  cached audio decoded by ffmpeg to raw s16le mono 22050 Hz, because a Kindle's GStreamer 0.10
  has no decoders. Verified by ear on a Paperwhite 5 with Bluetooth headphones.
  *Security:* `/api/speak` is the first endpoint that speaks text from the request (`/api/speech`
  still never does). It sits behind the passcode like everything else, is capped at one
  passage (1000 characters after whitespace is collapsed, 16 KB body), and fills the same
  capped LRU cache; splitting is capped at 20,000 characters. The PCM stream kills ffmpeg when
  the client hangs up. *Open:* the plugin cannot unlock a passcode-protected Readhouse yet.

## Stability testing

- [x] **Test tooling and a check gate.** Vitest for units, Playwright for end-to-end; one
  `check` command (types, lint incl. design-system rules, unit, e2e) run by a pre-push hook
  and CI (GitHub Actions), like Ditherhouse's `mise run check`.
  *Done:* `mise run check` (types, prettier, eslint, stylelint, vitest, prod audit, gitleaks, Playwright on iPhone/Android/desktop), pre-push hook, GitHub Actions.
  *CI split (2026-11-03):* about 5 minutes a push, almost all of it the end-to-end tests in one
  queue. Now a static job (types, lint, unit, audit, secrets) beside one job per Playwright
  project, each installing only its browser; a newer push cancels the older run; pushes that
  only touch docs, Markdown or screenshot baselines don't run it. `mise run check` (local and
  pre-push) is unchanged.
- [x] **Fake AllTalk server.** A test double that serves the API with short fixed WAVs, slow
  responses and errors on demand, so tests are fast and deterministic without a GPU.
  *Done:* `tests/fake-alltalk.ts`, also runnable standalone for UI work.
- [x] **Unit tests for the core.** Text processing and paragraph splitting, AO3 parser, EPUB
  and TXT parsing (with real sample books, including malformed ones), chapter detection,
  the playback state machine, session (de)serialization, import/export round trips.
  *Done:* For text, import, library, settings, AllTalk client, speech and access (74 tests).
- [x] **End-to-end flows** on a phone viewport (iPhone + Android profiles, WebKit and Chromium)
  and desktop: import a book → pick a chapter → play → auto-advance → pause/resume →
  reload and resume position; settings persist; AllTalk offline shows the right state;
  offline session plays without AllTalk.
  *Done:* `tests/e2e/ui.spec.ts` on WebKit iPhone, Chromium Android and desktop: import, play, auto-advance across chapters, tap to read, contents, mini player, settings, theme, no sideways scroll, offline playback of a saved chapter.
- [x] **Visual regression.** Screenshot the design-system reference page and key screens in
  every theme; the build fails on unreviewed visual changes.
  *Done:* `tests/e2e/visual.spec.ts`: library (empty, and stocked with a worst-case AO3 title),
  Add a book, reader, reader while playing, Contents, Settings (top and end), Unlock, in light,
  dark and sepia on iPhone, Pixel and desktop (66 baselines, ~4 MB, committed in
  `tests/visual/`). Its own server and fake AllTalk (one-minute passages, so the playing state
  holds still). Local and pre-push only: CI skips it (`CI` set), since Mac baselines don't match
  Linux font rendering; a pinned Linux container in CI is the later option. Refresh with
  `mise run visual:update` after reviewing. Add the reference page once it exists. It caught
  two real bugs at once: the library overflowed the frame on phones (grid track sized by an
  unwrapped detail line) and the author separator lost its space.
- [x] **Manual device checklist.** *Done (2026-11-02):* every section validated by the user on
  real phones with the real AllTalk, including offline and the installed app over Tailscale
  https. Re-run the affected sections before each release. Written: `docs/device-checklist.md` (first
  run, lock screen and background, audio routes, offline, installed app and share target,
  accessibility with large text and screen readers, AO3, passcode, plain http, a results
  table). Covers: playback continues across passages with the screen
  locked; headphones unplugged pauses; lock-screen next/previous; offline chapter after toggling
  airplane mode; first real AllTalk run on a phone (verified on desktop WebKit, 2026-10-31).
  Originally: A short script to run on a real iPhone (Safari autoplay,
  lock screen, background playback) before each release; those can't be fully automated.

## Code quality

- [x] **Rewrite, don't port.** The React code isn't carried over as-is. Lessons from it for
  the Svelte version: no 800-line route files (`reader.tsx` 814, `readerStore.ts` 849,
  `useBufferedPlayback.ts` 788); routes and components stay thin, logic lives in plain TS
  modules that are tested without the UI; Svelte 5 runes for state instead of
  Zustand + XState side by side (keep an explicit state machine for playback only if it
  pays for itself).
  *Done:* Done; the React app is gone from this branch (still on `main`).
- [x] **One way to do each thing.** Today there are duplicates: live, buffered and batch
  generation paths; JSON export *and* zip export; server sessions *and* IndexedDB (with a
  migration banner); `ServerConfigModal` *and* `SessionStorageConfig`. The new app has one
  of each (see Feature audit).
  *Done:* One queue, one storage backend (server SQLite + device cache for offline), one export path still to decide (see Feature audit).
- [x] **Logic outside components.** Text processing, AO3/EPUB/TXT parsing, the generation
  queue, the AllTalk client and the library schema live in `$lib` / `$lib/server` modules,
  tested directly; components only render and dispatch.
  *Done:* Text, import, positions, player and offline logic are plain TS modules; components render and dispatch.
- [x] **Clean dependency list.** Start from zero; today's list carries unused packages
  (`cheerio`, `lowdb`, `redaxios`, `@tanstack/react-query`, `body-parser`) and TanStack
  starter remnants. Every dependency in the new app is justified.
  *Done:* Runtime deps are valibot, htmlparser2, fflate. Drizzle dropped (stable has no node:sqlite driver).
- [x] **Rewrite `README.md` and `CLAUDE.md` for Readhouse.** Both describe AllTalk Reader's
  React/Express app. README: what Readhouse is, screenshots (phone and desktop), setup with
  AllTalk `alltalkbeta`, running it on a computer and opening it from a phone over LAN or
  Tailscale (`tailscale serve` for HTTPS), importing EPUB/TXT/AO3. `CLAUDE.md`: the
  SvelteKit layout, commands (`mise` tasks, the check gate), design-system rules (no ad-hoc
  values or components), testing expectations. `CLAUDE.md` is currently gitignored; decide
  whether to commit it so every session gets the same rules. Update the rest of `docs/`
  (architecture, API reference) at the same time and delete what no longer applies.
  *(in progress)* README rewritten (setup, Tailscale, config, running as a service, security). CLAUDE.md rewritten and committed; design-system rules added (2026-10-31).
  README screenshots (phone light and dark reader, phone library, desktop reader; plus desktop
  library and sepia Contents in `docs/screenshots/`) are made by `mise run screenshots` from
  `tests/e2e/readme.spec.ts`, at 2x, with public-domain books. *Closed (2026-11-02):* `docs/presentation.md`
  removed (there is no presentation; the demo video stays in the README); `docs/` is now the
  AllTalk API reference, this backlog, the device checklist, screenshots and media. README now has "Connecting to
  AllTalk": only what to put in `ALLTALK_URL` and how to check it in Settings.
  *Refreshed (2026-11-02)* after the dithered covers, the new player bar, text size and "Make
  the audiobook": `mise run screenshots` and `mise run demo` retaken and reviewed.
- [x] **Tooling.** ESLint + Prettier (or Biome), strict TypeScript, pin Node and pnpm in
  `mise.toml` (pnpm is unpinned, so the `pnpm` shim fails), `pnpm approve-builds` for
  esbuild, commit conventions, one up-to-date architecture doc.
  *Done:* Prettier, ESLint (svelte plugin, typed routes), stylelint, strict TS, Node/pnpm/gitleaks pinned in `mise.toml`.
- [x] **Config in one place.** All settings validated at startup (`src/config/`), no
  hard-coded hosts; the old `localhost:7851` / LAN IP defaults live only in `.env`.
  *Done:* `src/env.ts` validates everything at startup.

## Security

The app is reachable from other devices by design, so treat the network as untrusted.

- [x] **Lock down the server.** Today's `server.js` allows any origin (`cors()`), binds
  `0.0.0.0`, has no authentication, accepts 50 MB JSON and stores `req.body` unvalidated.
  The SvelteKit server is same-origin only; every endpoint validates its input with a schema
  (e.g. zod/valibot) and has size limits; uploads are streamed with a cap; rate limits on
  write and AllTalk endpoints; SQLite transactions instead of rewriting a JSON file.
  *Done:* See Security checklist; API tests cover cross-site, validation and size limits.
- [x] **Access control for LAN/Tailscale.** At minimum an optional passcode/token; recommend
  serving over Tailscale (`tailscale serve` gives HTTPS and limits access to the tailnet)
  and document it. Bind to localhost when only Tailscale serve is used.
  *Done:* Passcode, signed cookies, rate limit; README covers Tailscale.
  *Fixed (2026-10-31):* over plain http the session cookie was sent `Secure`, because
  adapter-node takes every request for https unless `ORIGIN` or `PROTOCOL_HEADER` is set;
  Safari (and Chrome on a LAN address) dropped it, so a passcode never unlocked. `Secure` now
  follows the browser's Origin header. Chromium's e2e runs missed it: 127.0.0.1 counts as
  secure there.
- [x] **HTTPS story.** Plain http over LAN isn't a secure context: pitch shift (AudioWorklet)
  is disabled, and PWA install, service workers and some media APIs won't work. Make
  `tailscale serve` (or a local cert via mkcert/Caddy) the documented default.
  *Done:* README recommends `tailscale serve`; offline and lock-screen features explain themselves when on plain http.
- [x] **Untrusted input.** EPUB/HTML/AO3 content sanitized (DOMPurify or text-only
  rendering), size and entry limits on zip/EPUB import (zip bombs), session import
  validated, Content-Security-Policy header.
  *Done:* Book HTML reduced to text, covers sniffed and sandboxed, zip limits counted while inflating.
- [x] **Dependencies.** `pnpm audit` clean and part of the check gate; Dependabot/Renovate.
  *Done:* `pnpm audit --prod` and gitleaks in the gate. Dev-only advisories (eslint minimatch, vite-plugin deepmerge, no fix yet) reported by `mise run audit`. Dependabot (`.github/dependabot.yml`): weekly grouped npm updates, monthly Actions.
- [x] **Secrets and data.** Nothing sensitive in the repo or bundle; `data/` stays gitignored;
  no IPs or hostnames committed.
  *Checked (2026-10-31):* tracked files hold no addresses or hostnames (examples use TEST-NET
  and `example`); `data/`, `.env*` and `.e2e/` are ignored; gitleaks runs in the gate; the
  client bundle gets no private env (only `$app/env/private`, server side).
- [x] **Security checklist, applied to every change.** The items from the wider industry
  list that apply to a self-hosted, single-user app with SQLite:
  - *Injection:* parameterized SQL only (no string-built queries); no shell calls with user
    input; path traversal (uploaded and stored file names never become paths; files are
    stored by generated id).
  - *Browser:* XSS (book HTML is sanitized or rendered as text; no `{@html}` on untrusted
    input), CSRF (SvelteKit origin check stays on; state changes only via POST/PUT/DELETE),
    CORS (none: same origin), clickjacking (`frame-ancestors 'none'`), Content Security
    Policy (SvelteKit `csp` with nonces/hashes), security headers (`X-Content-Type-Options`,
    `Referrer-Policy`, `Permissions-Policy`), HSTS only when served over HTTPS.
  - *Server:* input validation with schemas at every endpoint, mass assignment (whitelist
    fields; never spread request bodies into rows), IDOR-safe ids (random, not sequential;
    still checked), SSRF (the AllTalk proxy forwards only to the configured AllTalk origin
    and an allow-list of paths; user-supplied URLs are never fetched server side), request
    size limits, file upload validation (type sniffing, size, zip-bomb limits), brute-force
    protection and timing-safe comparison for the access passcode, least privilege (runs as
    a normal user; writes only to its data dir).
  - *Supply chain:* lockfile committed, `pnpm audit` in the gate, minimal dependencies,
    pnpm build-script allow-list, secret scanning (gitleaks) in the gate.
  - *Data:* SQLite transactions, foreign keys on, unique constraints, migrations (forward
    and tested), backups of the data dir documented and restore tested once.
  *(in progress)* Applied so far to the server; CSP and headers in place.
  *Audit of every endpoint (2026-11-02):* 20 endpoints and page loads. Injection: every query is
  a prepared statement (the only SQL built from strings are constants and the migration counter);
  ffmpeg is spawned with an argument list on paths Readhouse chose; ids and audio hashes are
  matched by route matchers (`uuid`, `hash`, `position`) before any handler runs, and upload
  names never become paths. Search input is reduced to letters and digits before it reaches FTS5,
  so its query syntax can't be used. Browser: no `{@html}` anywhere; CSP with `default-src
  'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, plus `nosniff`,
  `no-referrer`, a closed Permissions-Policy, COOP/CORP, HSTS only over https; cross-site
  writes refused (Sec-Fetch-Site or Origin against Host). Server: every body read through
  `readJson`/`readBytes` with a cap (256 bytes to the upload limit), strict schemas (unknown
  fields refused, so no mass assignment), GET parameters range-checked (`chars`, `q` at most 200
  characters, 50 hits), the AllTalk proxy only reaches the configured origin on fixed paths (the
  audio file name AllTalk returns is reduced to its last segment and encoded), the passcode is
  compared in constant time with a global attempt limit. Writes and AllTalk calls have no rate
  limit of their own on purpose: the app is single-user behind the passcode, and the speech
  queue runs one generation at a time and drops abandoned requests, so a busy client can't pile
  work onto AllTalk. Data: transactions, foreign keys, unique keys, forward migrations tested
  (the search backfill has its own test), backups documented and restore tested.
  *Backup and restore tested (2026-10-31)* on the build: a library restored from
  `readhouse.db` alone lists its books, and audio missing from `audio/` is made again on
  request. README says what to copy (`secret.key` keeps devices unlocked).

  *Closed as an item (2026-11-03):* audit of every endpoint recorded above; applying it to each change stays part of How we work.
## Performance

A phone on Wi-Fi or Tailscale is the target device; budgets are checked in the gate.

- [ ] **Budgets.** Initial JS for the reader ≤ 100 KB gzipped; LCP < 1.5 s and INP < 100 ms on
  a mid-range phone over LAN; no layout shift while audio advances; 60 fps scrolling with a
  1,000-paragraph chapter. Bundle size checked in CI.
  *(in progress)* Reader script budget is an e2e test in the gate (and CI): a fresh browser
  context opens a book and the gzipped size of every script it fetches must stay at or under
  100 KB; today 54.8 KB in 25 files (2026-10-31). LCP, INP and scrolling a 1,000-paragraph
  chapter still need measuring on a real mid-range phone.
  *Re-measured (2026-11-02):* 55.6 KB gzipped in 23 scripts, so nothing to trim. LCP and INP on
  a real mid-range phone are the user's to run (device checklist).
  *Measured in Chromium with 4x CPU throttling (2026-11-02):* a 1,000-paragraph chapter
  (42,000 words) scrolls at a steady 60 fps (every frame 16.7 to 16.8 ms while scrolling 120
  steps); the slowest input event (play, next, pause, tap a paragraph to read from there) took
  40 ms, under the 100 ms INP budget; the page is ready (last paragraph in the DOM) 350 ms after
  a reload. A real mid-range phone remains the final word (device checklist).
- [x] **Rendering.** Long chapters render with `content-visibility: auto` (and
  `contain-intrinsic-size`) instead of a JS virtualizer; highlight changes touch two
  elements, not the list; no layout reads in scroll handlers.
  *Done:* `content-visibility: auto` with intrinsic size on every block; highlight is an attribute flip.
- [x] **Network.** Audio cached by content hash (same text + voice + settings → same file)
  so nothing is generated twice; `Cache-Control`/`ETag` on audio and immutable hashed
  assets; compression (brotli/gzip) for text; HTTP keep-alive to AllTalk; prefetch only a
  few paragraphs ahead (backpressure; no retry storms: retries with jittered backoff).
  *(in progress)* Content-hash audio cache, immutable caching, ranges and ETags done; compression done (below).
  *Compression (2026-11-02):* measured first: the same 42,000-word chapter's page was 628 KB
  uncompressed (about 3x the text: rendered plus its data), sent as is because adapter-node
  compresses only its prebuilt assets. Now `src/lib/server/compress.ts`, called from the server
  hook, compresses pages, page data and JSON (brotli at quality 4, else gzip; flushed per chunk
  so streamed pages aren't held back; `Vary: Accept-Encoding`; weak ETags). Never audio, ranges,
  HEAD, bodies under 1 KB or `no-transform`. Unit and API tested. Security: BREACH needs a secret
  repeated across many responses alongside attacker-reflected text; pages carry no CSRF token or
  session secret, and the CSP nonce changes with every response.
  *Closed (2026-11-03):* content-hash audio cache, immutable caching, ranges, ETags, br/gzip for pages and JSON, prefetch bounded by the buffer settings.
- [x] **Server.** Prepared statements, indexes for every lookup, no N+1 queries when
  listing a library, streaming uploads and audio (never whole files in memory), graceful
  shutdown.
  *(in progress)* Prepared statements, indexes, no N+1 in the library list, streaming audio, chapter LRU.
  *Query plans (2026-11-02):* `EXPLAIN QUERY PLAN` on every statement in `src/lib/server/`: each
  lookup by id, hash, book or chapter uses a primary key or index, and the library list is one
  indexed scan with its cover and progress joined by index (no N+1). The scans left are on
  purpose: the whole shelf (the list itself), prepared books at start-up (one row per prepared
  book), the audio cache's total (an aggregate by nature, a few thousand rows) and removing a
  book's search rows (FTS5 can't index an unindexed column; 59 ms for five copies of Dune).
  *Graceful shutdown (2026-10-31):* adapter-node drains requests on SIGTERM/SIGINT and emits
  `sveltekit:shutdown`; the database now closes then (checked on the build: the WAL is folded in
  and the process exits).
  *Closed (2026-11-03):* query plans checked for every statement, no N+1, streaming audio, graceful shutdown.
- [x] **Battery and memory.** No polling loops (event-driven status), audio elements reused,
  object URLs revoked, wake lock only while playing.
  *Checked (2026-10-31):* one audio element for the whole session; no object URLs; no wake lock
  (audio plays on with the screen off); the only timers are the sleep timer's 15 s tick while
  one is set and its fade-out.
- [x] **Fonts and assets.** Self-hosted, subset WOFF2, `font-display: swap` with metric-matched
  fallbacks; dithered PNG/WebP assets kept small.
  *Done:* EB Garamond variable via fontsource (Latin face preloaded, ~44 KB), Georgia fallback
  with metric overrides; the service worker precaches only Latin and Latin Extended faces
  (other scripts load on demand; all of them would be ~0.5 MB per phone). Bands are 1-bit
  PNGs of ~1.3 KB.

## Feature audit

Verify each works on phone and desktop; fix, or trim if it isn't worth keeping.

- [x] **Live playback** (generate on demand, auto-advance). Keep.
  *Done:* Kept; reworked on the new player.
- [x] **Buffered playback** and **batch pre-generation.** Merge into one "prefetch ahead / download
  chapter" behaviour in the new pipeline.
  *Done:* Merged: prefetch ahead + save chapter for offline.
  *Buffer settings restored (user, 2026-11-01):* the old app's two controls are back per device
  in Settings, "Preparing audio": Prepare ahead (1 to 10 passages, default 3; old Buffer Size)
  and Before playing, have ready (0 to that, default 0; the old Min Buffer pause threshold,
  applied at the start and whenever the voice catches up). Best effort offline. Unit and e2e
  tested. Whole-book download is still per chapter; a "Save the whole book" action was offered
  to the user.
- [x] **Sessions** (save/resume). Keep, renamed as the library; one storage backend.
  *Done:* Now the library (server) with per-book progress.
- [x] **Export/import** (JSON with base64 audio, zip). Keep zip only (smaller; base64 JSON
  inflates audio by a third and hits the 50 MB limit); read old JSON exports once for
  migration.
  *Trimmed:* the library lives on the server and devices save chapters for offline use, so exporting sessions has no job left. Backups are a copy of `DATA_DIR` (README).
- [x] **Offline sessions.** Keep; verify playback without AllTalk after the storage change.
  *Done:* Replaced by saved chapters on the device; tested end to end with the network cut.
- [x] **Audio cache status / clear cache.** Fold into Settings → Storage.
  *Done:* Settings → Offline listening (usage, remove copies); server cache is bounded by `AUDIO_CACHE_MAX_MB`.
- [x] **Settings monitor / server status.** Replace with a small connection indicator and a
  clear error state.
  *Done:* Settings shows AllTalk connection and model; the player explains when AllTalk is unreachable.
- [x] **Pitch shift.** Keep only if HTTPS becomes the default; otherwise hide over http instead
  of showing a disabled control.
  *Done:* Dropped: playback speed keeps pitch natively (`preservesPitch`), and AllTalk pitch isn't supported by XTTS.
- [x] **RVC voices and advanced TTS settings.** Keep behind "Advanced"; show only when
  `currentsettings` says the engine supports them.
  *Done:* Behind Advanced, shown only when the engine supports them.
- [x] **AO3 parser.** Keep (core use case); add tests.
  *Done:* Kept and tested; pasted AO3 pages become books.
- [x] **Safari/iOS audio handling** (`SafariAdapter`). Keep; cover with the device checklist.
  *Done:* One audio element unlocked on first tap; byte-range audio for Safari. Device checklist still to run on a real iPhone.

## Bugs

- [x] **`pnpm` doesn't run in this repo.** `mise.toml` pins only Node; add pnpm.
  *Done:* Node 26 and pnpm 12.16.1 pinned.
- [x] **esbuild build script blocked under pnpm 12.** `pnpm install` exits with
  `ERR_PNPM_IGNORED_BUILDS`; approve it in config.
  *Done:* `allowBuilds` in `pnpm-workspace.yaml`.

## Progress log

One line per work session: date, what was done, what's next.

- 2026-10-31: Backlog, decisions and working rules written; `design-inspo.md` set up
  (local only). Next: scaffold the SvelteKit app.
- 2026-10-31: SvelteKit 3 scaffold; text core and EPUB/TXT/AO3 import; SQLite library;
  AllTalk client, speech cache and queue; JSON API with CSP, cross-site checks, passcode;
  74 unit + 13 API e2e tests. Decided: no ORM (node:sqlite direct), server-side import.
  Next: reader client (player, prefetch, Media Session), interim UI on tokens.
- 2026-10-31: Reader client (player, prefetch, Media Session, mini player), library, settings,
  unlock; offline chapters via service worker; AAC compression; PWA manifest; README; stylelint
  token enforcement; gate in CI and pre-push. 80 unit + 31 e2e tests. Next: design phase
  (artifacts for comparison), then sentence-level highlight, sleep timer, desktop layout.
- 2026-10-31: Sentence-level highlight, sleep timer (minutes or end of chapter, fade-out),
  desktop keyboard shortcuts. Found and fixed a real WebKit bug: media played from service-worker
  responses got a stray pause on the second passage; media range requests now go to the network
  while online. 80 unit + 38 e2e tests. Visual directions artifact published; waiting on a pick.
- 2026-10-31: Engraved (direction A) built: tokens, EB Garamond, ruled frame (now above header
  and player, paper masked outside it), dithered chapter bands, drop caps, restyled library,
  reader, player and mini player. Screenshot review fixed: drop cap invisible in the spoken
  sentence, unreadable current chapter in Contents, justified rivers on phones, settings touching
  the frame. Service worker no longer precaches non-Latin font subsets. Kept AllTalk's local
  edits. 81 unit + 38 e2e tests. Next: Select/Field/Toggle/list rows and the lint rule against
  raw controls, then desktop layout.
- 2026-10-31: User picked control style B (Plate). Built Field, Select, TextField, Checkbox,
  Radio, Slider, FilePicker, ListRow (table-of-contents leaders), Badge, Button `text`;
  replaced every raw control; ESLint now forbids raw controls outside `src/lib/ui/`. Narrator
  marked Experimental with a warning, off by default. Next: desktop layout (variants first).
- 2026-10-31: Desktop layout variants published for a pick. Android share target with a
  confirm step (CSRF-safe), e2e-tested on all three profiles. Next: desktop layout once picked;
  visual regression screenshots; README screenshots; device checklist.
- 2026-10-31: Folio desktop reader built (sidebar contents shared with the phone sheet via a
  snippet; e2e helpers find Contents in either). Chapter bands now Bayer 8×8 (~200 bytes each).
  Next: visual regression screenshots, README screenshots, device checklist.
- 2026-10-31: Visual regression suite (66 baselines, local + pre-push, CI skips). Fixed the
  phone library overflowing its frame and the missing space after the author; book details
  now wrap instead of truncating. AllTalk v2 installed and running locally (XTTS v2.0.3, CPU;
  a subagent did the install, notes in `../alltalk_tts/READHOUSE-RUN.md`) and verified live
  through Readhouse. Desktop library built as the printed index (user's pick); type sizes
  raised for accessibility; every baseline reviewed again. README screenshots and a
  "Connecting to AllTalk" section. Fixed a lost-place bug the e2e suite caught intermittently:
  jumping to a chapter saved only after the chapter loaded, so leaving at once kept the old
  place; saves now go out at once and in order, and the library refreshes when the last one
  lands. Device checklist written (needs a run on real phones). Next: remaining components.
- 2026-10-31: Variants for Dialog, loading, toast and progress published for a pick. TXT import
  knows "Stave" headings (A Christmas Carol: five staves). Fixed a real passcode bug: over plain
  http the session cookie was `Secure` (adapter-node assumes https), so Safari never stayed
  unlocked; this was also the "locked share" gap, now e2e-tested. Built the picks: Confirm
  sheet, reverse-ink toasts, saving rule, printer's flower spinner; EmptyState and a plain error
  page; the `/reference` sheet in the visual suite. Then: reading text size (Settings),
  playback announcements for screen readers, a reader script budget in the gate (54.8 KB of
  100), the database closed on graceful shutdown, a tested restore from `readhouse.db` alone,
  secrets audit, plain words in Settings, CLAUDE.md design rules. Next needs the user or the
  world: the device checklist on real phones, AO3 downloads once AO3 is back (2026-11-13).
- 2026-10-31: Packaging: the pitch and a 32-second phone recording (`mise run demo`,
  `docs/presentation.md` with a talk track, linked from the README). Recording it caught a real
  bug: a pause tapped just as a passage ended was undone by the `ended` event already on its
  way, so playback resumed by itself; now e2e-tested on all three profiles and fixed.
- 2026-11-01: MIT license. Buffer settings back (Prepare ahead, Before playing). AllTalk
  decision clarified: users set AllTalk up, but choose model, voices, preview and modes in
  Readhouse. Passage length (packed across paragraphs, default about 7 s, a library setting;
  replaces `SEGMENT_MAX_CHARS`). AllTalk controls in Settings: model, low VRAM, DeepSpeed, voice
  preview, pitch, narrator RVC, skip text outside quotes; verified on the real AllTalk, with
  workarounds for two AllTalk bugs. 95 unit + 190 e2e tests. Next: AO3 EPUB testing with the
  user's files, device checklist, engine switching once it can be made safe.
- 2026-11-01 (phone testing, round 1): user's notes fixed. Chapter numerals removed (they were
  the section's position: an AO3 preface made Chapter 1 "II"); the band now fades downward.
  Player bar: "Ch. 2 of 20" in figures, room under the play button, speeds 0.5x to 2x in a sheet.
  The page frame spans the page instead of staying on screen. Readability audit of Settings in
  all three themes: hints and values upright (Garamond italic is too thin small), --text-xs
  15 px, --text-s 17 px, regular weight 450; aligned legends. Text size (Tiny to Extra large)
  replaces Reading text and scales the whole app. Home dithering: variants on the canvas.
- 2026-11-02: whole-book preparation (pinned audio, plays with AllTalk off) and dithered covers.
  The user validated the full device checklist on real phones, Tailscale https included. No
  presentation or deadline: Readhouse is an open-source project. Next: development and polish
  (desktop keyboard shortcuts, fresh screenshots and video, phone performance numbers, engine switching).
- 2026-11-02: Reader keys fixed after a mouse click (arrows ignored, Space re-clicked the
  button), e2e-tested. Whole-book preparation renamed "Make the audiobook" (user's pick D; the old
  label wrapped in the sidebar). Copy pass over Settings and import errors. Engine switching
  investigated and still out (AllTalk can't tell installed engines; a bad pick crashes it on every
  start). Flaky e2e hunt: the whole suite four times over (784 runs, `--repeat-each=4`) passed
  without a failure, so the one pre-push failure is not reproducible yet; if it recurs, keep the
  trace from `test-results/`. Next: README screenshots and demo video, phone performance numbers.
- 2026-11-02: README screenshots and demo video retaken. Pages, page data and JSON now compressed
  (br/gzip, `src/lib/server/compress.ts`); measured on a 1,000-paragraph chapter at 4x CPU
  throttle: steady 60 fps scrolling, worst INP 40 ms, the page 628 KB before compression. AllTalk
  version item closed (README names `alltalkbeta` f16117e as tested); `docs/presentation.md`
  dropped. Next: in-book search, then the open polish items (accessibility, security audit,
  query plans, budgets).
- 2026-11-02: In-book search, server side (FTS5 index with a backfill migration, a validated
  endpoint, measured on Dune); its UI and a typography row are on a canvas waiting for the
  user's picks. Axe in every theme is now in the gate (it had been skipping every contrast check
  under the page frame) and the reader gained its missing `main` landmark. Query plans checked,
  every endpoint audited, script budget re-measured (55.6 KB). Polish from reading Dune and the
  AO3 fic: wrapped chapter names in Contents, the sidebar's current chapter, drop caps on
  numbered lines, shelf leaders, follow-along under reduced motion, focus and disabled tokens.
  The non-ASCII rule is now linted (seven files had slipped). Found the WebKit Settings flake (a
  click before hydration). Then search built from the user's picks (B, R2, T1), and the player
  fixed at Extra large text. Typography details (canvas row 5) left as they are: the user saw no
  difference. Next: AO3 pastes when AO3 is back; phone passes for the new items.
- 2026-11-03: Player shows book progress by words (setting to hide it); find in the book moved
  into Contents (user's picks from canvases); seven finished backlog items ticked. For the
  release: README brought up to date (features, an install path without test browsers, `mise
  trust`, updating), checked from a fresh clone; screenshots retaken with a find shot; the
  walk-through video re-recorded with a search, and fixed: it had always shown the page in a
  quarter of the frame (the recorder draws the page at CSS size; now cropped and scaled).
  `readhouse` fast-forwarded onto `main`.
- 2026-11-03: GitHub repo renamed to `readhouse` (old links redirect); first release, v1.0.0.
- 2026-11-07: Kindle reading through KOReader (`kindle-speak` branch): `/api/speak`,
  `/api/speak/passages` and `/api/audio/<hash>/pcm`, API tests for each, plus the new
  readhouse-koreader plugin. Verified on a Paperwhite 5: reads from the current page, gapless,
  turns pages. Found on the device: mixersink stops on partial buffers, so the plugin feeds it
  whole 4 KB blocks.
