// Main JS — minimal interactions
document.addEventListener("DOMContentLoaded", () => {
  // Smooth page transitions (optional enhancement)
  document.querySelectorAll("a").forEach((link) => {
    if (link.hostname === window.location.hostname) {
      link.addEventListener("click", () => {
        document.body.style.opacity = "0.95";
      });
    }
  });
});
