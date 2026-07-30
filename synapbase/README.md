# SynapBase

**La base de datos inteligente de los clientes de tu comercio.** Un producto de **Synapse**.

Un QR en el local convierte cada visita en un cliente conocido: quién es, qué consume, cuándo vuelve y cuánto gasta. El descuento es el incentivo para capturar datos; la información es el producto.

![Stack](https://img.shields.io/badge/Next.js%2015-black) ![React 19](https://img.shields.io/badge/React%2019-blue) ![Tailwind 4](https://img.shields.io/badge/Tailwind%204-38bdf8) ![SQLite](https://img.shields.io/badge/SQLite%20(node%3Asqlite)-lightgrey)

---

## Puesta en marcha

Requiere **Node.js 22+** (usa el módulo nativo `node:sqlite`, sin dependencias binarias).

```bash
cd synapbase
npm install
npm run seed     # opcional: crea el comercio demo con 8 meses de datos
npm run dev      # http://localhost:3000
```

**Cuenta demo** (también disponible con el botón "Explorar la demo" en /login):

| | |
|---|---|
| Email | `demo@synapbase.app` |
| Contraseña | `synapse-demo` |
| Comercio | Café Martina — 185 clientes, ~550 registros, segmentos y campañas |

Build de producción: `npm run build && npm start`. Typecheck: `npm run typecheck`.

## El flujo del producto

```
Comercio se registra → crea su negocio (onboarding)
  → se genera su formulario con QR automáticamente
  → personaliza preguntas y diseño (constructor visual con vista previa en vivo)
  → descarga el QR (PNG / SVG / PDF imprimible) y lo pone en el local
  → el cliente escanea, responde en ~30 s y recibe su código de descuento
  → cada respuesta alimenta la base: ficha de cliente, visitas, favoritos, gasto
  → el comercio segmenta ("inactivos 30+ días", "fans del flat white"…)
  → y crea campañas personalizadas de WhatsApp/Email para hacerlos volver
```

## Módulos

| Módulo | Qué incluye |
|---|---|
| **Panel** | KPIs (clientes, nuevos, retorno, escaneos→conversión), clientes por mes, productos top, horarios, frecuencia, nuevos vs recurrentes, últimos registros. Gráficos interactivos (Recharts). |
| **Clientes** | Tabla moderna con búsqueda, filtros rápidos, orden y paginación. Ficha completa: visitas, producto favorito, frecuencia ("vuelve cada 8 días"), gasto, historial expandible con todas las respuestas, notas, etiquetas, segmentos a los que pertenece, acceso directo a WhatsApp. |
| **Base de datos** | Vista estilo Airtable de todos los registros: filtros, búsqueda, agrupación (formulario/producto/día), columnas por pregunta con **celdas editables**, borrado con recálculo de contadores y exportación **CSV / Excel / PDF**. |
| **Formularios** | Constructor visual: 7 tipos de pregunta (texto, número, selección única/múltiple, sí/no, fecha, escala), obligatorias/opcionales, activar/desactivar, **reordenar con drag & drop**, duplicar y guardar plantillas. Mapeo de respuestas a datos del cliente (nombre, teléfono, email, producto, género, edad, monto). Diseño: color, emoji, logo, textos de bienvenida/éxito e incentivo, con **vista previa en vivo** en marco de teléfono. |
| **QR** | Por formulario: descarga en **PNG (hasta 2048 px), SVG vectorial y PDF imprimible** (tarjeta A5 con nombre del comercio y beneficio), color de marca, logo en el centro, copiar link, imprimir. Trackea escaneos y calcula conversión. |
| **Formulario público** (`/f/slug`) | Experiencia mobile-first tipo Typeform: una pregunta por pantalla, barra de progreso, validaciones, avance con Enter/auto-avance, pantalla final con **código de descuento**. Identidad del cliente resuelta por teléfono→email→nombre: los que vuelven suman visitas en su misma ficha. |
| **Segmentos** | Reglas combinables (AND): visitas, días sin venir, consumió X, favorito, gasto total, edad entre X e Y, género, con/sin contacto, etiquetas, respuestas de encuestas. Presets de un clic, **conteo de audiencia en vivo** y muestra de clientes. |
| **Campañas** | WhatsApp/Email con asistente de 3 pasos, variables (`{{nombre}}`, `{{producto_favorito}}`, `{{visitas}}`), vista previa con un cliente real, audiencia calculada al instante, **borradores, programación e historial**. El "envío" materializa la cola `campaign_recipients`; conectar un proveedor real no requiere cambios de esquema. |
| **Estadísticas** | Activos/perdidos/recuperados, movimiento mensual, tiempo promedio entre visitas, edad promedio, distribución por género y edades, días pico, rankings de clientes/productos/preguntas y desglose por pregunta de encuesta. Exportable a CSV/Excel/PDF. |
| **Ajustes** | Perfil del comercio (logo con redimensión client-side, color de marca, dirección, horarios), **equipo con roles** (owner/admin/miembro) e invitaciones por enlace, planes con uso actual (facturación lista para conectar pasarela). |

## Arquitectura

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing pública
│   ├── (auth)/             # /login /register
│   ├── onboarding/         # Alta del comercio
│   ├── f/[slug]/           # Formulario público (QR)
│   ├── invite/[token]/     # Aceptar invitación de equipo
│   ├── app/                # Panel autenticado (8 módulos)
│   └── api/                # REST: auth, business, forms, customers,
│                           # submissions, segments, campaigns, team…
├── components/             # UI kit propio + charts + flujo público
├── lib/                    # Tipos compartidos, utils, cliente HTTP, export
└── server/                 # ← todo el backend
    ├── db.ts               # node:sqlite singleton + helpers TZ Argentina
    ├── schema.mjs          # Esquema SQL (fuente única, la usa también el seed)
    ├── auth.ts             # scrypt + sesiones opacas hasheadas en DB
    ├── guard.ts / http.ts  # requireTenant / withTenant / errores / zod
    ├── log.ts              # logging estructurado
    └── services/           # forms, submissions, customers, segments,
                            # campaigns, stats, business
```

**Decisiones clave**

- **Multi-tenant estricto**: toda tabla de datos lleva `business_id`. El tenant sale **siempre** de la sesión (`withTenant`/`requireTenant`), nunca del cliente; cada consulta de servicio filtra por negocio. Verificado: acceso cruzado responde 404/401.
- **Autenticación**: contraseñas con `scrypt` (nativo de Node), sesiones opacas en cookie httpOnly cuyo hash SHA-256 se guarda en DB (revocables, un robo de DB no expone tokens).
- **Base relacional** SQLite vía `node:sqlite` (cero binarios). El acceso está encapsulado en `src/server/services/*`; migrar a Postgres es reemplazar esa capa sin tocar UI ni rutas.
- **Validación** con zod en todas las rutas; errores consistentes `{error}` + logging estructurado.
- **Identidad del cliente**: normalización de teléfono/email y matching teléfono→email→nombre dentro del negocio; los datos nuevos completan la ficha sin pisar los existentes.
- **Enviabilidad futura**: `campaigns` + `campaign_recipients` (cola con estado) dejan la integración de WhatsApp Business API / proveedor de email como un worker que consume filas `queued`.
- **Exportaciones sin dependencias pesadas**: CSV con BOM, Excel real vía SpreadsheetML y PDF con jspdf/autotable importado dinámicamente.

## Datos y demo

`npm run seed` crea **Café Martina** con un RNG determinístico: 185 clientes con nombres argentinos, ~550 visitas en 8 meses con horarios/di̇as realistas, respuestas completas (NPS, cómo nos conociste, género, edad, gasto), escaneos con conversión ~57 %, etiquetas, 5 segmentos y 3 campañas (enviada con destinatarios, borrador y programada). La cuenta demo también se auto-crea desde el botón de la pantalla de login.

La base vive en `data/synapbase.db` (gitignored). Variable opcional: `SYNAPBASE_DB=/ruta/al/archivo.db`.

## Roadmap sugerido

1. Envío real de campañas (WhatsApp Business API / Resend) consumiendo `campaign_recipients`.
2. Postgres + Prisma/Drizzle reemplazando la capa `services` cuando el volumen lo pida.
3. Facturación con Mercado Pago/Stripe sobre el campo `plan` ya existente.
4. Multi-sucursal: `businesses` ya soporta N negocios por usuario con el switcher del panel.
