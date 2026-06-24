# YouTube Resume — Chrome Extension Design

**Date:** 2026-06-24
**Status:** Approved (design)

## Goal

A Chrome extension (Manifest V3) that, on a YouTube video page, extracts the
transcript and generates a summary with bullet points using the OpenAI API
(`gpt-4o-mini` by default). The summary is shown in a panel injected into the
page itself, next to the video.

## Decisions made

| Decision | Choice |
|----------|--------|
| Where the summary is shown | Panel injected into the YouTube page |
| Summary format | Bullet points (key takeaways) |
| Default OpenAI model | `gpt-4o-mini` |
| API key | Entered by the user on the Options page; stored in `chrome.storage.local` |
| Trigger | Manual: "Summarize video" button |

## Transcript source

The transcript content lives inside the div with class
`ytSectionListRendererContents` (YouTube's transcript panel). The individual
segments are `ytd-transcript-segment-renderer` elements.

The extension uses the user's existing browser session as-is (already logged in);
it does not manage login. It reads the DOM the user already sees.

## Architecture (Manifest V3)

Four pieces with isolated responsibilities:

### 1. `content.js` (content script on `*://*.youtube.com/*`)
- Injects the **"Summarize video"** button and a result panel into the page.
- **Extracts the transcript:**
  1. Looks for the transcript panel (`ytSectionListRendererContents`).
  2. If it is not open, tries to open it programmatically (clicks the
     "Show transcript" button).
  3. Reads and concatenates the segment text
     (`ytd-transcript-segment-renderer`).
- Sends the transcript to the service worker via `chrome.runtime.sendMessage`.
- Renders the received summary (or error) in the panel.

> Note: the content script matches all of `youtube.com` and filters for
> `/watch` internally, so it survives YouTube's SPA navigation (clicking into a
> video from the homepage does not trigger a full page load).

### 2. `background.js` (service worker)
- Receives the transcript.
- Reads `apiKey` and `model` from `chrome.storage.local`.
- Calls `https://api.openai.com/v1/chat/completions` with a system prompt asking
  for a summary with bullet points.
- Returns the summary (or a readable error) to the content script.
- **Why here and not in the content script:** avoids CORS issues and keeps the
  API key out of the web page context.

### 3. `options.html` + `options.js`
- Form to save the **OpenAI API key** and (optionally) select the model.
- Persists to `chrome.storage.local`.

### 4. `manifest.json` + `content.css` + icons
- `manifest_version: 3`.
- `host_permissions`: `https://api.openai.com/*`.
- `permissions`: `storage`.
- `content_scripts` on YouTube pages, with `content.css`.
- `background.service_worker`: `background.js`.
- `options_page`: `options.html`.

## Data flow

```
Click "Summarize video"
  → content.js extracts the transcript from the DOM (ytSectionListRendererContents)
  → chrome.runtime.sendMessage(transcript)
  → background.js reads apiKey/model from storage
  → POST to OpenAI /v1/chat/completions
  → summary
  → response to content.js
  → render in the injected panel
```

## Error handling

| Case | Behavior |
|------|----------|
| No API key configured | Panel warns and links to the Options page |
| Transcript not found / video without captions | Clear message asking to open the transcript manually |
| API error (invalid key, no credit, rate limit) | Shows the OpenAI error message |
| Very long transcript (over the character cap) | Truncated with a visible notice in the panel |

## Out of scope (v1) — YAGNI

- Chunking / map-reduce for extremely long videos.
- Summary history and export.
- Configurable output language (the prompt sets the language in v1).
- Automatic summary on video load (v1 is manual).

## Planned file structure

```
manifest.json
background.js
content.js
content.css
options.html
options.js
icons/
  icon16.png
  icon48.png
  icon128.png
```
