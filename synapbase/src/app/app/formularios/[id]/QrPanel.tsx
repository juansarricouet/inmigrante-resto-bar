"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Download, FileImage, FileText, Link2, Printer, Shapes } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/misc";
import { useToast } from "@/components/ui/Toast";
import { cn, downloadBlob } from "@/lib/utils";
import type { Form } from "@/lib/types";

const SIZES = [
  { label: "Chico (512 px)", value: 512 },
  { label: "Mediano (1024 px)", value: 1024 },
  { label: "Grande (2048 px)", value: 2048 },
];

export function QrPanel({
  form,
  businessName,
  logoUrl,
}: {
  form: Form;
  businessName: string;
  logoUrl: string | null;
}) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [size, setSize] = useState(1024);
  const [useBrandColor, setUseBrandColor] = useState(false);
  const [withLogo, setWithLogo] = useState(false);
  const [showName, setShowName] = useState(true);
  const [showIncentive, setShowIncentive] = useState(true);
  const [busy, setBusy] = useState(false);

  const url = useMemo(
    () => (typeof window !== "undefined" ? `${location.origin}/f/${form.slug}` : `/f/${form.slug}`),
    [form.slug],
  );
  const darkColor = useBrandColor ? form.theme.color : "#17171c";

  /** Genera el QR en un canvas, con logo superpuesto opcional. */
  const renderQr = useCallback(
    async (px: number): Promise<HTMLCanvasElement> => {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, url, {
        width: px,
        margin: 2,
        errorCorrectionLevel: withLogo ? "H" : "M",
        color: { dark: darkColor, light: "#ffffff" },
      });
      if (withLogo && logoUrl) {
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("logo"));
          img.src = logoUrl;
        });
        const box = px * 0.22;
        const pad = box * 0.12;
        const x = (px - box) / 2;
        ctx.fillStyle = "#ffffff";
        roundRect(ctx, x - pad, x - pad, box + pad * 2, box + pad * 2, box * 0.2);
        ctx.fill();
        ctx.drawImage(img, x, x, box, box);
      }
      return canvas;
    },
    [url, darkColor, withLogo, logoUrl],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const canvas = await renderQr(480);
        if (!cancelled) setDataUrl(canvas.toDataURL("image/png"));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [renderQr]);

  async function downloadPng() {
    setBusy(true);
    try {
      const canvas = await renderQr(size);
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, `qr-${form.slug}-${size}px.png`, "image/png");
      });
    } finally {
      setBusy(false);
    }
  }

  async function downloadSvg() {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: darkColor, light: "#ffffff" },
    });
    downloadBlob(svg, `qr-${form.slug}.svg`, "image/svg+xml");
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      const canvas = await renderQr(1024);
      const png = canvas.toDataURL("image/png");
      // Tarjeta A5 vertical lista para imprimir
      const doc = new jsPDF({ format: "a5", unit: "mm" });
      const w = doc.internal.pageSize.getWidth();

      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, w, doc.internal.pageSize.getHeight(), "F");

      let y = 22;
      if (showName) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(23, 23, 28);
        doc.text(businessName, w / 2, y, { align: "center" });
        y += 9;
      }
      if (showIncentive) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12.5);
        doc.setTextColor(90, 90, 100);
        doc.text(`Escaneá el QR y obtené ${form.incentive.toLowerCase()}`, w / 2, y, {
          align: "center",
          maxWidth: w - 30,
        });
        y += 10;
      }
      const qrSize = 86;
      doc.addImage(png, "PNG", (w - qrSize) / 2, y, qrSize, qrSize);
      y += qrSize + 10;
      doc.setFontSize(9.5);
      doc.setTextColor(120, 120, 130);
      doc.text("Apuntá la cámara de tu teléfono al código", w / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 170);
      doc.text(url.replace(/^https?:\/\//, ""), w / 2, y, { align: "center" });
      doc.setFontSize(7.5);
      doc.text("Impulsado por SynapBase — synapse", w / 2, doc.internal.pageSize.getHeight() - 10, {
        align: "center",
      });
      doc.save(`qr-${form.slug}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,380px)]">
      {/* Opciones */}
      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Personalización</h3>

          <div className="space-y-2.5">
            <Option
              label="Mostrar nombre del comercio"
              hint="En la tarjeta imprimible y el PDF"
              checked={showName}
              onChange={setShowName}
            />
            <Option
              label="Mostrar el beneficio"
              hint={`“Escaneá el QR y obtené ${form.incentive.toLowerCase()}”`}
              checked={showIncentive}
              onChange={setShowIncentive}
            />
            <Option
              label="QR con el color del formulario"
              hint="Usa el color de acento en lugar de negro"
              checked={useBrandColor}
              onChange={setUseBrandColor}
            />
            <Option
              label="Logo en el centro del QR"
              hint={logoUrl ? "Usa el logo cargado en Ajustes" : "Subí tu logo en Ajustes para activarlo"}
              checked={withLogo}
              onChange={setWithLogo}
              disabled={!logoUrl}
            />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-800">Tamaño de descarga</p>
            <div className="flex flex-wrap gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-all",
                    size === s.value
                      ? "border-ink-950 bg-ink-950 text-white"
                      : "border-line-strong/80 bg-white text-ink-600 hover:border-ink-300",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h3 className="text-[14px] font-semibold tracking-tight text-ink-950">Descargar</h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Button onClick={downloadPng} loading={busy} className="w-full">
              <FileImage className="size-4" />
              PNG
            </Button>
            <Button variant="secondary" onClick={downloadSvg} className="w-full">
              <Shapes className="size-4" />
              SVG
            </Button>
            <Button variant="secondary" onClick={downloadPdf} loading={busy} className="w-full">
              <FileText className="size-4" />
              PDF imprimible
            </Button>
          </div>
          <div className="flex flex-wrap gap-2.5 border-t border-line pt-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast("success", "Link copiado al portapapeles");
              }}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong/80 bg-white px-3.5 text-[13px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50"
            >
              <Link2 className="size-3.5" />
              Copiar link
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line-strong/80 bg-white px-3.5 text-[13px] font-medium text-ink-700 shadow-card transition hover:bg-ink-50"
            >
              <Printer className="size-3.5" />
              Imprimir
            </button>
          </div>
          <p className="text-xs leading-relaxed text-ink-400">
            <Download className="mr-1 inline size-3" />
            El PNG grande (2048 px) es ideal para imprimir en buena calidad; el SVG es vectorial, para
            imprenta o diseño.
          </p>
        </section>
      </div>

      {/* Tarjeta de vista previa / impresión */}
      <div className="flex justify-center">
        <div className="print-area h-fit w-full max-w-[340px] rounded-[28px] border border-line bg-white p-8 text-center shadow-pop">
          {showName && (
            <h4 className="text-[19px] font-bold tracking-tight text-ink-950">{businessName}</h4>
          )}
          {showIncentive && (
            <p className="mx-auto mt-1.5 max-w-[240px] text-balance text-[13px] leading-snug text-ink-500">
              Escaneá el QR y obtené{" "}
              <span className="font-semibold" style={{ color: form.theme.color }}>
                {form.incentive.toLowerCase()}
              </span>
            </p>
          )}
          <div className="mx-auto mt-5 w-fit rounded-2xl border border-line p-3.5">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt="Código QR" className="size-52" />
            ) : (
              <div className="skeleton size-52" />
            )}
          </div>
          <p className="mt-4 text-[11px] font-medium text-ink-400">
            Apuntá la cámara de tu teléfono al código
          </p>
          <p className="mt-3 border-t border-line pt-3 text-[10px] tracking-wide text-ink-300">
            Impulsado por SynapBase
          </p>
        </div>
      </div>
    </div>
  );
}

function Option({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-50/50 px-4 py-3",
        disabled && "opacity-60",
      )}
    >
      <span>
        <span className="block text-[13px] font-medium text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-400">{hint}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
