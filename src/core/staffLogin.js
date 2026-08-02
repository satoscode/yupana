// Firebase Auth (proveedor email/contraseña, único que usa esta app) exige
// un email como identificador único. Para que un operador solo tenga que
// saber su nombre de usuario (no un email real), generamos uno "sintético"
// bajo este dominio interno — nunca se resuelve ni se usa para enviar nada,
// es puramente el identificador técnico que pide Firebase.
const STAFF_DOMAIN = "yupana.local";

// "marcelo" -> "marcelo@yupana.local". Si ya viene con "@" (alguien que
// prefiere loguearse con su email real, p. ej. un socio), se respeta tal cual.
export function usernameToEmail(input) {
  const value = input.trim().toLowerCase();
  if (value.includes("@")) return value;
  return `${value.replace(/\s+/g, "")}@${STAFF_DOMAIN}`;
}

// Para mostrar en la UI: oculta el dominio sintético, deja emails reales tal cual.
export function emailToUsername(email) {
  return email?.endsWith(`@${STAFF_DOMAIN}`) ? email.slice(0, -(STAFF_DOMAIN.length + 1)) : email;
}
