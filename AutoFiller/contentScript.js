
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== "fill_forms") return;

  const fields = msg.data || [];
  if (!Array.isArray(fields)) return;

  fields.forEach(field => {
    const label = (field.label || "").toLowerCase();
    const value = field.value || "";

    document.querySelectorAll("input, textarea").forEach(input => {
      const name = (input.name || "").toLowerCase();
      const id = (input.id || "").toLowerCase();
      const placeholder = (input.placeholder || "").toLowerCase();

      // Basic matching logic
      if (
        name.includes(label) ||
        id.includes(label) ||
        placeholder.includes(label)
      ) {
        input.value = value;

        // Trigger events for React/Vue/Angular forms
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
});
