let currentFields = [];

// Default core template fields (flagged so they can't be deleted or changed)
const defaultFields = [
  { id: "f_1", label: "Full Name", value: "", isDefault: true },
  { id: "f_2", label: "Email", value: "", isDefault: true },
  { id: "f_3", label: "Password", value: "", isDefault: true }
];

document.addEventListener('DOMContentLoaded', () => {
  // Load data on startup
  chrome.storage.sync.get(['autofillFields'], (result) => {
    let savedFields = result.autofillFields || [];
    
    // Ensure core fields are always present at the top, even if structural updates occur
    const mergedFields = [...defaultFields];
    savedFields.forEach(sf => {
      const match = mergedFields.find(df => df.id === sf.id || (df.isDefault && df.label === sf.label));
      if (match) {
        match.value = sf.value; // Carry over stored values for defaults
      } else if (!sf.isDefault) {
        mergedFields.push(sf); // Append custom items
      }
    });

    currentFields = mergedFields;
    saveData();
    renderFields();
  });

  // Setup button listeners
  document.getElementById('addBtn').addEventListener('click', addNewField);
  document.getElementById('fillBtn').addEventListener('click', fillPage);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('fileInput').click());
  document.getElementById('fileInput').addEventListener('change', importData);
});

// Build the UI list of fields dynamically
function renderFields() {
  const container = document.getElementById('fieldsContainer');
  container.innerHTML = '';

  currentFields.forEach((field) => {
    const row = document.createElement('div');
    row.className = 'field-row';

    // Label input
    const labelInput = document.createElement('input');
    labelInput.className = 'field-label';
    labelInput.value = field.label;
    labelInput.placeholder = "Label";
    
    // If it's a default field, make it read-only
    if (field.isDefault) {
      labelInput.readOnly = true;
    } else {
      labelInput.addEventListener('input', (e) => {
        field.label = e.target.value;
        saveData();
      });
    }

    // Value input (the text to inject)
    const valueInput = document.createElement('input');
    valueInput.className = 'field-value';
    valueInput.value = field.value;
    
    if (field.label.toLowerCase().includes('password')) {
      valueInput.type = 'password';
    } else {
      valueInput.type = 'text';
    }

    valueInput.placeholder = `Enter ${field.label || 'value'}...`;
    valueInput.addEventListener('input', (e) => {
      field.value = e.target.value;
      saveData();
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.innerText = 'X';
    
    // Disable deletion if it's a default field
    if (field.isDefault) {
      removeBtn.disabled = true;
      removeBtn.title = "Default fields cannot be removed";
    } else {
      removeBtn.addEventListener('click', () => {
        currentFields = currentFields.filter(f => f.id !== field.id);
        saveData();
        renderFields();
      });
    }

    row.appendChild(labelInput);
    row.appendChild(valueInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
}

function addNewField() {
  const newId = 'f_' + Date.now();
  currentFields.push({ id: newId, label: 'Custom', value: '', isDefault: false });
  saveData();
  renderFields();
}

function saveData() {
  chrome.storage.sync.set({ autofillFields: currentFields });
}

// Export data to a downloadable JSON file
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentFields));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "autofill_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Import data from a local JSON file backup
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (Array.isArray(parsed)) {
        // Clean out default flags from incoming array to prevent duplicates, then merge safely
        const nonDefaults = parsed.filter(f => !f.isDefault);
        
        defaultFields.forEach(df => {
          const match = parsed.find(f => f.label === df.label);
          if (match) df.value = match.value;
        });

        currentFields = [...defaultFields, ...nonDefaults];
        saveData();
        renderFields();
        alert("Backup imported successfully!");
      }
    } catch (err) {
      alert("Invalid backup file format.");
    }
  };
  reader.readAsText(file);
}

// Inject into the active web page
async function fillPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: autoFillPage,
    args: [currentFields]
  });
}

// Webpage runtime context execution
function autoFillPage(fieldsArray) {
  fieldsArray.forEach(field => {
    if (!field.label || !field.value) return;
    
    const cleanLabel = field.label.toLowerCase().trim();
    const query = `input[name*="${cleanLabel}"], input[id*="${cleanLabel}"], input[placeholder*="${cleanLabel}"], input[type="${cleanLabel}"]`;
    const inputElement = document.querySelector(query);

    if (inputElement) {
      inputElement.value = field.value;
      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
}
