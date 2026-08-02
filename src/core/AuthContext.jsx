import React, { createContext, useContext, useEffect, useState } from "react";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase.js";
import { getStaffDoc } from "../data/db.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = sin sesión
  const [role, setRole] = useState(undefined); // undefined = cargando, null = sin rol asignado
  const [canAddClients, setCanAddClients] = useState(true);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u) {
          setRole(null);
          return;
        }
        setRole(undefined);
        getStaffDoc(u.uid).then((staffDoc) => {
          setRole(staffDoc?.role ?? null);
          setCanAddClients(staffDoc?.canAddClients ?? true);
        });
      }),
    []
  );

  const value = {
    user,
    role,
    isAdmin: role === "admin",
    // Un admin siempre puede, sin importar el campo — el permiso puntual
    // solo restringe operadores (ver canAddClients() en firestore.rules).
    canAddClients: role === "admin" || canAddClients,
    loading: user === undefined || (user && role === undefined),
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    signOut: () => firebaseSignOut(auth),
    // Firebase exige reautenticarse poco antes para cambios sensibles como
    // la contraseña (auth/requires-recent-login si no se hace).
    changePassword: async (currentPassword, newPassword) => {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
