/**
 * Datos de contacto e identidad de la empresa, centralizados.
 *
 * Edita SOLO este archivo para actualizar el teléfono, WhatsApp, dirección,
 * razón social o marca en todo el sitio (footer, botones de WhatsApp,
 * JSON-LD de SEO, metadata, copyright, etc.).
 */

/** Razón social / nombre legal de la empresa. */
export const COMPANY_LEGAL_NAME = "Fibernet Limitada";

/** Nombre comercial / marca. */
export const COMPANY_BRAND = "Finet";

/**
 * Teléfono de contacto en formato E.164 sin "+" ni espacios.
 * Es el que usa wa.me para construir el enlace de WhatsApp.
 */
export const COMPANY_PHONE_E164 = "56945002319";

/** Teléfono en formato legible, para mostrar al usuario. */
export const COMPANY_PHONE_DISPLAY = "+56 9 4500 2319";

/** Teléfono en formato `tel:` para enlaces de llamada directa. */
export const COMPANY_PHONE_TEL = "+56945002319";

/** Enlace directo a WhatsApp de la empresa. */
export const WHATSAPP_URL = `https://wa.me/${COMPANY_PHONE_E164}`;

/** Dirección de la empresa (usada en el JSON-LD de SEO). */
export const COMPANY_ADDRESS = {
  locality: "La Pintana",
  region: "Region Metropolitana",
  country: "CL",
} as const;
