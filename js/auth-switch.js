
(function () {
  const panes = document.getElementById("authPanes");
  const switcher = document.querySelector(".switcher");
  if (!panes || !switcher) return;

  let busy = false;

  function activePane() {
    return panes.querySelector(".pane.active");
  }

  function paneFor(target) {
    return panes.querySelector(`.pane[data-pane="${target}"]`);
  }

  function setSwitcherState(target) {
    switcher.setAttribute("data-active", target);
    switcher.querySelectorAll("[data-switch-target]").forEach((el) => {
      el.setAttribute(
        "aria-selected",
        el.dataset.switchTarget === target ? "true" : "false",
      );
    });
  }

  function switchTo(target, { pushState = true, focusInput = true } = {}) {
    const current = activePane();
    const next = paneFor(target);

    if (!current || !next || current === next || busy) return;

    busy = true;
    const forward = target === "signup"; // login -> signup slides leftward; signup -> login slides rightward

    // Lock the container at its current height so nothing jumps the
    // instant we lift both panes into absolute position below.
    panes.style.height = panes.getBoundingClientRect().height + "px";

    setSwitcherState(target);
    panes.classList.add("is-animating");

    // Place the incoming pane off-screen on the correct side, and mark
    // the current one as centered (matches where it already visually is).
    next.classList.add(forward ? "pane-pos-right" : "pane-pos-left");
    current.classList.add("pane-pos-center");

    // Force layout so the browser commits those starting positions
    // before we flip to the end state below — otherwise both changes
    // would get batched into one frame and there'd be nothing to animate.
    void next.getBoundingClientRect();

    requestAnimationFrame(() => {
      panes.style.height = next.scrollHeight + "px";
      current.classList.remove("pane-pos-center");
      current.classList.add(forward ? "pane-pos-left" : "pane-pos-right");
      next.classList.remove("pane-pos-right", "pane-pos-left");
      next.classList.add("pane-pos-center");
    });

    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      current.classList.remove(
        "active",
        "pane-pos-center",
        "pane-pos-left",
        "pane-pos-right",
      );
      next.classList.remove(
        "pane-pos-center",
        "pane-pos-left",
        "pane-pos-right",
      );
      next.classList.add("active");
      panes.classList.remove("is-animating");
      panes.style.height = "";
      busy = false;
      next.removeEventListener("transitionend", onEnd);

      if (focusInput) {
        const firstField = next.querySelector('input:not([type="hidden"])');
        if (firstField) firstField.focus({ preventScroll: true });
      }
    }
    function onEnd(e) {
      if (e.target === next && e.propertyName === "transform") finish();
    }
    next.addEventListener("transitionend", onEnd);
    window.setTimeout(finish, 500); // safety net if transitionend doesn't fire

    if (pushState) {
      const url = target === "signup" ? "login.php?mode=signup" : "login.php";
      history.pushState({ authMode: target }, "", url);
      document.title =
        target === "signup" ? "SmartCare - Sign Up" : "SmartCare - Log In";
    }
  }

  document.querySelectorAll("[data-switch-target]").forEach((el) => {
    el.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      switchTo(el.dataset.switchTarget);
    });
  });

  window.addEventListener("popstate", () => {
    const target = location.search.includes("mode=signup") ? "signup" : "login";
    switchTo(target, { pushState: false, focusInput: false });
  });
})();
