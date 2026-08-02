import React, { useState } from "react";
import { AlertCircle, Check, Download, Upload } from "lucide-react";
import { Modal } from "./PaymentModal.jsx";
import { parseCsv, toCsv, downloadCsv } from "./csv.js";

const ALIASES = {
  contact: ["contacto"],
  code: ["código", "codigo"],
  planName: ["plan"],
  startDate: ["fecha de alta", "fecha"],
  openingBalance: ["saldo inicial", "saldo"],
  notes: ["notas"],
};

function findColumn(headerRow, aliases) {
  return headerRow.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

// Solo admin: alta masiva de clientes desde un CSV (onboarding, migrar desde
// una planilla). Espera las mismas columnas que la plantilla que se puede
// descargar acá — coincidencia de encabezado por nombre, no por posición,
// así que el orden de columnas no importa. Cada fila crea un cliente vía
// createClient (mismo camino que el alta individual), una por una — es una
// acción rara, no de uso diario, así que no vale la pena optimizar el
// número de escrituras acá.
export default function ImportClientsModal({ config, plans, onClose, onImport }) {
  const [rows, setRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const downloadTemplate = () => {
    const headers = [
      config.clientTerm,
      "Contacto",
      "Código",
      "Plan",
      "Fecha de alta",
      "Saldo inicial",
      "Notas",
      ...config.customFields.map((f) => f.label),
    ];
    downloadCsv("plantilla-clientes.csv", toCsv(headers, []));
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setResult(null);
    setRows(null);

    const table = parseCsv(await file.text());
    if (table.length < 1) {
      setError("El archivo está vacío.");
      return;
    }
    const header = table[0];
    const nameIdx = findColumn(header, [config.clientTerm.trim().toLowerCase(), "nombre"]);
    if (nameIdx === -1) {
      setError(`No encontré la columna "${config.clientTerm}" (o "Nombre") en el archivo.`);
      return;
    }
    const contactIdx = findColumn(header, ALIASES.contact);
    const codeIdx = findColumn(header, ALIASES.code);
    const planIdx = findColumn(header, ALIASES.planName);
    const startDateIdx = findColumn(header, ALIASES.startDate);
    const openingBalanceIdx = findColumn(header, ALIASES.openingBalance);
    const notesIdx = findColumn(header, ALIASES.notes);
    const customFieldCols = config.customFields.map((f) => ({
      key: f.key,
      idx: findColumn(header, [f.label.trim().toLowerCase()]),
    }));

    const planByName = new Map(plans.map((p) => [p.name.trim().toLowerCase(), p]));
    const today = new Date().toISOString().slice(0, 10);
    const cell = (cells, idx) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");

    const parsed = table.slice(1).map((cells, i) => {
      const name = cell(cells, nameIdx);
      const planName = cell(cells, planIdx);
      const plan = planName ? planByName.get(planName.toLowerCase()) : null;
      const startDate = cell(cells, startDateIdx);
      const errors = [];
      if (!name) errors.push("falta nombre");
      if (!plan) errors.push(planName ? `plan "${planName}" no existe` : "falta plan");
      if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        errors.push("fecha inválida (usar AAAA-MM-DD)");
      }
      const customFields = {};
      for (const cf of customFieldCols) {
        if (cf.idx >= 0) customFields[cf.key] = cell(cells, cf.idx);
      }
      return {
        rowNumber: i + 2, // +1 por el header, +1 porque la fila 1 es la primera de datos
        errors,
        data: {
          name,
          contact: cell(cells, contactIdx),
          code: cell(cells, codeIdx),
          planId: plan?.id ?? "",
          startDate: startDate || today,
          openingBalance: Number(cell(cells, openingBalanceIdx) || 0),
          notes: cell(cells, notesIdx),
          customFields,
        },
      };
    });

    setRows(parsed);
  };

  const validRows = (rows ?? []).filter((r) => r.errors.length === 0);

  const submit = async () => {
    setImporting(true);
    try {
      for (const r of validRows) {
        await onImport(r.data);
      }
      setResult({ created: validRows.length, skipped: rows.length - validRows.length });
      setRows(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal onClose={onClose} titulo="Importar clientes (CSV)">
      <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">
        Columnas esperadas: {config.clientTerm}, Contacto, Código, Plan, Fecha de alta
        (AAAA-MM-DD), Saldo inicial, Notas
        {config.customFields.length > 0 &&
          `, ${config.customFields.map((f) => f.label).join(", ")}`}
        . El orden no importa, se busca por nombre de columna.
      </p>
      <button
        type="button"
        onClick={downloadTemplate}
        className="mb-3 flex items-center gap-2 text-sm text-teal-700 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300"
      >
        <Download size={14} /> Descargar plantilla vacía
      </button>
      <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
        <Upload size={16} /> Elegir archivo CSV
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
      </label>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {rows && (
        <div className="mt-3">
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            {validRows.length} de {rows.length} filas listas para importar
            {rows.length - validRows.length > 0 &&
              ` (${rows.length - validRows.length} con error, no se importan)`}
            .
          </p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            {rows.map((r) => (
              <div
                key={r.rowNumber}
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-xs last:border-b-0 dark:border-slate-700"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  Fila {r.rowNumber}: {r.data.name || "(sin nombre)"}
                </span>
                {r.errors.length > 0 ? (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <AlertCircle size={12} /> {r.errors.join(", ")}
                  </span>
                ) : (
                  <span className="text-teal-600 dark:text-teal-400">OK</span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={importing || validRows.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Check size={16} /> {importing ? "Importando..." : `Importar ${validRows.length}`}
          </button>
        </div>
      )}

      {result && (
        <p className="mt-3 text-sm text-teal-700 dark:text-teal-400">
          Listo: {result.created} clientes importados
          {result.skipped > 0 && ` (${result.skipped} con error, no se importaron)`}.
        </p>
      )}
    </Modal>
  );
}
