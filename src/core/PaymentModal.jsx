import React, { useState } from "react";
import { Check } from "lucide-react";

export default function PaymentModal({ client, config, onClose, onSave }) {
  const [amount, setAmount] = useState(Math.max(0, client.balance) || client.amount);
  const [method, setMethod] = useState(config.paymentMethods[0]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(Number(amount), method);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Registrar pago">
      <p className="text-sm text-slate-500 mb-3">{client.name}</p>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        Monto ({config.currency})
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
      />
      <label className="block text-xs font-medium text-slate-600 mb-1">Cómo pagó</label>
      <div className="mb-4 flex gap-2">
        {config.paymentMethods.map((opt) => (
          <button
            key={opt}
            onClick={() => setMethod(opt)}
            className={`flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm ${
              method === opt
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-slate-300 text-slate-600"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={saving || !amount}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Check size={16} /> {saving ? "Guardando..." : "Guardar pago"}
      </button>
    </Modal>
  );
}

export function Modal({ titulo, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
