# CLAUDE.md — Frontend

Angular 21 (standalone, SSR, strict TS), TailwindCSS *config* + a hand-written CSS design system.
An e-learning platform (courses, vocabulary, quizzes) with a WebRTC meeting feature bolted on.
See root `../CLAUDE.md` and `../readme.md` — but this file overrides them where they conflict.

## Build / run / test

```bash
npm install
npm start      # ng serve → http://localhost:4200
npm run build  # prod build (SSR + prerender)
npm test       # Vitest via @angular/build:unit-test (NOT karma)
```
Formatting: **Prettier** inline in `package.json` (`printWidth: 100`, `singleQuote: true`, `parser: angular`
for HTML). **No ESLint** is configured. `README.md` is the stock CLI template — ignore it.

## Layout (`src/app`)

- `components/` — 21 standalone components, each a folder with `*.component.ts/.html/.css`. Folders
  beyond the readme's list include `landing`, `my-courses`, `superadmin-dashboard`. Class name ≠ file
  name in a few: `courses/course-management.component.ts` → `CourseManagementComponent`,
  `videos/video-upload.component.ts` → `VideoUploadComponent`.
- `services/` — `auth`, `course`, `enrollment`, `assignment`, `quiz-result`, `user`, `video`,
  `vocabulary` (all `.service.ts`), plus `socket.ts`, `subtitle.ts`, `webrtc.ts` (**not** `.service`-suffixed).
- `guards/auth.guard.ts` — three functional guards: `authGuard`, `loginGuard`, `guestGuard`.
- `interceptors/auth.interceptor.ts` — class-based `AuthInterceptor` (registered via `HTTP_INTERCEPTORS`).
- `directives/src-object.directive.ts` — binds a `MediaStream` to `<video>.srcObject` (`input()` + `effect()`).
- `models/vocabulary.model.ts` — the **only** shared model file. Other interfaces are declared inline
  in their services (`User`/`AuthResponse` in auth.service; `ChatMessage`/`RoomUser`/`Subtitle` in socket.ts —
  and `Subtitle` is **duplicated** in subtitle.ts).

## Routing (`app.routes.ts`)

- Every route is `loadComponent: () => import(...)` — fully lazy, no child trees.
- Guards: `loginGuard` on `/login` `/register`; `authGuard` on protected routes; `guestGuard` on
  `/meeting` (always returns `true`). Role checks are data-driven: `data: { roles: [...] }` read by
  `authGuard` against `AuthService.getCurrentUser().role`. Roles: `STUDENT`, `LECTURER`, `ADMIN`,
  `SUPERADMIN`. Mismatch redirects by role.
- Gotchas: `superadmin` route is defined **twice** (duplicate); wildcard `**` → `/login`;
  `lobby/:roomId` and `room/:roomId` require auth but no role.

## State management

- **Signals** for UI/service state: `SocketService` (`connected`, `socketId`, `userNames`),
  `WebrtcService` (`localStream`, `remoteStreams`, `speakingPeers`, …), `SubtitleService`
  (`subtitlesMap` + `computed`). **Convention:** for Map/Set signals always assign a **new** Map/Set
  inside `.update()` (immutable replacement) — followed consistently; match it.
- **RxJS** at I/O boundaries: `AuthService.currentUser$` is a `BehaviorSubject`; HttpClient calls
  return Observables (`pipe(tap/map/catchError)`); `SocketService` bridges socket.io events into
  private `Subject`s exposed as `Observable` getters (`onOffer`, `onChat`, `onSubtitle`, …).
- Components use `ChangeDetectionStrategy.OnPush`.

## SSR / browser-only code (critical)

