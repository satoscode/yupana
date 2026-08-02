// Combina la config por defecto de la vertical (src/config/<rubro>.js) con
// los overrides que un admin guardó en Firestore (config/default vía
// saveConfig). Si no hay overrides, devuelve la base tal cual — así la app
// funciona out-of-the-box sin que nadie tenga que configurar nada primero.
// Perfil de recibo: no es específico de la vertical (cualquier rubro lo
// quiere), así que su default vive acá, no en src/config/<rubro>.js.
const DEFAULT_RECEIPT = { businessName: null, tagline: null, logoDataUrl: null };

export function applyConfigOverrides(base, overrides) {
  const receipt = { ...DEFAULT_RECEIPT, ...overrides?.receipt };
  if (!overrides) return { ...base, receipt };
  return {
    ...base,
    receipt,
    clientTerm: overrides.clientTerm ?? base.clientTerm,
    currency: overrides.currency ?? base.currency,
    paymentMethods: overrides.paymentMethods ?? base.paymentMethods,
    customFields: base.customFields.map((f) => ({
      ...f,
      label: overrides.fieldLabels?.[f.key] ?? f.label,
    })),
  };
}
