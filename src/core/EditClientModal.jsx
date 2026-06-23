import React, { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import Campo from "./Campo.jsx";

// Solo admin: editar la info base de un cliente ya existente (nombre, plan,
// fecha de alta, campos extra). El operador no tiene acceso a este modal
// (gateado en ClientDetail.jsx) ni a estos campos vía Firestore Rules.
export default function EditClientModal({ client, config, plans, onClose, onSave }) {
  const [name, setName] = useState(client.name);
  const [code, setCode] = useState(client.code ?? "");
  const [planId, setPlanId] = useState(client.planId ?? plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(
    typeof client.startDate === "string" ? client.startDate.slice(0, 10) : ""
  );
  const [customFields, setCustomFields] = useState(client.customFields ?? {});
  const [saving, setSaving] = useState(false);

  const setField = (key, value) =>
    setCustomFields((prev) => ({ ...prev, [key]: value }));

  const valido = name.trim() && planId;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({ name, code, planId, startDate, customFields });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={`Editar ${config.clientTerm.toLowerCase()}`}>
      <div className="space-y-3">
        <Campo label="Nombre" value={name} onChange={setName} />
        <Campo label="Código" value={code} onChange={setCode} />
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
        <Campo label="Fecha de alta" type="date" value={startDate} onChange={setStartDate} />
        {config.customFields.map((field) => (
          <Campo
            key={field.key}
            label={field.label}
            type={field.type === "number" ? "number" : "text"}
            value={customFields[field.key] ?? ""}
            onChange={(v) => setField(field.key, v)}
          />
        ))}
      </div>
      <button
        disabled={!valido || saving}
        onClick={submit}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
      >
        <Check size={16} /> {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </Modal>
  );
}
