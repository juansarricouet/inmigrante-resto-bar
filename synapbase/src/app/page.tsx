import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardList,
  Database,
  MessageCircle,
  QrCode,
  ScanLine,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { RevealObserver } from "@/components/Reveal";

export default function LandingPage() {
  return (
    <div className="bg-white text-ink-950">
      <RevealObserver />

      {/* ————— Nav ————— */}
      <header className="sticky top-0 z-40 border-b border-line/70 bg-white/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/">
            <Logo />
          </Link>
          <div className="hidden items-center gap-7 text-[13.5px] font-medium text-ink-500 md:flex">
            <a href="#producto" className="transition-colors hover:text-ink-950">Producto</a>
            <a href="#como-funciona" className="transition-colors hover:text-ink-950">Cómo funciona</a>
            <a href="#precios" className="transition-colors hover:text-ink-950">Precios</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="rounded-[10px] px-3.5 py-2 text-[13.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-950"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-[10px] bg-ink-950 px-4 py-2 text-[13.5px] font-medium text-white shadow-raised transition hover:bg-ink-800"
            >
              Crear cuenta
            </Link>
          </div>
        </nav>
      </header>

      {/* ————— Hero ————— */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-x-0 top-0 h-[420px] bg-dots opacity-[0.35] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <span className="mx-auto flex w-fit items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-600 shadow-card animate-fade-up">
            <span className="flex size-4 items-center justify-center rounded-full bg-brand-600 text-[9px] font-bold text-white">S</span>
            Un producto de Synapse
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-[38px] font-semibold leading-[1.08] tracking-tight sm:text-[54px] animate-fade-up">
            La base de datos inteligente de los clientes de tu comercio
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-balance text-[16px] leading-relaxed text-ink-500 animate-fade-up">
            Un QR en tu local convierte cada visita en un cliente conocido: quién es, qué consume y
            cuándo vuelve. Datos reales para hacer campañas que traen gente de vuelta.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
            <Link
              href="/register"
              className="group flex h-12 items-center gap-2 rounded-2xl bg-ink-950 px-6 text-[15px] font-semibold text-white shadow-pop transition-all hover:scale-[1.02] hover:bg-ink-800"
            >
              Empezar gratis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="flex h-12 items-center gap-2 rounded-2xl border border-line-strong bg-white px-6 text-[15px] font-semibold text-ink-700 shadow-card transition-all hover:border-ink-300 hover:bg-ink-50"
            >
              <Sparkles className="size-4 text-brand-600" />
              Ver la demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-400 animate-fade-up">
            Sin tarjeta · Tu QR listo en 2 minutos
          </p>

          {/* Mock del dashboard */}
          <div className="reveal relative mx-auto mt-14 max-w-4xl">
            <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-b from-brand-100/60 to-transparent blur-2xl" />
            <DashboardMock />
          </div>
        </div>
      </section>

      {/* ————— Cómo funciona ————— */}
      <section id="como-funciona" className="border-t border-line bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal text-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">Cómo funciona</p>
            <h2 className="mx-auto mt-3 max-w-xl text-balance text-[30px] font-semibold leading-tight tracking-tight">
              El descuento es el gancho. La información es el negocio.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              {
                icon: QrCode,
                step: "01",
                title: "Ponés el QR en tu local",
                text: "“Escaneá y obtené un 10% de descuento”. Lo imprimís desde el panel con tu marca, en PNG, SVG o PDF.",
              },
              {
                icon: ClipboardList,
                step: "02",
                title: "El cliente completa 30 segundos",
                text: "Nombre, qué consumió, contacto y las preguntas que vos definas. Una experiencia rápida, linda y mobile.",
              },
              {
                icon: Database,
                step: "03",
                title: "Tu base de datos se arma sola",
                text: "Cada respuesta se convierte en una ficha viva: visitas, frecuencia, favoritos, gasto. Lista para segmentar.",
              },
            ].map((s) => (
              <div key={s.step} className="reveal card card-hover relative overflow-hidden p-7">
                <span className="absolute -right-2 -top-4 text-[64px] font-bold tracking-tight text-ink-100">{s.step}</span>
                <span className="relative flex size-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-raised">
                  <s.icon className="size-5" strokeWidth={1.75} />
                </span>
                <h3 className="relative mt-5 text-[17px] font-semibold tracking-tight">{s.title}</h3>
                <p className="relative mt-2 text-[13.5px] leading-relaxed text-ink-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Features ————— */}
      <section id="producto" className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal text-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">El producto</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-balance text-[30px] font-semibold leading-tight tracking-tight">
              No es otro CRM. Es entender por fin a tus clientes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
              Todo lo que capturás se transforma en respuestas concretas: quiénes son tus mejores
              clientes, qué consumen, cuándo vienen y a quién invitar a volver.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Users, title: "Fichas de cliente completas", text: "Historial de visitas, producto favorito, frecuencia, gasto total, notas y etiquetas. Todo automático." },
              { icon: Target, title: "Segmentos inteligentes", text: "“Frecuentes”, “hace 30 días que no vienen”, “consumieron cerveza”, “gastaron más de $40.000”. En dos clics." },
              { icon: MessageCircle, title: "Campañas de retorno", text: "Mensajes por WhatsApp o email con variables: “Hola Juan, volvió tu hamburguesa favorita”." },
              { icon: BarChart3, title: "Estadísticas profundas", text: "Retorno, horarios pico, demografía, rankings de clientes y productos. Todo exportable." },
              { icon: ClipboardList, title: "Formularios a tu medida", text: "Constructor visual con drag & drop, 7 tipos de pregunta, tu color y tu logo. Vista previa en vivo." },
              { icon: ScanLine, title: "QR con tu marca", text: "Descargalo en PNG, SVG o PDF imprimible, medí escaneos y conversión a registros." },
            ].map((f) => (
              <div key={f.title} className="reveal card card-hover p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50">
                  <f.icon className="size-4.5 text-brand-600" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— Banda de campañas ————— */}
      <section className="relative overflow-hidden bg-ink-950 py-20 text-white">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(700px 400px at 15% 0%, rgb(91 91 214 / 0.5), transparent 60%), radial-gradient(700px 400px at 90% 100%, rgb(74 72 181 / 0.45), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-300">Fidelización real</p>
            <h2 className="mt-3 max-w-md text-balance text-[30px] font-semibold leading-tight tracking-tight">
              Mensajes que suenan a tu comercio, no a spam
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              Como sabés qué consume cada persona y cuándo fue su última visita, cada mensaje llega en el
              momento justo con el contenido justo. Eso es lo que hace que vuelvan.
            </p>
            <ul className="mt-6 space-y-2.5">
              {["Variables personalizadas por cliente", "Audiencia calculada al instante", "Borradores, programación e historial"].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[14px] text-white/80">
                  <Check className="size-4 text-emerald-400" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="reveal space-y-3">
            <div className="ml-auto w-fit max-w-sm rounded-2xl rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-[14px] leading-relaxed text-ink-950 shadow-pop">
              Hola <strong>Juan</strong> 👋 ¡Volvió tu <strong>hamburguesa doble favorita</strong>! Esta semana,
              2x1 mostrando este mensaje 🍔
            </div>
            <div className="w-fit max-w-sm rounded-2xl rounded-tl-md bg-white/10 px-4 py-3 text-[14px] leading-relaxed text-white backdrop-blur">
              <strong>María</strong>, hace 40 días que no venís… tenés un 15% esperándote esta semana ❤️
            </div>
            <div className="ml-auto w-fit max-w-sm rounded-2xl rounded-tr-md bg-[#DCF8C6] px-4 py-3 text-[14px] leading-relaxed text-ink-950 shadow-pop">
              <strong>Sofi</strong>, tu flat white de siempre te espera. Hoy la medialuna va de regalo ☕🥐
            </div>
          </div>
        </div>
      </section>

      {/* ————— Precios ————— */}
      <section id="precios" className="bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="reveal text-center">
            <p className="text-[12px] font-bold uppercase tracking-widest text-brand-600">Precios</p>
            <h2 className="mt-3 text-balance text-[30px] font-semibold leading-tight tracking-tight">
              Empezá gratis, crecé cuando lo veas funcionar
            </h2>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {[
              {
                name: "Free",
                price: "$0",
                period: "para siempre",
                features: ["1 formulario con QR", "Hasta 100 clientes", "Panel y métricas básicas"],
                cta: "Crear cuenta",
              },
              {
                name: "Pro",
                price: "$29.900",
                period: "por mes",
                features: [
                  "Formularios y clientes ilimitados",
                  "Segmentos y campañas",
                  "Estadísticas avanzadas y exportación",
                  "QR personalizado con tu marca",
                ],
                cta: "Probar Pro",
                highlight: true,
              },
              {
                name: "Business",
                price: "$59.900",
                period: "por mes",
                features: ["Todo lo de Pro", "Múltiples sucursales", "Roles y permisos avanzados", "Soporte prioritario"],
                cta: "Hablar con ventas",
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`reveal card relative flex flex-col p-7 ${p.highlight ? "border-brand-300 shadow-pop lg:-translate-y-2" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide text-white shadow-raised">
                    Más elegido
                  </span>
                )}
                <h3 className="text-[15px] font-semibold">{p.name}</h3>
                <p className="mt-3">
                  <span className="text-[34px] font-semibold tracking-tight">{p.price}</span>
                  <span className="ml-2 text-[13px] text-ink-400">{p.period}</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-ink-600">
                      <Check className="mt-0.5 size-4 shrink-0 text-success-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-7 flex h-11 items-center justify-center rounded-xl text-[14px] font-semibold transition-all ${
                    p.highlight
                      ? "bg-brand-600 text-white shadow-raised hover:bg-brand-700"
                      : "border border-line-strong bg-white text-ink-800 hover:bg-ink-50"
                  }`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ————— CTA final ————— */}
      <section className="py-20">
        <div className="reveal mx-auto max-w-3xl px-5 text-center">
          <LogoMark size={44} className="mx-auto" />
          <h2 className="mt-6 text-balance text-[32px] font-semibold leading-tight tracking-tight">
            Tus clientes ya están entrando por la puerta.
            <br className="hidden sm:block" />
            Empezá a conocerlos hoy.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="group flex h-12 items-center gap-2 rounded-2xl bg-ink-950 px-7 text-[15px] font-semibold text-white shadow-pop transition-all hover:scale-[1.02] hover:bg-ink-800"
            >
              Crear mi QR gratis
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ————— Footer ————— */}
      <footer className="border-t border-line bg-canvas">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div className="flex items-center gap-2.5">
            <Logo />
          </div>
          <p className="text-[12.5px] text-ink-400">
            © {new Date().getFullYear()} Synapse · SynapBase — La base de datos inteligente para comercios
          </p>
          <div className="flex items-center gap-5 text-[12.5px] font-medium text-ink-500">
            <Link href="/login" className="transition-colors hover:text-ink-900">Iniciar sesión</Link>
            <Link href="/register" className="transition-colors hover:text-ink-900">Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ————— Mock estilizado del dashboard ————— */

function DashboardMock() {
  const bars = [34, 48, 40, 62, 55, 74, 68, 88, 80, 96, 90, 100];
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-line bg-white text-left shadow-modal">
      {/* Barra de ventana */}
      <div className="flex items-center gap-1.5 border-b border-line bg-ink-50/70 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#f6564f]" />
        <span className="size-2.5 rounded-full bg-[#f5b800]" />
        <span className="size-2.5 rounded-full bg-[#33c748]" />
        <span className="ml-3 flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[10px] text-ink-400 shadow-card">
          <span className="size-2 rounded-full bg-success-600/70" />
          app.synapbase.com — Café Martina
        </span>
      </div>
      <div className="grid grid-cols-[150px_1fr] max-sm:grid-cols-1">
        {/* Sidebar */}
        <div className="hidden border-r border-line bg-canvas p-3.5 sm:block">
          <div className="flex items-center gap-1.5 px-1">
            <LogoMark size={18} />
            <span className="text-[11px] font-bold">SynapBase</span>
          </div>
          <div className="mt-4 space-y-1">
            {["Panel", "Clientes", "Base de datos", "Formularios", "Segmentos", "Campañas", "Estadísticas"].map((item, i) => (
              <div
                key={item}
                className={`rounded-md px-2 py-1.5 text-[10.5px] font-medium ${
                  i === 0 ? "bg-white text-ink-950 shadow-card" : "text-ink-400"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        {/* Contenido */}
        <div className="p-5">
          <p className="text-[13px] font-semibold">Hola, Martina 👋</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              ["Clientes", "1.248", Users],
              ["Nuevos este mes", "+86", TrendingUp],
              ["Tasa de retorno", "58%", Target],
              ["Escaneos", "3.402", ScanLine],
            ].map(([label, value, Icon]) => {
              const I = Icon as React.ElementType;
              return (
                <div key={String(label)} className="rounded-xl border border-line bg-white p-2.5 shadow-card">
                  <I className="size-3 text-brand-600" />
                  <p className="tabular mt-1.5 text-[15px] font-semibold leading-none">{String(value)}</p>
                  <p className="mt-1 text-[9px] font-medium text-ink-400">{String(label)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <div className="col-span-2 rounded-xl border border-line bg-white p-3 shadow-card">
              <p className="text-[10px] font-semibold text-ink-700">Clientes por mes</p>
              <div className="mt-2 flex h-[92px] items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-[3px] bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%`, opacity: 0.55 + (i / bars.length) * 0.45 }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 shadow-card">
              <p className="text-[10px] font-semibold text-ink-700">Últimos registros</p>
              <div className="mt-2 space-y-1.5">
                {[
                  ["JP", "Juan · Hamburguesa"],
                  ["SL", "Sofía · Flat white"],
                  ["MR", "Martín · Cerveza IPA"],
                  ["CA", "Camila · Avo toast"],
                ].map(([ini, text]) => (
                  <div key={text} className="flex items-center gap-1.5">
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-brand-100 text-[7px] font-bold text-brand-800">
                      {ini}
                    </span>
                    <span className="truncate text-[9px] text-ink-500">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
