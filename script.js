const STORAGE_KEY = "admitschoolsystem_v1";
const today = new Date().toISOString().slice(0, 10);
let state = loadState();
let toastTimer;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (error) { console.warn("Could not read saved data", error); }
  return { applicants: [], documents: [], exams: [], fees: [] };
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast("Could not save data in this browser."); }
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function applicantById(id) { return state.applicants.find(person => person.id === id); }
function initials(name = "") { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase(); }
function money(value) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0); }
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message; toast.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function statusClass(status) { return String(status).toLowerCase().replace(/\s+/g, "-"); }
function badge(status) { return `<span class="badge ${statusClass(status)}">${escapeHtml(status)}</span>`; }
function personCell(person) {
  return `<div class="person-cell"><span class="person-avatar">${escapeHtml(initials(person.name))}</span><div><div class="person-name">${escapeHtml(person.name)}</div><div class="person-email">${escapeHtml(person.email)}</div></div></div>`;
}
function emptyRow(cols, text = "No records yet. Add an applicant to get started.") {
  return `<tr><td colspan="${cols}"><div class="empty-state">${escapeHtml(text)}</div></td></tr>`;
}
function applicantOptions(selected = "") {
  return `<option value="">Select applicant</option>` + state.applicants.map(p => `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${escapeHtml(p.name)} (${escapeHtml(p.id)})</option>`).join("");
}
function refreshSelects() {
  ["documentApplicant", "examApplicant", "feeApplicant"].forEach(id => {
    const select = document.getElementById(id); const old = select.value;
    select.innerHTML = applicantOptions(old);
  });
}
function render() {
  const applicants = state.applicants;
  document.getElementById("statTotal").textContent = applicants.length;
  document.getElementById("statReview").textContent = applicants.filter(p => ["Submitted", "Under Review"].includes(p.status)).length;
  document.getElementById("statAdmitted").textContent = applicants.filter(p => p.status === "Admitted").length;
  document.getElementById("statDocs").textContent = applicants.filter(p => !state.documents.some(d => d.applicantId === p.id && d.status === "Verified")).length;
  document.getElementById("recentTable").innerHTML = applicants.length ? [...applicants].slice(-5).reverse().map(p => `<tr><td>${personCell(p)}</td><td>${escapeHtml(p.course)}</td><td>${badge(p.status)}</td></tr>`).join("") : emptyRow(3, "No applications yet. Use Register applicant to add your first record.");
  renderApplications(); renderDocuments(); renderReview(); renderExams(); renderMerit(); renderAdmission(); renderFees(); renderReports(); refreshSelects();
}
function renderApplications() {
  const search = document.getElementById("searchApplications").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const course = document.getElementById("courseFilter").value;
  const rows = state.applicants.filter(p => (!search || `${p.id} ${p.name} ${p.email}`.toLowerCase().includes(search)) && (!status || p.status === status) && (!course || p.course === course));
  document.getElementById("applicationsTable").innerHTML = rows.length ? rows.map(p => `<tr><td><b>${escapeHtml(p.id)}</b><div class="person-email">${escapeHtml(p.date)}</div></td><td>${personCell(p)}</td><td>${escapeHtml(p.course)}</td><td>${p.academic === null ? "—" : `${p.academic}%`}</td><td>${badge(p.status)}</td><td><button class="small-button" data-action="details" data-id="${p.id}">Details</button> <button class="small-button danger" data-action="delete-applicant" data-id="${p.id}">Delete</button></td></tr>`).join("") : emptyRow(6, "No applications match your search.");
  document.getElementById("applicationCount").textContent = `Showing ${rows.length} of ${state.applicants.length} application(s).`;
}
function renderDocuments() {
  document.getElementById("documentsTable").innerHTML = state.documents.length ? state.documents.map(d => {
    const p = applicantById(d.applicantId);
    return `<tr><td>${escapeHtml(p?.name || "Unknown applicant")}</td><td>${escapeHtml(d.type)}</td><td>${escapeHtml(d.fileName)}</td><td>${badge(d.status)}</td><td>${d.status === "Pending" ? `<button class="small-button" data-action="verify-document" data-id="${d.id}">Mark verified</button>` : ""} <button class="small-button danger" data-action="delete-document" data-id="${d.id}">Delete</button></td></tr>`;
  }).join("") : emptyRow(5, "No documents added yet.");
}
function renderReview() {
  document.getElementById("reviewTable").innerHTML = state.applicants.length ? state.applicants.map(p => `<tr><td>${personCell(p)}</td><td>${escapeHtml(p.course)}</td><td>${p.academic === null ? "—" : `${p.academic}%`}</td><td>${badge(p.status)}</td><td><select class="inline-select" aria-label="Status for ${escapeHtml(p.name)}" data-action="change-status" data-id="${p.id}">${["Submitted", "Under Review", "Shortlisted", "Merit List", "Admitted", "Rejected"].map(s => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select> <button class="small-button" data-action="feedback" data-id="${p.id}">Feedback</button></td></tr>`).join("") : emptyRow(5);
}
function renderExams() {
  document.getElementById("examsTable").innerHTML = state.exams.length ? state.exams.map(e => `<tr><td>${escapeHtml(applicantById(e.applicantId)?.name || "Unknown applicant")}</td><td>${escapeHtml(e.subject)}</td><td><b>${e.score}%</b></td><td>${escapeHtml(e.date)}</td><td><button class="small-button danger" data-action="delete-exam" data-id="${e.id}">Delete</button></td></tr>`).join("") : emptyRow(5, "No entrance exam scores recorded yet.");
}
function scoresFor(p) { return state.exams.filter(e => e.applicantId === p.id).map(e => Number(e.score)); }
function meritScore(p) {
  const academic = Number(p.academic) || 0; const exams = scoresFor(p);
  return exams.length ? (academic + exams.reduce((a, b) => a + b, 0) / exams.length) / 2 : academic;
}
function renderMerit() {
  const sorted = [...state.applicants].sort((a, b) => meritScore(b) - meritScore(a));
  document.getElementById("meritTable").innerHTML = sorted.length ? sorted.map((p, i) => {
    const exams = scoresFor(p); const avg = exams.length ? exams.reduce((a, b) => a + b, 0) / exams.length : null;
    return `<tr><td><b>#${i + 1}</b></td><td>${personCell(p)}</td><td>${escapeHtml(p.course)}</td><td>${p.academic === null ? "—" : `${p.academic}%`}</td><td>${avg === null ? "—" : `${avg.toFixed(1)}%`}</td><td><b>${meritScore(p).toFixed(1)}%</b></td><td>${badge(p.status)}</td></tr>`;
  }).join("") : emptyRow(7, "Register applicants and add scores to build a merit list.");
}
function renderAdmission() {
  document.getElementById("admissionTable").innerHTML = state.applicants.length ? state.applicants.map(p => `<tr><td>${personCell(p)}</td><td>${escapeHtml(p.course)}</td><td>${badge(p.status)}</td><td>${p.status === "Admitted" ? `<button class="small-button" data-action="print-letter" data-id="${p.id}">Print letter</button>` : `<button class="small-button" data-action="confirm-admission" data-id="${p.id}">Confirm admission</button>`}</td></tr>`).join("") : emptyRow(4);
}
function renderFees() {
  document.getElementById("feesTable").innerHTML = state.fees.length ? state.fees.map(f => `<tr><td>${escapeHtml(applicantById(f.applicantId)?.name || "Unknown applicant")}</td><td>${escapeHtml(f.type)}</td><td>${money(f.amount)}</td><td>${badge(f.status)}</td><td><button class="small-button danger" data-action="delete-fee" data-id="${f.id}">Delete</button></td></tr>`).join("") : emptyRow(5, "No fee records yet.");
}
function renderReports() {
  document.getElementById("reportTotal").textContent = state.applicants.length;
  document.getElementById("reportShortlisted").textContent = state.applicants.filter(p => ["Shortlisted", "Merit List"].includes(p.status)).length;
  document.getElementById("reportRejected").textContent = state.applicants.filter(p => p.status === "Rejected").length;
  document.getElementById("reportAdmitted").textContent = state.applicants.filter(p => p.status === "Admitted").length;
}
function goToSection(id) {
  const section = document.getElementById(id); if (!section) return;
  document.querySelectorAll(".page-section").forEach(s => s.classList.toggle("active", s.id === id));
  document.querySelectorAll(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.section === id));
  const link = document.querySelector(`.nav-link[data-section="${id}"]`);
  document.getElementById("pageTitle").textContent = link ? link.querySelector("span").textContent : "Dashboard";
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.addEventListener("click", event => {
  const go = event.target.closest("[data-go], .nav-link");
  if (go) {
    const id = go.dataset.go || go.dataset.section;
    if (id) { event.preventDefault(); history.replaceState(null, "", `#${id}`); goToSection(id); }
  }
});
document.getElementById("menuButton").addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));
document.getElementById("searchApplications").addEventListener("input", renderApplications);
document.getElementById("statusFilter").addEventListener("change", renderApplications);
document.getElementById("courseFilter").addEventListener("change", renderApplications);

