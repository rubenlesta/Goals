# Rumbo

PWA mobile-first para crear, seguir y celebrar retos personales. No necesita backend ni dependencias de instalación: los retos se guardan en el almacenamiento local del navegador.

Al abrirla, solicita el PIN `0000` antes de mostrar la interfaz.

> El PIN es una pantalla de acceso visual, no un mecanismo de cifrado: no protege los datos frente a alguien con acceso a las herramientas del navegador o al almacenamiento local del dispositivo.

## Probar en local

Desde esta carpeta, inicia un servidor HTTP:

```sh
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Un servidor HTTP es necesario para que el navegador pueda activar el service worker y las funciones de instalación/offline de la PWA.

## Instalar en el móvil

Consulta la [guía paso a paso para probar e instalar Rumbo en tu móvil](./To_install.md), con instrucciones para la red Wi‑Fi local, publicación HTTPS e instalación en iOS y Android.

## Incluye

- Retos de ejemplo al primer inicio y persistencia en `localStorage`.
- Filtros por Hábito, Clase, Laboral, Vida y Leyenda; navegación entre Mis retos y Mis logros.
- Alta, edición y eliminación de retos, con notas y categorías actualizadas.
- Celebración con confeti al completar; las metas Leyenda se pueden exponer en Mis logros.
- Mis logros tiene cuatro espacios destacados exclusivos para metas Leyenda, archivo por fecha/tema y borrado individual.
- Retos Cadena permite crear, reordenar y completar subretos por etapas.
- Hábitos con check-in diario y fecha de última realización; se mantienen en Mis retos y no se archivan al completarlos.
- Historial de retos conseguidos con opción de vaciar los logros archivados, conservando Leyenda por defecto.
- Persistencia de fecha de consecución, etiquetas, estado fijado, subretos y reflexión final en `localStorage`; los datos previos se migran al nuevo esquema de categorías.
- Manifiesto, icono y caché offline de los recursos principales.
- Código separado por responsabilidades: interfaz (`app.js`), datos (`goals-store.js`) y confeti (`celebration.js`).
