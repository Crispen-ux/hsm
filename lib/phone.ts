const SEPARATORS = /[\s\-().]/g;
const NATIONAL_NUMBER = /^[1-8]\d{8}$/;

export function normalizeSaPhone(raw: string): string | null {
  const stripped = raw.replace(SEPARATORS, "");
  let national: string;

  if (/^\+27\d{9}$/.test(stripped)) {
    national = stripped.slice(3);
  } else if (/^0027\d{9}$/.test(stripped)) {
    national = stripped.slice(4);
  } else if (/^27\d{9}$/.test(stripped)) {
    national = stripped.slice(2);
  } else if (/^0\d{9}$/.test(stripped)) {
    national = stripped.slice(1);
  } else {
    return null;
  }

  return NATIONAL_NUMBER.test(national) ? `+27${national}` : null;
}
