# YouTube Resume

Extensión de Chrome (Manifest V3) que extrae la transcripción de un vídeo de
YouTube y genera un **resumen en español con bullets** usando la API de OpenAI.

El resumen aparece en un panel inyectado junto al vídeo, en la columna derecha.

## Características

- 🎯 Botón **"Resumir vídeo"** integrado en la página de YouTube.
- 📝 Resumen en **español**, estructurado en puntos clave.
- 🤖 Usa la API de OpenAI (`gpt-4o-mini` por defecto, `gpt-4o` opcional).
- 🔑 Tu **API key se guarda solo en tu navegador** (`chrome.storage.local`).
- 🧭 Funciona con la navegación interna de YouTube (SPA): el panel reaparece al
  cambiar de vídeo sin recargar.
- 🪄 Intenta abrir la transcripción automáticamente; si no puede, te avisa para
  que la abras a mano.

## Instalación (modo desarrollador)

1. Descarga o clona este repositorio:
   ```bash
   git clone git@github.com:quimpg/resumeTube.git
   ```
2. Abre Chrome y ve a `chrome://extensions`.
3. Activa el **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta del repositorio.
5. La extensión "YouTube Resume" aparecerá en la lista.

## Configuración

1. Haz clic en el icono de la extensión en la barra (o botón derecho →
   *Opciones*).
2. Pega tu **API key de OpenAI** (`sk-...`) y elige el modelo.
3. Pulsa **Guardar**.

> Necesitas una cuenta de OpenAI con API habilitada. Puedes crear tu key en
> https://platform.openai.com/api-keys

## Uso

1. Abre cualquier vídeo de YouTube (`youtube.com/watch?...`).
2. En la columna de la derecha verás el panel **📝 Resumen IA**.
3. Pulsa **Resumir vídeo**.
   - Si aparece *"No se encontró la transcripción"*, abre manualmente
     *"Mostrar transcripción"* en el vídeo y vuelve a pulsar el botón.
4. El resumen en español aparece en el panel.

## Privacidad

- La **API key** se almacena únicamente en tu navegador
  (`chrome.storage.local`); no se envía a ningún sitio salvo a la propia API de
  OpenAI en las cabeceras de la petición.
- Al pulsar "Resumir vídeo", el **texto de la transcripción se envía a OpenAI**
  para generar el resumen. Revisa la política de uso de datos de OpenAI si esto
  es relevante para ti.
- La extensión no recopila ni envía datos a terceros distintos de OpenAI.

## Cómo funciona

```
Clic "Resumir vídeo"
  → content.js extrae la transcripción del DOM (.ytSectionListRendererContents)
  → mensaje al service worker (background.js)
  → POST a https://api.openai.com/v1/chat/completions
  → resumen
  → render en el panel inyectado
```

La llamada a OpenAI se hace desde el **service worker** (no desde el content
script) para evitar problemas de CORS y mantener la API key fuera del contexto
de la página web.

## Limitaciones

- El vídeo debe tener **transcripción/subtítulos** disponibles.
- Las transcripciones muy largas se **truncan** automáticamente (tope de
  seguridad) y se avisa en el panel.
- Los selectores del DOM de YouTube cambian con el tiempo; si YouTube actualiza
  su interfaz, la extracción podría necesitar un ajuste.
- El coste de cada resumen corre por tu cuenta de OpenAI según el modelo
  elegido.

## Estructura

```
manifest.json     Configuración de la extensión (MV3)
background.js     Service worker: llama a la API de OpenAI
content.js        Inyecta el panel y extrae la transcripción del DOM
content.css       Estilos del panel
options.html/js   Página de opciones (API key y modelo)
icons/            Iconos de la extensión
docs/             Spec de diseño
```

## Licencia

[MIT](LICENSE) © quimpg
