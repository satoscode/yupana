import React, { useState } from "react";
import { Check } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { useAuth } from "./AuthContext.jsx";

export default function ChangePasswordModal({ onClose }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const valido = currentPassword && newPassword.length >= 6 && newPassword === confirmPassword;

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await changePassword(currentPassword, newPassword);
      onClose();
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? "Tu contraseña actual no es correcta."
          : "No se pudo cambiar la contraseña."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Cambiar contraseña">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Contraseña actual
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Contraseña nueva
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Mínimo 6 caracteres.</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
            Repetir contraseña nueva
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">No coinciden.</p>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        onClick={submit}
        disabled={!valido || saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
      >
        <Check size={16} /> {saving ? "Guardando..." : "Guardar"}
      </button>
    </Modal>
  );
}
