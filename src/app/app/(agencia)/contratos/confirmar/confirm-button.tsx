"use client";

import { TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, useToast } from "@/components/ui";
import { confirmEndContractAction } from "./actions";

export function ConfirmEnd({ token, label }: { token: string; label: string }) {
  const toast = useToast();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="destructive"
        className="self-start"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await confirmEndContractAction(token);
            if (!res.ok) return setError(res.error);
            toast({ title: "Listo. El contrato quedó cerrado y se avisó al cliente.", tone: "success" });
            router.push(`/app/c/${res.clientId}/plan`);
          })
        }
      >
        {label}
      </Button>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-label font-semibold text-coral-strong">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
