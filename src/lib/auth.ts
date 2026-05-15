// Este módulo solo puede ejecutarse en el servidor (Next.js server-only).
// Impide que este código se importe accidentalmente en el cliente.
import "server-only";

// SignJWT: clase para crear tokens JWT firmados.
// jwtVerify: función para verificar y decodificar tokens JWT.
import { SignJWT, jwtVerify } from "jose";

// cookies(): función de Next.js para leer y escribir cookies en el servidor.
import { cookies } from "next/headers";

// NextRequest: tipo de solicitud HTTP en el middleware de Next.js.
import { NextRequest } from "next/server";

// Clave secreta usada para firmar y verificar los tokens JWT.
// Se convierte a Uint8Array porque la librería "jose" lo requiere así.
// En producción debe definirse la variable de entorno JWT_SECRET con un valor seguro.
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

// Nombre de la cookie donde se almacenará el token JWT de autenticación.
const COOKIE_NAME = "auth-token";

// Interfaz que define la estructura del payload (datos) almacenados dentro del JWT.
// - userId: identificador único del usuario en la base de datos.
// - email: correo electrónico del usuario.
// - expiresAt: fecha y hora en que expira la sesión.
export interface SessionPayload {
  userId: string;
  email: string;
  expiresAt: Date;
}

/**
 * Crea una nueva sesión para el usuario autenticado.
 * Genera un token JWT firmado con los datos del usuario y lo guarda en una cookie httpOnly.
 *
 * @param userId - ID único del usuario en la base de datos.
 * @param email  - Correo electrónico del usuario.
 */
export async function createSession(userId: string, email: string) {
  // Calcula la fecha de expiración: 7 días desde ahora (en milisegundos).
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

  // Construye el objeto de sesión que se incluirá como payload dentro del JWT.
  const session: SessionPayload = { userId, email, expiresAt };

  // Crea y firma el token JWT usando el algoritmo HS256 (HMAC con SHA-256).
  // - setProtectedHeader: define el algoritmo de firma.
  // - setExpirationTime: establece el tiempo de expiración del token.
  // - setIssuedAt: registra el momento exacto en que fue emitido.
  // - sign: firma el token con la clave secreta.
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);

  // Obtiene el almacén de cookies del servidor para poder escribir en él.
  const cookieStore = await cookies();

  // Guarda el token JWT en una cookie con las siguientes opciones de seguridad:
  // - httpOnly: impide que JavaScript del cliente acceda a la cookie (protege contra XSS).
  // - secure: solo se envía la cookie por HTTPS en producción.
  // - sameSite: "lax" protege contra ataques CSRF en la mayoría de los casos.
  // - expires: la cookie expira en la misma fecha que la sesión.
  // - path: la cookie está disponible en toda la aplicación.
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Obtiene la sesión activa del usuario desde las cookies del servidor.
 * Verifica y decodifica el token JWT; retorna null si no existe o es inválido.
 *
 * @returns El payload de la sesión si el token es válido, o null en caso contrario.
 */
export async function getSession(): Promise<SessionPayload | null> {
  // Obtiene el almacén de cookies del servidor.
  const cookieStore = await cookies();

  // Intenta obtener el valor del token JWT desde la cookie de autenticación.
  const token = cookieStore.get(COOKIE_NAME)?.value;

  // Si no existe la cookie, el usuario no tiene sesión activa.
  if (!token) {
    return null;
  }

  try {
    // Verifica la firma del token y decodifica su payload.
    // Si el token está expirado o fue alterado, jwtVerify lanzará un error.
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Retorna el payload casteado al tipo SessionPayload.
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Si el token es inválido, expiró o fue manipulado, se descarta la sesión.
    return null;
  }
}

/**
 * Elimina la sesión del usuario borrando la cookie de autenticación.
 * Se usa al cerrar sesión (logout).
 */
export async function deleteSession() {
  // Obtiene el almacén de cookies del servidor.
  const cookieStore = await cookies();

  // Borra la cookie que contiene el token JWT.
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verifica la sesión del usuario directamente desde el objeto de solicitud (NextRequest).
 * Se usa principalmente en el middleware de Next.js, donde no se puede llamar a cookies().
 *
 * @param request - Objeto de solicitud HTTP de Next.js.
 * @returns El payload de la sesión si el token es válido, o null en caso contrario.
 */
export async function verifySession(
  request: NextRequest
): Promise<SessionPayload | null> {
  // Lee el token JWT directamente desde las cookies de la solicitud entrante.
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // Si no hay token en la solicitud, el usuario no está autenticado.
  if (!token) {
    return null;
  }

  try {
    // Verifica la firma y valida el token JWT.
    // Lanza un error si el token es inválido o ha expirado.
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Retorna el payload casteado al tipo SessionPayload.
    return payload as unknown as SessionPayload;
  } catch (error) {
    // Token inválido o expirado: se rechaza la sesión.
    return null;
  }
}
