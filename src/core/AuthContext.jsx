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
import { getStaffRole } from "../data/db.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = cargando, null = sin sesión
  const [role, setRole] = useState(undefined); // undefined = cargando, null = sin rol asignado

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        if (!u) {
          setRole(null);
          return;
        }
        setRole(undefined);
        getStaffRole(u.uid).then(setRole);
      }),
    []
  );

  const value = {
    user,
    role,
    isAdmin: role === "admin",
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
