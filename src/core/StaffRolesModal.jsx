import React, { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { Plus, Trash2, UserCog } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { getStaffCreationAuth } from "../firebase.js";
import { listStaff, setStaffRole, removeStaff } from "../data/db.js";

// Solo admin: crear cuentas nuevas (email + contraseña) y asignarles rol, o
// cambiar/quitar el rol de alguien que ya tiene cuenta.
export default function StaffRolesModal({ currentUid, onClose }) {
  const [staff, setStaff] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = async () => setStaff(await listStaff());

  useEffect(() => {
    reload();
  }, []);

  const addStaff = async () => {
    if (!email.trim() || !password) return;
    setSaving(true);
    setError("");
    try {
      const secondaryAuth = getStaffCreationAuth();
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      await signOut(secondaryAuth); // limpia la sesión secundaria; no afecta al admin
      await setStaffRole(cred.user.uid, { email: email.trim(), role });
      setEmail("");
      setPassword("");
      setRole("operator");
      await reload();
    } catch (err) {
      setError(
        err.code === "auth/email-already-in-use"
          ? "Ese email ya tiene una cuenta."
          : "No se pudo crear la cuenta."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member, newRole) => {
    await setStaffRole(member.id, { email: member.email, role: newRole });
    await reload();
  };

  const remove = async (member) => {
    await removeStaff(member.id);
    await reload();
  };

  return (
    <Modal onClose={onClose} titulo="Gestionar roles">
      <div className="mb-4 space-y-2">
        {staff === null && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
        )}
        {staff?.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2 text-sm dark:border-slate-700"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                {member.email || member.id}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">{member.id}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={member.role}
                onChange={(e) => changeRole(member, e.target.value)}
                disabled={member.id === currentUid}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="admin">Admin</option>
                <option value="operator">Operador</option>
              </select>
              <button
                onClick={() => remove(member)}
                disabled={member.id === currentUid}
                aria-label="Quitar acceso"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        Crear acceso nuevo
      </h3>
      <div className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="admin">Admin</option>
          <option value="operator">Operador</option>
        </select>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        onClick={addStaff}
        disabled={!email.trim() || !password || saving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-40"
      >
        <Plus size={16} /> {saving ? "Creando..." : "Crear cuenta"}
      </button>
      <p className="mt-3 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <UserCog size={12} /> No puedes cambiar ni quitar tu propio acceso desde aquí.
      </p>
    </Modal>
  );
}
