// Siembra datos de ejemplo de la vertical "agua potable" (ver
// water-demo-data.js) en el emulador local de Firestore + crea un usuario
// operador en el emulador de Auth. Solo para desarrollo local
// (npm run dev:emulator).
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, connectFirestoreEmulator, doc, getFirestore, setDoc } from "firebase/firestore";
import { plans, clients } from "./water-demo-data.js";

const app = initializeApp({ projectId: "demo-yupana", apiKey: "demo-api-key" });
const auth = getAuth(app);
const db = getFirestore(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

const OPERATOR_EMAIL = "operador@yupana.test";
const OPERATOR_PASSWORD = "yupana123";

async function seed() {
  await createUserWithEmailAndPassword(auth, OPERATOR_EMAIL, OPERATOR_PASSWORD).catch((err) => {
    if (err.code !== "auth/email-already-in-use") throw err;
  });

  const planIdByKey = {};
  for (const { key, ...plan } of plans) {
    const ref = doc(collection(db, "plans"));
    await setDoc(ref, plan);
    planIdByKey[key] = ref.id;
  }

  for (const c of clients) {
    const ref = doc(collection(db, "clients"));
    await setDoc(ref, {
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
      await setDoc(doc(db, "clients", ref.id, "payments", "pago1"), {
        amount: 25,
        method: "Efectivo",
        date: monthsAgo(1),
      });
    }
    console.log(`Usuario creado: ${c.name} -> http://localhost:5173/${ref.id}`);
  }

  console.log("\nOperador de prueba:");
  console.log(`  email: ${OPERATOR_EMAIL}`);
  console.log(`  password: ${OPERATOR_PASSWORD}`);
  console.log("\nSemilla completa.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
