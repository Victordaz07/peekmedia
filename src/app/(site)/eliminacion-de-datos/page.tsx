import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "Eliminación de datos",
  description: "Cómo pedir que Peek Media borre tus datos y los de las redes que conectaste.",
  alternates: { canonical: "/eliminacion-de-datos" },
};

export default async function EliminacionPage() {
  const { general } = await getSiteContent();
  return (
    <LegalPage title="Eliminación de datos" intro="Puedes pedir que borremos tus datos cuando quieras. Así se hace.">
      <h2>1. Quita el acceso desde la red</h2>
      <p>Si conectaste una red social con Peek Media, puedes revocar el permiso tú mismo:</p>
      <ul>
        <li>
          <strong>Facebook e Instagram:</strong> Configuración → Seguridad → Integraciones comerciales (o Apps y sitios web) → Peek
          Media → Eliminar.
        </li>
        <li>
          <strong>TikTok:</strong> Configuración y privacidad → Seguridad → Apps y servicios → Peek Media → Eliminar acceso.
        </li>
        <li>
          <strong>Google y YouTube:</strong> myaccount.google.com → Seguridad → Apps de terceros con acceso → Peek Media → Quitar acceso.
        </li>
      </ul>
      <p>Cuando revocas el acceso, dejamos de poder leer o publicar en esa cuenta y borramos los tokens guardados.</p>

      <h2>2. Pídenos borrar todo</h2>
      <p>
        Para que eliminemos tus datos personales y los de tus cuentas (cotizaciones, métricas, mensajes y publicaciones guardadas),{" "}
        <ContactLine general={general} /> con el asunto &ldquo;Eliminar mis datos&rdquo;. Incluye tu nombre, el negocio y el usuario
        de las redes conectadas.
      </p>

      <h2>3. Qué pasa después</h2>
      <ul>
        <li>Te confirmamos que recibimos la solicitud en un máximo de 3 días hábiles.</li>
        <li>Borramos los datos en un máximo de 30 días y te avisamos cuando esté hecho.</li>
        <li>
          Solo conservamos lo que la ley nos obliga a guardar (por ejemplo, contratos firmados y facturas), y únicamente por el plazo
          que exige.
        </li>
      </ul>
    </LegalPage>
  );
}
