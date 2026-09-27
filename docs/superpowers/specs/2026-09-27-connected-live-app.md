# Connected live application

## Intent and authority

The user requests a deployed, live-testable application with login and connected services. Email magic link is selected. Live OpenRouter requests are authorized within the existing limits only. Supabase project selection and account connections are pending. This request authorizes implementation and deployment of the resulting verified app; it does not authorize paid infrastructure, higher AI limits, reading credentials, or fabricating completed source checks.

## Design

- Preserve the unified routes and shared shell. Add `/account` for email magic-link sign-in, sign-out and owned saved snapshots. Use the Supabase browser SDK for authentication, with the exact deployed account URL allowed as a redirect.
- Public runtime configuration exposes only the Supabase project URL and publishable key, plus capability booleans. Provider credentials never reach the browser. Missing configuration produces an explicit unavailable state rather than a broken form.
- Authenticated users can explicitly save walkthrough and comparison snapshots to Supabase and reopen them. Store immutable snapshots with owner-based row-level security. Keep device drafts and archives until a successful save; restore explicitly and preserve the current walkthrough as an archive. Do not silently upload anonymous drafts or overwrite cloud work.
- Hosted AI validates the Supabase bearer token with the provider, then reserves bounded usage in Postgres before calling the existing intake model. Preserve the current OpenRouter key checks, $3 weekly limit, $10 lifetime limit, $0.01 conservative per-call allowance, request/response validation, provider restrictions and no fallback. Database reservations must be atomic across serverless instances. Failed attempts can conservatively consume a reservation.
- Anonymous public-record search and screening remain available. Explorer accepts manual activity selections without requiring prose, uses one explicit confirmation-and-search action, and displays actual AI availability. No semantic property matching is claimed.
- Public-source gaps, source conflicts and incomplete scores remain visible. Login and connectivity do not establish feasibility evidence.
- Deploy only after migrations, real configuration, owner isolation, auth callback, cloud save/reopen, AI and public APIs are verified. A pending provider connection is a blocker, not a completed feature.

## Verification

Unit tests and browser flows cover missing configuration, failed login, callback recovery, sign-out, owner isolation, bounded authenticated AI, manual Explorer search, source errors, save failure and restored snapshots. Run npm test, typecheck, lint and build. Run final production checks on the deployed origin, with one bounded paid AI test after configuration and no credential output. User completes their email link when human mailbox interaction is necessary.
