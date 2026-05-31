/**
 * Questionnaire JS — handles auto-proceed on single-choice selection
 */
document.addEventListener("DOMContentLoaded", () => {
  // Auto-proceed: when user clicks a radio option, submit after a brief delay
  const form = document.querySelector(".question-form");
  if (!form) return;

  const radioOptions = form.querySelectorAll(
    '.option-item[data-auto-proceed="true"] input[type="radio"]'
  );

  radioOptions.forEach((radio) => {
    radio.addEventListener("change", () => {
      // Visual feedback
      document.querySelectorAll(".option-item").forEach((item) => {
        item.style.borderColor = "";
        item.style.background = "";
      });
      const parent = radio.closest(".option-item");
      parent.style.borderColor = "#2563eb";
      parent.style.background = "#dbeafe";

      // Auto-submit after short delay for visual feedback
      setTimeout(() => {
        form.submit();
      }, 300);
    });
  });

  // For checkbox questions, limit max selections
  const checkboxes = form.querySelectorAll('input[type="checkbox"]');
  if (checkboxes.length > 0) {
    const hint = form.querySelector(".hint");
    const maxMatch = hint ? hint.textContent.match(/(\d+)/) : null;
    const maxSelections = maxMatch ? parseInt(maxMatch[1], 10) : Infinity;

    checkboxes.forEach((cb) => {
      cb.addEventListener("change", () => {
        const checked = form.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length > maxSelections) {
          cb.checked = false;
        }
      });
    });
  }
});
