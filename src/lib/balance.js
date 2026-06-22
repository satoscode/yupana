const CYCLE_MONTHS = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Cuenta cuántas fechas de vencimiento (startDate + k*cycleMonths) son <= cutoff,
// y devuelve también la primera fecha de vencimiento posterior a cutoff.
function dueSchedule(startDate, cycleMonths, cutoff) {
  let count = 0;
  let due = new Date(startDate);
  const guard = Math.ceil((100 * 12) / cycleMonths); // tope ~100 años, evita loops infinitos
  let i = 0;
  while (due <= cutoff && i < guard) {
    count++;
    due = addMonths(due, cycleMonths);
    i++;
  }
  return { count, next: due };
}

// Lista las fechas de vencimiento ya cargadas (<= cutoff), para mostrar el
// historial de cargos calculados junto a los pagos.
export function listDueDates(client, asOf = new Date()) {
  const cycleMonths = CYCLE_MONTHS[client.cycle];
  const startDate = new Date(client.startDate);
  const cutoff =
    client.status !== "active" && client.endedAt
      ? new Date(Math.min(asOf.getTime(), new Date(client.endedAt).getTime()))
      : asOf;

  const dates = [];
  let due = new Date(startDate);
  const guard = Math.ceil((100 * 12) / cycleMonths);
  let i = 0;
  while (due <= cutoff && i < guard) {
    dates.push(new Date(due));
    due = addMonths(due, cycleMonths);
    i++;
  }
  return dates;
}

// Resuelve amount/cycle efectivos del cliente: override del cliente o, si es
// null, los del plan.
export function resolvePlanFields(client, plan) {
  return {
    amount: client.amount ?? plan.amount,
    cycle: client.cycle ?? plan.cycle,
  };
}

// Cálculo puro de saldo. No toca Firestore — recibe el cliente (con
// amount/cycle ya resueltos vía resolvePlanFields), sus pagos, y la fecha de
// referencia (por defecto hoy).
export function calculateBalance(client, payments, asOf = new Date()) {
  const cycleMonths = CYCLE_MONTHS[client.cycle];
  const startDate = new Date(client.startDate);

  const chargeCutoff =
    client.status !== "active" && client.endedAt
      ? new Date(Math.min(asOf.getTime(), new Date(client.endedAt).getTime()))
      : asOf;

  const { count: dueCharges } = dueSchedule(startDate, cycleMonths, chargeCutoff);
  const { next: nextDueDate } = dueSchedule(startDate, cycleMonths, asOf);

  const totalCharged = dueCharges * client.amount + (client.openingBalance || 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalCharged - totalPaid;

  return {
    balance,
    totalCharged,
    totalPaid,
    dueCharges,
    nextDueDate,
    isPaidUp: balance <= 0,
  };
}