`app.routes.server.ts` sets `RenderMode.Prerender` for `**` — **all routes prerender on Node**. So any
`localStorage` / `window` / socket / `navigator.mediaDevices` access **must** be `isPlatformBrowser`-gated:
- `AuthService` wraps all `localStorage` in `this.isBrowser`; `getToken()` returns `null` on server.
- `SocketService` **returns early in its constructor on the server** (`this.socket` stays `null`; emits use `this.socket?.`).
- `WebrtcService` and `SubtitleService.startTranscription` guard all media entry points with `isBrowser`.

Follow this pattern for any new browser API usage.

## Media services

- `webrtc.ts` — custom Web Audio chain (high-pass → compressor → gain) on the mic; ICE-restart on
  failure; buffers pending ICE candidates until remoteDescription is set; interval-based VAD.
  **Hard-coded Metered.ca TURN/STUN credentials are committed in source (~lines 54-81)** — treat as sensitive.
- `subtitle.ts` — captures via deprecated `ScriptProcessorNode`, Float32→Int16 PCM @ **16 kHz**, streams
  to the signaling server (`socket.sendAudioData`). Must match the server's 16 kHz expectation.

## Environment config (readme & ENVIRONMENT_CONFIG.md are wrong)

- `environments/environment.ts` (dev): real localhost values (`apiBaseUrl: localhost:8080`,
  `socket.url: localhost:3000`, `apiEndpoints`, `r2PublicUrl`).
- `environments/environment.prod.ts`: **literal placeholder strings** `__API_BASE_URL__`,
  `__SOCKET_URL__`, `__R2_PUBLIC_URL__`.
- Swap = `fileReplacements` in `angular.json` (build-time) **plus runtime `sed`** in
  `docker-entrypoint.sh` rewriting placeholders in the built JS from env vars `API_BASE_URL` /
  `SOCKET_URL` / `R2_PUBLIC_URL`. **`ENVIRONMENT_CONFIG.md` claims `process.env[...]` — that is false.**

## Styling — Tailwind is vestigial

TailwindCSS 4 is wired via `.postcssrc.json` **but `styles.css` never imports it** (no `@import
"tailwindcss"`, no `@tailwind`/`@apply` anywhere in `src`). **Tailwind utilities are not generated —
do not rely on them.** The real system is `src/styles.css`: a CSS-variable design system
(`--bg-*`, `--text-*`, `--brand*`, `--shadow/-radius/-space-*`, badge tokens), global reset, Inter font,
shared `@keyframes`. Each component's `*.component.css` uses those variables + semantic class names.
Per-component style budget: warn 50 kB / error 100 kB.

## Build / SSR / Docker

- Builder `@angular/build:application`; `browser: src/main.ts`, `server: src/server.ts`; output
  `dist/webrtc-angular/{browser,server}`. Prod budgets: warn 500 kB / error 1 MB initial.
- `app.config.ts`: `provideClientHydration(withEventReplay())`, `provideHttpClient(withFetch(), withInterceptorsFromDi())`.
- **Deploy gotcha:** the `Dockerfile` does **not** run the Angular SSR server. It generates its own
  plain Express `server.js` serving `dist/webrtc-angular/browser` statically with SPA fallback on port
  8080 (after `docker-entrypoint.sh` does the sed injection). **In production the app ships as a static
  SPA; `server.ts`/SSR is effectively unused there** — though prerender still runs at build time.

## Tests are broken stubs

Vitest 4 via `@angular/build:unit-test` (`tsconfig.spec.json` has `types: ["vitest/globals"]`, jsdom env,
**no `vitest.config.*`**). Only three specs exist and **all are stale CLI stubs that fail**:
`socket.spec.ts` imports `Socket` (class is `SocketService`), `webrtc.spec.ts` imports `Webrtc` (class is
`WebrtcService`), `app.spec.ts` asserts `Hello, webrtc-angular` but `App` renders only `<router-outlet />`.
Fix or replace these before relying on the test suite; there are no test helpers/setup files.

## API contract docs

`quiz_result_api_docs.md`, `vocabulary-api.md`, and `docs/` document the backend contracts this app consumes.
