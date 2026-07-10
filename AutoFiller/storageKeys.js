// storageKeys.js

/**
 * @readonly
 * @enum {string}
 */
export const STORAGE_KEYS = {
  AUTOFILL_FIELDS: 'autofillFields'
};

/**
 * Default core template fields
 * These MUST always exist, even if storage is empty.
 * They MUST always have isDefault = true.
 */
export const DEFAULT_FIELDS = Object.freeze([
  { id: "default_fullname", label: "Full Name", value: "", isDefault: true },
  { id: "default_email",    label: "Email",     value: "", isDefault: true },
  { id: "default_password", label: "Password",  value: "", isDefault: true }
]);
