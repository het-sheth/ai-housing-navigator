# Chrome DevTools MCP assessment

Checked September 26, 2026. Chrome DevTools MCP is not configured in the local Codex MCP server list and no Chrome DevTools tools are exposed in this session. Plugin directory search returned no matching plugin. No browser connection or installation was performed.

The machine has Node v25.2.1, npm 11.6.2 and Chromium 148.0.7778.178 at `/usr/bin/chromium`. Google Chrome was not found on PATH. The upstream project documents Node LTS and Chrome requirements; it officially supports Google Chrome and Chrome for Testing. Chromium compatibility is not guaranteed.

## Fit for this repository

Use it for interactive diagnosis of browser network requests, console errors, map rendering and performance traces. It can help distinguish a failed API call, missing source response and rendering problem. It does not replace API contract tests, source validation or repeatable browser regression scripts.

For the Housing Navigator, keep a temporary browser profile, block the AI endpoint during verification, and inspect synthetic drafts only. Do not attach to a personal browser profile. Preserve the existing no-paid-inference constraint.

## Reviewed setup example, not executed

After providing a supported Chrome installation and Node LTS, the documented Codex stdio setup can be adapted as follows:

```sh
codex mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest \
  --isolated --headless \
  --no-usage-statistics --no-performance-crux \
  --redact-network-headers \
  --blocked-url-pattern='http://127.0.0.1:5173/api/assist*' \
  --blocked-url-pattern='http://127.0.0.1:5175/api/assist*' \
  --blocked-url-pattern='https://ai-housing-navigator.vercel.app/api/assist*'
```

This changes the user's Codex MCP configuration when executed. It is a setup example, not evidence that the integration is connected. For reproducible tooling, replace `@latest` with a version verified during installation. Use the full tool set for network and console inspection; upstream's slim mode only exposes navigation, evaluation and screenshots.

## Verification after connection

1. Confirm the server is listed and its tools are available in the active client.
2. Open a synthetic local walkthrough in the isolated browser.
3. Confirm property lookup and screening requests, named source failures and no AI requests.
4. Reproduce saved-stage recovery and parcel replacement, inspect console output, and capture the desktop/mobile map state.
5. Keep automated API and browser regressions as the repeatable verification record.

## Sources

- [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [Server configuration](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/configuration.md)
- [Codex MCP setup](https://developers.openai.com/codex/mcp)
