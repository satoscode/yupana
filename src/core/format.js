export function fmtAmount(n, config) {
  return `${Number(n).toLocaleString(config.locale)} ${config.currency}`;
}

export function fmtDate(d, config) {
  return new Date(d).toLocaleDateString(config.locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
