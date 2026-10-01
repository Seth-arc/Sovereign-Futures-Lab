import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { FACILITATOR_STAGE_GUIDES, STAGES } from "./scenario";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const participantSource = read("./ParticipantApp.tsx");
const advisorFunctionSource = read("../supabase/functions/advisor-chat/index.ts");
const dataSource = read("./data.ts");
const reportSource = read("./report.ts");
const typesSource = read("./types.ts");
const facilitatorSource = read("./FacilitatorApp.tsx");
const referenceExperienceSource = read("./ReferenceExperience.tsx");
const scenarioSource = read("./scenario.ts");
const themeButtonSource = read("./ThemeButton.tsx");
const styles = read("./styles.css");
const landingSource = read("../index.html");
const aboutSource = read("../about.html");
const workshopEntry = read("../workshop/index.html");
const facilitatorEntry = read("../facilitator/index.html");
const productContract = read("../docs/PRODUCT_CONTRACT.md");
const privacyNotice = read("../docs/PRIVACY_NOTICE.md");
const vercelConfig = read("../vercel.json");
const participantReference = read("../docs/interface-references/kuvera_debt_management_office.html");
const runtimeParticipantReference = read("../public/kuvera_debt_management_office.html");
const aidDataFavicon = '/assets/AidData%20Brandmark.png';

