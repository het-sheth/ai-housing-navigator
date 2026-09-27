# Chrome DevTools MCP in Codex CLI

Checked September 27, 2026 on het-legion. The [wiki CLI note](https://github.com/het-sheth/ai-housing-hackathon-wiki/blob/docs/chrome-devtools-cli/docs/chrome-devtools-mcp-cli.md) records a user-level Codex stdio registration for `chrome-devtools`. In its CLI session, the native server exposed 30 tools, but native `list_pages` failed when Chromium could not start inside the command sandbox. The wiki note is pending publication on a separate branch. No native Chrome DevTools tool is exposed in this current agent session, so registration alone does not make it callable here.

An approval-reviewed isolated stdio probe outside that sandbox succeeded in this session. It initialized MCP protocol `2025-03-26`, read `tools/list` before calling a tool, found 30 tools, and called `list_pages` with its empty argument schema. The result included `about:blank`. This verifies the narrow workaround, not an app inspection or general Chromium support. No global Codex configuration was changed. No personal browser profile, credentials, project data or paid AI endpoint was used.

The machine has Node v25.2.1 and Chromium 148.0.7778.178 at `/usr/bin/chromium`. Google Chrome was not found on PATH during the earlier check. Chrome DevTools MCP officially supports Google Chrome and Chrome for Testing; the installed Chromium worked for the bounded probe but is not guaranteed by upstream.

## Use for this repository

Chrome DevTools MCP can inspect browser network requests, console errors, map rendering and performance traces. It complements API contract tests and repeatable browser regressions. Use synthetic project data and an isolated profile. Block `/api/assist` before inspecting the local app so browser checks make no paid AI request. Never attach to a personal browser profile.

In a Codex CLI session, check `codex mcp list` for registration and try the native tools only if they are actually exposed. If native `list_pages` fails with the documented Chromium socket error, use an approval-reviewed elevated stdio command with these browser arguments:

```sh
npx -y chrome-devtools-mcp@latest \
  --executablePath=/usr/bin/chromium --isolated --headless \
  --no-usage-statistics --no-performance-crux
```

An earlier bounded JSON-RPC probe and prior failure evidence are in the wiki CLI note. Request `initialize`, send `notifications/initialized`, inspect `tools/list` schemas, then call only the needed tool. For app inspection, add explicit blocked URL patterns for `/api/assist` and limit navigation to a synthetic local app session. Do not change the global sandbox policy based on an assumption that it controls native MCP launches. Recheck native access after a runtime change and retire the workaround when it succeeds.

## Sources

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Server configuration](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md)
- [Official OpenAI documentation: Codex MCP setup](https://learn.chatgpt.com/docs/extend/mcp)
