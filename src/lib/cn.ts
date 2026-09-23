import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Enseña a tailwind-merge los tamaños de texto propios para que no los confunda con colores.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "eyebrow",
            "caption",
            "label",
            "button",
            "body",
            "lead",
            "h3",
            "h2",
            "h1",
            "display-sm",
            "display-md",
            "display-lg",
          ],
        },
      ],
      shadow: [{ shadow: ["elevated", "hover"] }],
      rounded: [{ rounded: ["item", "modal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
