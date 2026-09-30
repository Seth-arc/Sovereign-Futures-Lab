import type { AfterActionReport, DecisionState } from "./types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function download(name: string, type: string, content: BlobPart): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filename(report: AfterActionReport, extension: string): string {
  const safe = report.participant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `futureslab-aar-${safe || report.participant.id}.${extension}`;
}

const label = (value: string | undefined) => value?.replaceAll("_", " ").toLowerCase() ?? "Not recorded";

const advisorSourcesText = (turn: AfterActionReport["advisorUsage"][number]) => turn.sources.length
  ? turn.sources.map((source) => `${source.claimId} · ${source.sourceId} · ${source.sourceTitle} · ${source.pageReference} · ${source.sourceClass}`).join("; ")
  : "No external research cited";

export function afterActionReportHtml(report: AfterActionReport, identified = true): string {
  const identity = identified
    ? `<p><strong>${escapeHtml(report.participant.name)}</strong><br>${escapeHtml(report.participant.organization)}<br>${escapeHtml(report.participant.email)}</p>`
    : `<p><strong>Participant ${escapeHtml(report.participant.id.slice(0, 8))}</strong></p>`;
  const decisionRows: Array<[string, string]> = [
    ["Liquidity action", label(report.decisions.liquidityAction)],
    ["Liquidity basis", label(report.decisions.liquidityBasis)],
    ["Account classification", label(report.decisions.accountClassification)],
    ["Facility linkage", label(report.decisions.facilityLinkage)],
    ["Disclosure", label(report.decisions.disclosure)],
    ["Treatment perimeter", label(report.decisions.treatmentPerimeter)],
    ["Readiness", label(report.decisions.readiness)],
  ];
  const timelineRows = report.timeline.map((event) => `<tr><td>${escapeHtml(new Date(event.createdAt).toLocaleTimeString())}</td><td>${escapeHtml(event.type.replaceAll("_", " "))}</td><td><code>${escapeHtml(JSON.stringify(event.detail))}</code></td></tr>`).join("");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Futureslab After-Action Report</title>
<style>
body{font:15px/1.55 Arial,sans-serif;color:#182522;max-width:940px;margin:48px auto;padding:0 32px}header{border-bottom:3px solid #aa6f32;padding-bottom:22px;margin-bottom:30px}.kicker{color:#6b4d2e;text-transform:uppercase;letter-spacing:.12em;font-size:12px}h1{font:700 34px Georgia,serif;margin:.2em 0}h2{font:700 22px Georgia,serif;border-bottom:1px solid #d8d2c6;padding-bottom:8px;margin-top:32px}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;padding:9px;border-bottom:1px solid #e4dfd6}th{background:#f4f1eb}.tag{display:inline-block;padding:3px 7px;background:#e8eee9;margin:2px}li{margin:.5em 0}.meta{color:#596560}code{white-space:pre-wrap;font-size:11px}@media print{body{margin:0;max-width:none}.no-print{display:none}}</style></head>
<body><header><div class="kicker">Sovereign Room · Kuvera Financing Assurances</div><h1>After-Action Report</h1>${identity}<p class="meta">${escapeHtml(report.session.kind)} session · Generated ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p></header>
<section><h2>Executive summary</h2><p>${escapeHtml(report.executiveSummary)}</p></section>
<section><h2>Mandate and authority boundary</h2><p>${escapeHtml(report.decisions.mandateRationale || "Not recorded")}</p></section>
<section><h2>Recorded recommendation</h2><table><tbody>${decisionRows.map(([key,value]) => `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table><p><strong>Final rationale.</strong> ${escapeHtml(report.decisions.finalRationale || "Not recorded")}</p></section>
<section><h2>Information and evidence</h2><h3>Requested</h3><ul>${report.evidenceRequested.map((item) => `<li><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.sourceLabel)}</li>`).join("") || "<li>None</li>"}</ul><h3>Returned evidence not incorporated into the final record</h3><ul>${report.evidenceIgnored.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("") || "<li>None identified by the deterministic comparison.</li>"}</ul><h3>Not requested</h3><ul>${report.evidenceNotRequested.map((item) => `<li>${escapeHtml(item.title)}</li>`).join("") || "<li>None</li>"}</ul></section>
<section><h2>Institutional correspondence</h2>${report.institutionalMessages.map((message) => `<article><p><strong>To ${escapeHtml(label(message.institution))}:</strong> ${escapeHtml(message.question)}</p><p>${message.reply ? `<strong>Reply:</strong> ${escapeHtml(message.reply)}` : "Awaiting facilitator reply at exercise close."}</p><p class="meta">${escapeHtml(message.status)} · sent ${escapeHtml(new Date(message.createdAt).toLocaleString())}${message.answeredAt ? ` · answered ${escapeHtml(new Date(message.answeredAt).toLocaleString())}` : ""}</p></article>`).join("") || "<p>No exceptional institutional requests recorded.</p>"}</section>
<section><h2>Deterministic consequences</h2>${report.consequences.map((item) => `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.outcome)}</p><p class="meta">Basis: ${escapeHtml(item.basis)}</p></article>`).join("")}</section>
<section><h2>Unresolved risks</h2><ul>${report.unresolvedRisks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("") || "<li>No blocking uncertainty recorded in the bounded exercise.</li>"}</ul></section>
<section><h2>Counterfactual pathways</h2>${report.counterfactuals.map((item) => `<article><h3>${escapeHtml(item.alternative)}</h3><p>${escapeHtml(item.projectedDifference)}</p><p class="meta">Held fixed: ${escapeHtml(item.fixedAssumptions)}</p></article>`).join("")}</section>
<section><h2>Submission history and information available</h2><ol>${report.submissions.map((item) => { const available = report.evidenceRequestHistory.filter((request) => (request.releasedAt ? new Date(request.releasedAt) : new Date(request.availableAt)).getTime() <= new Date(item.submittedAt).getTime()).map((request) => report.evidenceRequested.find((definition) => definition.id === request.evidenceId)?.title).filter(Boolean); return `<li><strong>Version ${item.version}</strong>, ${escapeHtml(new Date(item.submittedAt).toLocaleString())} — ${escapeHtml(label(item.decisions.readiness))}<br><span class="meta">Evidence then available: ${escapeHtml(available.join("; ") || "No requested evidence had returned")}</span></li>`; }).join("") || "<li>No recommendation submitted.</li>"}</ol></section>
<section><h2>AI-advisor record</h2>${report.advisorUsage.map((turn) => `<article><p><strong>${escapeHtml(turn.advisorId)}:</strong> ${escapeHtml(turn.question)}</p><p>${escapeHtml(turn.answer)}</p><p class="meta">Sources: ${escapeHtml(advisorSourcesText(turn))} · ${escapeHtml(turn.mode)}</p></article>`).join("") || "<p>No advisor interaction recorded.</p>"}</section>
<section><h2>Facilitator interventions</h2>${report.facilitatorInjects.map((inject) => `<article><p><strong>${escapeHtml(inject.title)}</strong></p><p>${escapeHtml(inject.body)}</p><p class="meta">${escapeHtml(new Date(inject.sentAt).toLocaleString())}</p></article>`).join("") || "<p>No global facilitator inject recorded.</p>"}</section>
<section><h2>Participant reflection</h2><p>${escapeHtml(report.decisions.reflection || "Not recorded")}</p></section>
<section><h2>Decision timeline</h2><table><thead><tr><th>Time</th><th>Event</th><th>Detail</th></tr></thead><tbody>${timelineRows}</tbody></table></section>
<footer><p class="meta">This report describes the recorded decision process in a fictional training scenario. It is not a score, legal advice, financial advice, or evidence of individual competence.</p></footer></body></html>`;
}

