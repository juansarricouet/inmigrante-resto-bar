"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { api } from "@/lib/client";

const CATEGORIES = [
  "Cafetería",
  "Restaurante",
  "Bar",
  "Heladería",
  "Panadería",
  "Tienda de ropa",
  "Peluquería / Belleza",
  "Gimnasio",
  "Otro comercio",
];

export function OnboardingForm({ userName }: { userName: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]!);
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/business", { body: { name, category, address: address || undefined } });
      router.push("/app?bienvenida=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos crear el comercio");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-7">
      <Field label="Nombre del comercio">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Ej.: Café ${userName.split(" ")[0] ?? "Palermo"}`}
          required
          autoFocus
        />
      </Field>
      <Field label="Rubro">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Dirección" optional>
        <Input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Calle, número, barrio"
        />
      </Field>

      {error && (
        <p className="rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-[13px] font-medium text-danger-600 animate-fade-in">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Crear mi panel
        <ArrowRight className="size-4" />
      </Button>
      <p className="text-center text-xs leading-relaxed text-ink-400">
        Vas a poder cambiar todo esto después desde Ajustes.
      </p>
    </form>
  );
}
