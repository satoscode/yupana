import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, BadgeCheck, Zap } from "lucide-react";
import { getClient, listPayments, listPlans } from "../data/db.js";
import { calculateBalance, resolvePlanFields } from "../lib/balance.js";
import { fmtAmount, fmtDate } from "./format.js";
import { activeConfig } from "../config/index.js";

export default function ClientLookup() {
  const { token } = useParams();
  const [state, setState] = useState("loading"); // loading | notfound | ready
  const [client, setClient] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      const c = await getClient(token);
      if (!c) {
        if (active) setState("notfound");
        return;
      }
      const [payments, plans] = await Promise.all([listPayments(token), listPlans()]);
      const plan = plans.find((p) => p.id === c.planId) ?? { amount: 0, cycle: "monthly" };
      const resolved = resolvePlanFields(c, plan);
      const balance = calculateBalance({ ...c, ...resolved }, payments);
      if (active) {
        setClient({ ...c, ...resolved, plan, payments, ...balance });
        setState("ready");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const config = activeConfig;

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-8">
      <div className="mx-auto max-w-sm">
        <h1 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Zap size={18} />
          </span>
          Yupana
        </h1>

        {state === "loading" && <p className="text-sm text-slate-500">Cargando...</p>}

        {state === "notfound" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            No encontramos tu cuenta. Revisa el enlace o consulta con tu proveedor.
          </div>
        )}

        {state === "ready" && client && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="bg-slate-800 px-5 py-3 text-white">
              <p className="text-xs text-slate-300">Estado de cuenta</p>
              <p className="text-lg font-semibold">{client.name}</p>
              <p className="text-xs text-slate-400">
                {Object.values(client.customFields ?? {}).join(" · ")}
              </p>
            </div>

            <div className="p-5">
              <div
                className={`flex items-center gap-3 rounded-lg p-4 ${
                  client.balance > 0 ? "bg-rose-50" : "bg-teal-50"
                }`}
              >
                {client.balance > 0 ? (
                  <AlertCircle size={28} className="text-rose-600 shrink-0" />
                ) : (
                  <BadgeCheck size={28} className="text-teal-600 shrink-0" />
                )}
                <div>
                  <p
                    className={`text-lg font-bold ${
                      client.balance > 0 ? "text-rose-700" : "text-teal-700"
                    }`}
                  >
                    {client.balance > 0
                      ? `Debes ${fmtAmount(client.balance, config)}`
                      : "Estás al día"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Próximo cobro: {fmtDate(client.nextDueDate, config)}
                  </p>
                </div>
              </div>

              <h3 className="mt-5 mb-2 text-sm font-semibold text-slate-700">
                Tus últimos movimientos
              </h3>
              <div className="space-y-1">
                {client.payments.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-slate-100 py-2 text-sm"
                  >
                    <span className="text-slate-700">Pago ({p.method})</span>
                    <div className="text-right">
                      <span className="text-teal-700">−{fmtAmount(p.amount, config)}</span>
                      <p className="text-xs text-slate-400">{fmtDate(p.date, config)}</p>
                    </div>
                  </div>
                ))}
                {client.payments.length === 0 && (
                  <p className="text-sm text-slate-400">Sin pagos registrados todavía.</p>
                )}
              </div>

              <p className="mt-4 text-xs text-slate-400">
                ¿Ya pagaste? Tu estado se actualiza cuando el operador registra el pago.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
