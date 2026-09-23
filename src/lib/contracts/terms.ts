import { addMonths, todayRD } from "@/lib/format";
import type { ContractPlan } from "./catalog";
import type { Contract, ContractTerms } from "./schema";

/** Condiciones iniciales para un plan: precio "desde", inicio el mes que viene, 6 meses, pago el día 5. */
export function defaultTerms(plan: ContractPlan, today = todayRD()): ContractTerms {
  return {
    planId: plan.id,
    price: plan.priceFrom || 1,
    startDate: addMonths(`${today.slice(0, 7)}-01`, 1),
    months: 6,
    billingDay: 5,
    paymentMethod: "Transferencia bancaria",
    deliverables: { ...plan.deliverables },
    addons: [],
  };
}

export function termsOf(c: Contract): ContractTerms {
  return {
    planId: c.planId,
    price: c.price,
    startDate: c.startDate,
    months: c.months,
    billingDay: c.billingDay,
    paymentMethod: c.paymentMethod as ContractTerms["paymentMethod"],
    deliverables: { ...c.deliverables },
    addons: c.addons as ContractTerms["addons"],
  };
}
