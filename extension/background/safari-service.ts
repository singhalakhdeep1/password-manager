// Safari extension background service worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Password Manager extension installed');
  createContextMenu();
});

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'save-password',
    title: 'Save Password',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'generate-password',
    title: 'Generate Password',
    contexts: ['all']
  });

  chrome.contextMenus.create({
    id: 'fill-credentials',
    title: 'Fill Credentials',
    contexts: ['all']
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'save-password':
      chrome.tabs.sendMessage(tab.id, { action: 'save-password' });
      break;
    case 'generate-password':
      chrome.tabs.sendMessage(tab.id, { action: 'generate-password' });
      break;
    case 'fill-credentials':
      chrome.tabs.sendMessage(tab.id, { action: 'fill-credentials' });
      break;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'get-passwords') {
    chrome.storage.local.get(['passwords'], (result) => {
      sendResponse(result.passwords || []);
    });
    return true;
  }

  if (request.action === 'save-password') {
    chrome.storage.local.get(['passwords'], (result) => {
      const passwords = result.passwords || [];
      passwords.push(request.data);
      chrome.storage.local.set({ passwords });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'delete-password') {
    chrome.storage.local.get(['passwords'], (result) => {
      const passwords = result.passwords || [];
      const filtered = passwords.filter(p => p.id !== request.id);
      chrome.storage.local.set({ passwords: filtered });
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'generate-password') {
    const password = generateSecurePassword();
    sendResponse({ password });
  }

  if (request.action === 'encrypt') {
    const encrypted = encryptData(request.data);
    sendResponse({ encrypted });
  }

  if (request.action === 'decrypt') {
    const decrypted = decryptData(request.data);
    sendResponse({ decrypted });
  }
});

function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

async function encryptData(data) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  
  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv),
    key: Array.from(await crypto.subtle.exportKey('raw', key))
  };
}

async function decryptData(data) {
  const { encrypted, iv, key } = data;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(key),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    cryptoKey,
    new Uint8Array(encrypted)
  );
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
