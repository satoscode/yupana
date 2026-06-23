// Siembra datos de ejemplo de la vertical "agua potable" (ver
// water-demo-data.js) en el emulador local de Firestore + crea un usuario
// admin en el emulador de Auth. Solo para desarrollo local
// (npm run dev:emulator).
//
// Usa firebase-admin (no firebase/client SDK) porque necesita crear el
// primer documento staff/{uid} con rol admin — y las Firestore Rules exigen
// ya ser admin para escribir en "staff", así que ese primer registro no se
// puede crear respetando las rules vía el SDK de cliente. Admin SDK siempre
// se salta las rules; eso es seguro aquí porque solo corre contra el
// emulador local, nunca contra un proyecto real (no requiere plan Blaze).
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { plans, clients } from "./water-demo-data.js";

const app = initializeApp({ projectId: "demo-yupana" });
const auth = getAuth(app);
const db = getFirestore(app);

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

const ADMIN_EMAIL = "operador@yupana.test";
const ADMIN_PASSWORD = "yupana123";

async function ensureAdminUser() {
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    return existing.uid;
  } catch {
    const created = await auth.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    return created.uid;
  }
}

async function seed() {
  const uid = await ensureAdminUser();
  // Cuenta de prueba sembrada como admin para poder probar todo (editar
  // clientes, gestionar roles) de entrada en local.
  await db.doc(`staff/${uid}`).set({ email: ADMIN_EMAIL, role: "admin" });

  const planIdByKey = {};
  for (const { key, ...plan } of plans) {
    const ref = db.collection("plans").doc();
    await ref.set(plan);
    planIdByKey[key] = ref.id;
  }

  for (const c of clients) {
    const ref = db.collection("clients").doc();
    await ref.set({
      name: c.name,
      contact: null,
      planId: planIdByKey[c.planKey],
      amount: null,
      cycle: null,
      startDate: c.startDate,
      status: c.status ?? "active",
      openingBalance: 0,
      code: c.code,
      notes: null,
      customFields: c.customFields,
      createdAt: new Date().toISOString(),
      endedAt: c.endedAt ?? null,
    });
    if (c.name === "Ana Demo Pérez") {
      await ref.collection("payments").doc("pago1").set({
        amount: 25,
        method: "Efectivo",
        date: monthsAgo(1),
      });
    }
    console.log(`Usuario creado: ${c.name} -> http://localhost:5173/${ref.id}`);
  }

  console.log("\nCuenta de prueba (rol admin):");
  console.log(`  email: ${ADMIN_EMAIL}`);
  console.log(`  password: ${ADMIN_PASSWORD}`);
  console.log("\nSemilla completa.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
