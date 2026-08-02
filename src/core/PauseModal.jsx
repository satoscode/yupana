import React, { useState } from "react";
import { Pause, Trash2 } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { fmtDate } from "./format.js";

// Solo admin: pausa el cobro durante un rango de fechas (viaje, ausencia del
// usuario) sin dar de baja al cliente. Cualquier vencimiento dentro del
// rango cobra 0 automáticamente — ver pausePeriods en balance.js. Reusa
// onEdit (mismo mecanismo que EditClientModal) porque pausePeriods es un
// campo más del cliente, no necesita su propia función en db.js.
export default function PauseModal({ client, config, onClose, onSave }) {
  const [periods, setPeriods] = useState(client.pausePeriods ?? []);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const persist = async (next) => {
    setSaving(true);
    try {
      await onSave({ pausePeriods: next });
      setPeriods(next);
    } finally {
      setSaving(false);
    }
  };

  const addPeriod = async () => {
    if (!from || !to || from > to) return;
    const next = [...periods, { from, to, note: note.trim() || null }].sort((a, b) =>
      a.from < b.from ? -1 : 1
    );
    await persist(next);
    setFrom("");
    setTo("");
    setNote("");
  };

  const removePeriod = async (index) => {
    if (
      !window.confirm("¿Quitar esta pausa? Los meses dentro de ese rango vuelven a cobrar normal.")
    ) {
      return;
    }
    await persist(periods.filter((_, i) => i !== index));
  };

  return (
    <Modal onClose={onClose} titulo="Pausar servicio">
      <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">
        Los meses que venzan dentro del rango no generan cobro, sin dar de baja al cliente.
      </p>
      <div className="mb-4 space-y-2">
        {periods.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Sin pausas registradas.</p>
        )}
        {periods.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
          >
            <div className="min-w-0">
              <p className="text-slate-700 dark:text-slate-300">
                {fmtDate(p.from, config)} — {fmtDate(p.to, config)}
              </p>
              {p.note && (
                <p className="truncate text-xs italic text-slate-400 dark:text-slate-500">
                  {p.note}
                </p>
              )}
            </div>
            <button
              onClick={() => removePeriod(i)}
              disabled={saving}
              aria-label="Quitar pausa"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-rose-950 dark:hover:text-rose-400"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Agregar pausa
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
      <label className="mt-2 mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        Motivo
      </label>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ej: viaje, ausencia temporal"
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        onClick={addPeriod}
        disabled={!from || !to || from > to || saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Pause size={16} /> {saving ? "Guardando..." : "Agregar pausa"}
      </button>
    </Modal>
  );
}
