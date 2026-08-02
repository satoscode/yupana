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

// Ajuste de monto para un mes puntual (rebaja/cobro especial excepcional),
// buscado por fecha exacta de vencimiento (no por índice k): así, si
// startDate o cycle cambian después, un ajuste viejo queda huérfano (deja de
// aplicarse) en vez de reengancharse silenciosamente a otro mes.
function chargeOverrideFor(client, dueDate) {
  const key = dueDate.toISOString().slice(0, 10);
  return client.chargeOverrides?.[key] ?? null;
}

// client.pausePeriods: [{ from, to, note }] — rango de fechas (inclusive)
// donde el servicio está pausado: ningún vencimiento dentro del rango
// genera cobro, sin dar de baja al cliente ni tocar el resto del ciclo. Es
// una decisión explícita del negocio (viaje, ausencia del usuario), a
// diferencia de un cobro por asistencia real — eso queda fuera del núcleo.
export function pausePeriodFor(client, dueDate) {
  return (
    (client.pausePeriods ?? []).find((p) => dueDate >= new Date(p.from) && dueDate <= new Date(p.to)) ??
    null
  );
}

export function chargeAmountFor(client, dueDate) {
  if (pausePeriodFor(client, dueDate)) return 0;
  return chargeOverrideFor(client, dueDate)?.amount ?? client.amount;
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

  // Meses futuros (más allá de lo ya vencido) siempre cobran el monto plano
  // del plan: todavía no existe negociación posible sobre un mes que no
  // venció. Por eso el "adelanto" que sobra tras cubrir lo ya vencido se
  // reparte a razón de client.amount, aunque algunos meses ya vencidos hayan
  // tenido un monto especial distinto.
  let dueTotal = 0;
  for (let k = 0; k < dueCount; k++) {
    dueTotal += chargeAmountFor(client, dueDateAt(startDate, cycleMonths, k));
  }
  const advanceExtra = Math.ceil(
    Math.max(0, totalPaid - (client.openingBalance || 0) - dueTotal) / client.amount
  );
  const rowCount = dueCount + advanceExtra;
  const dueDates = [];
  for (let k = 0; k < rowCount; k++) dueDates.push(dueDateAt(startDate, cycleMonths, k));
  const chargeAmounts = dueDates.map((d) => chargeAmountFor(client, d));

  let openingRemaining = client.openingBalance || 0;
  let chargeIndex = 0;
  let chargeRemaining = chargeAmounts[0] ?? client.amount;
  const paidByCharge = new Array(dueDates.length).fill(0);

  // Único lugar que avanza al siguiente cargo, para no repetir (y arriesgar
  // desincronizar) la lectura de chargeAmounts en varios puntos.
  function advanceCharge() {
    chargeIndex++;
    chargeRemaining = chargeAmounts[chargeIndex] ?? client.amount;
  }

  // Un ajuste de saldo negativo (rebaja/crédito excepcional) se aplica igual
  // que un pago, cubriendo los cargos más antiguos primero, para que el
  // historial mes a mes quede consistente con el total ya saldado.
  if (openingRemaining < 0) {
    let credit = -openingRemaining;
    while (credit > 0 && chargeIndex < dueDates.length) {
      const used = Math.min(credit, chargeRemaining);
      paidByCharge[chargeIndex] += used;
      chargeRemaining -= used;
      credit -= used;
      if (chargeRemaining <= 0) advanceCharge();
    }
    openingRemaining = 0;
  }

  const annotatedPayments = sortedPayments.map((payment) => {
    let remaining = payment.amount;
    // Cada vuelta del while de abajo pasa a un chargeIndex distinto (nunca
    // repite uno ya tocado en esta misma iteración), así que un push por
    // vuelta alcanza para listar, en orden, todos los meses que este pago
    // cubrió — no solo el primero (coversMonth, que ya usaba el historial
    // para el label corto "Pago <mes>") — junto con cuánto de *este* pago
    // (no del cargo completo) fue a cada uno, para el detalle del recibo.
    const monthsCovered = [];

    if (remaining > 0 && openingRemaining > 0) {
      const used = Math.min(remaining, openingRemaining);
      openingRemaining -= used;
      remaining -= used;
    }

    while (remaining > 0 && chargeIndex < dueDates.length) {
      const used = Math.min(remaining, chargeRemaining);
      monthsCovered.push({ date: dueDates[chargeIndex], amount: used });
      paidByCharge[chargeIndex] += used;
      chargeRemaining -= used;
      remaining -= used;
      if (chargeRemaining <= 0) advanceCharge();
    }

    return { ...payment, coversMonth: monthsCovered[0]?.date ?? null, monthsCovered };
  });

  // Las filas futuras (más allá de cutoff) solo se muestran si el adelanto
  // ya las cubre; si no, no tiene sentido listar meses pendientes lejanos.
  const charges = dueDates
    .map((date, i) => {
      const amount = chargeAmounts[i];
      const paidAmount = paidByCharge[i];
      const paused = pausePeriodFor(client, date);
      const status = paused
        ? "paused"
        : paidAmount >= amount
          ? "paid"
          : paidAmount > 0
            ? "partial"
            : "pending";
      const override = chargeOverrideFor(client, date);
      return {
        date,
        amount,
        status,
        paidAmount,
        overridden: !!override,
        note: paused ? paused.note : (override?.note ?? null),
        appliedByEmail: override?.appliedByEmail ?? null,
      };
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

  let chargesTotal = 0;
  for (let k = 0; k < dueCharges; k++) {
    chargesTotal += chargeAmountFor(client, dueDateAt(startDate, cycleMonths, k));
  }
  const totalCharged = chargesTotal + (client.openingBalance || 0);
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
