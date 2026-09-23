import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Las reglas para usar el sitio y la plataforma de Peek Media.",
  alternates: { canonical: "/terminos" },
};

export default async function TerminosPage() {
  const { general } = await getSiteContent();
  return (
    <LegalPage title="Términos de uso" intro="Las reglas del juego para usar este sitio y la plataforma de clientes de Peek Media.">
      <h2>El sitio</h2>
      <p>
        La información de este sitio es orientativa. Los precios aparecen como &ldquo;desde&rdquo;: son de referencia y el monto final
        se acuerda por escrito según lo que necesite tu negocio. Enviar una cotización no crea ninguna obligación para ti ni para
        nosotros.
      </p>

      <h2>La plataforma de clientes</h2>
      <ul>
        <li>El acceso es personal. Cuida tu contraseña o código y avísanos si crees que alguien más lo usa.</li>
        <li>Cada cliente solo ve la información de su propio espacio.</li>
        <li>
          Al conectar tus redes, nos autorizas a publicar, leer métricas y responder en tu nombre dentro de los permisos que
          aceptes. Puedes quitar el acceso cuando quieras.
        </li>
        <li>Los servicios, entregables y pagos se rigen por el contrato firmado entre tu negocio y Peek Media.</li>
      </ul>

      <h2>Contenido</h2>
      <p>
        Tú sigues siendo dueño de tu marca y del material que nos compartes. Nos das permiso para usarlo solo para prestarte el
        servicio. Las piezas que creamos para ti se entregan según lo que diga tu contrato.
      </p>

      <h2>Uso correcto</h2>
      <p>
        No uses el sitio ni la plataforma para enviar spam, intentar acceder a datos de otros clientes o publicar contenido ilegal.
        Podemos suspender el acceso si eso ocurre.
      </p>

      <h2>Responsabilidad</h2>
      <p>
        Trabajamos para que todo funcione, pero las redes sociales cambian sus reglas y sus APIs: no podemos garantizar resultados
        concretos de alcance o ventas, ni responder por fallas de servicios de terceros.
      </p>

      <h2>Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República Dominicana.</p>

      <h2>Contacto</h2>
      <p>
        Si tienes dudas, <ContactLine general={general} />.
      </p>
    </LegalPage>
  );
}
