import React, { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Save,
  Settings as SettingsIcon,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { createPlan, deletePlan, listPlans, planInUse, saveConfig, updatePlan } from "../data/db.js";

const LOGO_MAX_DIM = 128;

// Redimensiona la imagen elegida a un cuadrado chico (cabe cómodo en el
// límite de 1 MiB del doc de Firestore) y la devuelve como data URL PNG, sin
// necesidad de Firebase Storage.
function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, LOGO_MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

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
  const [deletingPlanId, setDeletingPlanId] = useState(null);
  const [planError, setPlanError] = useState("");

  const [clientTerm, setClientTerm] = useState(config.clientTerm);
  const [currency, setCurrency] = useState(config.currency);
  const [paymentMethods, setPaymentMethods] = useState(config.paymentMethods.join(", "));
  const [fieldLabels, setFieldLabels] = useState(
    Object.fromEntries(config.customFields.map((f) => [f.key, f.label]))
  );
  const [savingLabels, setSavingLabels] = useState(false);

  const [businessName, setBusinessName] = useState(config.receipt?.businessName ?? "");
  const [tagline, setTagline] = useState(config.receipt?.tagline ?? "");
  const [logoDataUrl, setLogoDataUrl] = useState(config.receipt?.logoDataUrl ?? null);
  const [savingReceipt, setSavingReceipt] = useState(false);
  const logoInputRef = useRef(null);

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

  const removePlan = async (plan) => {
    setPlanError("");
    setDeletingPlanId(plan.id);
    try {
      if (await planInUse(plan.id)) {
        setPlanError(
          `No se puede eliminar "${plan.name}": hay clientes en este plan. Desactivalo en su lugar.`
        );
        return;
      }
      if (!window.confirm(`¿Eliminar el plan "${plan.name}"? No se puede deshacer.`)) return;
      await deletePlan(plan.id);
      await reloadPlans();
    } finally {
      setDeletingPlanId(null);
    }
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

  const onLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoDataUrl(await resizeToDataUrl(file));
    e.target.value = "";
  };

  const saveReceipt = async () => {
    setSavingReceipt(true);
    try {
      await saveConfig({
        receipt: {
          businessName: businessName.trim() || null,
          tagline: tagline.trim() || null,
          logoDataUrl,
        },
      });
      await onSaved();
    } finally {
      setSavingReceipt(false);
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
            className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Nombre
                </label>
                <input
                  value={plan.name}
                  onChange={(e) => editPlan(plan, "name", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                onClick={() => removePlan(plan)}
                disabled={deletingPlanId === plan.id}
                aria-label={`Eliminar plan ${plan.name}`}
                className="mt-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:text-slate-500 dark:hover:bg-rose-950 dark:hover:text-rose-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <div className="w-24">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Monto ({config.currency})
                </label>
                <input
                  type="number"
                  value={plan.amount}
                  onChange={(e) => editPlan(plan, "amount", Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="min-w-[8rem] flex-1">
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Frecuencia
                </label>
                <select
                  value={plan.cycle}
                  onChange={(e) => editPlan(plan, "cycle", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {Object.entries(CYCLE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex shrink-0 items-center gap-1 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={plan.active}
                  onChange={(e) => editPlan(plan, "active", e.target.checked)}
                />
                Activo
              </label>
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          "Activo" controla si el plan se ofrece a clientes nuevos — desactivalo para retirarlo
          sin afectar a quienes ya lo tienen. Eliminar solo funciona si ningún cliente lo usa.
        </p>
        {planError && <p className="text-xs text-rose-600 dark:text-rose-400">{planError}</p>}
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
              Etiqueta para "{f.label}"
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

      <h3 className="mt-6 mb-2 flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
        <ImageIcon size={14} /> Perfil de recibo
      </h3>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
        Se usa al compartir el recibo de un pago. Si no cargás nada, el recibo usa la marca de
        Yupana.
      </p>
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Nombre del negocio o institución
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Yupana"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Lema (opcional)
          </label>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Logo
          </label>
          <div className="flex items-center gap-3">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-600 text-white">
                <ImageIcon size={18} />
              </span>
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Subir logo
            </button>
            {logoDataUrl && (
              <button
                onClick={() => setLogoDataUrl(null)}
                aria-label="Quitar logo"
                className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400"
              >
                <X size={16} />
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoChange}
              className="hidden"
            />
          </div>
        </div>
      </div>
      <button
        onClick={saveReceipt}
        disabled={savingReceipt}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Save size={16} /> {savingReceipt ? "Guardando..." : "Guardar"}
      </button>
    </Modal>
  );
}
