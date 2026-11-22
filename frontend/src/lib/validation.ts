/** Client-side validation rules shared by the auth forms (mirrors the backend rules). */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULE_MESSAGE =
  "Password must be at least 8 characters long and contain both letters and numbers.";

export const validateEmail = (email: string): boolean => EMAIL_PATTERN.test(email);

/** At least 8 characters, with at least one letter and one digit. */
export const validatePassword = (password: string): boolean =>
  password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
