import React, { useState } from "react";
import { Plus, Shuffle } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import Campo from "./Campo.jsx";

// Sin 0/O ni 1/I/L: caracteres que se confunden fácil al leer o tipear el
// código a mano (p. ej. en un carnet de socio).
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export default function AddClientModal({ config, plans, onClose, onSave }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [customFields, setCustomFields] = useState({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const setField = (key, value) =>
    setCustomFields((prev) => ({ ...prev, [key]: value }));

  const valido = name.trim() && planId;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ name, contact, code, planId, startDate, customFields, notes });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Agregar ${config.clientTerm.toLowerCase()}`}>
      <div className="space-y-3">
        <Campo label="Nombre" value={name} onChange={setName} />
        <Campo label="Contacto (teléfono/WhatsApp)" value={contact} onChange={setContact} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Código
          </label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => setCode(randomCode())}
              aria-label="Generar código aleatorio"
              className="flex shrink-0 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              <Shuffle size={16} />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Si no manejás carnet u otro identificador (p. ej. un gimnasio), generá uno aleatorio.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Plan
          </label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.amount} {config.currency})
              </option>
            ))}
          </select>
        </div>
        <Campo
          label="Fecha de alta"
          type="date"
          value={startDate}
          onChange={setStartDate}
        />
        {config.customFields.map((field) => (
          <Campo
            key={field.key}
            label={field.label}
            type={field.type === "number" ? "number" : "text"}
            value={customFields[field.key] ?? ""}
            onChange={(v) => setField(field.key, v)}
          />
        ))}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Notas
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>
      <button
        disabled={!valido || saving}
        onClick={submit}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
      >
        <Plus size={16} /> {saving ? "Guardando..." : "Guardar"}
      </button>
    </Modal>
  );
}
