// Datos de ejemplo de la vertical "agua potable" (OTB), compartidos por los
// dos scripts de semilla (real y emulador). Si adaptas este template a otro
// rubro, este es el archivo que reemplazas por tus propios datos de ejemplo.
// Todos los nombres y medidores son inventados, sin relación con personas reales.
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

export const plans = [
  {
    key: "10cubos",
    name: "10 cubos",
    amount: 25,
    cycle: "monthly",
    description: "Hasta 10 cubos de agua al mes",
    active: true,
  },
  {
    key: "15cubos",
    name: "15 cubos",
    amount: 35,
    cycle: "monthly",
    description: "Hasta 15 cubos de agua al mes",
    active: true,
  },
];

export const clients = [
  {
    name: "Ana Demo Pérez",
    code: "DEMO-01",
    startDate: monthsAgo(1),
    planKey: "10cubos",
    customFields: { medidor: "M-0001", categoria: "Doméstica" },
  },
  {
    name: "Carlos Demo Flores",
    code: "DEMO-02",
    startDate: monthsAgo(3),
    planKey: "15cubos",
    customFields: { medidor: "M-0002", categoria: "Doméstica" },
  },
  {
    name: "Beatriz Demo Rojas",
    code: "DEMO-03",
    startDate: monthsAgo(0),
    planKey: "15cubos",
    customFields: { medidor: "M-0003", categoria: "Comercial" },
  },
  {
    name: "Daniel Demo Mamani",
    code: "DEMO-04",
    startDate: monthsAgo(2),
    status: "cancelled",
    endedAt: monthsAgo(1),
    planKey: "10cubos",
    customFields: { medidor: "M-0004", categoria: "Doméstica" },
  },
];
