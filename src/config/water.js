// Configuración de la vertical "agua potable" (OTB) encima del núcleo
// genérico de Yupana. El núcleo nunca lee este archivo directamente: la UI
// lo recibe vía src/config/index.js.
export const waterConfig = {
  currency: "Bs",
  locale: "es-BO",
  clientTerm: "Usuario",
  paymentMethods: ["Efectivo", "Transferencia"],
  customFields: [
    { key: "medidor", label: "N° de medidor", type: "text" },
    {
      key: "categoria",
      label: "Categoría",
      type: "select",
      options: ["Doméstica", "Comercial"],
    },
  ],
};
