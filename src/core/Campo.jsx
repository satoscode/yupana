import React from "react";

// Input genérico con label, reusado por los formularios de alta/edición de cliente.
export default function Campo({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
    </div>
  );
}
