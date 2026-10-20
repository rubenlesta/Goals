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
- Filtros por categoría y navegación entre retos, vitrina e historial.
- Alta, edición y eliminación de retos, con fecha objetivo, récord y notas.
- Celebración con confeti al completar; los hitos Oro abren una invitación para fijarlos en la Vitrina de Honor.
- Vitrina con tres espacios destacados, archivo Oro por fecha/tema, recuerdos con notas y récords previos, reflexión final y tarjetas PNG para compartir.
- Historial separado para los retos completados de Plata, Bronce y Hábitos.
- Persistencia de fecha de consecución, etiquetas, estado fijado y reflexión final en `localStorage`.
- Manifiesto, icono y caché offline de los recursos principales.
- Código separado por responsabilidades: interfaz (`app.js`), datos (`goals-store.js`) y confeti (`celebration.js`).
