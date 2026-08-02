import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

const firebaseConfig = useEmulator
  ? { projectId: "demo-yupana", apiKey: "demo-api-key" } // los emuladores no validan estas credenciales, pero getAuth exige que apiKey no esté vacío
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Se usa el hostname con el que el navegador cargó la página (no un
// 127.0.0.1 fijo) para que también funcione al acceder desde otro
// dispositivo en la red local (ej. celular) apuntando a la IP LAN del
// equipo de desarrollo.
const emulatorHost = window.location.hostname;

if (useEmulator) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
}

// Instancia de Auth aislada (app secundaria) solo para crear cuentas nuevas
// de staff desde "Gestionar roles". createUserWithEmailAndPassword inicia
// sesión automáticamente como el usuario creado; usar la instancia principal
// desconectaría al admin de su propia sesión. Memoizada porque tanto
// initializeApp con el mismo nombre como connectAuthEmulator sobre la misma
// instancia fallan si se llaman más de una vez.
let staffCreationAuth;
export function getStaffCreationAuth() {
  if (!staffCreationAuth) {
    const secondaryApp = initializeApp(firebaseConfig, "staff-creation");
    staffCreationAuth = getAuth(secondaryApp);
    if (useEmulator) {
      connectAuthEmulator(staffCreationAuth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    }
  }
  return staffCreationAuth;
}
