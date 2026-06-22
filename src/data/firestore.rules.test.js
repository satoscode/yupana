import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, collection, getDocs, addDoc } from "firebase/firestore";
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

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "clients", CLIENT_A), { name: "Cliente A", status: "active" });
    await setDoc(doc(db, "clients", CLIENT_B), { name: "Cliente B", status: "active" });
    await setDoc(doc(db, "clients", CLIENT_A, "payments", "p1"), { amount: 70, method: "Tienda" });
    await setDoc(doc(db, "plans", "plan1"), { name: "Básico", amount: 70, cycle: "monthly" });
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

describe("firestore.rules — operador autenticado", () => {
  beforeEach(seed);

  it("puede listar todos los clientes", async () => {
    const db = testEnv.authenticatedContext("operator1").firestore();
    await assertSucceeds(getDocs(collection(db, "clients")));
  });

  it("puede crear pagos para cualquier cliente", async () => {
    const db = testEnv.authenticatedContext("operator1").firestore();
    await assertSucceeds(
      addDoc(collection(db, "clients", CLIENT_B, "payments"), { amount: 70, method: "Banco" })
    );
  });

  it("puede crear clientes nuevos", async () => {
    const db = testEnv.authenticatedContext("operator1").firestore();
    await assertSucceeds(setDoc(doc(db, "clients", "nuevoToken"), { name: "Nuevo" }));
  });
});
