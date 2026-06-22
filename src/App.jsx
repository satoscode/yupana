import React, { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./core/AuthContext.jsx";
import Login from "./core/Login.jsx";
import OperatorPanel from "./core/OperatorPanel.jsx";
import { listPlans } from "./data/db.js";
import { activeConfig } from "./config/index.js";

function Authenticated() {
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    if (user) listPlans().then(setPlans);
  }, [user]);

  if (loading) return <FullScreenMessage text="Cargando..." />;
  if (!user) return <Login />;
  if (!plans) return <FullScreenMessage text="Cargando..." />;

  return <OperatorPanel config={activeConfig} plans={plans} />;
}

function FullScreenMessage({ text }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-slate-500">
      {text}
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
