import { describe, expect, it } from "vitest";
import { allocateLedger, calculateBalance, listDueDates, resolvePlanFields } from "./balance.js";

describe("calculateBalance", () => {
  it("mensual con atraso: 3 meses vencidos, sin pagos", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2026-03-22",
      status: "active",
      openingBalance: 0,
    };
    const asOf = new Date("2026-06-22");
    const result = calculateBalance(client, [], asOf);

    expect(result.dueCharges).toBe(4); // 22-mar, 22-abr, 22-may, 22-jun
    expect(result.totalCharged).toBe(280);
    expect(result.balance).toBe(280);
    expect(result.isPaidUp).toBe(false);
    expect(result.nextDueDate.toISOString().slice(0, 10)).toBe("2026-07-22");
  });

  it("mensual con pagos al día queda en 0", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2026-03-22",
      status: "active",
      openingBalance: 0,
    };
    const payments = [
      { amount: 70 },
      { amount: 70 },
      { amount: 70 },
      { amount: 70 },
    ];
    const result = calculateBalance(client, payments, new Date("2026-06-22"));
    expect(result.balance).toBe(0);
    expect(result.isPaidUp).toBe(true);
  });

  it("anual: solo un cargo vencido tras un año", () => {
    const client = {
      amount: 700,
      cycle: "annual",
      startDate: "2025-01-10",
      status: "active",
      openingBalance: 0,
    };
    const result = calculateBalance(client, [], new Date("2026-01-15"));
    expect(result.dueCharges).toBe(2); // 10-ene-2025 y 10-ene-2026
    expect(result.totalCharged).toBe(1400);
    expect(result.nextDueDate.toISOString().slice(0, 10)).toBe("2027-01-10");
  });

  it("cliente cancelado a mitad de ciclo: deja de contar cargos tras endedAt", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2026-01-15",
      status: "cancelled",
      endedAt: "2026-03-01", // se da de baja antes del cargo de marzo
      openingBalance: 0,
    };
    const result = calculateBalance(client, [], new Date("2026-06-22"));
    expect(result.dueCharges).toBe(2); // 15-ene y 15-feb; el de 15-mar no cuenta
    expect(result.totalCharged).toBe(140);
  });

  it("openingBalance siembra saldo histórico", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2026-06-01",
      status: "active",
      openingBalance: 200,
    };
    const result = calculateBalance(client, [], new Date("2026-06-01"));
    expect(result.dueCharges).toBe(1);
    expect(result.totalCharged).toBe(270);
  });

  it("chargeOverrides: solo los meses ajustados cobran distinto, el resto sigue al monto del plan", () => {
    const client = {
      amount: 90,
      cycle: "monthly",
      startDate: "2026-01-01",
      status: "active",
      openingBalance: 0,
      chargeOverrides: {
        "2026-01-01": { amount: 60, note: "rebaja excepcional" },
        "2026-02-01": { amount: 60, note: "rebaja excepcional" },
      },
    };
    const result = calculateBalance(client, [], new Date("2026-04-01"));
    expect(result.dueCharges).toBe(4); // ene, feb, mar, abr
    expect(result.totalCharged).toBe(60 + 60 + 90 + 90); // ene y feb rebajados, mar y abr normales
  });

  it("pausePeriods: los meses dentro del rango cobran 0, el resto sigue normal", () => {
    const client = {
      amount: 90,
      cycle: "monthly",
      startDate: "2026-01-01",
      status: "active",
      openingBalance: 0,
      pausePeriods: [{ from: "2026-02-01", to: "2026-02-28", note: "viaje" }],
    };
    const result = calculateBalance(client, [], new Date("2026-04-01"));
    expect(result.dueCharges).toBe(4); // ene, feb, mar, abr
    expect(result.totalCharged).toBe(90 + 0 + 90 + 90); // solo feb pausado
  });

  it("pausePeriods: pisa a chargeOverrides si coinciden en el mismo mes", () => {
    const client = {
      amount: 90,
      cycle: "monthly",
      startDate: "2026-01-01",
      status: "active",
      openingBalance: 0,
      chargeOverrides: { "2026-01-01": { amount: 60, note: "rebaja" } },
      pausePeriods: [{ from: "2026-01-01", to: "2026-01-31", note: "viaje" }],
    };
    const result = calculateBalance(client, [], new Date("2026-01-01"));
    expect(result.totalCharged).toBe(0);
  });
});

describe("listDueDates", () => {
  it("devuelve una fecha por cada cargo vencido", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2026-03-22",
      status: "active",
    };
    const dates = listDueDates(client, new Date("2026-06-22"));
    expect(dates).toHaveLength(4);
    expect(dates[0].toISOString().slice(0, 10)).toBe("2026-03-22");
    expect(dates[3].toISOString().slice(0, 10)).toBe("2026-06-22");
  });

  it("no arrastra drift de mes a mes (siempre cae el día 1, sin saltar de año)", () => {
    const client = {
      amount: 70,
      cycle: "monthly",
      startDate: "2025-01-01",
      status: "active",
    };
    const dates = listDueDates(client, new Date("2026-06-22"));
    expect(dates).toHaveLength(18);
    expect(dates[0].toISOString().slice(0, 10)).toBe("2025-01-01");
    expect(dates[2].toISOString().slice(0, 10)).toBe("2025-03-01"); // no "2025-03-04"
    expect(dates[17].toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(dates.every((d) => d.getUTCDate() === 1)).toBe(true);
  });
});

