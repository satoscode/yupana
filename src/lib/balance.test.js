import { describe, expect, it } from "vitest";
import { calculateBalance, listDueDates, resolvePlanFields } from "./balance.js";

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
