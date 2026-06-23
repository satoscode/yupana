const CYCLE_MONTHS = {
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

// Calcula el k-ésimo vencimiento (startDate + k*cycleMonths) en UTC, siempre
// a partir de la fecha original — nunca encadenando sobre un Date ya
// desplazado. Esto evita que el parseo de "YYYY-MM-DD" como medianoche UTC
// (que se desplaza un día al mostrarse en una zona horaria negativa) o el
// rebote de setMonth en meses cortos arrastren el error a los meses siguientes.
function dueDateAt(startDate, cycleMonths, k) {
  const d = new Date(startDate);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k * cycleMonths, d.getUTCDate()));
}

// Cuenta cuántos vencimientos son <= cutoff, y devuelve también el primer
// vencimiento posterior a cutoff.
function dueSchedule(startDate, cycleMonths, cutoff) {
  const guard = Math.ceil((100 * 12) / cycleMonths); // tope ~100 años, evita loops infinitos
  let count = 0;
  while (count < guard && dueDateAt(startDate, cycleMonths, count) <= cutoff) {
    count++;
  }
  return { count, next: dueDateAt(startDate, cycleMonths, count) };
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

  const guard = Math.ceil((100 * 12) / cycleMonths);
  const dates = [];
  for (let k = 0; k < guard; k++) {
    const due = dueDateAt(startDate, cycleMonths, k);
    if (due > cutoff) break;
    dates.push(due);
  }
  return dates;
}

// Asigna los pagos a los cargos calculados, del más antiguo al más nuevo
// (FIFO): el mes más viejo se cubre primero, en orden cronológico de pago.
// Si el total pagado adelanta más allá de los cargos ya vencidos, se generan
// también los ciclos futuros que ese adelanto ya cubre (para que el
// historial muestre esos meses como pagados, no solo el saldo total). Es
// solo para mostrar el historial — el saldo real sigue calculándose como un
// solo total en calculateBalance, esto no cambia esa lógica.
export function allocateLedger(client, payments, asOf = new Date()) {
  const cycleMonths = CYCLE_MONTHS[client.cycle];
  const startDate = new Date(client.startDate);
  const cutoff =
    client.status !== "active" && client.endedAt
      ? new Date(Math.min(asOf.getTime(), new Date(client.endedAt).getTime()))
      : asOf;

  const sortedPayments = [...payments].sort((a, b) => new Date(a.date) - new Date(b.date));
  const totalPaid = sortedPayments.reduce((sum, p) => sum + p.amount, 0);

  const { count: dueCount } = dueSchedule(startDate, cycleMonths, cutoff);
  const advanceCount = Math.ceil(
    Math.max(0, totalPaid - (client.openingBalance || 0)) / client.amount
  );
  const rowCount = Math.max(dueCount, advanceCount);
  const dueDates = [];
  for (let k = 0; k < rowCount; k++) dueDates.push(dueDateAt(startDate, cycleMonths, k));

  let openingRemaining = client.openingBalance || 0;
  let chargeIndex = 0;
  let chargeRemaining = client.amount;
  const paidByCharge = new Array(dueDates.length).fill(0);

  const annotatedPayments = sortedPayments.map((payment) => {
    let remaining = payment.amount;
    let coversMonth = null;

    if (remaining > 0 && openingRemaining > 0) {
      const used = Math.min(remaining, openingRemaining);
      openingRemaining -= used;
      remaining -= used;
    }

    while (remaining > 0 && chargeIndex < dueDates.length) {
      if (coversMonth === null) coversMonth = dueDates[chargeIndex];
      const used = Math.min(remaining, chargeRemaining);
      paidByCharge[chargeIndex] += used;
      chargeRemaining -= used;
      remaining -= used;
      if (chargeRemaining <= 0) {
        chargeIndex++;
        chargeRemaining = client.amount;
      }
    }

    return { ...payment, coversMonth };
  });

  // Las filas futuras (más allá de cutoff) solo se muestran si el adelanto
  // ya las cubre; si no, no tiene sentido listar meses pendientes lejanos.
  const charges = dueDates
    .map((date, i) => {
      const paidAmount = paidByCharge[i];
      const status = paidAmount >= client.amount ? "paid" : paidAmount > 0 ? "partial" : "pending";
      return { date, amount: client.amount, status, paidAmount };
    })
    .filter((c) => c.date <= cutoff || c.paidAmount > 0);

  return { charges, payments: annotatedPayments };
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
