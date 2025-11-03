// Utilities for Kazakhstan phone formatting and normalization

// Normalize to canonical E.164-like: +7XXXXXXXXXX
export function normalizeKzPhone(input: string): string {
  if (!input) return "";
  // Keep digits only
  let digits = input.replace(/\D+/g, "");
  // Replace leading 8 with 7
  if (digits.startsWith("8")) {
    digits = "7" + digits.slice(1);
  }
  // Ensure starts with 7
  if (!digits.startsWith("7")) {
    // If user entered without country code and length is 10, prepend 7
    if (digits.length === 10) {
      digits = "7" + digits;
    }
  }
  // Trim to max 11 digits (7 + 10)
  digits = digits.slice(0, 11);
  return digits ? `+${digits}` : "";
}

// Format progressively as +7(XXX)XXX-XX-XX while typing
export function formatKzPhone(input: string): string {
  if (!input) return "";
  // Normalize first for consistent start
  let digits = input.replace(/\D+/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) {
    if (digits.length === 10) digits = "7" + digits;
  }
  digits = digits.slice(0, 11);

  // Extract groups
  const a = digits.slice(1, 4); // XXX
  const b = digits.slice(4, 7); // XXX
  const c = digits.slice(7, 9); // XX
  const d = digits.slice(9, 11); // XX

  // Assemble with separators: +7(XXX) XXX-XX-XX
  let formatted = "+7";
  if (a.length > 0) {
    formatted += `(${a}`;
    if (a.length === 3) formatted += ") ";
  }
  if (b.length > 0) {
    // If area code not complete, avoid extra space
    if (a.length < 3 && !formatted.endsWith(" ")) {
      formatted += "";
    }
    formatted += b;
  }
  if (c.length > 0) {
    formatted += `-${c}`;
  }
  if (d.length > 0) {
    formatted += `-${d}`;
  }

  return formatted.trim();
}


