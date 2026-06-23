import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-yupana",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const CLIENT_A = "clientTokenA";
const CLIENT_B = "clientTokenB";
const ADMIN_UID = "admin1";
const OPERATOR_UID = "operator1";

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clients", CLIENT_A), { name: "Cliente A", status: "active" });
    await setDoc(doc(db, "clients", CLIENT_B), { name: "Cliente B", status: "active" });
    await setDoc(doc(db, "clients", CLIENT_A, "payments", "p1"), { amount: 70, method: "Tienda" });
    await setDoc(doc(db, "plans", "plan1"), { name: "Básico", amount: 70, cycle: "monthly" });
    await setDoc(doc(db, "staff", ADMIN_UID), { email: "admin@test.com", role: "admin" });
    await setDoc(doc(db, "staff", OPERATOR_UID), { email: "op@test.com", role: "operator" });
  });
}

describe("firestore.rules — cliente público (sin auth)", () => {
  beforeEach(seed);

  it("puede leer un cliente por su token exacto", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, "clients", CLIENT_A)));
  });

  it("NO puede listar la colección completa de clientes", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, "clients")));
  });

  it("puede listar los pagos de SU clientId (lo conoce porque va en la ruta)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(db, "clients", CLIENT_A, "payments")));
  });

  it("NO puede escribir clientes ni pagos", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, "clients", "nuevo"), { name: "x" }));
    await assertFails(addDoc(collection(db, "clients", CLIENT_A, "payments"), { amount: 1 }));
  });

  it("puede leer planes (catálogo no sensible)", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(collection(db, "plans")));
  });
});

describe("firestore.rules — autenticado sin rol asignado", () => {
  beforeEach(seed);

  it("NO tiene ningún acceso de staff", async () => {
    const db = testEnv.authenticatedContext("stranger1").firestore();
    await assertFails(getDocs(collection(db, "clients")));
    await assertFails(setDoc(doc(db, "clients", "nuevo"), { name: "x" }));
  });
});

describe("firestore.rules — operador", () => {
  beforeEach(seed);

  it("puede listar todos los clientes", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertSucceeds(getDocs(collection(db, "clients")));
  });

  it("puede crear pagos para cualquier cliente", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertSucceeds(
      addDoc(collection(db, "clients", CLIENT_B, "payments"), { amount: 70, method: "Banco" })
    );
  });

  it("puede crear clientes nuevos", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertSucceeds(setDoc(doc(db, "clients", "nuevoToken"), { name: "Nuevo" }));
  });

  it("puede retirar/reactivar (status + endedAt)", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, "clients", CLIENT_A), { status: "cancelled", endedAt: "2026-01-01" })
    );
  });

  it("NO puede editar la info base de un cliente (nombre, plan, etc.)", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertFails(updateDoc(doc(db, "clients", CLIENT_A), { name: "Otro nombre" }));
  });

  it("NO puede borrar clientes", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertFails(deleteDoc(doc(db, "clients", CLIENT_A)));
  });

  it("NO puede borrar un pago", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertFails(deleteDoc(doc(db, "clients", CLIENT_A, "payments", "p1")));
  });

  it("NO puede leer ni escribir roles de otros", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertFails(getDocs(collection(db, "staff")));
    await assertFails(setDoc(doc(db, "staff", "nuevoUid"), { role: "admin" }));
  });

  it("puede leer su propio doc de staff", async () => {
    const db = testEnv.authenticatedContext(OPERATOR_UID).firestore();
    await assertSucceeds(getDoc(doc(db, "staff", OPERATOR_UID)));
  });
});

describe("firestore.rules — admin", () => {
  beforeEach(seed);

  it("puede editar la info base de un cliente", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, "clients", CLIENT_A), { name: "Otro nombre" }));
  });

  it("puede borrar clientes", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, "clients", CLIENT_A)));
  });

  it("puede borrar un pago", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(deleteDoc(doc(db, "clients", CLIENT_A, "payments", "p1")));
  });

  it("puede listar y escribir roles del equipo", async () => {
    const db = testEnv.authenticatedContext(ADMIN_UID).firestore();
    await assertSucceeds(getDocs(collection(db, "staff")));
    await assertSucceeds(setDoc(doc(db, "staff", "nuevoUid"), { email: "x@x.com", role: "operator" }));
  });
});
