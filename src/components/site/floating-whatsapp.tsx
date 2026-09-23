"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { waLink, waMessages } from "@/lib/content/helpers";
import { WhatsAppIcon } from "./section";

// Se oculta arriba del todo (hero), en el cotizador (tiene su propia barra) y cuando el CTA final está en pantalla.
const HIDE_ON = ["top", "cotiza", "contacto"];

export function FloatingWhatsApp({ whatsapp }: { whatsapp: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        setHidden(visible.size > 0);
      },
      { threshold: 0.15 },
    );
    HIDE_ON.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <a
      href={waLink(whatsapp, waMessages.bubble)}
      target="_blank"
      rel="noopener"
      aria-label="¿Hablamos? Escríbenos por WhatsApp"
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "fixed right-5 bottom-5 z-40 flex items-center gap-3 rounded-full bg-ink p-2 text-white shadow-elevated transition-[opacity,transform] duration-300 ease-reveal hover:-translate-y-1 hover:scale-[1.03]",
        hidden && "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-coral text-ink">
        <WhatsAppIcon />
      </span>
      <span className="hidden pr-3 text-button font-semibold min-[820px]:inline">¿Hablamos?</span>
    </a>
  );
}
