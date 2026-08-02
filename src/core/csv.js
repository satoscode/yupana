// Utilidades chicas de CSV, compartidas por exportar (OperatorPanel) e
// importar (ImportClientsModal) clientes. Sin librería externa: el formato
// de escritura lo controlamos nosotros (simple), y el de lectura sigue la
// regla estándar de comillas dobles (RFC 4180) para poder abrir cualquier
// CSV exportado de Excel/Google Sheets, no solo el nuestro.

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

// BOM al inicio para que Excel detecte UTF-8 y no rompa acentos/ñ.
export function downloadCsv(filename, csvText) {
  const blob = new Blob(["﻿" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Parser CSV mínimo pero correcto con comillas (campos con comas, comillas
// escapadas "" y saltos de línea dentro de comillas). Devuelve un array de
// filas, cada fila un array de strings — sin asumir headers, eso lo resuelve
// quien llama.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const s = text.replace(/^﻿/, ""); // por si el archivo trae BOM

  while (i < s.length) {
    const char = s[i];
    if (inQuotes) {
      if (char === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
