import type { FormField } from "@pwm/types";

/** Heuristic selectors for login form fields (Module 6). */
const USERNAME_SELECTORS = [
  'input[type=email]',
  'input[type=text][autocomplete*=user]',
  'input[type=text][name*=user]',
  'input[type=text][name*=login]',
  'input[type=text][id*=user]',
  'input[type=text][id*=email]',
];

const PASSWORD_SELECTORS = [
  'input[type=password]',
  'input[autocomplete*=password]',
];

/** Detects login form fields including Shadow DOM (Module 6). */
export function detectFormFields(root: Document | ShadowRoot | Element = document): FormField[] {
  const fields: FormField[] = [];

  for (const selector of USERNAME_SELECTORS) {
    root.querySelectorAll(selector).forEach((el) => {
      fields.push({
        type: el.getAttribute("type") === "email" ? "email" : "username",
        element: el,
        name: el.getAttribute("name") ?? undefined,
        autocomplete: el.getAttribute("autocomplete") ?? undefined,
      });
    });
  }

  for (const selector of PASSWORD_SELECTORS) {
    root.querySelectorAll(selector).forEach((el) => {
      fields.push({
        type: "password",
        element: el,
        name: el.getAttribute("name") ?? undefined,
        autocomplete: el.getAttribute("autocomplete") ?? undefined,
      });
    });
  }

  // Shadow DOM traversal
  if (root instanceof Document || root instanceof ShadowRoot) {
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) fields.push(...detectFormFields(el.shadowRoot));
    });
  }

  return fields;
}

/** Validates that page origin matches credential URL (Module 7 — anti-phishing). */
export function validateOrigin(credentialUrl: string, pageUrl: string): boolean {
  try {
    const credOrigin = new URL(credentialUrl).origin;
    const pageOrigin = new URL(pageUrl).origin;
    return credOrigin === pageOrigin;
  } catch {
    return false;
  }
}

/** Detects homograph/IDN phishing attempts (Module 7). */
export function detectHomograph(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    // Mixed scripts or punycode indicators
    return hostname.includes("xn--") || /[^\x00-\x7F]/.test(hostname);
  } catch {
    return false;
  }
}

/** Fills a form field securely (Module 7). */
export function fillField(element: Element, value: string): void {
  if (!(element instanceof HTMLInputElement)) return;

  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Creates MutationObserver for SPA form detection (Module 6). */
export function observeFormChanges(onDetect: (fields: FormField[]) => void): MutationObserver {
  const observer = new MutationObserver(() => onDetect(detectFormFields()));
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
