import React, { useEffect, useState } from "react";
import { Check } from "lucide-react";

// payment: si viene, edita ese pago existente en vez de registrar uno
// nuevo — mismo formulario, precargado con sus valores actuales.
export default function PaymentModal({ client, config, payment, onClose, onSave }) {
  const [amount, setAmount] = useState(
    payment ? payment.amount : Math.max(0, client.balance) || client.amount
  );
  const [method, setMethod] = useState(payment?.method ?? config.paymentMethods[0]);
  const [note, setNote] = useState(payment?.note ?? "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await onSave(Number(amount), method, note.trim() || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo={payment ? "Editar pago" : "Registrar pago"}>
      <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">{client.name}</p>
      <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
        Monto ({config.currency})
      </label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
        Cómo pagó
      </label>
      <div className="mb-4 flex gap-2">
        {config.paymentMethods.map((opt) => (
          <button
            key={opt}
            onClick={() => setMethod(opt)}
            className={`flex flex-1 items-center justify-center rounded-lg border px-3 py-2 text-sm ${
              method === opt
                ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-950 dark:text-teal-400"
                : "border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
        Nota (opcional)
      </label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Ej: pago con descuento excepcional autorizado"
        className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <button
        onClick={submit}
        disabled={saving || !amount}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        <Check size={16} /> {saving ? "Guardando..." : payment ? "Guardar cambios" : "Guardar pago"}
      </button>
    </Modal>
  );
}

// `vh`/`dvh` no se enteran cuando aparece el teclado del celular (sobre todo
// en Android): el navegador achica el área visible real sin que el CSS lo
// sepa, así que un input enfocado puede dejar el botón de guardar tapado
// por el teclado sin nada que scrollear para alcanzarlo. visualViewport sí
// conoce el alto realmente visible en cada momento.
function useVisualViewportHeight() {
  const [height, setHeight] = useState(() => window.visualViewport?.height ?? null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setHeight(vv.height);
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}

export function Modal({ titulo, children, onClose }) {
  const vvHeight = useVisualViewportHeight();
  return (
    <div
      className="fixed inset-x-0 top-0 z-30 flex h-dvh items-center justify-center overflow-y-auto bg-black/40 p-4"
      style={vvHeight ? { height: `${Math.round(vvHeight)}px` } : undefined}
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-sm flex-col rounded-xl bg-white shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-5 pb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{titulo}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        {/* Solo el cuerpo scrollea; el header queda fijo arriba para poder
            cerrar el modal aunque el contenido sea más alto que la pantalla
            (p. ej. Configuración en un celular). */}
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
