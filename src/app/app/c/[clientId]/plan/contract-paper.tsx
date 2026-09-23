import { Logo } from "@/components/ui";
import type { Agency, ContractSection } from "@/lib/contracts/document";
import type { Contract } from "@/lib/contracts/schema";
import { formatDateTimeRD, longDate } from "@/lib/format";

/** El contrato con aspecto de papel. Es lo único que se imprime (clase print-contract en el body). */
export function ContractPaper({
  contract: c,
  sections,
  agency,
  client,
  showDraftNotice,
}: {
  contract: Contract;
  sections: ContractSection[];
  agency: Agency;
  client: { name: string; contactName: string };
  showDraftNotice: boolean;
}) {
  const sig = c.signature;
  const docDate = (c.sentAt ?? c.createdAt).slice(0, 10);
  return (
    <article
      data-contract
      aria-label={`Contrato ${c.number}, versión ${c.version}`}
      className="flex min-w-0 flex-[3_1_520px] flex-col gap-[22px] rounded-[6px] bg-surface p-[clamp(24px,4vw,56px)] shadow-elevated"
    >
      <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-[18px]">
        <Logo className="h-10" />
        <div className="text-right text-eyebrow leading-normal">
          <p className="font-bold">Contrato {c.number}</p>
          <p>Versión {c.version}</p>
          <p>{longDate(docDate)}</p>
        </div>
      </header>
      <h2 className="font-display text-[26px] leading-[1.1] font-bold tracking-[-0.02em]">Contrato de servicios de marketing digital</h2>
      {showDraftNotice && c.status !== "signed" && (
        <p className="rounded-sm bg-coral-tint px-3 py-2 text-eyebrow" data-noprint>
          Antes de enviar el primer contrato, revisa este texto con un abogado.
        </p>
      )}
      {sections.map((s) => (
        <section key={s.title} className="flex flex-col gap-2">
          <h3 className="text-label font-bold tracking-[0.02em]">{s.title}</h3>
          {s.paras.map((p, i) => (
            <p key={i} className="text-label leading-[1.65] text-pretty">
              {p}
            </p>
          ))}
        </section>
      ))}

      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex h-[70px] items-end font-signature text-[38px] leading-none font-semibold">{agency.representative}</div>
          <p className="border-t-[1.5px] border-ink pt-1.5 text-caption leading-snug">
            <strong>{agency.representative}</strong>
            <br />
            {agency.name}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex h-[70px] items-end">
            {sig?.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- firma en data URL
              <img src={sig.image} alt={`Firma de ${sig.signerName}`} className="h-[70px] w-auto max-w-full object-contain object-left-bottom" />
            ) : sig ? (
              <span className="font-signature text-[38px] leading-none font-semibold">{sig.signerName}</span>
            ) : (
              <span className="text-caption text-muted">Pendiente de firma</span>
            )}
          </div>
          <p className="border-t-[1.5px] border-ink pt-1.5 text-caption leading-snug">
            <strong>{sig?.signerName ?? (client.contactName || "Representante del cliente")}</strong>
            <br />
            {client.name}
          </p>
        </div>
      </div>

      {sig && (
        <p className="rounded-sm bg-sand px-3 py-2.5 font-mono text-[11px] leading-normal break-words">
          Firmado electrónicamente por {sig.signerName} ({sig.signerRole}) el {formatDateTimeRD(sig.signedAt)} (hora de RD) · Método:{" "}
          {sig.method === "drawn" ? "firma dibujada" : "firma escrita"} · Código de verificación {sig.verificationCode} · SHA-256{" "}
          {sig.docSha256.slice(0, 16)}…
        </p>
      )}
    </article>
  );
}
