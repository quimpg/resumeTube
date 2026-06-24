# YouTube Resume

Extensión de Chrome (Manifest V3) que extrae la transcripción de un vídeo de
YouTube y genera un **resumen en español con bullets** usando la API de OpenAI.

El resumen aparece en un panel inyectado junto al vídeo (columna de la derecha).

## Instalación (modo desarrollador)

1. Abre Chrome y ve a `chrome://extensions`.
2. Activa el **Modo de desarrollador** (arriba a la derecha).
3. Pulsa **Cargar descomprimida** y selecciona esta carpeta
   (`/net/www/youtubeResume`).
4. La extensión "YouTube Resume" aparecerá en la lista.

## Configuración

1. Haz clic en el icono de la extensión en la barra (o botón derecho →
   *Opciones*).
2. Pega tu **API key de OpenAI** (`sk-...`) y elige el modelo
   (`gpt-4o-mini` por defecto).
3. Pulsa **Guardar**.

La key se guarda únicamente en tu navegador (`chrome.storage.local`).

## Uso

1. Abre cualquier vídeo de YouTube (`youtube.com/watch?...`).
2. En la columna de la derecha verás el panel **📝 Resumen IA**.
3. Pulsa **Resumir vídeo**.
   - La extensión intenta abrir la transcripción automáticamente. Si no lo
     consigue, abre manualmente *"Mostrar transcripción"* en el vídeo y vuelve
     a pulsar el botón.
4. El resumen en español aparece en el panel.

## Notas

- El vídeo debe tener transcripción/subtítulos disponibles.
- Transcripciones muy largas se truncan automáticamente (tope de seguridad) y
  se avisa en el panel.
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
