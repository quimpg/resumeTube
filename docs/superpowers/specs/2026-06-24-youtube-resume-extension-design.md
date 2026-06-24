# YouTube Resume — Chrome Extension Design

**Fecha:** 2026-06-24
**Estado:** Aprobado (diseño)

## Objetivo

Extensión de Chrome (Manifest V3) que, en una página de vídeo de YouTube,
extrae la transcripción y genera un resumen en español (con bullets) usando la
API de OpenAI (`gpt-4o-mini` por defecto). El resumen se muestra en un panel
inyectado en la propia página, junto al vídeo.

## Decisiones tomadas

| Decisión | Elección |
|----------|----------|
| Dónde se muestra el resumen | Panel inyectado en la página de YouTube |
| Idioma y formato del resumen | Español, con bullets (puntos clave) |
| Modelo OpenAI por defecto | `gpt-4o-mini` |
| API key | La introduce el usuario en la página de Opciones; se guarda en `chrome.storage.local` |
| Disparador | Manual: botón "Resumir vídeo" |

## Origen de la transcripción

El contenido de la transcripción vive dentro del div con clase
`ytSectionListRendererContents` (panel de transcripción de YouTube). Los
segmentos individuales son elementos `ytd-transcript-segment-renderer`.

La extensión usa la sesión del navegador del usuario tal cual (ya está logeado);
no gestiona login. Lee el DOM que el usuario ya ve.

## Arquitectura (Manifest V3)

Cuatro piezas con responsabilidades aisladas:

### 1. `content.js` (content script en `*://*.youtube.com/watch*`)
- Inyecta el botón **"Resumir vídeo"** y un panel de resultado en la página.
- **Extrae la transcripción:**
  1. Busca el panel de transcripción (`ytSectionListRendererContents`).
  2. Si no está abierto, intenta abrirlo programáticamente (clic en el botón
     "Mostrar transcripción" / "Show transcript").
  3. Lee y concatena el texto de los segmentos
     (`ytd-transcript-segment-renderer`).
- Envía la transcripción al service worker vía `chrome.runtime.sendMessage`.
- Pinta el resumen recibido (o el error) en el panel.

### 2. `background.js` (service worker)
- Recibe la transcripción.
- Lee `apiKey` y `model` de `chrome.storage.local`.
- Llama a `https://api.openai.com/v1/chat/completions` con un prompt de sistema
  que pide un resumen en español con bullets.
- Devuelve el resumen (o un error legible) al content script.
- **Por qué aquí y no en el content script:** evita problemas de CORS y mantiene
  la API key fuera del contexto de la página web.

### 3. `options.html` + `options.js`
- Formulario para guardar la **API key de OpenAI** y (opcional) seleccionar el
  modelo.
- Persiste en `chrome.storage.local`.

### 4. `manifest.json` + `content.css` + iconos
- `manifest_version: 3`.
- `host_permissions`: `https://api.openai.com/*`.
- `permissions`: `storage`.
- `content_scripts` en las URLs de YouTube watch, con `content.css`.
- `background.service_worker`: `background.js`.
- `options_page`: `options.html`.

## Flujo de datos

```
Clic "Resumir vídeo"
  → content.js extrae transcripción del DOM (ytSectionListRendererContents)
  → chrome.runtime.sendMessage(transcripción)
  → background.js lee apiKey/model de storage
  → POST a OpenAI /v1/chat/completions
  → resumen
  → respuesta a content.js
  → render en el panel inyectado
```

## Manejo de errores

| Caso | Comportamiento |
|------|----------------|
| Sin API key configurada | Panel avisa y enlaza a la página de Opciones |
| No se encuentra transcripción / vídeo sin subtítulos | Mensaje claro pidiendo abrir la transcripción manualmente |
| Error de la API (key inválida, sin saldo, rate limit) | Muestra el mensaje de error de OpenAI |
| Transcripción muy larga (supera umbral de caracteres) | Se trunca con un aviso visible en el panel |

## Fuera de alcance (v1) — YAGNI

- Chunking / map-reduce para vídeos extremadamente largos.
- Historial de resúmenes y exportación.
- Selección de idioma de salida configurable (fijado a español en v1).
- Resumen automático al cargar el vídeo (v1 es manual).

## Estructura de archivos prevista

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
