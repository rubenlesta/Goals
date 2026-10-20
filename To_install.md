# Instalar y probar Rumbo en el móvil

Rumbo es una aplicación web estática: no necesita backend ni un proceso de compilación. Para probarla en el móvil puedes servirla desde tu ordenador por Wi‑Fi o publicarla en un servicio gratuito con HTTPS.

> **Importante:** los retos se guardan en el almacenamiento local del navegador. Los datos creados en el ordenador no aparecen automáticamente en el móvil; cada navegador y dispositivo mantiene sus propios datos.

## Opción 1: abrirla desde la red Wi‑Fi local

1. Conecta el ordenador y el teléfono a la misma red Wi‑Fi.
2. En el ordenador, abre una terminal y ejecuta:

   ```bash
   cd /home/ruru/Proyectos/Goals
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

   Deja la terminal abierta mientras utilizas la aplicación.

3. En otra terminal, consulta la IP local del ordenador:

   ```bash
   hostname -I
   ```

   Identifica la dirección de la red Wi‑Fi, normalmente con un formato similar a `192.168.1.25` o `10.0.0.12`.

4. En el navegador del móvil, abre `http://IP-DEL-ORDENADOR:8000`. Por ejemplo:

   ```text
   http://192.168.1.25:8000
   ```

5. Si no se abre, comprueba que ambos dispositivos sigan en la misma Wi‑Fi y que el firewall del ordenador permita conexiones entrantes al puerto `8000`.

Esta opción sirve para revisar rápidamente el diseño y la interacción. La dirección local usa HTTP, no HTTPS; por eso el navegador puede limitar funciones de PWA como el service worker o la instalación. **No configures un reenvío del puerto 8000 desde Internet al ordenador.**

## Opción 2: publicar gratis con HTTPS

La carpeta del proyecto no necesita build. Publica todos los archivos de `Goals` manteniendo `index.html` en la raíz de lo que subas.

### Netlify Drop

1. Abre [Netlify Drop](https://app.netlify.com/drop) y accede o crea una cuenta.
2. Arrastra la carpeta del proyecto `Goals` a la zona de carga. Si el navegador no permite subir carpetas, comprímela en un ZIP y utiliza el método de carga de Netlify que admita archivos comprimidos.
3. Espera a que termine la publicación.
4. Abre la URL HTTPS asignada por Netlify desde el teléfono.

### Vercel CLI

Necesitas tener Node.js instalado y acceder a una cuenta de Vercel.

1. Abre una terminal en la carpeta del proyecto:

   ```bash
   cd /home/ruru/Proyectos/Goals
   ```

2. Ejecuta:

   ```bash
   npx vercel --prod
   ```

3. Si es la primera vez, sigue las indicaciones para iniciar sesión y confirmar la configuración del proyecto. Para esta app estática no hace falta un comando de build.
4. Abre en el móvil la URL HTTPS que muestre Vercel al finalizar.

### Cloudflare Pages

1. Accede al panel de Cloudflare.
2. Ve a **Workers & Pages → Create application → Pages** y elige la opción para subir recursos estáticos.
3. Sube los archivos del proyecto `Goals` con `index.html` en la raíz.
4. No configures un comando de build; la aplicación ya está lista para servirse.
5. Cuando finalice la publicación, abre en el móvil la URL HTTPS asignada.

Los nombres exactos de algunos botones del panel pueden cambiar con el tiempo. En cualquiera de estos proveedores, confirma que la URL publicada comienza con `https://`.

## Opción 3: añadirla a la pantalla de inicio

El proyecto incluye `manifest.json`, `sw.js` e `icon.svg`. Para instalarla como PWA, abre en el teléfono la **URL HTTPS publicada**. La instalación desde HTTP local puede no estar disponible.

### iPhone o iPad

1. Abre la URL HTTPS con **Safari**.
2. Toca **Compartir**.
3. Desplázate y selecciona **Añadir a pantalla de inicio**.
4. Revisa el nombre y toca **Añadir**.
5. Si aparece la opción **Abrir como app web**, déjala activada.

Después, inicia Rumbo desde el icono añadido a la pantalla de inicio.

### Android

1. Abre la URL HTTPS con **Chrome**.
2. Toca el menú de tres puntos `⋮`.
3. Selecciona **Instalar aplicación** o **Añadir a pantalla de inicio**.
4. Confirma la instalación siguiendo el diálogo del navegador.

Después, abre Rumbo desde el icono de la pantalla de inicio o la lista de aplicaciones.

## Verificar la instalación

- Al abrir Rumbo solicita el PIN `0000`. Hay que introducirlo en cada carga de la página.
- La app se abre con su propia ventana, sin la barra de direcciones habitual.
- Puedes navegar entre **Mis retos** y **Mis logros**; abre el historial desde el icono de reloj en la cabecera o desde **Conseguidos**.
- Crea un reto de prueba y recarga la aplicación: debe conservarse en ese mismo navegador.
- Para probar la instalación offline, abre la app online al menos una vez para que el service worker almacene sus recursos principales.

El icono SVG incluido permite identificar la app. Para una compatibilidad visual más amplia entre dispositivos, se pueden añadir iconos PNG de 192×192 y 512×512 al manifiesto y un `apple-touch-icon` PNG de 180×180.

> **Sobre el PIN:** `0000` es una barrera visual de acceso y se solicita al abrir/cargar la aplicación. No cifra los datos guardados ni sustituye el PIN, contraseña o bloqueo biométrico del teléfono; alguien con acceso técnico al navegador puede inspeccionar o modificar el almacenamiento local.
