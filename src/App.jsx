import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./core/AuthContext.jsx";
import Login from "./core/Login.jsx";
import OperatorPanel from "./core/OperatorPanel.jsx";
import { listPlans } from "./data/db.js";
import { activeConfig } from "./config/index.js";

function Authenticated() {
  const { user, role, isAdmin, loading, signOut } = useAuth();
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    if (user) listPlans().then(setPlans);
  }, [user]);

  if (loading) return <FullScreenMessage text="Cargando..." />;
  if (!user) return <Login />;
  if (role === null) {
    return (
      <FullScreenMessage text="Tu cuenta no tiene un rol asignado todavía. Contacta a un administrador.">
        <button
          onClick={signOut}
          className="mt-3 text-sm text-teal-700 underline hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
        >
          Salir
        </button>
      </FullScreenMessage>
    );
  }
  if (!plans) return <FullScreenMessage text="Cargando..." />;

  return <OperatorPanel config={activeConfig} plans={plans} isAdmin={isAdmin} />;
}

function FullScreenMessage({ text, children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-1 bg-stone-100 px-6 text-center text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
      <p>{text}</p>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Authenticated />
    </AuthProvider>
  );
}
