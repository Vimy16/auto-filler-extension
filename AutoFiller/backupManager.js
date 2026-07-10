// backupManager.js
import { StorageManager } from './storageManager.js';
import { DEFAULT_FIELDS } from './storageKeys.js';
import { getChromeIdentity } from './storageUtils.js';

export const BackupManager = {

  /**
   * Export current fields to a downloadable JSON file
   */
  exportData(fields) {
    if (!fields || !fields.length) return;

    const dataStr = "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(fields));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = dataStr;
    downloadAnchor.download = "autofill_backup.json";

    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  /**
   * Import backup JSON and restore fields properly
   */
  importData(event) {
    return new Promise((resolve) => {
      const file = event.target.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!Array.isArray(parsed)) throw new Error("Invalid structure");

          // Separate defaults and customs
          const nonDefaults = parsed.filter(f => !f.isDefault);

          // Rebuild fresh defaults
          const freshDefaults = DEFAULT_FIELDS.map(df => ({ ...df, value: "" }));

          // Apply default values from backup
          freshDefaults.forEach(df => {
            const match = parsed.find(f => f.label === df.label);
            if (match) df.value = match.value;
          });

          const restoredFields = [...freshDefaults, ...nonDefaults];

          // Determine correct storage target (sync or local)
          const identity = await getChromeIdentity();

          if (identity.signedIn) {
            // Save to sync + local
            await StorageManager.persistFields(restoredFields);
          } else {
            // Save ONLY to local storage
            await StorageManager.persistFields(restoredFields, true);
          }

          resolve(restoredFields);

        } catch (err) {
          alert("Invalid JSON file backup structure.");
          resolve(null);
        }
      };

      reader.readAsText(file);
    });
  }
};
