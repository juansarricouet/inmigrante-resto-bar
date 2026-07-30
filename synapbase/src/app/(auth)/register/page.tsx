"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { api } from "@/lib/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/register", { body: { name, email, password } });
      router.push("/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear tu cuenta");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink-950">Creá tu cuenta</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        En dos minutos tenés tu QR listo para empezar a construir tu base de clientes.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Tu nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej.: Martina López"
            autoComplete="name"
            required
            autoFocus
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vos@tucomercio.com"
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>

        {error && (
          <p className="rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600 animate-fade-in">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Continuar
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-ink-500">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-700 transition-colors hover:text-brand-600">
          Iniciá sesión
        </Link>
      </p>
    </div>
  );
}
