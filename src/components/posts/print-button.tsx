"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui";

/** Imprime solo el bloque marcado con data-report (el navegador ofrece "Guardar como PDF"). */
export function PrintReportButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      data-noprint
      iconLeft={<Download className="size-4" />}
      onClick={() => {
        document.body.classList.add("print-report");
        window.print();
        document.body.classList.remove("print-report");
      }}
    >
      Descargar PDF
    </Button>
  );
}
