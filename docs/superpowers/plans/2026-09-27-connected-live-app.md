# Connected live application implementation plan

**Goal:** Deploy an app with email magic-link login, owned cloud snapshots, working bounded AI and live public-source flows.

**Spec:** `docs/superpowers/specs/2026-09-27-connected-live-app.md`

**Architecture:** Supabase Auth and owner-protected Postgres snapshots augment the existing browser drafts. Shared public config and verified bearer requests connect the browser and hosted AI. Existing public-source handlers remain independent.

## Constraints

No credential file reads or secret output. No paid infrastructure. Existing AI limits only. Preserve all original worktrees. No direct main push. User authorizes deployment; verify before publication. No numeric score until all rubric factors are assessed.

## Tasks and interfaces

1. Backend configuration, auth and persistence boundary. Own `api/config.mjs`, `api/assist.mjs`, `server/account/`, `server/ai/`, hosted tests, and `supabase/migrations/`. Public config: `{supabaseUrl: string|null, supabasePublishableKey: string|null, aiEnabled: boolean}`. Environment: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SECRET_KEY`, `OPENROUTER_API_KEY`, `AI_ENABLED`. Table `saved_projects`: immutable `id uuid`, `owner_id uuid default auth.uid()`, `kind` (`walkthrough` or `comparison`), `title text`, `data jsonb`, `created_at timestamptz`. RLS grants authenticated owner insert/select/delete only, no updates. Atomic AI reservation RPC `reserve_ai_request(p_user_id uuid)` is executable only by service_role, called with the server-only secret key after bearer verification. The UUID comes from the verified user response; browser users cannot reserve directly. Tests must reject foreign origins, anonymous/invalid tokens, missing config, bypassed limits and provider failures before requests can spend.
2. Account and cloud UI. Own `src/features/account/`, `src/components/AppHeader.tsx`, `src/components/app-header.css`, `src/main.tsx`, `vercel.json`, `package.json` and lockfile. Install Supabase JS SDK. Export `getSupabase(): Promise<SupabaseClient|null>` and `getAccessToken(): Promise<string|null>` from `session.ts`. Export `CloudSaveButton({kind,title,data})`. Account page sends magic links, handles SDK session recovery, lists owned snapshots and restores them with existing local store APIs. Preserve current walkthrough before restore. Revalidate cloud payloads as untrusted input; no automatic anonymous upload. Tests exercise callbacks, errors, expired sessions, session changes and restored data.
3. Root integration. Wire token into AI client requests, add cloud save affordances to walkthrough/comparison, repair manual Explorer search, show capability/login requirements, wire local config endpoint, and update architecture and handoff. Add browser regressions for manual selection without prose, real confirmation-and-search, auth and save controls. Review all delegated changes together.
4. Connected environment and release. Confirm Supabase/Vercel connection, project selection, allowed callback URLs and email delivery. Apply reviewed migration and production config through authorized account tools without printing keys. Run all four repo checks, isolated browser regressions and two-user access checks. Publish feature PR, integrate through PR, deploy to Vercel, and verify actual hosted login/save/reopen/AI/public-data paths. Record any external blocker precisely; never call an offline/mock run a live test.

## Review focus

- A sign-out or account switch must not show another user's snapshots or accept late saves under a different user.
- Cloud payload validation and restore must not erase an existing local project.
- AI limits must hold across serverless instances and invalid auth must never invoke the model.
- Production callback origin and public config must never expose a privileged key.
- An unavailable provider must preserve the user's inputs and dated findings.

## Approved release amendment, September 27

The user approved public judge access through an explicit Try as a guest action using Supabase anonymous Auth. Retain email magic-link login for supported addresses. Default Supabase email delivery is restricted to project-team addresses; no public email service or domain is being provisioned. A guest receives an authenticated UUID and uses existing owner RLS and shared AI quotas. Disclose that guest cloud access cannot be recovered after sign-out, clearing browser data or changing devices. Require confirmation before guest sign-out, preserve local work and do not silently create or upload guest projects.

Release sequence: implement and independently review guest entry, enable only anonymous Auth, run full application checks and hosted guest persistence/isolation checks, merge PR #20, deploy and verify production, then update both wikis. Preserve the one completed live AI request; do not retry paid AI merely to repeat verification. No additional AI features or visual redesign are in scope.
