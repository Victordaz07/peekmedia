"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Aparece con opacity 0→1 y translateY 40px→0 (0.8 s) al entrar en pantalla.
 * Lo que ya está visible al cargar no se anima, y con prefers-reduced-motion no se oculta nunca.
 */
export function Reveal({ className, delay = 0, style, ...props }: ComponentProps<"div"> & { delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || el.getBoundingClientRect().top < window.innerHeight) return;
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(state !== "idle" && "transition-[opacity,transform] duration-800 ease-reveal", state === "hidden" && "reveal-hidden", className)}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...props}
    />
  );
}
