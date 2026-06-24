"use strict";

// Service worker: recibe la transcripción del content script, llama a OpenAI
// y devuelve el resumen. Hacemos la llamada aquí (no en el content script)
// para evitar problemas de CORS y mantener la API key fuera de la página.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT =
  "Eres un asistente que resume transcripciones de vídeos de YouTube. " +
  "Devuelve un resumen claro y conciso EN ESPAÑOL. " +
  "Empieza con una sola frase que diga de qué trata el vídeo y, a continuación, " +
  "lista los puntos clave como bullets usando un guion (-) al inicio de cada línea. " +
  "No inventes información que no esté en la transcripción.";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    return false;
  }
  if (msg && msg.type === "SUMMARIZE") {
    summarize(msg.transcript)
      .then(sendResponse)
      .catch((e) => sendResponse({ ok: false, error: e.message || String(e) }));
    return true; // respuesta asíncrona
  }
  return false;
});

// Al clicar el icono de la barra, abrir las opciones (no hay popup).
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

async function summarize(transcript) {
  if (!transcript || !transcript.trim()) {
    return { ok: false, error: "La transcripción está vacía." };
  }

  const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);
  if (!apiKey) {
    return { ok: false, needKey: true, error: "Falta la API key de OpenAI." };
  }

  const body = {
    model: model || DEFAULT_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: "Resume esta transcripción:\n\n" + transcript },
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
    return { ok: false, error: "No se pudo conectar con OpenAI: " + (e.message || e) };
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
    return { ok: false, error: "Respuesta no válida de OpenAI." };
  }

  const summary =
    data && data.choices && data.choices[0] && data.choices[0].message
      ? (data.choices[0].message.content || "").trim()
      : "";

  if (!summary) {
    return { ok: false, error: "OpenAI devolvió una respuesta vacía." };
  }

  return { ok: true, summary };
}