document.getElementById("registrationForm").addEventListener("submit", event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  const academicRaw = data.get("academic");
  const academic = academicRaw === "" ? null : Number(academicRaw);
  const applicant = {
    id: `APP-${String(Date.now()).slice(-7)}`, name: data.get("name").trim(), email: data.get("email").trim(),
    phone: data.get("phone").trim(), dob: data.get("dob"), gender: data.get("gender"), parent: data.get("parent").trim(),
    parentPhone: data.get("parentPhone").trim(), course: data.get("course"), academic, address: data.get("address").trim(),
    status: "Submitted", date: today, feedback: ""
  };
  state.applicants.push(applicant); saveState(); form.reset(); render(); showToast(`Applicant ${applicant.id} saved successfully.`); goToSection("applications");
});
document.getElementById("documentForm").addEventListener("submit", event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const file = data.get("file");
  if (!file || !file.name) return;
  state.documents.push({ id: `DOC-${Date.now()}`, applicantId: data.get("applicantId"), type: data.get("type"), fileName: file.name, status: "Pending" });
  saveState(); form.reset(); render(); showToast("Document record added. The actual file stays on your device.");
});
document.getElementById("examForm").addEventListener("submit", event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  state.exams.push({ id: `EX-${Date.now()}`, applicantId: data.get("applicantId"), subject: data.get("subject").trim(), score: Number(data.get("score")), date: data.get("date") });
  saveState(); form.reset(); render(); showToast("Entrance exam score saved.");
});
document.getElementById("feeForm").addEventListener("submit", event => {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
  state.fees.push({ id: `FEE-${Date.now()}`, applicantId: data.get("applicantId"), type: data.get("type"), amount: Number(data.get("amount")), status: data.get("status") });
  saveState(); form.reset(); render(); showToast("Fee record saved. No real payment was processed.");
});
document.getElementById("generateMerit").addEventListener("click", () => { renderMerit(); showToast("Merit list recalculated using available scores."); });
document.getElementById("exportCsv").addEventListener("click", () => {
  if (!state.applicants.length) { showToast("Add applicants before exporting a report."); return; }
  const headers = ["Application ID", "Name", "Email", "Phone", "Course", "Academic Score", "Status", "Application Date", "Feedback"];
  const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...state.applicants.map(p => [p.id, p.name, p.email, p.phone, p.course, p.academic ?? "", p.status, p.date, p.feedback])].map(row => row.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a"); link.href = url; link.download = "admitschool-applications.csv"; link.click(); URL.revokeObjectURL(url); showToast("CSV report exported.");
});
document.addEventListener("change", event => {
  const el = event.target;
  if (el.dataset.action === "change-status") {
    const p = applicantById(el.dataset.id); if (p) { p.status = el.value; saveState(); render(); showToast("Application status updated."); }
  }
});
document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]"); if (!button || button.tagName === "SELECT") return;
  const id = button.dataset.id; const action = button.dataset.action;
  if (action === "details") {
    const p = applicantById(id); if (!p) return;
    alert(`Application: ${p.id}\nName: ${p.name}\nEmail: ${p.email}\nPhone: ${p.phone}\nParent/guardian: ${p.parent}\nCourse: ${p.course}\nAcademic score: ${p.academic ?? "Not entered"}\nStatus: ${p.status}\nFeedback: ${p.feedback || "No feedback yet"}`);
  } else if (action === "delete-applicant") {
    const p = applicantById(id); if (p && confirm(`Delete ${p.name} and related demo records?`)) {
      state.applicants = state.applicants.filter(x => x.id !== id); state.documents = state.documents.filter(x => x.applicantId !== id); state.exams = state.exams.filter(x => x.applicantId !== id); state.fees = state.fees.filter(x => x.applicantId !== id); saveState(); render(); showToast("Applicant and related records deleted.");
    }
  } else if (action === "verify-document") {
    const d = state.documents.find(x => x.id === id); if (d) { d.status = "Verified"; saveState(); render(); showToast("Document marked as verified."); }
  } else if (action === "delete-document") {
    state.documents = state.documents.filter(x => x.id !== id); saveState(); render(); showToast("Document record deleted.");
  } else if (action === "delete-exam") {
    state.exams = state.exams.filter(x => x.id !== id); saveState(); render(); showToast("Exam score deleted.");
  } else if (action === "delete-fee") {
    state.fees = state.fees.filter(x => x.id !== id); saveState(); render(); showToast("Fee record deleted.");
  } else if (action === "feedback") {
    const p = applicantById(id); if (!p) return; const feedback = prompt("Enter review feedback:", p.feedback || "");
    if (feedback !== null) { p.feedback = feedback.trim(); if (p.status === "Submitted") p.status = "Under Review"; saveState(); render(); showToast("Review feedback saved."); }
  } else if (action === "confirm-admission") {
    const p = applicantById(id); if (p && confirm(`Confirm admission for ${p.name}?`)) { p.status = "Admitted"; saveState(); render(); showToast("Admission confirmed."); }
  } else if (action === "print-letter") {
    const p = applicantById(id); if (!p) return;
    const win = window.open("", "_blank", "width=700,height=800");
    if (!win) { showToast("Allow pop-ups to print the admission letter."); return; }
    win.document.write(`<!doctype html><html><head><title>Admission Letter</title><style>body{font-family:Arial,sans-serif;max-width:680px;margin:50px auto;line-height:1.7;color:#24213a}header{text-align:center;border-bottom:2px solid #7651d5;padding-bottom:18px}h1{color:#7651d5}footer{margin-top:60px}</style></head><body><header><h1>AdmitSchool</h1><p>ADMISSION CONFIRMATION LETTER</p></header><p>Date: ${escapeHtml(today)}</p><p>Application ID: ${escapeHtml(p.id)}</p><p>Dear ${escapeHtml(p.parent || "Parent/Guardian)},</p><p>We are pleased to confirm the admission of <b>${escapeHtml(p.name)}</b> to <b>${escapeHtml(p.course)}</b> for the academic year 2026–2027.</p><p>Please retain this letter for your records. This is a demonstration letter generated by the AdmitSchool project.</p><footer>Admissions Office<br>AdmitSchool</footer><script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  }
});
if (location.hash && document.querySelector(location.hash + ".page-section")) goToSection(location.hash.slice(1));
render();