describe("allocateLedger", () => {
  const client = {
    amount: 70,
    cycle: "monthly",
    startDate: "2026-01-01",
    status: "active",
    openingBalance: 0,
  };

  it("sin pagos, todos los cargos quedan pendientes", () => {
    const { charges } = allocateLedger(client, [], new Date("2026-03-01"));
    expect(charges).toHaveLength(3); // ene, feb, mar
    expect(charges.every((c) => c.status === "pending")).toBe(true);
  });

  it("un pago completo cubre el mes más antiguo (enero) primero", () => {
    const payments = [{ amount: 70, date: "2026-01-05" }];
    const { charges } = allocateLedger(client, payments, new Date("2026-03-01"));
    expect(charges[0].date.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(charges[0].status).toBe("paid");
    expect(charges[1].status).toBe("pending"); // feb
    expect(charges[2].status).toBe("pending"); // mar
  });

  it("pago parcial deja el mes más antiguo en 'partial', no en 'paid'", () => {
    const payments = [{ amount: 30, date: "2026-01-05" }];
    const { charges } = allocateLedger(client, payments, new Date("2026-03-01"));
    expect(charges[0].status).toBe("partial");
    expect(charges[0].paidAmount).toBe(30);
    expect(charges[1].status).toBe("pending");
  });

  it("varios pagos se acumulan y siguen cubriendo en orden", () => {
    const payments = [
      { amount: 70, date: "2026-01-05" },
      { amount: 70, date: "2026-02-05" },
    ];
    const { charges } = allocateLedger(client, payments, new Date("2026-03-01"));
    expect(charges[0].status).toBe("paid"); // ene
    expect(charges[1].status).toBe("paid"); // feb
    expect(charges[2].status).toBe("pending"); // mar
  });

  it("a cada pago le asigna el mes que cubre, en orden cronológico de pago", () => {
    const payments = [
      { amount: 70, date: "2026-02-10" }, // se registra después, pero...
      { amount: 70, date: "2026-01-05" }, // este es cronológicamente el primero
    ];
    const { payments: ledgerPayments } = allocateLedger(client, payments, new Date("2026-03-01"));
    const enero = ledgerPayments.find((p) => p.date === "2026-01-05");
    const febrero = ledgerPayments.find((p) => p.date === "2026-02-10");
    expect(enero.coversMonth.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(febrero.coversMonth.toISOString().slice(0, 10)).toBe("2026-02-01");
  });

  it("un pago que cubre dos meses se le asigna el mes más antiguo de los dos", () => {
    const payments = [{ amount: 140, date: "2026-01-05" }];
    const { charges, payments: ledgerPayments } = allocateLedger(
      client,
      payments,
      new Date("2026-03-01")
    );
    expect(charges[0].status).toBe("paid"); // ene
    expect(charges[1].status).toBe("paid"); // feb
    expect(ledgerPayments[0].coversMonth.toISOString().slice(0, 10)).toBe("2026-01-01");
  });

  it("monthsCovered lista todos los meses que un pago alcanzó a cubrir, no solo el primero, con lo que aportó a cada uno", () => {
    const payments = [{ amount: 140, date: "2026-01-05" }]; // 2 meses justos, 70 c/u
    const { payments: ledgerPayments } = allocateLedger(client, payments, new Date("2026-03-01"));
    const meses = ledgerPayments[0].monthsCovered.map((m) => ({
      date: m.date.toISOString().slice(0, 10),
      amount: m.amount,
    }));
    expect(meses).toEqual([
      { date: "2026-01-01", amount: 70 },
      { date: "2026-02-01", amount: 70 },
    ]);
  });

  it("monthsCovered de un pago parcial refleja solo lo que ese pago aportó a ese mes", () => {
    const payments = [{ amount: 30, date: "2026-01-05" }]; // parcial de 70
    const { payments: ledgerPayments } = allocateLedger(client, payments, new Date("2026-03-01"));
    expect(ledgerPayments[0].monthsCovered).toEqual([
      { date: new Date("2026-01-01"), amount: 30 },
    ]);
  });

  it("un adelanto más allá de lo vencido genera y paga también los meses futuros", () => {
    // solo enero está vencido a la fecha de corte, pero paga 3 meses de una
    const payments = [{ amount: 210, date: "2026-01-05" }];
    const { charges } = allocateLedger(client, payments, new Date("2026-01-15"));
    expect(charges).toHaveLength(3); // ene (vencido) + feb y mar (adelanto)
    expect(charges.map((c) => c.status)).toEqual(["paid", "paid", "paid"]);
    expect(charges[2].date.toISOString().slice(0, 10)).toBe("2026-03-01");
  });

  it("adelanto parcial de un mes futuro queda en 'partial', sin generar más filas", () => {
    const payments = [{ amount: 105, date: "2026-01-05" }]; // 1 mes + medio
    const { charges } = allocateLedger(client, payments, new Date("2026-01-15"));
    expect(charges).toHaveLength(2); // ene pagado, feb parcial
    expect(charges[0].status).toBe("paid");
    expect(charges[1].status).toBe("partial");
    expect(charges[1].paidAmount).toBe(35);
  });

  it("un ajuste de saldo negativo (rebaja) cubre los meses más antiguos como si fuera un pago", () => {
    const clientConAjuste = { ...client, openingBalance: -140 }; // 2 meses de crédito
    const { charges } = allocateLedger(clientConAjuste, [], new Date("2026-03-01"));
    expect(charges[0].status).toBe("paid"); // ene
    expect(charges[1].status).toBe("paid"); // feb
    expect(charges[2].status).toBe("pending"); // mar
  });

  it("un ajuste negativo se combina con pagos reales, ambos cubriendo desde el mes más antiguo", () => {
    const clientConAjuste = { ...client, openingBalance: -70 }; // 1 mes de crédito
    const payments = [{ amount: 70, date: "2026-02-05" }];
    const { charges } = allocateLedger(clientConAjuste, payments, new Date("2026-03-01"));
    expect(charges[0].status).toBe("paid"); // ene, cubierto por el ajuste
    expect(charges[1].status).toBe("paid"); // feb, cubierto por el pago real
    expect(charges[2].status).toBe("pending"); // mar
  });

  it("chargeOverrides: un mes con monto especial queda 'paid' al alcanzar ese monto, no el del plan", () => {
    const clientConDescuento = {
      ...client,
      chargeOverrides: { "2026-01-01": { amount: 60, note: "rebaja" } },
    };
    const payments = [{ amount: 60, date: "2026-01-05" }];
    const { charges } = allocateLedger(clientConDescuento, payments, new Date("2026-03-01"));
    expect(charges[0].amount).toBe(60);
    expect(charges[0].status).toBe("paid"); // 60 alcanza el monto ajustado, no el plan (70)
    expect(charges[0].overridden).toBe(true);
    expect(charges[0].note).toBe("rebaja");
    expect(charges[1].overridden).toBe(false); // feb sigue al monto del plan
    expect(charges[1].amount).toBe(70);
  });

  it("chargeOverrides: los meses futuros nunca heredan un ajuste de un mes pasado", () => {
    const clientConDescuento = {
      ...client,
      chargeOverrides: { "2026-01-01": { amount: 60, note: "rebaja" } },
    };
    const { charges } = allocateLedger(clientConDescuento, [], new Date("2026-03-01"));
    expect(charges[1].amount).toBe(70); // feb
    expect(charges[2].amount).toBe(70); // mar
  });

  it("chargeOverrides: un pago que salda los meses rebajados y adelanta un mes futuro genera la fila extra correcta", () => {
    // ene y feb rebajados a 60 c/u (120 total); un pago de 210 los cubre y
    // además adelanta mar a precio normal (70) con 20 de sobra en abr.
    const clientConDescuento = {
      ...client,
      chargeOverrides: {
        "2026-01-01": { amount: 60, note: "rebaja" },
        "2026-02-01": { amount: 60, note: "rebaja" },
      },
    };
    const payments = [{ amount: 210, date: "2026-01-05" }];
    const { charges } = allocateLedger(clientConDescuento, payments, new Date("2026-01-15")); // solo ene vencido
    expect(charges).toHaveLength(4); // ene, feb, mar (adelanto), abr (adelanto parcial)
    expect(charges.map((c) => c.status)).toEqual(["paid", "paid", "paid", "partial"]);
    expect(charges[3].paidAmount).toBe(20);
  });

  it("pausePeriods: el mes pausado queda con estado 'paused', motivo incluido, y no cuenta como deuda", () => {
    const clientPausado = {
      ...client,
      pausePeriods: [{ from: "2026-02-01", to: "2026-02-28", note: "viaje" }],
    };
    const { charges } = allocateLedger(clientPausado, [], new Date("2026-03-01"));
    expect(charges.map((c) => c.status)).toEqual(["pending", "paused", "pending"]);
    expect(charges[1].amount).toBe(0);
    expect(charges[1].note).toBe("viaje");
  });
});

describe("resolvePlanFields", () => {
  it("usa el override del cliente si existe", () => {
    const plan = { amount: 70, cycle: "monthly" };
    const client = { amount: 100, cycle: "quarterly" };
    expect(resolvePlanFields(client, plan)).toEqual({ amount: 100, cycle: "quarterly" });
  });

  it("usa el del plan si el cliente no tiene override", () => {
    const plan = { amount: 70, cycle: "monthly" };
    const client = { amount: null, cycle: null };
    expect(resolvePlanFields(client, plan)).toEqual({ amount: 70, cycle: "monthly" });
  });
});
