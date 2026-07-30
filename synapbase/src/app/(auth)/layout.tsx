import Link from "next/link";
import { MessageCircle, TrendingUp, Users } from "lucide-react";
import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,44%)]">
      {/* Formulario */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>
        <p className="text-center text-xs text-ink-400">
          Un producto de <span className="font-medium text-ink-600">Synapse</span> · Hecho para comercios que quieren conocer a sus clientes
        </p>
      </div>

      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(800px 500px at 20% -10%, rgb(91 91 214 / 0.55), transparent 60%), radial-gradient(700px 500px at 110% 110%, rgb(74 72 181 / 0.5), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 bg-dots opacity-[0.07]" />
        <div className="relative flex h-full flex-col justify-center gap-8 px-14 xl:px-20">
          <blockquote className="max-w-md">
            <p className="text-balance text-[26px] font-medium leading-snug tracking-tight text-white">
              “Dejamos de ver caras anónimas. Ahora sabemos quién vuelve, qué pide y a quién invitar a volver.”
            </p>
            <footer className="mt-5 text-sm text-white/60">Valentina R. — Café de especialidad, Palermo</footer>
          </blockquote>

          <div className="flex max-w-md flex-col gap-3">
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/25">
                <Users className="size-4.5 text-brand-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Base de clientes que crece sola</p>
                <p className="text-xs text-white/55">Cada escaneo del QR suma un registro completo</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20">
                <TrendingUp className="size-4.5 text-emerald-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Métricas que importan</p>
                <p className="text-xs text-white/55">Frecuencia, productos favoritos, horarios y retorno</p>
              </div>
            </div>
            <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/20">
                <MessageCircle className="size-4.5 text-amber-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Campañas que traen gente de vuelta</p>
                <p className="text-xs text-white/55">“Hola Juan, volvió tu hamburguesa favorita”</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
