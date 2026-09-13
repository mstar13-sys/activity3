
(function () {
  const nav = document.querySelectorAll(
    ".switcher a[href], .switch-foot a[href]",
  );
  if (!nav.length) return;

  const EXIT_MS = 200;

  nav.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");

      // Let modified clicks (new tab, etc.) behave normally.
      if (!href || e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (document.body.classList.contains("page-leaving")) return; // already navigating

      e.preventDefault();
      document.body.classList.add("page-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, EXIT_MS);
    });
  });
})();
