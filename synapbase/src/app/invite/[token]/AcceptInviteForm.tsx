"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { api } from "@/lib/client";

export function AcceptInviteForm({
  token,
  needsAccount,
  emailMatches,
}: {
  token: string;
  needsAccount: boolean;
  emailMatches: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/accept-invite", {
        body: needsAccount ? { token, name, password } : { token },
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos aceptar la invitación");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {needsAccount && (
        <>
          <Field label="Tu nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" required autoFocus />
          </Field>
          <Field label="Creá una contraseña" hint="Mínimo 8 caracteres.">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              placeholder="••••••••"
            />
          </Field>
        </>
      )}
      {!needsAccount && !emailMatches && (
        <p className="rounded-xl border border-warning-100 bg-warning-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-800">
          Estás con otra sesión abierta. Al aceptar, la invitación se suma a tu cuenta actual.
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Unirme al equipo
      </Button>
    </form>
  );
}
