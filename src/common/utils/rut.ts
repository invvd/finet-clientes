export function cleanRut(rut: string): string {
  return rut.replace(/\./g, '').replace(/-/g, '');
}

export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  return `${body}-${dv}`;
}

const FACTORES = [3, 2, 7, 6, 5, 4, 3, 2];

export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (!/^\d{1,8}[\dkK]$/.test(clean)) return false;

  const body = clean.slice(0, -1);
  const dvIngresado = clean.slice(-1).toUpperCase();

  let suma = 0;
  for (let i = 0; i < body.length; i++) {
    suma += parseInt(body[i], 10) * FACTORES[i];
  }

  const dvEsperado = 11 - (suma % 11);
  const dvChar =
    dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : String(dvEsperado);

  return dvChar === dvIngresado;
}
