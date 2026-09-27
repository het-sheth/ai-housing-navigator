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
