export function fmtAmount(n, config) {
  return `${Number(n).toLocaleString(config.locale)} ${config.currency}`;
}

export function fmtDate(d, config) {
  // timeZone UTC: las fechas se guardan como "YYYY-MM-DD" (medianoche UTC);
  // sin esto, el navegador las muestra en su zona horaria local y corre el
  // día/mes hacia atrás en zonas con offset negativo (p. ej. Bolivia).
  return new Date(d).toLocaleDateString(config.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function fmtMonth(d, config) {
  const label = new Date(d).toLocaleDateString(config.locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
