import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/lib/data/content";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Qué datos recoge Peek Media, para qué los usa y cómo puedes pedir que los borremos.",
  alternates: { canonical: "/privacidad" },
};

export default async function PrivacidadPage() {
  const { general } = await getSiteContent();
  return (
    <LegalPage
      title="Política de privacidad"
      intro="Te contamos, sin letra chiquita, qué datos guardamos, para qué y qué puedes hacer con ellos."
    >
      <h2>Quiénes somos</h2>
      <p>
        Peek Media es una agencia de marketing digital en Santo Domingo, República Dominicana. Somos responsables de los datos que nos
        compartes en este sitio y en nuestra plataforma de clientes.
      </p>

      <h2>Qué datos recogemos</h2>
      <ul>
        <li>
          <strong>Cuando cotizas en el sitio:</strong> tu nombre, el nombre de tu negocio, los servicios que marcas y lo que nos
          cuentes en las notas.
        </li>
        <li>
          <strong>Cuando nos escribes por WhatsApp:</strong> tu número y los mensajes que nos envías. WhatsApp tiene su propia
          política de privacidad.
        </li>
        <li>
          <strong>Si eres cliente y usas la plataforma:</strong> tu nombre, email, rol y la actividad dentro de tu espacio
          (aprobaciones, comentarios y firma del contrato, con fecha, hora, IP y navegador para respaldarla).
        </li>
        <li>
          <strong>Si conectas tus redes (Instagram, Facebook, TikTok, YouTube, Google y otras):</strong> los permisos que tú
          autorizas, los identificadores de tus cuentas, métricas, publicaciones, comentarios y mensajes necesarios para gestionar
          tu contenido. Los tokens de acceso se guardan cifrados en nuestro servidor y nunca se envían al navegador.
        </li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Responder tu cotización y preparar una propuesta.</li>
        <li>Prestar los servicios que contrataste: publicar, responder, medir y reportar.</li>
        <li>Cumplir con obligaciones legales y contractuales.</li>
      </ul>
      <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>

      <h2>Con quién los compartimos</h2>
      <p>
        Solo con los proveedores que necesitamos para operar (alojamiento, base de datos, correo) y con las redes sociales que tú
        conectes, cuando publicamos o leemos datos en tu nombre. Todos tratan los datos bajo sus propias obligaciones de seguridad.
      </p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>
        Las cotizaciones, hasta 24 meses. Los datos de clientes, mientras dure la relación y el tiempo que exija la ley después. Si
        desconectas una red, borramos sus tokens de inmediato.
      </p>

      <h2>Tus derechos</h2>
      <p>
        De acuerdo con la Ley 172-13 de República Dominicana, puedes pedir acceso, corrección o eliminación de tus datos, y oponerte a
        su uso. Para hacerlo, <ContactLine general={general} />. También puedes seguir los pasos de{" "}
        <a href="/eliminacion-de-datos">eliminación de datos</a>.
      </p>

      <h2>Cambios</h2>
      <p>Si cambiamos esta política, actualizamos la fecha de arriba y, si el cambio es importante, te avisamos.</p>
    </LegalPage>
  );
}
