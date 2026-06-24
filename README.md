# YouTube Resume

A Chrome extension (Manifest V3) that extracts a YouTube video's transcript and
generates a **summary with bullet points** using the OpenAI API.

The summary appears in a panel injected next to the video, in the right-hand
column.

## Features

- 🎯 **"Summarize video"** button integrated into the YouTube page.
- 📝 Concise summary structured as key bullet points (in Spanish by default —
  easy to change in `background.js`).
- 🤖 Powered by the OpenAI API (`gpt-4o-mini` by default, `gpt-4o` optional).
- 🔑 Your **API key is stored only in your browser** (`chrome.storage.local`).
- 🧭 Works with YouTube's in-app (SPA) navigation: the panel reappears when you
  switch videos without reloading.
- 🪄 Tries to open the transcript automatically; if it can't, it tells you to
  open it manually.

## Installation (developer mode)

1. Download or clone this repository:
   ```bash
   git clone git@github.com:quimpg/resumeTube.git
   ```
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the repository folder.
5. The "YouTube Resume" extension will appear in the list.

## Configuration

1. Click the extension icon in the toolbar (or right-click → *Options*).
2. Paste your **OpenAI API key** (`sk-...`) and pick the model.
3. Click **Save**.

> You need an OpenAI account with API access enabled. Create your key at
> https://platform.openai.com/api-keys

## Usage

1. Open any YouTube video (`youtube.com/watch?...`).
2. In the right-hand column you'll see the **📝 Resumen IA** panel.
3. Click **Summarize video**.
   - If you get *"transcript not found"*, open *"Show transcript"* on the video
     manually and click the button again.
4. The summary appears in the panel.

## Privacy

- The **API key** is stored only in your browser (`chrome.storage.local`); it is
  never sent anywhere except to the OpenAI API itself in the request headers.
- When you click "Summarize video", the **transcript text is sent to OpenAI** to
  generate the summary. Review OpenAI's data usage policy if this matters to you.
- The extension does not collect or send data to any third party other than
  OpenAI.

## How it works

```
Click "Summarize video"
  → content.js extracts the transcript from the DOM (.ytSectionListRendererContents)
  → message to the service worker (background.js)
  → POST to https://api.openai.com/v1/chat/completions
  → summary
  → rendered in the injected panel
```

The OpenAI call is made from the **service worker** (not the content script) to
avoid CORS issues and to keep the API key out of the web page context.

## Limitations

- The video must have a **transcript/captions** available.
- Very long transcripts are **truncated** automatically (safety cap) and a
  notice is shown in the panel.
- YouTube's DOM selectors change over time; if YouTube updates its UI, the
  extraction may need an adjustment.
- The cost of each summary is billed to your own OpenAI account based on the
  chosen model.

## Project structure

```
manifest.json     Extension configuration (MV3)
background.js     Service worker: calls the OpenAI API
content.js        Injects the panel and extracts the transcript from the DOM
content.css       Panel styles
options.html/js   Options page (API key and model)
icons/            Extension icons
docs/             Design spec
```

## License

[MIT](LICENSE) © quimpg
