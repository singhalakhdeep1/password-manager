/**
 * Injected script — page main world.
 * Module 6: Universal form detection (Shadow DOM, SPA, iframes).
 */
(function initInjectedScript() {
  const SOURCE = "pwm-injected";

  const USERNAME_SELECTORS = [
    "input[type=email]",
    "input[type=text][autocomplete*=user]",
    "input[type=text][autocomplete*=email]",
    "input[type=text][name*=user]",
    "input[type=text][name*=login]",
    "input[type=text][name*=email]",
    "input[type=text][id*=user]",
    "input[type=text][id*=email]",
  ];

  const PASSWORD_SELECTORS = ["input[type=password]", "input[autocomplete*=password]"];

  function detectFields(root: Document | ShadowRoot | Element): { type: string; name?: string }[] {
    const fields: { type: string; name?: string }[] = [];

    for (const selector of USERNAME_SELECTORS) {
      root.querySelectorAll(selector).forEach((el) => {
        fields.push({
          type: el.getAttribute("type") === "email" ? "email" : "username",
          name: el.getAttribute("name") ?? undefined,
        });
      });
    }

    for (const selector of PASSWORD_SELECTORS) {
      root.querySelectorAll(selector).forEach((el) => {
        fields.push({
          type: "password",
          name: el.getAttribute("name") ?? undefined,
        });
      });
    }

    if (root instanceof Document || root instanceof ShadowRoot) {
      root.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot) fields.push(...detectFields(el.shadowRoot));
      });
    }

    return fields;
  }

  function notify(type: string, payload: unknown): void {
    window.postMessage({ source: SOURCE, type, payload }, "*");
  }

  function scan(): void {
    const fields = detectFields(document);
    if (fields.length > 0) {
      notify("FORM_DETECTED", {
        url: window.location.href,
        fieldCount: fields.length,
        types: fields.map((f) => f.type),
      });
    }
  }

  notify("INJECTED_READY", { url: window.location.href, timestamp: Date.now() });
  scan();

  const observer = new MutationObserver(() => scan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("popstate", scan);
  const origPushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    origPushState(...args);
    scan();
  };
})();

export {};