export function downloadReportHtml(report: AfterActionReport): void {
  download(filename(report, "html"), "text/html;charset=utf-8", afterActionReportHtml(report));
}

export function downloadReportJson(report: AfterActionReport): void {
  download(filename(report, "json"), "application/json;charset=utf-8", JSON.stringify(report, null, 2));
}

export async function downloadReportPdf(report: AfterActionReport): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = 499;
  let y = 54;
  const add = (text: string, size = 10, gap = 8) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    const height = lines.length * (size + 3);
    if (y + height > 790) { pdf.addPage(); y = 54; }
    pdf.text(lines, margin, y);
    y += height + gap;
  };
  add("SOVEREIGN ROOM · KUVERA FINANCING ASSURANCES", 9, 10);
  add("After-Action Report", 22, 12);
  add(`${report.participant.name} · ${report.participant.organization} · ${report.participant.email}`, 10, 18);
  add("Executive summary", 15, 6);
  add(report.executiveSummary, 10, 14);
  add("Mandate and authority boundary", 15, 6);
  add(report.decisions.mandateRationale || "Not recorded", 10, 14);
  add("Recorded recommendation", 15, 6);
  add(`Readiness: ${label(report.decisions.readiness)}\nLiquidity: ${label(report.decisions.liquidityBasis)}\nAccount: ${label(report.decisions.accountClassification)}\nFacility linkage: ${label(report.decisions.facilityLinkage)}\nDisclosure: ${label(report.decisions.disclosure)}\nTreatment perimeter: ${label(report.decisions.treatmentPerimeter)}\nRationale: ${report.decisions.finalRationale || "Not recorded"}`, 10, 14);
  add("Evidence requested and not incorporated", 15, 6);
  add(`Requested: ${report.evidenceRequested.map((item) => item.title).join("; ") || "None"}\nReturned but not incorporated: ${report.evidenceIgnored.map((item) => item.title).join("; ") || "None identified"}\nNot requested: ${report.evidenceNotRequested.map((item) => item.title).join("; ") || "None"}`, 10, 14);
  add("Institutional correspondence", 15, 6);
  add(report.institutionalMessages.length ? report.institutionalMessages.map((message) => `${label(message.institution)} — ${message.question}\n${message.reply ? `Reply: ${message.reply}` : "Awaiting reply at exercise close."}`).join("\n\n") : "No exceptional institutional requests recorded.", 10, 14);
  add("Deterministic consequences", 15, 6);
  report.consequences.forEach((item) => add(`${item.title}\n${item.outcome}\nBasis: ${item.basis}`, 10, 9));
  add("Unresolved risks", 15, 6);
  add(report.unresolvedRisks.length ? report.unresolvedRisks.map((item) => `• ${item}`).join("\n") : "No blocking uncertainty recorded in the bounded exercise.", 10, 14);
  add("Counterfactual pathways", 15, 6);
  report.counterfactuals.forEach((item) => add(`${item.alternative}\n${item.projectedDifference}\nHeld fixed: ${item.fixedAssumptions}`, 10, 9));
  add("Submission history", 15, 6);
  add(report.submissions.length ? report.submissions.map((item) => `Version ${item.version} · ${new Date(item.submittedAt).toLocaleString()} · ${label(item.decisions.readiness)}`).join("\n") : "No recommendation submitted.", 10, 14);
  add("AI-advisor usage and citations", 15, 6);
  add(report.advisorUsage.length ? report.advisorUsage.map((turn) => `${turn.advisorId}: ${turn.question}\n${turn.answer}\nSources: ${advisorSourcesText(turn)} · ${turn.mode}`).join("\n\n") : "No advisor interaction recorded.", 10, 14);
  add("Facilitator interventions", 15, 6);
  add(report.facilitatorInjects.length ? report.facilitatorInjects.map((inject) => `${inject.title}: ${inject.body}`).join("\n") : "No global facilitator inject recorded.", 10, 14);
  add("Participant reflection", 15, 6);
  add(report.decisions.reflection || "Not recorded", 10, 16);
  add("This report is a process reconstruction for a fictional training scenario, not a score or evidence of individual competence.", 8, 0);
  pdf.save(filename(report, "pdf"));
}

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadWorkshopCsv(reports: AfterActionReport[]): void {
  const headings = ["participant_id", "name", "organization", "email", "readiness", "liquidity_basis", "account_classification", "facility_linkage", "disclosure", "treatment_perimeter", "evidence_requested", "submission_versions", "unresolved_risks"];
  const rows = reports.map((report) => [
    report.participant.id,
    report.participant.name,
    report.participant.organization,
    report.participant.email,
    report.decisions.readiness,
    report.decisions.liquidityBasis,
    report.decisions.accountClassification,
    report.decisions.facilityLinkage,
    report.decisions.disclosure,
    report.decisions.treatmentPerimeter,
    report.evidenceRequested.length,
    report.submissions.length,
    report.unresolvedRisks.join(" | "),
  ]);
  download("futureslab-workshop-export.csv", "text/csv;charset=utf-8", [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"));
}

export function downloadWorkshopJson(reports: AfterActionReport[]): void {
  download("futureslab-workshop-export.json", "application/json;charset=utf-8", JSON.stringify({ exportedAt: new Date().toISOString(), reports }, null, 2));
}

export async function downloadWorkshopPdf(reports: AfterActionReport[], anonymous: boolean): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const width = 499;
  let y = 54;
  const add = (text: string, size = 10, gap = 8) => {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, width) as string[];
    const height = lines.length * (size + 3);
    if (y + height > 790) { pdf.addPage(); y = 54; }
    pdf.text(lines, margin, y);
    y += height + gap;
  };
  add("SOVEREIGN ROOM · KUVERA FINANCING ASSURANCES", 9, 10);
  add("Workshop comparison", 22, 8);
  add(`${reports.length} individual decision records. Pathways are compared without scores or rankings.`, 10, 16);
  const pathCounts = new Map<string, number>();
  reports.forEach((report) => pathCounts.set(decisionPathKey(report.decisions), (pathCounts.get(decisionPathKey(report.decisions)) ?? 0) + 1));
  add("Decision pathways", 15, 7);
  [...pathCounts].forEach(([path, count]) => add(`${count} participant${count === 1 ? "" : "s"}: ${path}`, 10, 7));
  add("Participant records", 15, 7);
  reports.forEach((report, index) => {
    const name = anonymous ? `Participant ${index + 1}` : `${report.participant.name} · ${report.participant.organization}`;
    add(`${name}\nReadiness: ${label(report.decisions.readiness)} · Liquidity: ${label(report.decisions.liquidityBasis)} · Disclosure: ${label(report.decisions.disclosure)} · Evidence requests: ${report.evidenceRequested.length} · Open risks: ${report.unresolvedRisks.length}`, 10, 9);
  });
  add("This comparison describes recorded process in a fictional training scenario. It is not a ranking or evidence of individual competence.", 8, 0);
  pdf.save("futureslab-workshop-comparison.pdf");
}

