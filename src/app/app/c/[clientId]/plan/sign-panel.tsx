"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type PointerEvent } from "react";
import { Button, Card, CardTitle, Checkbox, Field, Input, Segmented, useToast } from "@/components/ui";
import { signContractAction } from "./actions";

type Mode = "typed" | "drawn";

/** Firma electrónica: nombre completo, firma escrita o dibujada y aceptación. */
export function SignPanel({ contractId, preview, defaultName }: { contractId: string; preview: boolean; defaultName: string }) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState(preview ? defaultName : "");
  const [mode, setMode] = useState<Mode>("typed");
  const [accept, setAccept] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height] as const;
  };

  function down(e: PointerEvent<HTMLCanvasElement>) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0B1F33";
    ctx.beginPath();
    ctx.moveTo(...point(e));
    drawing.current = true;
    canvas.current!.setPointerCapture(e.pointerId);
  }

  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    ctx.lineTo(...point(e));
    ctx.stroke();
    if (!hasDrawing) {
      setHasDrawing(true);
      setError(null);
    }
  }

  function clear() {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setHasDrawing(false);
  }

  function sign() {
    if (preview) return;
    if (name.trim().length < 5) return setError("Escribe tu nombre completo.");
    if (mode === "drawn" && !hasDrawing) return setError("Dibuja tu firma en el recuadro.");
    if (!accept) return setError("Marca la casilla para aceptar el contrato.");
    const image = mode === "drawn" ? (canvas.current?.toDataURL("image/png") ?? null) : null;
    start(async () => {
      const res = await signContractAction({ contractId, name: name.trim(), method: mode, image, accept: true });
      if (!res.ok) return setError(res.error);
      toast({ title: "¡Listo! Contrato firmado", description: `Código de verificación ${res.code}. Puedes imprimirlo o guardarlo en PDF.`, tone: "success" });
      router.refresh();
    });
  }

  return (
    <Card className="gap-4 ring-2 ring-coral">
      <CardTitle>Firma electrónica</CardTitle>
      <Field label="Nombre completo">
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          autoComplete="name"
          disabled={preview}
        />
      </Field>
      <Segmented
        label="Cómo quieres firmar"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setHasDrawing(false);
          setError(null);
        }}
        className="self-start"
        options={[
          { value: "typed", label: "Escribir" },
          { value: "drawn", label: "Dibujar" },
        ]}
      />
      {mode === "typed" ? (
        <div
          aria-label="Vista previa de tu firma"
          className="flex h-[110px] items-center justify-center overflow-hidden rounded-item border-[1.5px] border-dashed border-ink/30 px-3 font-signature text-[44px] font-semibold whitespace-nowrap"
        >
          {name.trim() || <span className="text-muted">Tu firma</span>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvas}
            width={600}
            height={220}
            aria-label="Dibuja tu firma aquí con el dedo o el mouse"
            onPointerDown={preview ? undefined : down}
            onPointerMove={move}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
            className="h-[150px] w-full cursor-crosshair touch-none rounded-item border-[1.5px] border-dashed border-ink/30 bg-surface"
          />
          <Button variant="ghost" size="sm" className="self-start" onClick={clear}>
            Borrar y volver a firmar
          </Button>
        </div>
      )}
      <Checkbox
        checked={accept}
        onChange={(e) => {
          setAccept(e.target.checked);
          setError(null);
        }}
        disabled={preview}
        label="Leí el contrato y acepto sus condiciones."
        description="Entiendo que esta firma electrónica tiene la misma validez que mi firma a mano."
      />
      {error && (
        <p role="alert" className="rounded-sm bg-coral-tint px-3 py-2 text-caption font-semibold">
          {error}
        </p>
      )}
      <Button size="lg" onClick={sign} loading={pending} disabled={preview}>
        Firmar contrato
      </Button>
      {preview && <p className="text-caption text-muted">Vista previa: solo un Administrador del cliente puede firmar.</p>}
    </Card>
  );
}
