import { createMessage, onMessage } from "@pwm/messaging";
import { detectFormFields, fillField, validateOrigin } from "@pwm/autofill";
import { logger } from "@pwm/utils";

logger.info("Content script loaded", { url: window.location.href });

function injectPageScript(): void {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected/injected-script.js");
  script.type = "module";
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

injectPageScript();

let detectedFields: ReturnType<typeof detectFormFields> = [];

function scanForms(): void {
  detectedFields = detectFormFields();
  if (detectedFields.length > 0) {
    void chrome.runtime.sendMessage(
      createMessage("FORM_DETECTED", {
        url: window.location.href,
        fieldCount: detectedFields.length,
        types: detectedFields.map((f) => f.type),
      }),
    );
  }
}

onMessage({
  PING: () => ({ success: true, data: "PONG from content script" }),

  AUTOFILL_FILL: (message) => {
    const payload = message.payload as { username: string; password: string; credentialUrl?: string };
    const pageUrl = window.location.href;

    if (payload.credentialUrl && !validateOrigin(payload.credentialUrl, pageUrl)) {
      logger.warn("Autofill blocked: origin mismatch", { pageUrl, credentialUrl: payload.credentialUrl });
      return { success: false, error: "Origin mismatch — autofill blocked for security" };
    }

    scanForms();
    const usernameField = detectedFields.find((f) => f.type === "username" || f.type === "email");
    const passwordField = detectedFields.find((f) => f.type === "password");

    if (!passwordField?.element) {
      return { success: false, error: "No password field detected" };
    }

    if (usernameField?.element) {
      fillField(usernameField.element, payload.username);
    }
    fillField(passwordField.element, payload.password);

    logger.info("Autofill completed", { url: pageUrl });
    return { success: true, data: { filled: true } };
  },
});

void chrome.runtime.sendMessage(createMessage("EXTENSION_READY"));

window.addEventListener("message", (event) => {
  if (event.source !== window || event.data?.source !== "pwm-injected") return;
  if (event.data.type === "FORM_DETECTED") {
    void chrome.runtime.sendMessage(createMessage("FORM_DETECTED", event.data.payload));
  }
});

const observer = new MutationObserver(() => scanForms());
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
  scanForms();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
    scanForms();
  });
}

export {};
