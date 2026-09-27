# Chrome DevTools MCP in Codex CLI

Checked September 27, 2026 on het-legion. The [wiki CLI note](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/chrome-devtools-cli/docs/chrome-devtools-mcp-cli.md) records a user-level Codex stdio registration for `chrome-devtools`. This Codex session exposes 30 native Chrome DevTools tools, but native `list_pages` returns `Protocol error (Target.setDiscoverTargets): Target closed`. A direct sandboxed Chromium launch exits after a local socket permission error.

An approval-reviewed isolated stdio launch outside that sandbox succeeded. It initialized MCP protocol `2025-03-26`, found 30 tools, and inspected the local guided workspace with `/api/assist` blocked. A live search and confirmation returned 2003 MOUNTFORD AVE, parcel `0046R00029000000`. The County boundary rendered over real OpenStreetMap tiles; the tile image requests returned HTTP 200. The local screenshot is `/tmp/housing-walkthrough-integration/mcp-live-map.png`. With dependencies installed locally in the worktree, the console showed only a missing favicon request. No global Codex configuration, personal browser profile, credentials or paid AI endpoint was used.

The machine has Node v25.2.1 and Chromium 148.0.7778.178 at `/usr/bin/chromium`. Google Chrome was not found on PATH during the earlier check. Chrome DevTools MCP officially supports Google Chrome and Chrome for Testing; the installed Chromium worked for the bounded probe but is not guaranteed by upstream.

## Use for this repository

Chrome DevTools MCP can inspect browser network requests, console errors, map rendering and performance traces. It complements API contract tests and repeatable browser regressions. Use synthetic project data and an isolated profile. Block `/api/assist` before inspecting the local app so browser checks make no paid AI request. Never attach to a personal browser profile.

In a Codex CLI session, check `codex mcp list` for registration and try the native tools only if they are actually exposed. If native `list_pages` fails with the documented Chromium socket error, use an approval-reviewed elevated stdio command with these browser arguments:

```sh
npx -y chrome-devtools-mcp@latest \
  --executablePath=/usr/bin/chromium --isolated --headless \
  --no-usage-statistics --no-performance-crux \
  '--blockedUrlPattern=*://*/api/assist'
```

An earlier bounded JSON-RPC probe and prior failure evidence are in the wiki CLI note. Request `initialize`, send `notifications/initialized`, inspect `tools/list` schemas, then call only the needed tool. The repeatable synthetic walkthrough is `node scripts/walkthrough-integration-smoke.mjs`; it blocks `/api/assist` and records desktop, mobile and export artifacts under `/tmp/housing-walkthrough-integration/`. Do not change the global sandbox policy based on an assumption that it controls native MCP launches. Recheck native access after a runtime change and retire the workaround when it succeeds.

## Sources

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Server configuration](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md)
- [Official OpenAI documentation: Codex MCP setup](https://learn.chatgpt.com/docs/extend/mcp)
