import { useCallback, useEffect, useState } from "react";
import { listClients, listPlans, listPayments } from "../data/db.js";
import { calculateBalance, resolvePlanFields } from "../lib/balance.js";

// Trae clientes + planes + pagos y devuelve cada cliente con su saldo ya
// calculado. Vive en core/ porque combina datos + lógica pura, no porque sea
// parte de la capa de datos.
export function useClientsWithBalance() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [rawClients, plans] = await Promise.all([listClients(), listPlans()]);
      const planById = new Map(plans.map((p) => [p.id, p]));

      const withBalance = await Promise.all(
        rawClients.map(async (client) => {
          const plan = planById.get(client.planId) ?? { amount: 0, cycle: "monthly" };
          const resolved = resolvePlanFields(client, plan);
          const payments = await listPayments(client.id);
          const balance = calculateBalance({ ...client, ...resolved }, payments);
          return { ...client, ...resolved, plan, payments, ...balance };
        })
      );

      setClients(withBalance);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { clients, loading, error, reload };
}
