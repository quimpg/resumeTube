"use strict";

// Service worker: receives the transcript from the content script, calls OpenAI
// and returns the summary. We make the call here (not in the content script) to
// avoid CORS issues and to keep the API key out of the web page.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "You are an assistant that summarizes YouTube video transcripts. " +
  "Return a clear, concise summary IN ENGLISH. " +
  "Start with a single sentence stating what the video is about, then " +
  "list the key points as bullets, using a hyphen (-) at the start of each line. " +
  "Do not invent information that is not in the transcript.";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return false;
  }
  if (msg && msg.type === "SUMMARIZE") {
    summarize(msg.transcript)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true; // asynchronous response
  }
  return false;
});

// Clicking the toolbar icon opens the options page (there is no popup).
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

async function summarize(transcript) {
  if (!transcript || !transcript.trim()) {
    return { ok: false, error: "The transcript is empty." };
  }

  const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);
  if (!apiKey) {
    return { ok: false, needKey: true, error: "Missing OpenAI API key." };
  }

  const body = {
    model: model || DEFAULT_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Summarize this transcript:\n\n" + transcript },
    ],
  };

  let res;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: "Could not connect to OpenAI: " + (e.message || e) };
  }

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = (err && err.error && err.error.message) || JSON.stringify(err);
    } catch {
      try {
        detail = await res.text();
      } catch {
        detail = "";
      }
    }
    return { ok: false, error: `OpenAI (${res.status}): ${detail}` };
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return { ok: false, error: "Invalid response from OpenAI." };
  }

  const summary =
    data && data.choices && data.choices[0] && data.choices[0].message
      ? (data.choices[0].message.content || "").trim()
      : "";

  if (!summary) {
    return { ok: false, error: "OpenAI returned an empty response." };
  }

  return { ok: true, summary };
}
