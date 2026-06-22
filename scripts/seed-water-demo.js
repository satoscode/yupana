// Siembra datos de ejemplo de la vertical "agua potable" (ver
// water-demo-data.js) en un proyecto Firebase real. Requiere las mismas
// env vars que la app (.env). Uso: npm run seed
import "dotenv/config";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { plans, clients } from "./water-demo-data.js";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
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
    console.log(`Usuario creado: ${c.name} -> /${ref.id}`);
  }

  console.log("Semilla completa.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