describe("reference interface fidelity", () => {
  it("pins the reference palette and shell geometry", () => {
    expect(styles).toContain("--bg: #0c0f0e");
    expect(styles).toContain("--recorded: #a9c6b7");
    expect(styles).toContain("--attention: #c9a468");
    expect(styles).toContain("--process-rail-width: 268px");
    expect(styles).toContain("grid-template-columns: var(--process-rail-width) minmax(0, 1fr)");
    expect(styles).toContain("grid-template-columns: 220px minmax(0, 1fr)");
  });

  it("uses a low-glare grey hierarchy for the workshop light theme", () => {
    const lightTheme = styles.match(/:root\[data-theme="light"\]\s*\{([\s\S]*?)\}/)?.[1] ?? "";
    expect(lightTheme).toContain("--bg: #e7e9e6");
    expect(lightTheme).toContain("--shell: rgb(231 233 230 / 96%)");
    expect(lightTheme).toContain("--field: #f1f3f0");
    expect(lightTheme).not.toContain("--field: #fff");
  });

  it("keeps the page width stable while modal scroll locks are active", () => {
    expect(styles).toContain("scrollbar-gutter: stable");
    expect(referenceExperienceSource).toContain('document.body.style.overflow = "hidden"');
    expect(participantSource).toContain('document.body.style.overflow = "hidden"');
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

  it("leads the landing and About experiences with participant value", () => {
    const proposition = /Work through a high-stakes sovereign-finance case,\s+test what the evidence supports, prepare an\s+internal negotiation-preparation brief, and see how your choices shape the outcome\./;
    expect(landingSource).toContain("Futures Lab · Practise decisions that can withstand uncertainty.");
    expect(landingSource).toMatch(proposition);
    expect(aboutSource).toContain("Practise decisions that can withstand uncertainty.");
    expect(aboutSource).toMatch(proposition);
    expect(aboutSource.indexOf("Practise decisions")).toBeLessThan(aboutSource.indexOf("Research Translation and Learning Framework"));
    expect(landingSource).toContain("Decision support:");
    expect(landingSource).toContain("Negotiation preparation:");
    expect(landingSource).toContain("Strategic intelligence:");
    expect(landingSource).toContain("Reflection:");
  });

  it("uses the approved product hierarchy across participant and facilitator surfaces", () => {
    expect(landingSource).toContain("<h1>Sovereign</h1>");
    expect(participantSource).toContain("<small>Futures Lab</small>");
    expect(scenarioSource).toContain('WORKSHOP_TITLE = "A Data-Informed Simulation for African Foresight Practice"');
    expect(scenarioSource).toContain('EXERCISE_TITLE = "Kuvera Financing Assurances"');
    expect(scenarioSource).toContain('ROLE_TITLE = "Debt Management Office"');
    expect(runtimeParticipantReference).toContain("Sovereign · Futures Lab · Kuvera Financing Assurances");
    expect(workshopEntry).toContain("Sovereign · Futures Lab · Participant Workshop");
    expect(facilitatorEntry).toContain("Sovereign · Futures Lab · Facilitator");
  });

  it("removes prototype and developer language from participant-facing copy", () => {
    const participantCopy = [landingSource, aboutSource, participantSource, referenceExperienceSource, runtimeParticipantReference].join("\n").toLowerCase();
    for (const phrase of [
      "internal role partition",
      "authored delay",
      "authored response time",
      "participant-visible",
      "bounded recommendation",
      "deterministic counterfactual",
      "demo calibration",
      "the demo should",
      "the interface must",
      "scenario mechanic used to",
      "prototype behaviour",
      "ai advisor prototype",
    ]) expect(participantCopy).not.toContain(phrase);
    expect(participantSource).not.toMatch(/\bAAR\b/);
    expect(participantSource).toContain("What will you do differently when preparing a real decision under uncertainty?");
    expect(participantSource).toContain("Fixed assumptions:");
    expect(participantSource).toContain("This response takes time to obtain");
    expect(participantSource).toContain("exercise-only assumptions");
  });

  it("introduces specialist terms in plain language before relying on acronyms", () => {
    expect(participantSource).toContain("Debt Management Office (DMO)");
    expect(participantSource).toContain("A financing assurance is a creditor signal");
    expect(referenceExperienceSource).toContain("Official Creditor Committee (OCC)");
    expect(scenarioSource).toContain("effective control—practical limits on Kuvera’s use of cash");
    expect(scenarioSource).toContain("treatment perimeter—the facilities carried into restructuring analysis");
    expect(runtimeParticipantReference).toContain("Comparability of Treatment (CoT) is multi-dimensional");
  });

  it("keeps human-readable provenance ahead of internal identifiers", () => {
    const advisorSources = participantSource.slice(
      participantSource.indexOf("function AdvisorSources"),
      participantSource.indexOf("function AdvisorPanel"),
    );
    expect(advisorSources).toContain(
      '<strong>{advisorSourceText(source?.sourceTitle, "Source title unavailable")}</strong><span>{sourceClassLabel(source?.sourceClass)}</span><span>{advisorSourceText(source?.pageReference, "Page reference unavailable")}</span><span><code>{claimId}</code>',
    );
    expect(runtimeParticipantReference.indexOf("How China Collateralizes")).toBeLessThan(
      runtimeParticipantReference.indexOf("RTL-FA-002"),
    );
  });

  it("preserves privacy and fictional-scenario disclosures", () => {
    expect(landingSource).toMatch(/retained for up\s+to 30 days/);
    expect(landingSource).toContain("Microphone audio is not stored");
    expect(aboutSource).toContain("fictional Republic of Kuvera");
    expect(runtimeParticipantReference).toMatch(/Every example here is\s+invented for practice/);
    expect(privacyNotice).toContain("training delivery, not research or individual performance scoring");
    expect(productContract).toContain("No probabilistic scoring, ranking, or inferred competence");
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
    expect(runtimeParticipantReference.replace(/\r\n/g, "\n")).toBe(participantReference.replace(/\r\n/g, "\n"));
    expect(referenceExperienceSource).not.toContain('sandbox="allow-scripts allow-same-origin"');
    expect(referenceExperienceSource).toContain("fixed, bundled reference document");
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

  it("opens preparation only until the participant has completed it", () => {
    const cloudJoin = participantSource.slice(
      participantSource.indexOf("async function handleJoin"),
      participantSource.indexOf("function handleLocalJoin"),
    );
    const localJoin = participantSource.slice(
      participantSource.indexOf("function handleLocalJoin"),
      participantSource.indexOf("async function persist"),
    );
    expect(cloudJoin).toContain("preparationIsComplete(joined)");
    expect(cloudJoin).toContain('setReferenceSurface(complete ? null : "orientation")');
    expect(localJoin).toContain("preparationIsComplete(joined)");
    expect(localJoin).toContain('setReferenceSurface(complete ? null : "orientation")');
    expect(participantSource).toContain('const PREPARATION_KEY_PREFIX = "futureslab-preparation-v1:"');
  });

  it("chains Orientation to the Learning Bridge and hands completed preparation to Mandate", () => {
    const completionHandler = participantSource.slice(
      participantSource.indexOf("function completePreparationSurface"),
      participantSource.indexOf("async function exitWorkshop"),
    );
    expect(runtimeParticipantReference).toContain('"Continue to Learning Bridge"');
    expect(runtimeParticipantReference).toContain("else openBridge();");
    expect(referenceExperienceSource).toContain('surface === "orientation" && bridge.classList.contains("open")');
    expect(referenceExperienceSource).toContain('bridge.dataset.preparationExit === "complete"');
    expect(completionHandler).toContain('setReferenceSurface("bridge")');
    expect(completionHandler).toContain('localStorage.setItem(preparationKey(bundle.participant.id), "complete")');
    expect(completionHandler).toContain("setStage(0)");
    expect(completionHandler).toContain("setRoleBriefOpen(true)");
    expect(completionHandler).not.toContain("setDecisions");
  });

  it("keeps Skip and Close in an incomplete preparation state without touching decisions", () => {
    const preparationControls = participantSource.slice(
      participantSource.indexOf('<div className="orientation-tools"'),
      participantSource.indexOf('<div className="shell">'),
    );
    const referenceHandlers = runtimeParticipantReference.slice(
      runtimeParticipantReference.indexOf('document.getElementById("onboardingNext")'),
      runtimeParticipantReference.indexOf("/* First-run sequence"),
    );
    expect(runtimeParticipantReference).toContain('id="skipOnboarding" type="button">Skip for now</button>');
    expect(runtimeParticipantReference).toContain('id="skipBridge" type="button">Skip for now</button>');
    expect(referenceHandlers).toContain('closeBridge(false)');
    expect(referenceHandlers).toContain('closeBridge(true)');
    expect(participantSource).toContain("Preparation incomplete · casework waiting");
    expect(preparationControls).not.toContain("setDecisions");
    expect(referenceHandlers).not.toContain("setDecisions");
  });

  it("uses one honest bridge duration and separates preparation, casework, and institutional deadlines", () => {
    expect(runtimeParticipantReference.match(/About 6 minutes/g)).toHaveLength(1);
    expect(runtimeParticipantReference).not.toMatch(/3[–-]4 minutes/i);
    expect(runtimeParticipantReference).not.toMatch(/about six minutes/i);
    expect(participantSource).toContain("Casework · ${formatClock(displayedClock)}");
    expect(participantSource).toContain('? "paused for debrief" : caseworkRunning ? "" : "waiting"');
    expect(referenceExperienceSource).toContain("until the facilitator begins the exercise");
    expect(referenceExperienceSource).toContain("USD 750m maturity in six weeks");
    expect(referenceExperienceSource).toContain("IMF Board horizon in eleven weeks");
    expect(runtimeParticipantReference).toContain("Casework · 20:00 · waiting");
    expect(runtimeParticipantReference).not.toContain('title: "The clock is running"');
    expect(runtimeParticipantReference).not.toContain("It starts the moment you confirm your mandate");
    expect(runtimeParticipantReference).not.toContain("secondsPerWeek");
  });

  it("wires the facilitator debrief transition into the participant subscription", () => {
    expect(facilitatorSource).toContain("beginDebriefSession(selected, new Date())");
    expect(facilitatorSource).toContain("current_stage: transition.currentStage");
    expect(participantSource).toContain("subscribeToWorkshop");
    expect(participantSource).toContain("setStage(participantEntryStage(fresh.session, fresh.participant))");
  });

  it("defines a complete facilitator guide for every participant stage", () => {
    expect(FACILITATOR_STAGE_GUIDES).toHaveLength(STAGES.length);
    FACILITATOR_STAGE_GUIDES.forEach((guide) => {
      expect(guide.learningPurpose.trim()).not.toBe("");
      expect(guide.openingQuestion.trim()).not.toBe("");
      expect(guide.listenFor.length).toBeGreaterThanOrEqual(2);
      expect(guide.listenFor.length).toBeLessThanOrEqual(3);
      expect(guide.listenFor.every((cue) => cue.trim().length > 0)).toBe(true);
      expect(guide.misconception.trim()).not.toBe("");
      expect(guide.unlockCondition.trim()).not.toBe("");
      expect(guide.unlockCondition).not.toMatch(/\b(seconds?|minutes?|elapsed|clock)\b/i);
      expect(guide.debriefConnection.trim()).not.toBe("");
    });
  });

  it("keeps restricted case answers out of guidance before evidence can return", () => {
    const preReturnGuidance = JSON.stringify(FACILITATOR_STAGE_GUIDES.slice(0, 3));
    expect(preReturnGuidance).not.toMatch(/\b(?:480|240|60)\b|shared (?:revenue )?pool|same RA-01|redacted functional summary|headquarters authorization/i);
  });

  it("shows the current guide and describes participant progress without treating a visited stage as complete", () => {
    const progressHelper = facilitatorSource.slice(
      facilitatorSource.indexOf("function participantProgressLabel"),
      facilitatorSource.indexOf("export function FacilitatorApp"),
    );
    expect(facilitatorSource).toContain("FACILITATOR_STAGE_GUIDES[currentStageIndex]");
    expect(facilitatorSource).toContain("currentGuide.learningPurpose");
    expect(facilitatorSource).toContain("currentGuide.openingQuestion");
    expect(facilitatorSource).not.toContain("Current phase");
    expect(progressHelper).toContain('return "Joined"');
    expect(progressHelper).toContain('return "Preparing"');
    expect(progressHelper).toContain("Working in stage");
    expect(progressHelper).toContain("Submitted · version");
    expect(progressHelper).toContain('return "In debrief"');
    expect(progressHelper).not.toMatch(/complete/i);
  });

  it("explains the effect of Begin debrief and presents the non-ranking sequence", () => {
    const beginDebrief = facilitatorSource.slice(
      facilitatorSource.indexOf("async function beginDebrief"),
      facilitatorSource.indexOf("return <div", facilitatorSource.indexOf("async function beginDebrief")),
    );
    expect(beginDebrief).toContain("window.confirm");
    expect(beginDebrief).toContain("close submissions");
    expect(beginDebrief).toContain("pause the casework clock");
    expect(beginDebrief).toContain("open the participant debrief and transfer view");
    expect(facilitatorSource).toContain("Reconstruct the evidence state at the submitted version.");
    expect(facilitatorSource).toContain("Compare decision pathways without scoring or ranking.");
    expect(facilitatorSource).toContain("Run one counterfactual and name the assumptions held fixed.");
    expect(facilitatorSource).toContain("Ask what participants will transfer to real decision preparation.");
  });

  it("restores completed or already-started casework without forcing preparation on refresh", () => {
    const restoration = participantSource.slice(
      participantSource.indexOf("const participantId = localStorage.getItem(PARTICIPANT_KEY)"),
      participantSource.indexOf("if (!entryHandoff", participantSource.indexOf("const participantId = localStorage.getItem(PARTICIPANT_KEY)")),
    );
    expect(restoration).toContain("preparationIsComplete(loaded)");
    expect(restoration).toContain("setPreparationComplete(complete)");
    expect(restoration).not.toContain('setReferenceSurface("orientation")');
    expect(participantSource).toContain("hasCaseworkData(bundle)");
  });

  it("keeps the preparation status and controls inside the process rail", () => {
    expect(styles).toContain("--process-rail-width: 268px; --process-rail-gutter: 18px");
    expect(styles).toContain("width: calc(var(--process-rail-width) - var(--process-rail-gutter) - var(--process-rail-gutter))");
    expect(styles).toContain(".participant-reference.app { --process-rail-width: 230px; }");
    expect(styles).toContain(".participant-reference .preparation-status { min-width: 0; width: 100%");
    expect(styles).toContain("overflow-wrap: anywhere");
    expect(styles).toContain("width: auto; max-width: none");
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
    expect(styles).toContain("grid-template-columns: var(--process-rail-width) minmax(0, 1fr)");
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

  it("gives each advisor a greeting, a distinct written cadence, and accessible progressive replies", () => {
    expect(participantSource).toContain("profile.greeting");
    expect(participantSource).toContain("ADVISOR_RESPONSE_REVEAL_INTERVAL_MS");
    expect(participantSource).toContain('aria-live="off"');
    expect(participantSource).toContain('className="sr-only" aria-live="polite"');
    expect(advisorFunctionSource).toContain("You are calm, warm, and analytically patient.");
    expect(advisorFunctionSource).toContain("You are precise, direct, and quietly reassuring.");
    expect(advisorFunctionSource).toContain("respond with a brief in-character greeting");
    expect(advisorFunctionSource).toContain('GROQ_ADVISOR_TEXT_MODEL") ?? "openai/gpt-oss-120b"');
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

  it('shows expandable structured research sources and sizes the conversation proportionally', () => {
    expect(participantSource).toContain('function AdvisorSources');
    expect(participantSource).toContain('<details className="advisor-sources">');
    expect(participantSource).toContain('source?.claimId');
    expect(participantSource).toContain('source?.sourceId');
    expect(participantSource).toContain('source?.pageReference');
    expect(participantSource).toContain('source?.sourceClass');
    expect(typesSource).toContain('sources: AdvisorCitation[]');
    expect(dataSource).toContain('function mapAdvisorSources');
    expect(reportSource).toContain('source.claimId');
    expect(reportSource).toContain('source.pageReference');
    expect(styles).toContain('.advisor-sources summary');
    expect(styles).not.toContain('.advisor-conversation .citations { display: none; }');
    expect(styles).toContain('.advisor-conversation .question { width: 64%; margin-left: auto;');
    expect(styles).toContain('.advisor-conversation .answer { width: 74%; margin-right: auto;');
    expect(styles).toContain('.advisor-conversation .question, .advisor-conversation .answer { padding: 8px 10px;');
    expect(styles).toContain('.advisor-conversation p { margin: 4px 0 0; white-space: pre-wrap; font-size: .6rem; line-height: 1.45; }');
    expect(referenceExperienceSource).not.toContain('include sources');
  });
});
