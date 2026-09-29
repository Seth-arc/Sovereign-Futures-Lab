import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const participantSource = read("./ParticipantApp.tsx");
const facilitatorSource = read("./FacilitatorApp.tsx");
const referenceExperienceSource = read("./ReferenceExperience.tsx");
const themeButtonSource = read("./ThemeButton.tsx");
const styles = read("./styles.css");
const landingSource = read("../index.html");
const aboutSource = read("../about.html");
const workshopEntry = read("../workshop/index.html");
const facilitatorEntry = read("../facilitator/index.html");
const vercelConfig = read("../vercel.json");
const participantReference = read("../docs/interface-references/kuvera_debt_management_office.html");
const runtimeParticipantReference = read("../public/kuvera_debt_management_office.html");
const aidDataFavicon = '/assets/AidData%20Brandmark.png';

describe("reference interface fidelity", () => {
  it("pins the reference palette and shell geometry", () => {
    expect(styles).toContain("--bg: #0c0f0e");
    expect(styles).toContain("--recorded: #a9c6b7");
    expect(styles).toContain("--attention: #c9a468");
    expect(styles).toContain("grid-template-columns: 268px minmax(0, 1fr)");
    expect(styles).toContain("grid-template-columns: 220px minmax(0, 1fr)");
  });

  it("uses the exact reference branding and role imagery", () => {
    expect(participantSource).toContain('/assets/AidData Brandmark.png');
    expect(runtimeParticipantReference).toContain('src="assets/national flag.jpg"');
    expect(participantSource).toContain('/img/Amara Okoye.jpg');
    expect(participantSource).toContain('/img/Daniel Mensah.jpg');
    expect(facilitatorSource).toContain("Sovereign · Facilitator");
    expect(facilitatorSource).toContain('className="brand-mark">FC</div>');
    expect(facilitatorSource).toContain("Live overview");
    expect(facilitatorSource).toContain("Replay &amp; debrief");
  });

  it("uses the AidData brandmark as the site icon on every deployable page", () => {
    for (const page of [landingSource, aboutSource, workshopEntry, facilitatorEntry, runtimeParticipantReference]) {
      expect(page).toContain(`rel="icon"`);
      expect(page).toContain(`href="${aidDataFavicon}"`);
      expect(page).toContain(`rel="apple-touch-icon"`);
    }
  });

  it("preserves the reference landing motion and integrated About experience", () => {
    expect(landingSource).toContain('id="topography-canvas"');
    expect(landingSource).toContain('id="about-overlay"');
    expect(landingSource.match(/data-about-slide=/g)).toHaveLength(6);
    expect(landingSource).toContain("requestAnimationFrame(drawTopography)");
    expect(aboutSource.match(/data-slide=/g)).toHaveLength(6);
    expect(aboutSource).toContain('href="index.html"');
  });

  it("uses one participant identity and consent gate without putting PII in the URL", () => {
    const modalStyles = landingSource.match(/\.login-modal\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    const overlayStyles = landingSource.match(/\.login-overlay\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(landingSource).toContain('id="participant-name"');
    expect(landingSource).toContain('id="organization"');
    expect(landingSource).toContain('id="email"');
    expect(landingSource).toContain('id="privacy-consent"');
    expect(landingSource).toContain("sessionStorage.setItem('futureslab-entry-handoff-v1'");
    expect(landingSource).toContain("window.location.href = 'workshop/'");
    expect(landingSource).not.toContain("workshop/?participant=");
    expect(participantSource).toContain('sessionStorage.removeItem(ENTRY_HANDOFF_KEY)');
    expect(participantSource).toContain("function WorkshopEntryState");
    expect(participantSource).not.toContain("function JoinScreen");
    expect(participantSource).not.toContain("new URLSearchParams(window.location.search)");
    expect(modalStyles).not.toContain("overflow-y");
    expect(overlayStyles).toContain("overflow-y: auto");
  });

  it("authorizes the current inline landing script without allowing arbitrary inline scripts", () => {
    const scripts = Array.from(landingSource.matchAll(/<script>([\s\S]*?)<\/script>/g));
    const entryScript = scripts[0][1].replace(/\r\n/g, "\n");
    const hash = createHash("sha256").update(entryScript, "utf8").digest("base64");
    expect(vercelConfig).toContain(`'sha256-${hash}'`);
    expect(vercelConfig).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it("restores the exact orientation, learning bridge, and complete case file", () => {
    expect(runtimeParticipantReference).toBe(participantReference);
    expect(runtimeParticipantReference).toContain('id="onboardingModal"');
    expect(runtimeParticipantReference).toContain('id="learningBridge"');
    expect(runtimeParticipantReference).toContain('id="referenceOverlay"');
    expect(runtimeParticipantReference.match(/data-ref-section=/g)).toHaveLength(6);
    expect(runtimeParticipantReference).toContain("Country Profile");
    expect(runtimeParticipantReference).toContain("Macro Indicators");
    expect(runtimeParticipantReference).toContain("Creditor Landscape");
    expect(runtimeParticipantReference).toContain("Contracts & Escrow");
    expect(runtimeParticipantReference).toContain("Common Framework");
    expect(runtimeParticipantReference).toContain("Evidence Basis");
    expect(participantSource).toContain('setReferenceSurface("orientation")');
    expect(participantSource).toContain('setReferenceSurface("bridge")');
    expect(participantSource).toContain('setReferenceSurface("case-file")');
    for (const script of runtimeParticipantReference.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = createHash("sha256").update(script[1].replace(/\r\n/g, "\n"), "utf8").digest("base64");
      expect(vercelConfig).toContain(`'sha256-${hash}'`);
    }
  });

  it("keeps the embedded Case File to one accessible scroll region", () => {
    expect(referenceExperienceSource).toContain('caseFile.style.setProperty("overflow", "hidden", "important")');
    expect(referenceExperienceSource).toContain('caseBody.style.setProperty("overflow", "auto", "important")');
    expect(referenceExperienceSource).toContain("const scaledViewport = 100 / panelZoom");
    expect(referenceExperienceSource).toContain("caseBody.tabIndex = 0");
    expect(referenceExperienceSource).toContain('caseBody.setAttribute("role", "region")');
  });

  it("uses one live process rail beneath the Orientation overlay", () => {
    expect(participantSource).toContain('className="shell"');
    expect(participantSource).toContain('className="process"');
    expect(participantSource).not.toContain('className="sideguide"');
    expect(participantSource).toContain('className="orientation-tools"');
    expect(participantSource).toContain('id="masterClock"');
    expect(participantSource).toContain('id="openCommunications"');
    expect(participantSource).toContain('id="openReference"');
    expect(participantSource).toContain('className="role-lens"');
    expect(referenceExperienceSource).toContain("function alignOrientationCopy");
    expect(referenceExperienceSource).toContain('body>.app{visibility:hidden!important;pointer-events:none!important}');
    expect(styles).toContain("grid-template-columns: 268px minmax(0, 1fr)");
    expect(styles).toContain(".reference-experience-orientation iframe { background: transparent; }");
    expect(styles).toContain("width: 80%; padding: 38px clamp(24px, 4vw, 54px) 56px; zoom: 1.25");
  });

  it("uses the participant navigation menu for glossary, theme, and exit", () => {
    expect(participantSource).toContain('<div className="brand-copy"><strong>Sovereign</strong></div>');
    expect(participantSource).not.toContain('<span>Role · Debt Management Office</span>');
    expect(participantSource).toContain('id="participantMenuButton"');
    expect(participantSource).toContain('id="participantMenu" hidden={!menuOpen}');
    expect(participantSource).toContain(">Glossary</button>");
    expect(participantSource).toContain('<ThemeButton variant="menu"');
    expect(participantSource).toContain(">Exit</button>");
    expect(participantSource).toContain("function GlossaryDialog");
    expect(participantSource).toContain('role="dialog" aria-modal="true" aria-labelledby="glossary-title"');
    expect(participantSource).toContain('window.location.assign("/")');
    expect(themeButtonSource).toContain('variant === "menu" ? "menu-item" : "theme-button"');
    expect(styles).toContain(".participant-reference .topbar .brand-copy strong { font-size: 1.2rem");
  });

  it("opens Communications as a dialog without changing the process stage", () => {
    const communicationsStart = participantSource.indexOf('id="openCommunications"');
    const communicationsEnd = participantSource.indexOf("</button>", communicationsStart);
    const communicationsControl = participantSource.slice(communicationsStart, communicationsEnd);
    expect(communicationsControl).toContain("setCommunicationsOpen(true)");
    expect(communicationsControl).not.toContain("setStage(");
    expect(participantSource).toContain("function CommunicationsPanel");
    expect(participantSource).toContain('role="dialog" aria-modal="true" aria-labelledby="communications-title"');
    expect(participantSource).toContain('className="communications-sidebar"');
    expect(participantSource).toContain('className="communications-thread-wrap"');
    expect(participantSource).toContain('className="communications-context"');
    expect(participantSource).toContain("<InstitutionalRequestDesk bundle={bundle}");
    expect(participantSource).toContain("No exceptional institutional requests have been sent.");
    expect(styles).toContain(".communications-dialog");
    expect(styles).toContain("width: 66.666667vw; height: 66.666667vh; height: 66.666667dvh");
    expect(styles).toContain("zoom: 1.5");
    expect(styles).toContain("grid-template-columns: 245px minmax(0, 1fr) 260px");
  });

  it("opens AI advisors as a full-page workspace with both supplied briefs and welcomes", () => {
    expect(participantSource).toContain("const ADVISOR_PROFILES");
    expect(participantSource).toContain("Welcome. I’m Amara, your Kuvera country and Common Framework advisor.");
    expect(participantSource).toContain("Welcome. I’m Daniel Mensah, your contracts, escrow, financing assurances, and comparability advisor.");
    expect(participantSource).toContain('className="advisor-briefs"');
    expect(participantSource).toContain('className="advisor-chat"');
    expect(participantSource).toContain('className="advisor-selector"');
    expect(participantSource).toContain('<small>{profile.bio}</small><span>{profile.role}</span>');
    expect(participantSource).toContain('<details className="advisor-welcome-message"><summary>Read welcome transcript</summary>');
    expect(participantSource).toContain('role="dialog" aria-modal="true" aria-labelledby="advisor-title"');
    expect(participantSource).not.toContain('className="advisor-drawer"');
    expect(participantSource).not.toContain("Participant-visible support");
    expect(participantSource).not.toContain("Choose one advisor. The selected brief stays beside the conversation without crowding the workspace.");
    expect(participantSource).not.toContain("{profile.name} is ready.");
    expect(participantSource).not.toContain("Ask for an explanation of visible evidence, decision criteria, or process. The advisor cannot select your recommendation or reveal hidden state.");
    expect(participantSource).not.toContain("Grounded in visible case evidence");
    expect(styles).toContain(".advisor-workspace { width: 66.666667vw; height: 66.666667vh; height: 66.666667dvh");
    expect(styles).toContain("background: var(--bg); zoom: 1.5");
    expect(styles).toContain(".advisor-briefs { min-height: 0; overflow: hidden");
    expect(styles).toContain("grid-template-columns: minmax(360px, 430px) minmax(0, 1fr)");
  });

  it("keeps workshop and facilitator as dedicated React entry points", () => {
    expect(workshopEntry).toContain('src="/src/main.tsx"');
    expect(facilitatorEntry).toContain('src="/src/main.tsx"');
  });

  it('matches the advisor action controls to the reference-tool button dimensions', () => {
    expect(styles).toContain('.advisor-workspace-head .secondary-button, .advisor-compose .voice-button, .advisor-compose .primary-button { min-height: 36px; padding: 9px 12px; font-size: .64rem; letter-spacing: .08em; text-transform: uppercase; }');
  });

  it('guards the asynchronous exit save against an unavailable participant bundle', () => {
    expect(participantSource).toMatch(/async function exitWorkshop\(\) \{\r?\n\s+if \(!bundle \|\| !decisions\) return;/);
  });
});
