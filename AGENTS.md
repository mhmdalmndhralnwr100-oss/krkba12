# Architecture

Arabic RTL client application. `index.html` contains the inherited glass-style design and social metadata. `src/app.js` contains React components written with HTM, with real Identity signup/login/confirmation/recovery/invite flows. `src/data.js` adapts the inherited collection interface to authenticated REST requests and polls only while the page is visible. There is no Firebase or local-account fallback.

`netlify/server/index.mjs` is the single Hono server entrypoint. It validates the session against the same-origin Identity user endpoint for every request. The browser Identity SDK manages cookies; secrets and session contents must never be logged. Server-controlled Identity roles govern administration. Only the project owner can bootstrap the first admin using the dashboard; never infer roles from email addresses or user metadata.

`db/schema.ts` defines Drizzle tables. Migrations live in `netlify/database/migrations/` and are applied by the platform. Use beta Drizzle packages for the Netlify adapter. Generate a migration for every schema change; never apply it manually.

`public/` contains uploaded icons, manifest, security headers, and a service worker. Cache only the public app shell. Never cache `/api/` or `/.netlify/` responses. Never store application records or passwords in localStorage. Netlify Identity's own session management is handled by its SDK.

Use Arabic copy, labels, loading and error states. Keep failed message/order drafts in the active component; never claim offline submissions are queued. All request-driven backend work belongs in the server. Static assets deploy from `dist`; do not add a catch-all rewrite that shadows `/api/`.

Node 24 is configured for deployment. Avoid builds, tests, and dev servers in the agent environment: the platform validates builds automatically. Verify modifications by reading source files. Root dependencies use npm with a committed lockfile.

`/admin` serves the owner workspace through an explicit rewrite to the public app shell. Server checks remain authoritative. `src/owner-settings.js` edits public application content persisted in `app_content`; `src/content-defaults.js` holds defaults only. `/api/content` reads are public and never cached; writes require a verified Identity admin. Service availability and the order pause setting are enforced by the server. Employee invitations and the first admin role remain owner-managed in Identity.
