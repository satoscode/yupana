// Combina la config por defecto de la vertical (src/config/<rubro>.js) con
// los overrides que un admin guardó en Firestore (config/default vía
// saveConfig). Si no hay overrides, devuelve la base tal cual — así la app
// funciona out-of-the-box sin que nadie tenga que configurar nada primero.
export function applyConfigOverrides(base, overrides) {
  if (!overrides) return base;
  return {
    ...base,
    clientTerm: overrides.clientTerm ?? base.clientTerm,
    currency: overrides.currency ?? base.currency,
    paymentMethods: overrides.paymentMethods ?? base.paymentMethods,
    customFields: base.customFields.map((f) => ({
      ...f,
      label: overrides.fieldLabels?.[f.key] ?? f.label,
    })),
  };
}
