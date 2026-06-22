import React, { useMemo } from "react";
import { ArrowLeft, CalendarClock, Power, RotateCcw, Wallet } from "lucide-react";
import { listDueDates } from "../lib/balance.js";
import { fmtAmount, fmtDate } from "./format.js";

export default function ClientDetail({ client, config, onClose, onPagar, onToggle }) {
  const movimientos = useMemo(() => {
    const cargos = listDueDates(client).map((date) => ({
      kind: "cargo",
      date,
      amount: client.amount,
    }));
    const pagos = client.payments.map((p) => ({
      kind: "pago",
      date: p.date,
      amount: p.amount,
      method: p.method,
    }));
    return [...cargos, ...pagos].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [client]);

  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={16} /> Volver
        </button>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {config.customFields
            .map((f) => client.customFields?.[f.key])
            .filter(Boolean)
            .join(" · ")}
        </p>
        {client.code && (
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Código {client.code}</p>
        )}

        <div className="mt-4 rounded-lg bg-stone-100 p-4 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saldo actual</p>
          <p
            className={`text-2xl font-bold ${
              client.balance > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-teal-700 dark:text-teal-400"
            }`}
          >
            {client.balance > 0 ? fmtAmount(client.balance, config) : "Al día"}
          </p>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            Próximo cobro: {fmtDate(client.nextDueDate, config)}
          </p>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={onPagar}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
          >
            <Wallet size={16} /> Registrar pago
          </button>
          <button
            onClick={onToggle}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            {client.status === "active" ? (
              <>
                <Power size={16} /> Retirar
              </>
            ) : (
              <>
                <RotateCcw size={16} /> Reactivar
              </>
            )}
          </button>
        </div>

        <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Historial
        </h3>
        <div className="space-y-1">
          {movimientos.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin movimientos todavía.</p>
          )}
          {movimientos.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-700"
            >
              <div className="flex items-center gap-2">
                {m.kind === "pago" ? (
                  <Wallet size={15} className="text-teal-600 dark:text-teal-400" />
                ) : (
                  <CalendarClock size={15} className="text-slate-400 dark:text-slate-500" />
                )}
                <span className="text-slate-700 dark:text-slate-300">
                  {m.kind === "pago" ? `Pago (${m.method})` : "Cargo"}
                </span>
              </div>
              <div className="text-right">
                <span
                  className={
                    m.kind === "pago"
                      ? "text-teal-700 dark:text-teal-400"
                      : "text-slate-700 dark:text-slate-300"
                  }
                >
                  {m.kind === "pago" ? "−" : "+"}
                  {fmtAmount(m.amount, config)}
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {fmtDate(m.date, config)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
