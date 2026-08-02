// Único punto de acceso a Firestore. Ningún otro archivo debe importar
// "firebase/firestore" directamente — así se puede migrar de backend
// reescribiendo solo este archivo.
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase.js";

const clientsCol = () => collection(db, "clients");
const plansCol = () => collection(db, "plans");
// payments es subcolección de clients: clients/{clientId}/payments. Así, para
// listarlos hay que conocer el clientId (el token del enlace) de antemano —
// es lo que permite que un cliente público vea solo SUS pagos sin que las
// Firestore Rules tengan que "adivinar" si conoce su propio ID.
const paymentsCol = (clientId) => collection(db, "clients", clientId, "payments");
const configDoc = () => doc(db, "config", "default");
const staffCol = () => collection(db, "staff");

function withId(snap) {
  return { id: snap.id, ...snap.data() };
}

// ---------- clients ----------

export async function listClients(filter = {}) {
  const constraints = [];
  if (filter.status) constraints.push(where("status", "==", filter.status));
  const q = query(clientsCol(), ...constraints, orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function getClient(idOrToken) {
  const snap = await getDoc(doc(db, "clients", idOrToken));
  return snap.exists() ? withId(snap) : null;
}

export async function createClient(data) {
  const ref = doc(clientsCol()); // ID aleatorio largo = token del cliente
  const docData = {
    name: data.name,
    contact: data.contact ?? null,
    planId: data.planId,
    amount: data.amount ?? null,
    cycle: data.cycle ?? null,
    startDate: data.startDate,
    status: "active",
    openingBalance: data.openingBalance ?? 0,
    code: data.code ?? null,
    notes: data.notes ?? null,
    customFields: data.customFields ?? {},
    createdAt: new Date().toISOString(),
    endedAt: null,
  };
  await setDoc(ref, docData);
  // Devuelve el doc completo (no solo el id) para que la UI pueda reflejarlo
  // en memoria sin tener que releerlo de Firestore.
  return { id: ref.id, ...docData };
}

// author: { uid, email } del staff que hace el cambio — queda registrado
// para auditoría (ver docs/roadmap.md). Solo guarda el último cambio de
// cada tipo, no un historial completo.
export async function updateClient(id, data, author) {
  const patch = {
    ...data,
    lastEditedBy: author.uid,
    lastEditedByEmail: author.email,
    lastEditedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, "clients", id), patch);
  return patch;
}

export async function setClientStatus(id, status, author) {
  const patch = {
    status,
    endedAt: status === "active" ? null : new Date().toISOString(),
    statusChangedBy: author.uid,
    statusChangedByEmail: author.email,
    statusChangedAt: new Date().toISOString(),
  };
  await updateDoc(doc(db, "clients", id), patch);
  // Devuelve el patch aplicado para que la UI actualice el cliente en
  // memoria sin releerlo.
  return patch;
}

// overrides: { "<YYYY-MM-DD>": { amount, note } | null }. null borra el
// ajuste de esa fecha (deleteField). Actualiza por clave puntual (notación
// de punto) para no pisar ajustes de otras fechas en la misma escritura.
// author: { uid, email } — queda registrado en cada ajuste para auditoría.
export async function setChargeOverrides(clientId, overrides, author) {
  const updates = {};
  const applied = {};
  const appliedAt = new Date().toISOString();
  for (const [dateKey, value] of Object.entries(overrides)) {
    if (value === null) {
      updates[`chargeOverrides.${dateKey}`] = deleteField();
      applied[dateKey] = null;
    } else {
      const entry = {
        ...value,
        appliedBy: author.uid,
        appliedByEmail: author.email,
        appliedAt,
      };
      updates[`chargeOverrides.${dateKey}`] = entry;
      applied[dateKey] = entry;
    }
  }
  await updateDoc(doc(db, "clients", clientId), updates);
  // Devuelve los ajustes aplicados (con autoría) para actualizar el cliente
  // en memoria sin releerlo.
  return applied;
}

// ---------- payments ----------

export async function listPayments(clientId) {
  const q = query(paymentsCol(clientId), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function createPayment(data) {
  const docData = {
    amount: data.amount,
    date: data.date ?? new Date().toISOString(),
    method: data.method,
    note: data.note ?? null,
    registeredBy: data.registeredBy ?? null,
    registeredByEmail: data.registeredByEmail ?? null,
  };
  const ref = await addDoc(paymentsCol(data.clientId), docData);
  // Devuelve el pago completo (no solo el id) para que la UI lo agregue en
  // memoria sin releer la subcolección de pagos.
  return { id: ref.id, ...docData };
}

export async function deletePayment(clientId, paymentId) {
  await deleteDoc(doc(paymentsCol(clientId), paymentId));
}

// ---------- plans ----------

export async function listPlans() {
  const q = query(plansCol(), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function createPlan(data) {
  const ref = await addDoc(plansCol(), {
    name: data.name,
    amount: data.amount,
    cycle: data.cycle,
    description: data.description ?? null,
    active: data.active ?? true,
  });
  return ref.id;
}

export async function updatePlan(id, data) {
  await updateDoc(doc(db, "plans", id), data);
}

// Borrar un plan que ya tiene clientes lo dejaría a esos clientes con un
// planId huérfano (cobro en 0 silencioso, ver resolvePlanFields). Antes de
// borrar hay que confirmar que ningún cliente (activo o retirado, ambos
// necesitan resolver su plan para el historial) lo esté usando.
export async function planInUse(planId) {
  const q = query(clientsCol(), where("planId", "==", planId), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function deletePlan(id) {
  await deleteDoc(doc(db, "plans", id));
}

// ---------- config ----------

export async function getConfig() {
  const snap = await getDoc(configDoc());
  return snap.exists() ? snap.data() : null;
}

export async function saveConfig(data) {
  await setDoc(configDoc(), data, { merge: true });
}

// ---------- staff (roles del equipo) ----------

export async function getStaffRole(uid) {
  const snap = await getDoc(doc(staffCol(), uid));
  return snap.exists() ? snap.data().role : null;
}

export async function listStaff() {
  const snap = await getDocs(staffCol());
  return snap.docs.map(withId);
}

export async function setStaffRole(uid, { email, role }) {
  await setDoc(doc(staffCol(), uid), { email, role });
}

export async function removeStaff(uid) {
  await deleteDoc(doc(staffCol(), uid));
}
