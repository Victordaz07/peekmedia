"use client";

import { Button } from "@/components/ui";

/** Imprime solo el bloque marcado con data-report (el navegador ofrece "Guardar como PDF"). */
export function PrintReportButton() {
  return (
    <Button
      variant="dark"
      data-noprint
      onClick={() => {
        document.body.classList.add("print-report");
        window.print();
        document.body.classList.remove("print-report");
      }}
    >
      Descargar reporte (PDF)
    </Button>
  );
}