export function decisionPathKey(decisions: DecisionState): string {
  return [decisions.liquidityAction, decisions.liquidityBasis, decisions.facilityLinkage, decisions.disclosure, decisions.readiness].map((value) => value ?? "UNRECORDED").join(" · ");
}

export function workshopComparisonHtml(reports: AfterActionReport[], anonymous: boolean): string {
  const paths = new Map<string, number>();
  reports.forEach((report) => paths.set(decisionPathKey(report.decisions), (paths.get(decisionPathKey(report.decisions)) ?? 0) + 1));
  const table = reports.map((report, index) => `<tr><td>${anonymous ? `Participant ${index + 1}` : escapeHtml(report.participant.name)}</td><td>${escapeHtml(label(report.decisions.readiness))}</td><td>${escapeHtml(label(report.decisions.liquidityBasis))}</td><td>${escapeHtml(label(report.decisions.disclosure))}</td><td>${report.evidenceRequested.length}</td><td>${report.unresolvedRisks.length}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Futureslab Workshop Comparison</title><style>body{font:15px/1.5 Arial,sans-serif;color:#182522;max-width:1100px;margin:40px auto;padding:0 28px}h1,h2{font-family:Georgia,serif}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#f1eee7}.path{padding:10px;border-left:3px solid #aa6f32;margin:8px 0}.meta{color:#60706a}</style></head><body><p class="meta">Sovereign Room · Kuvera Financing Assurances</p><h1>Workshop comparison</h1><p>${reports.length} individual decision records. This comparison describes pathways and evidence use; it does not rank participants.</p><h2>Decision pathways</h2>${[...paths].map(([path,count]) => `<div class="path"><strong>${count} participant${count === 1 ? "" : "s"}</strong><br>${escapeHtml(path)}</div>`).join("")}<h2>Participant records</h2><table><thead><tr><th>Participant</th><th>Readiness</th><th>Liquidity</th><th>Disclosure</th><th>Evidence requests</th><th>Open risks</th></tr></thead><tbody>${table}</tbody></table></body></html>`;
}

export function downloadWorkshopHtml(reports: AfterActionReport[], anonymous: boolean): void {
  download("futureslab-workshop-comparison.html", "text/html;charset=utf-8", workshopComparisonHtml(reports, anonymous));
}
