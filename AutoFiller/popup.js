// popup.js
import { StorageManager } from './storageManager.js';
import { BackupManager } from './backupManager.js';
import { STORAGE_KEYS, DEFAULT_FIELDS } from './storageKeys.js';
import { getChromeIdentity } from './storageUtils.js';
import { fetchLocalFields } from './storageUtils.js';


let currentFields = [];
let isSelfSaving = false;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadFieldsBasedOnIdentity();
  renderFields();

  document.getElementById('addBtn').addEventListener('click', addNewField);
  document.getElementById('fillBtn').addEventListener('click', fillPage);

  document.getElementById('exportBtn').addEventListener('click', () => {
    BackupManager.exportData(currentFields);
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const importedFields = await BackupManager.importData(e);
    if (importedFields) {
      currentFields = importedFields;
      renderFields();
      alert("Backup imported successfully!");
    }
    e.target.value = '';
  });

  // Live storage updates (sync/local)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (isSelfSaving) return;

    const key = STORAGE_KEYS.AUTOFILL_FIELDS;
    if ((areaName === 'sync' || areaName === 'local') && changes[key]) {
      await loadFieldsBasedOnIdentity();
      renderFields();
    }
  });
});

/**
 * Load fields depending on sign-in state
 */
async function loadFieldsBasedOnIdentity() {
  const identity = await getChromeIdentity();

  const statusEl = document.getElementById('syncStatus');

  if (!identity.signedIn) {
    statusEl.textContent = "Using local storage (Google Sync disabled)";
    currentFields = await fetchLocalFields();

    if (!currentFields || currentFields.length === 0) {
      currentFields = DEFAULT_FIELDS.map(df => ({ ...df }));
    }

  } else {
    statusEl.textContent = "Google Sync enabled (fields stored in your account)";
    currentFields = await StorageManager.loadAndProcessFields();
  }
}


/**
 * Build UI
 */
function renderFields() {
  const container = document.getElementById('fieldsContainer');
  if (!container) return;
  container.innerHTML = '';

  currentFields.forEach((field) => {
    const row = document.createElement('div');
    row.className = 'field-row';

    const labelInput = document.createElement('input');
    labelInput.className = 'field-label';
    labelInput.value = field.label;
    labelInput.placeholder = "Label";

    if (field.isDefault) {
      labelInput.readOnly = true;
    } else {
      labelInput.addEventListener('input', (e) => {
        field.label = e.target.value;
        debounceSave();
      });
    }

    const valueInput = document.createElement('input');
    valueInput.className = 'field-value';
    valueInput.value = field.value;
    valueInput.type = field.label.toLowerCase().includes('password') ? 'password' : 'text';
    valueInput.placeholder = `Enter ${field.label || 'value'}...`;

    valueInput.addEventListener('input', (e) => {
      field.value = e.target.value;
      debounceSave();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.innerText = 'X';

    if (field.isDefault) {
      removeBtn.disabled = true;
      removeBtn.title = "Default fields cannot be removed";
    } else {
      removeBtn.addEventListener('click', async () => {
        currentFields = currentFields.filter(f => f.id !== field.id);
        await saveDataImmediate();
        renderFields();
      });
    }

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

/**
 * Add new custom field (only allowed when signed in)
 */
async function addNewField() {
  const identity = await getChromeIdentity();

  if (!identity.signedIn) {
    alert("Please sign into your Google account to add fields.");
    return;
  }

  const newId = 'f_' + Date.now();
  currentFields.push({ id: newId, label: 'Custom', value: '', isDefault: false });
  await saveDataImmediate();
  renderFields();
}

/**
 * Debounced save
 */
function debounceSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDataImmediate();
  }, 400);
}

/**
 * Save fields depending on identity
 */
async function saveDataImmediate() {
  isSelfSaving = true;
  await StorageManager.persistFields(currentFields);
  setTimeout(() => { isSelfSaving = false; }, 50);
}

/**
 * Fill webpage forms
 */
function fillPage() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    chrome.tabs.sendMessage(tabs[0].id, {
      action: "fill_forms",
      data: currentFields
    }).catch(() => {
      
    });
  });
}
