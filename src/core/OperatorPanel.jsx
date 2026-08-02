import React, { useMemo, useState } from "react";
import {
  Download,
  KeyRound,
  MoreVertical,
  Search,
  Settings,
  Upload,
  UserCog,
  UserPlus,
  Zap,
  LogOut,
} from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import { useClientsWithBalance } from "./useClientsWithBalance.js";
import {
  createClient,
  createPayment,
  deletePayment,
  setChargeOverrides,
  setClientStatus,
  updateClient,
  updatePayment,
} from "../data/db.js";
import { fmtAmount } from "./format.js";
import ClientDetail from "./ClientDetail.jsx";
import PaymentModal from "./PaymentModal.jsx";
import AddClientModal from "./AddClientModal.jsx";
import StaffRolesModal from "./StaffRolesModal.jsx";
import SettingsModal from "./SettingsModal.jsx";
import ChangePasswordModal from "./ChangePasswordModal.jsx";
import ReciboModal from "./ReciboModal.jsx";
import ImportClientsModal from "./ImportClientsModal.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { toCsv, downloadCsv } from "./csv.js";

const FILTROS = [
  ["deben", "Deben"],
  ["activos", "Activos"],
  ["retirados", "Retirados"],
  ["todos", "Todos"],
];

export default function OperatorPanel({ config, plans, isAdmin, onReloadPlans, onReloadConfig }) {
  const { user, signOut, canAddClients } = useAuth();
  const {
    clients,
    loading,
    reload,
    addClient,
    patchClient,
    patchChargeOverrides,
    addPayment,
    removePayment,
    updatePayment: updatePaymentLocal,
  } = useClientsWithBalance();
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("deben");
  const [selId, setSelId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pagoFor, setPagoFor] = useState(null);
  const [showRoles, setShowRoles] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [reciboFor, setReciboFor] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const totalPorCobrar = clients
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + Math.max(0, c.balance), 0);
  const nDeben = clients.filter((c) => c.status === "active" && c.balance > 0).length;
  const nActivos = clients.filter((c) => c.status === "active").length;

  const lista = useMemo(() => {
    return clients
      .filter((c) => {
        if (filtro === "deben") return c.status === "active" && c.balance > 0;
        if (filtro === "activos") return c.status === "active";
        if (filtro === "retirados") return c.status === "cancelled";
        return true;
      })
      .filter((c) => {
        const haystack = [c.name, c.contact, c.code, ...Object.values(c.customFields ?? {})]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query.toLowerCase());
      })
      .sort((a, b) => b.balance - a.balance);
  }, [clients, filtro, query]);

  const sel = clients.find((c) => c.id === selId) ?? null;

  const handleAddClient = async (data) => {
    const created = await createClient(data);
    addClient(created);
    setShowAdd(false);
  };

  const handleImportClient = async (data) => {
    const created = await createClient(data);
    addClient(created);
  };

  const handlePayment = async (amount, method, note) => {
    const client = pagoFor;
    const payment = await createPayment({
      clientId: client.id,
      amount,
      method,
      note,
      registeredBy: user.uid,
      registeredByEmail: user.email,
    });
    const updatedClient = addPayment(client.id, payment) ?? client;
    setPagoFor(null);
    setReciboFor({ client: updatedClient, payment });
  };

  const author = { uid: user.uid, email: user.email };

  const handleToggle = async () => {
    const patch = await setClientStatus(
      sel.id,
      sel.status === "active" ? "cancelled" : "active",
      author
    );
    patchClient(sel.id, patch);
  };

  const handleEdit = async (data) => {
    const patch = await updateClient(sel.id, data, author);
    patchClient(sel.id, patch);
  };

  const handleChargeOverride = async (overrides) => {
    const applied = await setChargeOverrides(sel.id, overrides, author);
    patchChargeOverrides(sel.id, applied);
  };

  const handleDeletePayment = async (paymentId) => {
    await deletePayment(sel.id, paymentId);
    removePayment(sel.id, paymentId);
  };

  const handleEditPayment = async (paymentId, amount, method, note) => {
    const patch = await updatePayment(sel.id, paymentId, { amount, method, note }, author);
    updatePaymentLocal(sel.id, paymentId, patch);
  };

  const handleShowRecibo = (payment) => {
    setReciboFor({ client: sel, payment });
  };

  const handleExportCsv = () => {
    const headers = [
      config.clientTerm,
      "Contacto",
      "Código",
      "Plan",
      "Estado",
      "Saldo",
      "Próximo cobro",
      ...config.customFields.map((f) => f.label),
    ];
    const rows = clients.map((c) => [
      c.name,
      c.contact ?? "",
      c.code ?? "",
      c.plan?.name ?? "",
      c.status === "active" ? "Activo" : "Retirado",
      c.balance,
      c.nextDueDate ? new Date(c.nextDueDate).toISOString().slice(0, 10) : "",
      ...config.customFields.map((f) => c.customFields?.[f.key] ?? ""),
    ]);
    downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
    setShowMenu(false);
  };

  return (
    <div className="min-h-dvh bg-stone-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 dark:text-slate-100">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                <Zap size={20} />
              </span>
              Yupana
            </h1>
            <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Control de clientes y cobros</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowMenu((v) => !v)}
                aria-label="Más opciones"
                aria-expanded={showMenu}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <MoreVertical size={18} />
              </button>
              {showMenu && (
                <>
                  {/* Overlay para cerrar el menú al tocar afuera, mismo patrón que los modales. */}
                  <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {isAdmin && (
                      <MenuItem
                        icon={Settings}
                        label="Configuración"
                        onClick={() => {
                          setShowSettings(true);
                          setShowMenu(false);
                        }}
                      />
                    )}
                    {isAdmin && (
                      <MenuItem
                        icon={UserCog}
                        label="Gestionar roles"
                        onClick={() => {
                          setShowRoles(true);
                          setShowMenu(false);
                        }}
                      />
                    )}
                    {isAdmin && (
                      <MenuItem
                        icon={Upload}
                        label="Importar clientes (CSV)"
                        onClick={() => {
                          setShowImport(true);
                          setShowMenu(false);
                        }}
                      />
                    )}
                    {isAdmin && (
                      <MenuItem icon={Download} label="Exportar clientes (CSV)" onClick={handleExportCsv} />
                    )}
                    <MenuItem
                      icon={KeyRound}
                      label="Cambiar contraseña"
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowMenu(false);
                      }}
                    />
                    <MenuItem icon={LogOut} label="Salir" onClick={signOut} danger />
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat etiqueta="Por cobrar" valor={fmtAmount(totalPorCobrar, config)} acento="text-rose-600 dark:text-rose-400" />
          <Stat etiqueta="Deben" valor={nDeben} acento="text-amber-600 dark:text-amber-400" />
          <Stat etiqueta="Activos" valor={nActivos} acento="text-teal-700 dark:text-teal-400" />
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o código"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          {canAddClients && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <UserPlus size={16} /> Agregar
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4 text-sm">
          {FILTROS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={`rounded-full px-3 py-1 ${
                filtro === k
                  ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Cargando...</p>}

        <div className="space-y-2">
          {!loading && lista.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              No hay {config.clientTerm.toLowerCase()}s en esta vista. Agrega uno o cambia el filtro.
            </div>
          )}
          {lista.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelId(c.id)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-teal-400 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-500"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate dark:text-slate-100">{c.name}</p>
                  <p className="text-xs text-slate-500 truncate dark:text-slate-400">
                    {Object.values(c.customFields ?? {}).join(" · ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold ${
                      c.balance > 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-teal-700 dark:text-teal-400"
                    }`}
                  >
                    {c.balance > 0 ? fmtAmount(c.balance, config) : "Al día"}
                  </p>
                  {c.status === "cancelled" && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">retirado</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {sel && (
        <ClientDetail
          client={sel}
          config={config}
          plans={plans}
          isAdmin={isAdmin}
          onClose={() => setSelId(null)}
          onPagar={() => setPagoFor(sel)}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDeletePayment={handleDeletePayment}
          onEditPayment={handleEditPayment}
          onChargeOverride={handleChargeOverride}
          onShowRecibo={handleShowRecibo}
        />
      )}
      {pagoFor && (
        <PaymentModal
          client={pagoFor}
          config={config}
          onClose={() => setPagoFor(null)}
          onSave={handlePayment}
        />
      )}
      {reciboFor && (
        <ReciboModal
          client={reciboFor.client}
          payment={reciboFor.payment}
          config={config}
          onClose={() => setReciboFor(null)}
        />
      )}
      {showAdd && (
        <AddClientModal
          config={config}
          plans={plans}
          onClose={() => setShowAdd(false)}
          onSave={handleAddClient}
        />
      )}
      {showRoles && <StaffRolesModal currentUid={user.uid} onClose={() => setShowRoles(false)} />}
      {showSettings && (
        <SettingsModal
          config={config}
          onClose={async () => {
            setShowSettings(false);
            await onReloadConfig();
            await onReloadPlans();
            await reload();
          }}
          onSaved={onReloadConfig}
        />
      )}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
      {showImport && (
        <ImportClientsModal
          config={config}
          plans={plans}
          onClose={() => setShowImport(false)}
          onImport={handleImportClient}
        />
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${
        danger
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
          : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}

function Stat({ etiqueta, valor, acento }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</p>
      <p className={`mt-1 text-lg font-bold ${acento}`}>{valor}</p>
    </div>
  );
}
