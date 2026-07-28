# Desplegar en Vercel (gratis, todo en un solo lugar)

La app detecta sola dónde está corriendo: con `npm start` local usa
WebSockets, y en Vercel usa las funciones serverless de `/api` con los
datos guardados en una base Redis de Upstash que se activa desde el
propio panel de Vercel (sin cuenta aparte y sin SQL).

## 1. Importar el proyecto en Vercel

1. Entrá a https://vercel.com → **Sign Up** → **Continue with GitHub**.
2. **Add New… → Project** → importá el repo `inmigrante-resto-bar`.
3. Botón **Deploy** (todavía sin base de datos — la agregamos ahora).

## 2. Conectar la base de datos (desde Vercel mismo)

1. En tu proyecto de Vercel → pestaña **Storage**.
2. **Create Database** → elegí **Upstash** (Serverless DB - Redis) →
   **Redis** → plan **Free** → Create.
3. Cuando pregunte a qué proyecto conectarla, elegí `inmigrante-resto-bar`
   → **Connect**. Esto carga las variables de entorno solo.
4. Pestaña **Deployments** → en el último deployment, menú **⋯** →
   **Redeploy** (para que tome las variables nuevas).

## 3. Listo

Tu URL queda tipo `https://inmigrante-resto-bar.vercel.app`:

- Menú clientes: la raíz directamente (o `/bar-app.html`)
- Panel admin: `https://TU-URL/admin.html`

Nota: en Vercel la actualización entre pantallas es por sondeo cada
4 segundos (no instantánea como con WebSockets) — para un bar funciona
perfecto: un pedido nuevo aparece en el panel admin en menos de 4 segundos.

---

# Desplegar en EasyPanel

Guía para alojar Inmigrante Resto Bar en EasyPanel desde cero.

## 1. Conseguir un servidor (VPS)

EasyPanel es un panel que se instala en un servidor propio. Si perdiste el
acceso anterior, necesitás un VPS nuevo. Opciones económicas:

- **Hostinger VPS** (tiene plantilla con EasyPanel preinstalado — lo más fácil)
- **Hetzner** (~4 €/mes)
- **DigitalOcean** (~6 US$/mes)

Con 1 GB de RAM alcanza de sobra para esta app.

## 2. Instalar EasyPanel

Si el VPS no viene con EasyPanel preinstalado, conectate por SSH y ejecutá:

```bash
curl -sSL https://get.easypanel.io | sh
```

Después entrá a `https://IP-DEL-SERVIDOR:3000` y creá el usuario admin
(usá tu email actual).

## 3. Crear la app

1. En EasyPanel: **Create Project** → poné un nombre (ej. `inmigrante`).
2. Dentro del proyecto: **+ Service** → **App**.
3. En **Source** elegí **GitHub**, conectá tu cuenta de GitHub y seleccioná
   el repo `juansarricouet/inmigrante-resto-bar`, rama `main`.
4. En **Build** elegí **Dockerfile** (el repo ya lo trae).

## 4. Datos persistentes (importante)

Para que los pedidos, el menú y los clientes NO se borren en cada redeploy:

1. En la pestaña **Mounts** del servicio: agregá un **Volume**
   - Name: `data`
   - Mount path: `/data`
2. En la pestaña **Environment** agregá:
   ```
   DATA_DIR=/data
   ```

## 5. Dominio y puerto

1. En **Domains** agregá el dominio (o usá el subdominio gratuito que da
   EasyPanel) apuntando al puerto **3000**.
2. Activá HTTPS (EasyPanel lo hace solo con Let's Encrypt).

## 6. Deploy

Botón **Deploy**. En un minuto la app queda en línea:

- Menú clientes: `https://tu-dominio/bar-app.html`
- Panel admin: `https://tu-dominio/admin.html`

Cada vez que hagas push a `main` en GitHub podés redesplegar con un clic
(o activar auto-deploy en la pestaña **Source**).
