import React, { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { fmtAmount, fmtMonth } from "./format.js";

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Solo admin: ajusta el monto de meses puntuales (rebaja/cobro excepcional),
// sin tocar el monto del plan ni los meses no editados. Ver chargeOverrides
// en balance.js. Cada mes tiene su propio campo de monto (permite valores
// distintos por mes en la misma pasada); el bloque de arriba es un atajo
// para aplicar el mismo monto/motivo a varios meses marcados de una vez.
// Al guardar, solo se escriben los meses realmente tocados en esta sesión —
// un ajuste ya aplicado en un mes que no se toca queda intacto.
export default function ChargeOverrideModal({ client, charges, config, onClose, onSave }) {
  const [rows, setRows] = useState(
    () =>
      new Map(
        charges.map((c) => {
          const key = dateKey(c.date);
          const amount = String(c.amount);
          const note = c.note ?? "";
          return [key, { amount, note, initialAmount: amount, initialNote: note }];
        })
      )
  );
  const [selected, setSelected] = useState(new Set());
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleSelected = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setRow = (key, patch) =>
    setRows((prev) => {
      const next = new Map(prev);
      next.set(key, { ...next.get(key), ...patch });
      return next;
    });

  const applyBulk = () => {
    if (!bulkAmount || selected.size === 0) return;
    setRows((prev) => {
      const next = new Map(prev);
      for (const key of selected) {
        next.set(key, { ...next.get(key), amount: bulkAmount, note: bulkNote });
      }
      return next;
    });
    setSelected(new Set());
  };

  const dirtyEntries = [...rows.entries()].filter(
    ([, r]) => r.amount !== r.initialAmount || r.note !== r.initialNote
  );
  const valido =
    dirtyEntries.length > 0 &&
    dirtyEntries.every(([, r]) => r.amount.trim() !== "" && !Number.isNaN(Number(r.amount)));

  const submit = async () => {
    setSaving(true);
    try {
      const overrides = {};
      for (const [key, r] of dirtyEntries) {
        const amountNum = Number(r.amount);
        overrides[key] =
          amountNum === client.amount ? null : { amount: amountNum, note: r.note.trim() || null };
      }
      await onSave(overrides);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Cobro especial">
      <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">
        Editá el monto de los meses que necesiten un valor distinto al normal (
        {fmtAmount(client.amount, config)}). Los meses que no toques siguen con el monto normal.
      </p>

      <div className="mb-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          Aplicar el mismo monto a varios meses: marcalos abajo y completá acá.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            placeholder={`Monto (${config.currency})`}
            className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            value={bulkNote}
            onChange={(e) => setBulkNote(e.target.value)}
            placeholder="Motivo"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={applyBulk}
            disabled={!bulkAmount || selected.size === 0}
            className="shrink-0 rounded-lg bg-slate-700 px-3 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            Aplicar a marcados{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>

      <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
        {charges.map((c) => {
          const key = dateKey(c.date);
          const row = rows.get(key);
          const isSpecial = row.amount !== String(client.amount);
          return (
            <div
              key={key}
              className="border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-700"
            >
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggleSelected(key)}
                  aria-label={`Marcar ${fmtMonth(c.date, config)}`}
                />
                <span className="flex-1 text-slate-700 dark:text-slate-300">
                  {fmtMonth(c.date, config)}
                </span>
                <input
                  type="number"
                  value={row.amount}
                  onChange={(e) => setRow(key, { amount: e.target.value })}
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              {isSpecial && (
                <input
                  value={row.note}
                  onChange={(e) => setRow(key, { note: e.target.value })}
                  placeholder="Motivo"
                  className="mt-1 ml-6 w-[calc(100%-1.5rem)] rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              )}
            </div>
          );
        })}
        {charges.length === 0 && (
          <p className="p-3 text-sm text-slate-400 dark:text-slate-500">Sin meses cargados todavía.</p>
        )}
      </div>

      <button
        onClick={submit}
        disabled={saving || !valido}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Check size={16} /> {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </Modal>
  );
}
