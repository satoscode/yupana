import React, { useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { usernameToEmail } from "./staffLogin.js";

export default function Login() {
  const { signIn } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(usernameToEmail(usuario), password);
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-stone-100 px-4 dark:bg-slate-900">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm dark:bg-slate-800"
      >
        <h1 className="mb-4 text-xl font-bold text-slate-900 dark:text-slate-100">
          Yupana — Acceso
        </h1>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Usuario
        </label>
        <input
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          required
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Contraseña
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        {error && <p className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
