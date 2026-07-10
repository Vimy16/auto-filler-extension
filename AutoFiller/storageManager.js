// storageManager.js
import { getChromeIdentity, fetchExtensionFields, fetchLocalFields, saveExtensionFields } from './storageUtils.js';
import { DEFAULT_FIELDS } from './storageKeys.js';

export const StorageManager = {

  /**
   * Load fields depending on identity state
   * - Signed in  → load sync (fallback local)
   * - Signed out → load ONLY local
   */
  async loadAndProcessFields() {
    const identity = await getChromeIdentity();

    const rawSavedFields = identity.signedIn
      ? await fetchExtensionFields()        // sync → fallback local
      : await fetchLocalFields();           // local only

    // Build fresh default fields
    const mergedFields = DEFAULT_FIELDS.map(df => ({ ...df, value: "" }));

    // Merge saved fields into defaults
    rawSavedFields.forEach(sf => {
      const match = mergedFields.find(df => df.id === sf.id);
      if (match) {
        match.value = sf.value;
      } else if (!sf.isDefault) {
        mergedFields.push(sf);
      }
    });

    return mergedFields;
  },

  /**
   * Save fields depending on identity state
   * - Signed in  → save sync + local
   * - Signed out → save ONLY local
   */
  async persistFields(fields, forceLocalSave = false) {
    const identity = await getChromeIdentity();

    if (forceLocalSave || !identity.signedIn) {
      // Save ONLY to local storage
      await chrome.storage.local.set({ autofillFields: fields });
      return true;
    }

    // Save to sync + local
    await saveExtensionFields(fields);
    return true;
  }
};
