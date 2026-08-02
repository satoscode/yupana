import { useCallback, useEffect, useRef, useState } from "react";
import { listClients, listPlans, listPayments } from "../data/db.js";
import { calculateBalance, resolvePlanFields } from "../lib/balance.js";

// Combina un cliente crudo (tal cual está en Firestore) + su plan + sus pagos
// en la entrada que consume la UI, con el saldo ya calculado. `_raw` guarda
// el doc crudo para poder recalcular localmente tras un patch (ver
// patchClient/patchChargeOverrides más abajo) sin perder de vista si
// amount/cycle son overrides del cliente o heredados del plan.
function computeEntry(rawClient, plan, payments) {
  const resolved = resolvePlanFields(rawClient, plan);
  const balance = calculateBalance({ ...rawClient, ...resolved }, payments);
  return { ...rawClient, ...resolved, plan, payments, _raw: rawClient, ...balance };
}

// Trae clientes + planes + pagos y devuelve cada cliente con su saldo ya
// calculado. Vive en core/ porque combina datos + lógica pura, no porque sea
// parte de la capa de datos.
//
// `reload()` es la única función que vuelve a leer Firestore por completo —
// cuesta 1 lectura por cliente + 1 por cada pago histórico de cada cliente,
// así que solo se usa al montar el panel o tras cambios que sí pueden
// afectar a todos los clientes a la vez (p. ej. editar un plan). Cualquier
// mutación sobre UN cliente (pago, edición, baja, ajuste de cargo) debe usar
// los patches locales (patchClient, addPayment, etc.) para no repetir esa
// lectura completa en cada operación — ver docs/rendimiento-firestore.md.
export function useClientsWithBalance() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const plansByIdRef = useRef(new Map());

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [rawClients, plans] = await Promise.all([listClients(), listPlans()]);
      const planById = new Map(plans.map((p) => [p.id, p]));
      plansByIdRef.current = planById;

      const withBalance = await Promise.all(
        rawClients.map(async (client) => {
          const plan = planById.get(client.planId) ?? { amount: 0, cycle: "monthly" };
          const payments = await listPayments(client.id);
          return computeEntry(client, plan, payments);
        })
      );

      setClients(withBalance);
      setError(null);
      return withBalance;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Agrega un cliente recién creado sin releer la lista completa. `rawClient`
  // es el doc devuelto por createClient() (id + campos).
  const addClient = useCallback((rawClient) => {
    const plan = plansByIdRef.current.get(rawClient.planId) ?? { amount: 0, cycle: "monthly" };
    const entry = computeEntry(rawClient, plan, []);
    setClients((prev) => [...prev, entry]);
    return entry;
  }, []);

  // Aplica un patch de campos crudos (los mismos que se mandaron a
  // updateClient/setClientStatus) a UN cliente en memoria y recalcula su
  // saldo. Si el patch cambia planId, resuelve amount/cycle contra el plan
  // nuevo.
  const patchClient = useCallback((id, rawPatch) => {
    let updated = null;
    setClients((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const newRaw = { ...entry._raw, ...rawPatch };
        const plan = rawPatch.planId
          ? (plansByIdRef.current.get(rawPatch.planId) ?? entry.plan)
          : entry.plan;
        updated = computeEntry(newRaw, plan, entry.payments);
        return updated;
      })
    );
    return updated;
  }, []);

  // Espejo local de setChargeOverrides: misma semántica (null borra esa
  // fecha, cualquier otro valor la fija), sin pisar otras fechas.
  const patchChargeOverrides = useCallback((id, overrides) => {
    let updated = null;
    setClients((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry;
        const chargeOverrides = { ...(entry._raw.chargeOverrides ?? {}) };
        for (const [dateKey, value] of Object.entries(overrides)) {
          if (value === null) delete chargeOverrides[dateKey];
          else chargeOverrides[dateKey] = value;
        }
        updated = computeEntry({ ...entry._raw, chargeOverrides }, entry.plan, entry.payments);
        return updated;
      })
    );
    return updated;
  }, []);

  const addPayment = useCallback((clientId, payment) => {
    let updated = null;
    setClients((prev) =>
      prev.map((entry) => {
        if (entry.id !== clientId) return entry;
        updated = computeEntry(entry._raw, entry.plan, [payment, ...entry.payments]);
        return updated;
      })
    );
    return updated;
  }, []);

  const removePayment = useCallback((clientId, paymentId) => {
    let updated = null;
    setClients((prev) =>
      prev.map((entry) => {
        if (entry.id !== clientId) return entry;
        const payments = entry.payments.filter((p) => p.id !== paymentId);
        updated = computeEntry(entry._raw, entry.plan, payments);
        return updated;
      })
    );
    return updated;
  }, []);

  const updatePayment = useCallback((clientId, paymentId, patch) => {
    let updated = null;
    setClients((prev) =>
      prev.map((entry) => {
        if (entry.id !== clientId) return entry;
        const payments = entry.payments.map((p) =>
          p.id === paymentId ? { ...p, ...patch } : p
        );
        updated = computeEntry(entry._raw, entry.plan, payments);
        return updated;
      })
    );
    return updated;
  }, []);

  return {
    clients,
    loading,
    error,
    reload,
    addClient,
    patchClient,
    patchChargeOverrides,
    addPayment,
    removePayment,
    updatePayment,
  };
}
