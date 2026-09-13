(function () {
  "use strict";

  const app = document.getElementById("adminApp");
  if (!app) return;

  const state = { view: "overview", cache: {}, query: "", lookupsLoaded: false };
  const apiUrl = app.dataset.api;
  const csrfToken = app.dataset.csrf;
  const titles = {
    overview: "Operations overview",
    staff: "Staff management",
    patients: "Patient directory",
    appointments: "Appointment management",
    services: "Clinic services",
    schedules: "Staff schedules",
    notifications: "Notification center",
    reports: "Clinic reports",
    audit: "Audit log",
    settings: "System settings",
  };

  const emit = (name, detail = {}) => document.dispatchEvent(new CustomEvent(name, { detail }));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  })[character]);
  const pretty = (value) => String(value || "—").replaceAll("_", " ");
  const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const formatDate = (value, options = {}) => {
    if (!value) return "—";
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat("en-PH", options).format(date);
  };
  const statusBadge = (status) => `<span class="admin-status-badge is-${escapeHtml(status)}">${escapeHtml(pretty(status))}</span>`;
  const person = (name, detail) => `<span class="admin-person"><span class="admin-person-avatar">${escapeHtml(initials(name))}</span><span><strong>${escapeHtml(name || "Unassigned")}</strong><small>${escapeHtml(detail || "")}</small></span></span>`;
  const actionButton = (action, id, icon, label, tone = "", accessibleLabel = label) => `<button class="admin-row-action${tone ? ` is-${tone}` : ""}" type="button" data-${action}="${Number(id)}" aria-label="${escapeHtml(accessibleLabel)}" title="${escapeHtml(accessibleLabel)}"><i data-lucide="${escapeHtml(icon)}"></i><span>${escapeHtml(label)}</span></button>`;
  const statusTone = (status) => `status-${String(status || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "-")}`;
  const emptyRow = (columns, label) => `<tbody><tr><td colspan="${columns}"><div class="admin-empty">${escapeHtml(label)}</div></td></tr></tbody>`;
  const notify = (type, title, body) => {
    if (typeof window.showToast === "function") window.showToast({ type, title, body });
    else if (body) window.alert(`${title}\n${body}`);
  };
  const refreshIcons = () => {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
    }
  };

  async function request(action, options = {}) {
    const isPost = options.method === "POST";
    const response = await fetch(isPost ? apiUrl : `${apiUrl}?action=${encodeURIComponent(action)}`, {
      method: isPost ? "POST" : "GET",
      body: isPost ? options.body : undefined,
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    let payload;
    try { payload = await response.json(); }
    catch (_) { throw new Error("The server returned an unreadable response."); }
    if (!response.ok || !payload.success) throw Object.assign(new Error(payload.message || "Request failed."), { errors: payload.errors || {} });
    return payload;
  }

  function setAlert(message = "") {
    const alert = document.getElementById("dashboardAlert");
    alert.hidden = !message;
    alert.textContent = message;
  }

  function showView(view) {
    if (!titles[view]) return;
    state.view = view;
    state.query = "";
    document.getElementById("adminSearch").value = "";
    document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.dataset.viewPanel === view));
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
    document.getElementById("currentViewTitle").textContent = titles[view];
    document.getElementById("currentBreadcrumb").textContent = titles[view].replace(" management", "");
    app.classList.remove("sidebar-open");
    setAlert();
    emit("admin:view-changed", { view });
  }

  function setTableLoading(view) {
    const table = document.getElementById(`${view}Table`);
    const count = document.getElementById(`${view}Count`);
    if (table) table.innerHTML = emptyRow(6, "Loading records…");
    if (count) count.textContent = "Loading records…";
  }

  function loadView(view, force = false) {
    if (view === "settings") return;
    if (!force && state.cache[view]) {
      render(view, state.cache[view]);
      return;
    }
    if (view !== "overview") setTableLoading(view);
    emit("admin:data-requested", { view });
  }

  document.addEventListener("admin:data-requested", async (event) => {
    const view = event.detail.view;
    try {
      const response = await request(view);
      emit("admin:data-loaded", { view, data: response.data });
    } catch (error) {
      emit("admin:data-failed", { view, error });
    }
  });

  document.addEventListener("admin:data-loaded", (event) => NotificationCenter.publish("admin:data-ready", event.detail));
  NotificationCenter.subscribe("admin:data-ready", (data) => {
    state.cache[data.view] = data.data;
  }, "Cache dashboard data");
  NotificationCenter.subscribe("admin:data-ready", (data) => {
    if (data.view === state.view || data.view === "overview") render(data.view, data.data);
  }, "Render applicable dashboard view");

  NotificationCenter.subscribe("admin:mutation-succeeded", (data) => {
    if (data.form) {
      data.form.reset();
      closeModal(data.form.closest("dialog"));
    }
  }, "Reset saved form and close dialog");
  NotificationCenter.subscribe("admin:mutation-succeeded", (data) => {
    delete state.cache[data.view];
    delete state.cache.overview;
  }, "Invalidate outdated dashboard data");
  NotificationCenter.subscribe("admin:mutation-succeeded", (data) => {
    notify("success", "Update saved", data.message);
  }, "Request saved update notification");
  NotificationCenter.subscribe("admin:mutation-succeeded", (data) => {
    loadView(data.view, true);
    if (data.view !== "overview") loadView("overview", true);
  }, "Request refreshed records and overview");

  document.addEventListener("admin:data-failed", (event) => {
    const { view, error } = event.detail;
    setAlert(error.message);
    if (view !== "overview") {
      const table = document.getElementById(`${view}Table`);
      if (table) table.innerHTML = emptyRow(6, error.message);
      const count = document.getElementById(`${view}Count`);
      if (count) count.textContent = "Unable to load records";
    } else {
      document.querySelectorAll(".admin-skeleton").forEach((card) => card.classList.remove("admin-skeleton"));
      ["todayAppointments", "recentStaff", "recentActivity", "statusChart"].forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = `<div class="admin-empty">${escapeHtml(error.message)}</div>`;
      });
    }
  });

  function render(view, data) {
    if (view === "overview") renderOverview(data);
    else if (view === "staff") renderStaff(data);
    else if (view === "patients") renderPatients(data);
    else if (view === "appointments") renderAppointments(data);
    else if (view === "services") renderServices(data);
    else if (view === "schedules") renderSchedules(data);
    else if (view === "notifications") renderNotifications(data);
    else if (view === "reports") renderReports(data);
    else if (view === "audit") renderAudit(data);
    refreshIcons();
    applySearch();
  }

  function renderOverview(data) {
    const notes = {
      active_staff: "Accounts available for clinic work",
      total_patients: "Registered patient accounts",
      appointments_today: `${data.metrics.completed_today} already completed`,
      pending_approvals: "Accounts and appointment requests",
    };
    Object.entries(data.metrics).forEach(([key, value]) => {
      const card = document.querySelector(`[data-metric="${key}"]`);
      if (!card) return;
      card.querySelector("strong").textContent = Number(value).toLocaleString();
      const note = card.querySelector("[data-metric-note]");
      if (note && notes[key]) note.textContent = notes[key];
      card.classList.remove("admin-skeleton");
    });
    document.getElementById("pendingNavCount").textContent = data.metrics.pending_approvals;
    document.getElementById("completedToday").textContent = data.metrics.completed_today;
    document.getElementById("queueToday").textContent = data.metrics.queue_waiting + data.metrics.queue_in_service;

    const appointments = document.getElementById("todayAppointments");
    appointments.innerHTML = data.today_appointments.length ? data.today_appointments.map((row) => `<tr>
      <td><strong>${formatDate(row.scheduled_at, { hour: "numeric", minute: "2-digit" })}</strong></td>
      <td>${person(row.patient_name, row.reference_no)}</td><td>${escapeHtml(row.service_name || "General care")}</td>
      <td>${escapeHtml(row.staff_name || "Unassigned")}</td><td>${statusBadge(row.status)}</td></tr>`).join("")
      : '<tr><td colspan="5"><div class="admin-empty">No appointments scheduled today.</div></td></tr>';

    const staff = document.getElementById("recentStaff");
    staff.innerHTML = data.recent_staff.length ? data.recent_staff.map((row) => `<div class="admin-list-item">
      ${person(row.full_name, `${row.job_title || "Staff"} · ${row.department || "No department"}`)}${statusBadge(row.status)}</div>`).join("")
      : '<div class="admin-empty">No staff accounts yet.</div>';

    const activity = document.getElementById("recentActivity");
    activity.innerHTML = data.activity.length ? data.activity.map((row) => `<div class="admin-timeline-item"><i class="admin-timeline-dot"></i>
      <strong>${escapeHtml(row.actor_name)} · ${escapeHtml(pretty(row.action))}</strong>
      <small>${escapeHtml(pretty(row.entity_type))} · ${formatDate(row.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>`).join("")
      : '<div class="admin-empty">Administrative activity will appear here.</div>';

    const chart = document.getElementById("statusChart");
    const max = Math.max(1, ...data.appointment_statuses.map((row) => Number(row.total)));
    chart.innerHTML = data.appointment_statuses.length ? data.appointment_statuses.map((row) => `<div class="admin-chart-row">
      <span>${escapeHtml(pretty(row.status))}</span><span class="admin-chart-track"><i class="admin-chart-bar" style="width:${Math.max(4, (Number(row.total) / max) * 100)}%"></i></span><strong>${Number(row.total)}</strong></div>`).join("")
      : '<div class="admin-empty">No appointment activity in the last 30 days.</div>';
  }

  function table(view, headers, rows, body) {
    const element = document.getElementById(`${view}Table`);
    element.innerHTML = `<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>${rows.length ? `<tbody>${rows.map(body).join("")}</tbody>` : emptyRow(headers.length, `No ${view} records found.`)}`;
    document.getElementById(`${view}Count`).textContent = `${rows.length.toLocaleString()} record${rows.length === 1 ? "" : "s"}`;
  }

  const userStatusSelect = (row) => `<select class="admin-inline-select ${statusTone(row.status)}" data-user-status="${Number(row.id)}" aria-label="Status for ${escapeHtml(row.full_name)}">
    ${["active", "pending", "suspended", "inactive"].map((status) => `<option value="${status}"${row.status === status ? " selected" : ""}>${pretty(status)}</option>`).join("")}</select>`;

  function renderStaff(rows) {
    table("staff", ["Staff member", "Employee / department", "Phone", "Specialization", "Joined", "Status"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td>${person(row.full_name, row.email)}</td><td><strong>${escapeHtml(row.employee_no || "Not assigned")}</strong><br><small>${escapeHtml(row.job_title || "Staff")} · ${escapeHtml(row.department || "No department")}</small></td>
      <td>${escapeHtml(row.phone)}</td><td>${escapeHtml(row.specialization || "—")}</td><td>${formatDate(row.created_at, { month: "short", day: "numeric", year: "numeric" })}</td><td>${userStatusSelect(row)}</td></tr>`);
  }

  function renderPatients(rows) {
    table("patients", ["Patient", "Record number", "Phone", "Profile", "Appointments", "Status"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td>${person(row.full_name, row.email)}</td><td>${escapeHtml(row.medical_record_no || "Not assigned")}</td><td>${escapeHtml(row.phone)}</td>
      <td>${escapeHtml(pretty(row.sex))} · ${escapeHtml(row.blood_type || "unknown")}</td><td><strong>${Number(row.appointment_count)}</strong><br><small>Last: ${formatDate(row.last_appointment, { month: "short", day: "numeric", year: "numeric" })}</small></td><td>${userStatusSelect(row)}</td></tr>`);
  }

  function renderAppointments(rows) {
    const statuses = ["requested","confirmed","checked_in","in_progress","completed","cancelled","no_show"];
    table("appointments", ["Reference", "Schedule", "Patient", "Service", "Care provider", "Status"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td><strong>${escapeHtml(row.reference_no)}</strong><br><small>${Number(row.duration_minutes)} minutes</small></td><td>${formatDate(row.scheduled_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
      <td>${escapeHtml(row.patient_name)}</td><td>${escapeHtml(row.service_name || "General care")}</td><td>${escapeHtml(row.staff_name || "Unassigned")}</td>
      <td><select class="admin-inline-select ${statusTone(row.status)}" data-appointment-status="${Number(row.id)}" aria-label="Appointment status">${statuses.map((status) => `<option value="${status}"${row.status === status ? " selected" : ""}>${pretty(status)}</option>`).join("")}</select></td></tr>`);
  }

  function renderServices(rows) {
    table("services", ["Service", "Department", "Duration", "Fee", "Usage", "Availability", "Actions"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td><strong>${escapeHtml(row.name)}</strong><br><small>${escapeHtml(row.description || "No description")}</small></td><td>${escapeHtml(row.department || "Unassigned")}</td>
      <td>${Number(row.duration_minutes)} min</td><td>₱${Number(row.fee).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
      <td><strong>${Number(row.staff_count)}</strong> staff<br><small>${Number(row.appointment_count)} appointments</small></td><td>${statusBadge(Number(row.is_active) ? "available" : "unavailable")}</td>
      <td><span class="admin-row-actions">
        ${actionButton("service-edit", row.id, "pencil", "Edit", "", `Edit ${row.name}`)}
        ${actionButton("service-toggle", row.id, Number(row.is_active) ? "circle-pause" : "circle-play", Number(row.is_active) ? "Make unavailable" : "Make available", Number(row.is_active) ? "warning" : "success")}
        ${actionButton("service-delete", row.id, "trash-2", "Delete", "danger", `Delete ${row.name}`)}
      </span></td></tr>`);
  }

  function renderSchedules(rows) {
    const weekdays = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    table("schedules", ["Staff member", "Department", "Day", "Hours", "Validity", "Status", "Actions"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td>${person(row.staff_name, row.job_title)}</td><td>${escapeHtml(row.department || "Unassigned")}</td><td>${weekdays[Number(row.weekday)] || "—"}</td>
      <td>${escapeHtml(String(row.start_time).slice(0, 5))}–${escapeHtml(String(row.end_time).slice(0, 5))}</td><td>${row.valid_from ? `${formatDate(row.valid_from, { month: "short", day: "numeric", year: "numeric" })} – ${formatDate(row.valid_until, { month: "short", day: "numeric", year: "numeric" })}` : "Ongoing"}</td>
      <td>${statusBadge(Number(row.is_active) ? "active" : "inactive")}</td><td><span class="admin-row-actions">
        ${actionButton("schedule-toggle", row.id, Number(row.is_active) ? "circle-pause" : "circle-play", Number(row.is_active) ? "Deactivate schedule" : "Activate schedule", Number(row.is_active) ? "warning" : "success")}
        ${actionButton("schedule-delete", row.id, "trash-2", "Remove schedule", "danger")}
      </span></td></tr>`);
  }

  function renderNotifications(rows) {
    table("notifications", ["Sent", "Recipient", "Type", "Title", "Message", "State"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td>${formatDate(row.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td><td>${person(row.recipient_name, pretty(row.recipient_role))}</td>
      <td>${escapeHtml(pretty(row.type))}</td><td><strong>${escapeHtml(row.title)}</strong></td><td>${escapeHtml(row.body)}</td><td>${statusBadge(row.read_at ? "completed" : "pending")}</td></tr>`);
  }

  function renderReports(rows) {
    table("reports", ["Month", "Appointments", "Completed", "Open", "Cancelled", "No show"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td><strong>${formatDate(`${row.report_month}-01`, { month: "long", year: "numeric" })}</strong></td><td>${Number(row.total_appointments).toLocaleString()}</td>
      <td>${Number(row.completed).toLocaleString()}</td><td>${Number(row.open_items).toLocaleString()}</td><td>${Number(row.cancelled).toLocaleString()}</td><td>${Number(row.no_show).toLocaleString()}</td></tr>`);
  }

  function renderAudit(rows) {
    table("audit", ["When", "Administrator", "Action", "Entity"], rows, (row) => `<tr data-searchable="${escapeHtml(Object.values(row).join(" ").toLowerCase())}">
      <td>${formatDate(row.created_at, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td><td>${escapeHtml(row.actor_name)}</td>
      <td>${statusBadge(row.action)}</td><td>${escapeHtml(pretty(row.entity_type))}</td></tr>`);
  }

  function applySearch() {
    const table = document.getElementById(`${state.view}Table`);
    if (!table) return;
    const query = state.query.toLowerCase().trim();
    let visible = 0;
    table.querySelectorAll("tbody tr[data-searchable]").forEach((row) => {
      const show = !query || row.dataset.searchable.includes(query);
      row.hidden = !show;
      if (show) visible += 1;
    });
    const count = document.getElementById(`${state.view}Count`);
    if (count && query) count.textContent = `${visible} matching record${visible === 1 ? "" : "s"}`;
    else if (count && state.cache[state.view]) count.textContent = `${state.cache[state.view].length.toLocaleString()} record${state.cache[state.view].length === 1 ? "" : "s"}`;
  }

  async function loadLookups() {
    if (state.lookupsLoaded) return;
    try {
      const response = await request("lookups");
      ["staffDepartment", "serviceDepartment"].forEach((id) => {
        const select = document.getElementById(id);
        response.data.departments.forEach((department) => select.insertAdjacentHTML("beforeend", `<option value="${Number(department.id)}">${escapeHtml(department.name)}</option>`));
      });
      state.lookupsLoaded = true;
    } catch (error) { notify("error", "Could not load departments", error.message); }
  }

  async function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    await loadLookups();
    if (typeof modal.showModal === "function") modal.showModal(); else modal.setAttribute("open", "");
    document.body.classList.add("admin-modal-open");
  }
  function closeModal(modal) {
    if (!modal) return;
    if (typeof modal.close === "function") modal.close(); else modal.removeAttribute("open");
    document.body.classList.remove("admin-modal-open");
  }

  function prepareServiceModal(service = null) {
    const form = document.getElementById("createServiceForm");
    form.reset();
    form.elements.action.value = service ? "update_service" : "create_service";
    form.elements.service_id.value = service ? Number(service.id) : "";
    form.elements.name.value = service?.name || "";
    form.elements.department_id.value = service?.department_id || "";
    form.elements.duration_minutes.value = service?.duration_minutes || 30;
    form.elements.fee.value = service ? Number(service.fee).toFixed(2) : "0.00";
    form.elements.is_active.value = service && !Number(service.is_active) ? "0" : "1";
    form.elements.description.value = service?.description || "";
    document.getElementById("serviceModalTitle").textContent = service ? "Edit clinic service" : "Add clinic service";
    const submit = document.getElementById("serviceSubmitButton");
    submit.innerHTML = `<i data-lucide="${service ? "save" : "plus"}"></i><span>${service ? "Save changes" : "Add service"}</span>`;
    refreshIcons();
  }

  async function confirmAction(title, text, confirmText = "Continue") {
    if (window.Swal && typeof window.Swal.fire === "function") {
      const result = await window.Swal.fire({
        title, text, icon: "warning", showCancelButton: true,
        confirmButtonText: confirmText, cancelButtonText: "Cancel",
        confirmButtonColor: "#c93f4f", reverseButtons: true,
      });
      return result.isConfirmed;
    }
    return window.confirm(`${title}\n\n${text}`);
  }

  document.addEventListener("admin:service-edit-requested", async (event) => {
    const service = (state.cache.services || []).find((row) => Number(row.id) === Number(event.detail.id));
    if (!service) return notify("error", "Service unavailable", "Refresh the service list and try again.");
    await loadLookups();
    prepareServiceModal(service);
    openModal("serviceModal");
  });

  document.addEventListener("admin:service-status-requested", (event) => {
    const service = (state.cache.services || []).find((row) => Number(row.id) === Number(event.detail.id));
    if (!service) return;
    quickMutation({ action: "set_service_status", service_id: service.id, is_active: Number(service.is_active) ? 0 : 1 }, "services");
  });

  document.addEventListener("admin:schedule-status-requested", (event) => {
    const schedule = (state.cache.schedules || []).find((row) => Number(row.id) === Number(event.detail.id));
    if (!schedule) return;
    quickMutation({ action: "set_schedule_status", schedule_id: schedule.id, is_active: Number(schedule.is_active) ? 0 : 1 }, "schedules");
  });

  document.addEventListener("admin:delete-requested", async (event) => {
    const { entity, id } = event.detail;
    const isService = entity === "service";
    const rows = state.cache[isService ? "services" : "schedules"] || [];
    const record = rows.find((row) => Number(row.id) === Number(id));
    if (!record) return;
    const label = isService ? record.name : `${record.staff_name}'s schedule`;
    const allowed = await confirmAction(
      `Delete ${label}?`,
      isService ? "Only unused services can be deleted. Services with assignments or appointment history must be marked unavailable." : "This permanently removes the recurring schedule. Existing appointments are not deleted.",
      "Delete"
    );
    if (!allowed) return;
    quickMutation(isService
      ? { action: "delete_service", service_id: record.id }
      : { action: "delete_schedule", schedule_id: record.id }, isService ? "services" : "schedules");
  });

  document.addEventListener("admin:mutation-requested", async (event) => {
    const { form, reloadView } = event.detail;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    form.querySelectorAll("[data-error-for]").forEach((error) => { error.textContent = ""; error.closest(".admin-field").classList.remove("has-error"); });
    try {
      const body = new FormData(form);
      if (!body.has("csrf_token")) body.append("csrf_token", csrfToken);
      const response = await request(body.get("action"), { method: "POST", body });
      NotificationCenter.publish("admin:mutation-succeeded", { form, view: reloadView, message: response.message });
    } catch (error) {
      Object.entries(error.errors || {}).forEach(([name, message]) => {
        const target = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
        if (target) { target.textContent = message; target.closest(".admin-field").classList.add("has-error"); }
      });
      notify("error", "Update failed", error.message);
    } finally { submit.disabled = false; }
  });

  async function quickMutation(data, reloadView) {
    const body = new FormData();
    Object.entries(data).forEach(([key, value]) => body.append(key, value));
    body.append("csrf_token", csrfToken);
    try {
      const response = await request(data.action, { method: "POST", body });
      NotificationCenter.publish("admin:mutation-succeeded", { view: reloadView, message: response.message });
    } catch (error) {
      notify("error", "Update failed", error.message);
      loadView(reloadView, true);
    }
  }

  function exportCsv(view) {
    const rows = state.cache[view];
    if (!Array.isArray(rows) || !rows.length) return notify("info", "Nothing to export", "Load a view containing records first.");
    const keys = Object.keys(rows[0]);
    const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [keys.map(cell).join(","), ...rows.map((row) => keys.map((key) => cell(row[key])).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `smartcare-${view}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click(); URL.revokeObjectURL(link.href);
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view], [data-view-trigger]");
    if (viewButton) showView(viewButton.dataset.view || viewButton.dataset.viewTrigger);
    if (event.target.closest("[data-sidebar-open]")) app.classList.add("sidebar-open");
    if (event.target.closest("[data-sidebar-close]")) app.classList.remove("sidebar-open");
    const modalButton = event.target.closest("[data-open-modal]");
    if (modalButton) {
      if (modalButton.dataset.openModal === "serviceModal") prepareServiceModal();
      openModal(modalButton.dataset.openModal);
    }
    const closeButton = event.target.closest("[data-close-modal]");
    if (closeButton) closeModal(closeButton.closest("dialog"));
    const exportButton = event.target.closest("[data-export]");
    if (exportButton) exportCsv(exportButton.dataset.export);
    const editServiceButton = event.target.closest("[data-service-edit]");
    if (editServiceButton) emit("admin:service-edit-requested", { id: editServiceButton.dataset.serviceEdit });
    const toggleServiceButton = event.target.closest("[data-service-toggle]");
    if (toggleServiceButton) emit("admin:service-status-requested", { id: toggleServiceButton.dataset.serviceToggle });
    const deleteServiceButton = event.target.closest("[data-service-delete]");
    if (deleteServiceButton) emit("admin:delete-requested", { entity: "service", id: deleteServiceButton.dataset.serviceDelete });
    const toggleScheduleButton = event.target.closest("[data-schedule-toggle]");
    if (toggleScheduleButton) emit("admin:schedule-status-requested", { id: toggleScheduleButton.dataset.scheduleToggle });
    const deleteScheduleButton = event.target.closest("[data-schedule-delete]");
    if (deleteScheduleButton) emit("admin:delete-requested", { entity: "schedule", id: deleteScheduleButton.dataset.scheduleDelete });
    if (event.target.closest("#refreshView")) loadView(state.view, true);
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-user-status], [data-appointment-status]")) {
      [...event.target.classList].filter((name) => name.startsWith("status-")).forEach((name) => event.target.classList.remove(name));
      event.target.classList.add(statusTone(event.target.value));
    }
    if (event.target.matches("[data-user-status]")) quickMutation({ action: "update_user_status", user_id: event.target.dataset.userStatus, status: event.target.value }, state.view);
    if (event.target.matches("[data-appointment-status]")) quickMutation({ action: "update_appointment_status", appointment_id: event.target.dataset.appointmentStatus, status: event.target.value }, "appointments");
  });
  document.querySelectorAll(".admin-modal form, #changePasswordForm").forEach((form) => form.addEventListener("submit", (event) => {
    const reloadView = form.id === "createStaffForm" ? "staff" : (form.id === "changePasswordForm" ? "settings" : "services");
    event.preventDefault(); emit("admin:mutation-requested", { form, reloadView });
  }));
  document.querySelectorAll(".admin-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal); }));
  document.getElementById("adminSearch").addEventListener("input", (event) => { state.query = event.target.value; applySearch(); });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.getElementById("adminSearch").focus(); }
    if (event.key === "Escape") app.classList.remove("sidebar-open");
  });
  document.addEventListener("admin:view-changed", (event) => loadView(event.detail.view));

  document.getElementById("todayLabel").textContent = new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
  refreshIcons();
  loadView("overview", true);
})();
