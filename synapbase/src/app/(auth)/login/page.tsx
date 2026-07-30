"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { api } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", { body: { email, password } });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión");
      setLoading(false);
    }
  }

  async function enterDemo() {
    setError(null);
    setDemoLoading(true);
    try {
      await api("/api/auth/demo", { body: {} });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos preparar la demo");
      setDemoLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Bienvenido de nuevo</h1>
      <p className="mt-1.5 text-sm text-ink-500">Entrá a tu panel para ver cómo crece tu base de clientes.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@tucomercio.com"
            autoComplete="email"
            required
            autoFocus
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600 animate-fade-in">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Iniciar sesión
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-line" />
        o
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button variant="secondary" size="lg" className="w-full" onClick={enterDemo} loading={demoLoading}>
        <Sparkles className="size-4 text-brand-600" />
        Explorar la demo con datos reales
      </Button>

      <p className="mt-8 text-center text-sm text-ink-500">
        ¿Todavía no tenés cuenta?{" "}
        <Link href="/register" className="font-medium text-brand-700 transition-colors hover:text-brand-600">
          Creala gratis
        </Link>
      </p>
    </div>
  );
}
