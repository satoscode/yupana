import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Pause,
  Pencil,
  Power,
  RotateCcw,
  Share2,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { allocateLedger } from "../lib/balance.js";
import { fmtAmount, fmtDate, fmtDateTime, fmtMonth } from "./format.js";
import EditClientModal from "./EditClientModal.jsx";
import ChargeOverrideModal from "./ChargeOverrideModal.jsx";
import PauseModal from "./PauseModal.jsx";
import PaymentModal from "./PaymentModal.jsx";
import { emailToUsername } from "./staffLogin.js";

const CARGO_ESTADO = {
  paid: { label: "Pagado", icon: CheckCircle2, className: "text-teal-600 dark:text-teal-400" },
  partial: {
    label: "Pago parcial",
    icon: AlertCircle,
    className: "text-amber-600 dark:text-amber-400",
  },
  pending: {
    label: "Pendiente",
    icon: CalendarClock,
    className: "text-slate-400 dark:text-slate-500",
  },
  paused: { label: "Pausado", icon: Pause, className: "text-sky-500 dark:text-sky-400" },
};

export default function ClientDetail({
  client,
  config,
  plans,
  isAdmin,
  onClose,
  onPagar,
  onToggle,
  onEdit,
  onDeletePayment,
  onEditPayment,
  onChargeOverride,
  onShowRecibo,
}) {
  const [editing, setEditing] = useState(false);
  const [chargingSpecial, setChargingSpecial] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const activePause = (client.pausePeriods ?? []).find(
    (p) => new Date(p.from) <= new Date() && new Date() <= new Date(p.to)
  );

  const { charges, payments: ledgerPayments } = useMemo(
    () => allocateLedger(client, client.payments),
    [client]
  );

  const movimientos = useMemo(() => {
    const cargos = charges.map((c) => ({
      kind: "cargo",
      date: c.date,
      amount: c.amount,
      status: c.status,
      paidAmount: c.paidAmount,
      overridden: c.overridden,
      note: c.note,
      appliedByEmail: c.appliedByEmail,
    }));
    const pagos = ledgerPayments.map((p) => ({
      kind: "pago",
      id: p.id,
      date: p.date,
      amount: p.amount,
      method: p.method,
      coversMonth: p.coversMonth,
      registeredByEmail: p.registeredByEmail,
      note: p.note,
    }));
    return [...cargos, ...pagos].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [charges, ledgerPayments]);

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
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{client.name}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {config.customFields
                .map((f) => client.customFields?.[f.key])
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
            >
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>
        {client.contact && (
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">{client.contact}</p>
        )}
        {client.code && (
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Código {client.code}</p>
        )}
        {client.notes && (
          <p className="text-xs text-slate-500 mt-1 italic dark:text-slate-400">{client.notes}</p>
        )}
        {client.openingBalance !== 0 && (
          <p className="text-xs mt-1 font-medium text-amber-600 dark:text-amber-400">
            Ajuste de saldo aplicado: {client.openingBalance > 0 ? "+" : ""}
            {fmtAmount(client.openingBalance, config)}
          </p>
        )}
        {isAdmin && client.lastEditedByEmail && (
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
            Última edición: {emailToUsername(client.lastEditedByEmail)} ·{" "}
            {fmtDateTime(client.lastEditedAt, config)}
          </p>
        )}
        {isAdmin && client.status === "cancelled" && client.statusChangedByEmail && (
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
            Retirado por {emailToUsername(client.statusChangedByEmail)} ·{" "}
            {fmtDateTime(client.statusChangedAt, config)}
          </p>
        )}
        {activePause && (
          <p className="text-xs mt-1 font-medium text-sky-600 dark:text-sky-400">
            Servicio pausado hasta {fmtDate(activePause.to, config)}
          </p>
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
          {isAdmin && (
            <button
              onClick={() => {
                if (client.status === "active") {
                  if (window.confirm(`¿Retirar a ${client.name}? Podés reactivarlo después.`)) {
                    onToggle();
                  }
                } else {
                  onToggle();
                }
              }}
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
          )}
        </div>
        {isAdmin && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setChargingSpecial(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Tag size={16} /> Cobro especial
            </button>
            <button
              onClick={() => setPausing(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Pause size={16} /> Pausar servicio
            </button>
          </div>
        )}

        <h3 className="mt-6 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Historial
        </h3>
        <div className="space-y-1">
          {movimientos.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin movimientos todavía.</p>
          )}
          {movimientos.map((m, i) => {
            const estado = m.kind === "cargo" ? CARGO_ESTADO[m.status] : null;
            const EstadoIcon = estado?.icon;
            return (
              <div
                key={i}
                className="flex items-center justify-between border-b border-slate-100 py-2 text-sm dark:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  {m.kind === "pago" ? (
                    <Wallet size={15} className="text-teal-600 dark:text-teal-400" />
                  ) : (
                    <EstadoIcon size={15} className={estado.className} />
                  )}
                  <span className="text-slate-700 dark:text-slate-300">
                    {m.kind === "pago"
                      ? m.coversMonth
                        ? `Pago ${fmtMonth(m.coversMonth, config)} (${m.method})`
                        : `Pago (${m.method})`
                      : `${fmtMonth(m.date, config)} — ${estado.label}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span
                      className={
                        m.kind === "pago"
                          ? "text-teal-700 dark:text-teal-400"
                          : estado.className
                      }
                    >
                      {m.kind === "pago" ? "−" : "+"}
                      {m.kind === "cargo" && m.status === "partial"
                        ? `${fmtAmount(m.paidAmount, config)} de ${fmtAmount(m.amount, config)}`
                        : fmtAmount(m.amount, config)}
                    </span>
                    {m.kind === "cargo" && m.overridden && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        antes <s>{fmtAmount(client.amount, config)}</s>
                      </p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {m.kind === "pago" ? fmtDateTime(m.date, config) : fmtDate(m.date, config)}
                      {m.kind === "pago" &&
                        m.registeredByEmail &&
                        ` · ${emailToUsername(m.registeredByEmail)}`}
                    </p>
                    {m.note && (
                      <p className="text-xs italic text-slate-400 dark:text-slate-500">
                        {m.note}
                        {m.kind === "cargo" &&
                          isAdmin &&
                          m.appliedByEmail &&
                          ` · ${emailToUsername(m.appliedByEmail)}`}
                      </p>
                    )}
                  </div>
                  {m.kind === "pago" && (
                    <button
                      onClick={() => onShowRecibo(m)}
                      aria-label="Compartir recibo"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-teal-400"
                    >
                      <Share2 size={16} />
                    </button>
                  )}
                  {m.kind === "pago" && (
                    <button
                      onClick={() => setEditingPayment(m)}
                      aria-label="Editar pago"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-teal-400"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {m.kind === "pago" && isAdmin && (
                    <button
                      onClick={() => {
                        if (window.confirm("¿Eliminar este pago? No se puede deshacer.")) {
                          onDeletePayment(m.id);
                        }
                      }}
                      aria-label="Eliminar pago"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950 dark:hover:text-rose-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <EditClientModal
          client={client}
          config={config}
          plans={plans}
          onClose={() => setEditing(false)}
          onSave={async (data) => {
            await onEdit(data);
            setEditing(false);
          }}
        />
      )}

      {chargingSpecial && (
        <ChargeOverrideModal
          client={client}
          charges={charges}
          config={config}
          onClose={() => setChargingSpecial(false)}
          onSave={async (overrides) => {
            await onChargeOverride(overrides);
            setChargingSpecial(false);
          }}
        />
      )}

      {pausing && (
        <PauseModal
          client={client}
          config={config}
          onClose={() => setPausing(false)}
          onSave={onEdit}
        />
      )}

      {editingPayment && (
        <PaymentModal
          client={client}
          config={config}
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSave={async (amount, method, note) => {
            await onEditPayment(editingPayment.id, amount, method, note);
            setEditingPayment(null);
          }}
        />
      )}
    </div>
  );
}
