/* =========================================================================
   Password Visibility Toggle
   -------------------------------------------------------------------------
   Wires the eye icon buttons next to every password field. Applies to
   loginPassword, signupPassword, and confirmPassword alike, since each
   button carries its target field's id in data-target. A plain click
   listener flips the input between type="password" and type="text" and
   swaps the icon — nothing else needs to know this happened.
   ========================================================================= */
(function () {
  const EYE_OPEN_ICON =
    '<svg class="eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>';

  const EYE_CLOSED_ICON =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.6 6.7C4 8.3 1.5 12 1.5 12s3.5 7 10.5 7c2 0 3.7-.6 5.1-1.4M9.9 5.2A11 11 0 0 1 12 5c7 0 10.5 7 10.5 7-.4.8-1.4 2.3-2.9 3.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

  document.querySelectorAll(".toggle-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const isCurrentlyShowing = input.type === "text";

      input.type = isCurrentlyShowing ? "password" : "text";
      btn.setAttribute(
        "aria-label",
        isCurrentlyShowing ? "Show password" : "Hide password",
      );
      btn.innerHTML = isCurrentlyShowing ? EYE_OPEN_ICON : EYE_CLOSED_ICON;
    });
  });
})();
