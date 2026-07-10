// storageUtils.js
import { STORAGE_KEYS } from './storageKeys.js';

/**
 * Checks Chrome Identity profile status
 * @returns {Promise<{email: string|null, signedIn: boolean}>}
 */
export function getChromeIdentity() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.identity?.getProfileUserInfo) {
      chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
        if (!userInfo || !userInfo.email) {
          resolve({ email: null, signedIn: false });
        } else {
          resolve({ email: userInfo.email, signedIn: true });
        }
      });
    } else {
      resolve({ email: null, signedIn: false });
    }
  });
}

/**
 * Fetch fields from sync storage (fallback to local)
 * Used ONLY when user is signed in
 * @returns {Promise<Array>}
 */
export function fetchExtensionFields() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve([]);
      return;
    }

    chrome.storage.sync.get([STORAGE_KEYS.AUTOFILL_FIELDS], (result) => {
      const syncData = result[STORAGE_KEYS.AUTOFILL_FIELDS];

      if (Array.isArray(syncData) && syncData.length > 0) {
        resolve(syncData);
      } else {
        chrome.storage.local.get([STORAGE_KEYS.AUTOFILL_FIELDS], (localResult) => {
          resolve(localResult[STORAGE_KEYS.AUTOFILL_FIELDS] || []);
        });
      }
    });
  });
}

/**
 * Fetch fields ONLY from local storage
 * Used when user is signed out
 * @returns {Promise<Array>}
 */
export function fetchLocalFields() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve([]);
      return;
    }

    chrome.storage.local.get([STORAGE_KEYS.AUTOFILL_FIELDS], (result) => {
      resolve(result[STORAGE_KEYS.AUTOFILL_FIELDS] || []);
    });
  });
}

/**
 * Saves fields across sync and local storage pipelines
 * Used ONLY when user is signed in
 * @param {Array} fields 
 * @returns {Promise<void>}
 */
export function saveExtensionFields(fields) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      resolve();
      return;
    }

    chrome.storage.sync.set({ [STORAGE_KEYS.AUTOFILL_FIELDS]: fields }, () => {
      chrome.storage.local.set({ [STORAGE_KEYS.AUTOFILL_FIELDS]: fields }, () => {
        resolve();
      });
    });
  });
}
