import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";

export default function AddClientModal({ config, plans, onClose, onSave }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [customFields, setCustomFields] = useState({});
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
    <Modal onClose={onClose} titulo={`Agregar ${config.clientTerm.toLowerCase()}`}>
      <div className="space-y-3">
        <Campo label="Nombre" value={name} onChange={setName} />
        <Campo label="Código" value={code} onChange={setCode} />
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Plan</label>
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
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

function Campo({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
      />
    </div>
  );
}
