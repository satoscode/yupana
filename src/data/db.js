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
  query,
  where,
  orderBy,
  serverTimestamp,
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
  await setDoc(ref, {
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
    createdAt: serverTimestamp(),
    endedAt: null,
  });
  return ref.id;
}

export async function updateClient(id, data) {
  await updateDoc(doc(db, "clients", id), data);
}

export async function setClientStatus(id, status) {
  await updateDoc(doc(db, "clients", id), {
    status,
    endedAt: status === "active" ? null : serverTimestamp(),
  });
}

// ---------- payments ----------

export async function listPayments(clientId) {
  const q = query(paymentsCol(clientId), orderBy("date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(withId);
}

export async function createPayment(data) {
  const ref = await addDoc(paymentsCol(data.clientId), {
    amount: data.amount,
    date: data.date ?? serverTimestamp(),
    method: data.method,
    note: data.note ?? null,
  });
  return ref.id;
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
