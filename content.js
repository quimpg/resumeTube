"use strict";

// Content script para páginas /watch de YouTube.
// - Inyecta un panel con un botón "Resumir vídeo".
// - Extrae la transcripción desde el div .ytSectionListRendererContents.
// - Pide el resumen al service worker y lo muestra en el panel.

(() => {
  const PANEL_ID = "yt-resume-panel";
  const MAX_CHARS = 48000; // tope de seguridad para la longitud de la transcripción

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- helpers de DOM ----------

  function findByAriaLabel(regex) {
    for (const el of document.querySelectorAll("[aria-label]")) {
      const label = el.getAttribute("aria-label") || "";
      if (regex.test(label)) return el;
    }
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  // ---------- extracción de la transcripción ----------

  function readSegments() {
    const container =
      document.querySelector(".ytSectionListRendererContents") ||
      document.querySelector(
        "ytd-transcript-segment-list-renderer #segments-container"
      ) ||
      document.querySelector("#segments-container");
    if (!container) return "";

    const segs = container.querySelectorAll("ytd-transcript-segment-renderer");
    if (segs.length) {
      const lines = [];
      segs.forEach((seg) => {
        const textEl =
          seg.querySelector(".segment-text") ||
          seg.querySelector("yt-formatted-string");
        const t = (textEl ? textEl.textContent : seg.textContent) || "";
        const clean = t.replace(/\s+/g, " ").trim();
        if (clean) lines.push(clean);
      });
      return lines.join(" ");
    }

    // Fallback: texto plano del contenedor.
    return (container.innerText || "").replace(/\s+/g, " ").trim();
  }

  async function openTranscriptPanel() {
    // Expandir la descripción para revelar el botón "Mostrar transcripción".
    const expand = document.querySelector(
      "#description #expand, tp-yt-paper-button#expand, #expand"
    );
    if (expand) {
      expand.click();
      await sleep(400);
    }
    const btn = findByAriaLabel(/transcript|transcripci/i);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  async function waitForSegments(timeoutMs) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const text = readSegments();
      if (text) return text;
      await sleep(300);
    }
    return "";
  }

  async function getTranscript() {
    let text = readSegments();
    if (text) return text;
    await openTranscriptPanel();
    return waitForSegments(8000);
  }

  // ---------- comunicación con el service worker ----------

  function requestSummary(transcript) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "SUMMARIZE", transcript }, (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(resp);
        }
      });
    });
  }

  // ---------- panel UI ----------

  function setStatus(msg) {
    const el = document.querySelector(`#${PANEL_ID} .ytr-status`);
    if (el) el.textContent = msg || "";
  }

  function setResult(html) {
    const el = document.querySelector(`#${PANEL_ID} .ytr-result`);
    if (el) el.innerHTML = html || "";
  }

  function renderSummary(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let html = "";
    let inList = false;
    for (const line of lines) {
      const m = line.match(/^[-*•]\s+(.*)$/);
      if (m) {
        if (!inList) {
          html += "<ul>";
          inList = true;
        }
        html += `<li>${escapeHtml(m[1])}</li>`;
      } else {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += `<p>${escapeHtml(line)}</p>`;
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function showNeedKey() {
    setResult(
      `<p class="ytr-error">Falta tu API key de OpenAI. ` +
        `<a href="#" class="ytr-open-options">Configúrala en Opciones</a>.</p>`
    );
    const link = document.querySelector(`#${PANEL_ID} .ytr-open-options`);
    if (link) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
      });
    }
  }

  let busy = false;
  async function onSummarizeClick() {
    if (busy) return;
    busy = true;
    setResult("");
    setStatus("Extrayendo transcripción…");
    try {
      let transcript = await getTranscript();
      if (!transcript) {
        setStatus("");
        setResult(
          `<p class="ytr-error">No se encontró la transcripción. Abre ` +
            `"Mostrar transcripción" en el vídeo y vuelve a intentarlo. ` +
            `Si el vídeo no tiene subtítulos, no es posible resumirlo.</p>`
        );
        return;
      }

      let truncated = false;
      if (transcript.length > MAX_CHARS) {
        transcript = transcript.slice(0, MAX_CHARS);
        truncated = true;
      }

      setStatus("Generando resumen con OpenAI…");
      const resp = await requestSummary(transcript);

      if (!resp || !resp.ok) {
        setStatus("");
        if (resp && resp.needKey) {
          showNeedKey();
        } else {
          setResult(
            `<p class="ytr-error">${escapeHtml(
              (resp && resp.error) || "Error desconocido"
            )}</p>`
          );
        }
        return;
      }

      setStatus(
        truncated
          ? "Resumen generado (transcripción truncada por longitud)."
          : "Resumen generado."
      );
      setResult(renderSummary(resp.summary));
    } catch (e) {
      setStatus("");
      setResult(`<p class="ytr-error">${escapeHtml(e.message || String(e))}</p>`);
    } finally {
      busy = false;
    }
  }

  function buildPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="ytr-header">
        <span class="ytr-title">📝 Resumen IA</span>
        <button class="ytr-settings" title="Opciones" type="button">⚙️</button>
      </div>
      <button class="ytr-btn" type="button">Resumir vídeo</button>
      <div class="ytr-status"></div>
      <div class="ytr-result"></div>
    `;
    panel.querySelector(".ytr-btn").addEventListener("click", onSummarizeClick);
    panel
      .querySelector(".ytr-settings")
      .addEventListener("click", () =>
        chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" })
      );
    return panel;
  }

  function ensurePanel() {
    if (!location.pathname.startsWith("/watch")) return;
    if (document.getElementById(PANEL_ID)) return;
    const host =
      document.querySelector("#secondary-inner") ||
      document.querySelector("#secondary");
    if (!host) return;
    host.prepend(buildPanel());
  }

  // YouTube es una SPA: re-inyectar al navegar y cuando cambia el DOM.
  window.addEventListener("yt-navigate-finish", () =>
    setTimeout(ensurePanel, 500)
  );

  let scheduled = false;
  const scheduleEnsure = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      ensurePanel();
    }, 600);
  };
  new MutationObserver(scheduleEnsure).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  ensurePanel();
})();
