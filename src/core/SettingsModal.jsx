import React, { useEffect, useState } from "react";
import { Plus, Save, Settings as SettingsIcon } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { createPlan, listPlans, saveConfig, updatePlan } from "../data/db.js";

const CYCLE_LABELS = {
  monthly: "Mensual",
  quarterly: "Trimestral",
  biannual: "Semestral",
  annual: "Anual",
};

// Solo admin: crear/editar planes, y renombrar las etiquetas de los campos
// extra + métodos de pago + nombre del cliente/moneda. Persiste en
// config/default vía saveConfig(); el merge con la config base de la
// vertical vive en src/config/resolveConfig.js.
export default function SettingsModal({ config, onClose, onSaved }) {
  const [plans, setPlans] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: "", amount: "", cycle: "monthly" });
  const [savingPlan, setSavingPlan] = useState(false);

  const [clientTerm, setClientTerm] = useState(config.clientTerm);
  const [currency, setCurrency] = useState(config.currency);
  const [paymentMethods, setPaymentMethods] = useState(config.paymentMethods.join(", "));
  const [fieldLabels, setFieldLabels] = useState(
    Object.fromEntries(config.customFields.map((f) => [f.key, f.label]))
  );
  const [savingLabels, setSavingLabels] = useState(false);

  const reloadPlans = async () => setPlans(await listPlans());

  useEffect(() => {
    reloadPlans();
  }, []);

  const addPlan = async () => {
    if (!newPlan.name.trim() || !newPlan.amount) return;
    setSavingPlan(true);
    try {
      await createPlan({
        name: newPlan.name.trim(),
        amount: Number(newPlan.amount),
        cycle: newPlan.cycle,
      });
      setNewPlan({ name: "", amount: "", cycle: "monthly" });
      await reloadPlans();
    } finally {
      setSavingPlan(false);
    }
  };

  const editPlan = async (plan, field, value) => {
    await updatePlan(plan.id, { [field]: value });
    await reloadPlans();
  };

  const saveLabels = async () => {
    setSavingLabels(true);
    try {
      await saveConfig({
        clientTerm,
        currency,
        paymentMethods: paymentMethods
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        fieldLabels,
      });
      await onSaved();
    } finally {
      setSavingLabels(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Configuración">
      <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Planes
      </h3>
      <div className="mb-4 space-y-2">
        {plans === null && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
        )}
        {plans?.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
          >
            <input
              value={plan.name}
              onChange={(e) => editPlan(plan, "name", e.target.value)}
              className="flex-1 min-w-0 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <input
              type="number"
              value={plan.amount}
              onChange={(e) => editPlan(plan, "amount", Number(e.target.value))}
              className="w-20 shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <select
              value={plan.cycle}
              onChange={(e) => editPlan(plan, "cycle", e.target.value)}
              className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            >
              {Object.entries(CYCLE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <input
                type="checkbox"
                checked={plan.active}
                onChange={(e) => editPlan(plan, "active", e.target.checked)}
              />
              Activo
            </label>
          </div>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={newPlan.name}
          onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))}
          placeholder="Nombre del plan"
          className="min-w-[9rem] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          type="number"
          value={newPlan.amount}
          onChange={(e) => setNewPlan((p) => ({ ...p, amount: e.target.value }))}
          placeholder={`Monto (${config.currency})`}
          className="w-28 shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <select
          value={newPlan.cycle}
          onChange={(e) => setNewPlan((p) => ({ ...p, cycle: e.target.value }))}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          {Object.entries(CYCLE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={addPlan}
          disabled={!newPlan.name.trim() || !newPlan.amount || savingPlan}
          aria-label="Agregar plan"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>

      <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <SettingsIcon size={14} /> Etiquetas y métodos de pago
      </h3>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Cómo llamar al cliente (p. ej. Usuario, Socio, Abonado)
          </label>
          <input
            value={clientTerm}
            onChange={(e) => setClientTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Moneda (p. ej. Bs)
          </label>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Métodos de pago (separados por coma)
          </label>
          <input
            value={paymentMethods}
            onChange={(e) => setPaymentMethods(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        {config.customFields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
              Etiqueta para "{f.key}"
            </label>
            <input
              value={fieldLabels[f.key] ?? f.label}
              onChange={(e) => setFieldLabels((prev) => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        ))}
      </div>
      <button
        onClick={saveLabels}
        disabled={savingLabels}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Save size={16} /> {savingLabels ? "Guardando..." : "Guardar"}
      </button>
    </Modal>
  );
}
