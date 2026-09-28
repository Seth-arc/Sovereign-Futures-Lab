import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const participantSource = read("./ParticipantApp.tsx");
const facilitatorSource = read("./FacilitatorApp.tsx");
const styles = read("./styles.css");
const landingSource = read("../index.html");
const aboutSource = read("../about.html");
const workshopEntry = read("../workshop/index.html");
const facilitatorEntry = read("../facilitator/index.html");
const vercelConfig = read("../vercel.json");

describe("reference interface fidelity", () => {
  it("pins the reference palette and shell geometry", () => {
    expect(styles).toContain("--bg: #0c0f0e");
    expect(styles).toContain("--recorded: #a9c6b7");
    expect(styles).toContain("--attention: #c9a468");
    expect(styles).toContain("grid-template-columns: 270px minmax(500px, 1fr) 300px");
    expect(styles).toContain("grid-template-columns: 220px minmax(0, 1fr)");
  });

  it("uses the exact reference branding and role imagery", () => {
    expect(participantSource).toContain('/assets/AidData Brandmark.png');
    expect(participantSource).toContain('/assets/national flag.jpg');
    expect(participantSource).toContain('/img/Amara Okoye.jpg');
    expect(participantSource).toContain('/img/Daniel Mensah.jpg');
    expect(facilitatorSource).toContain("Sovereign · Facilitator");
    expect(facilitatorSource).toContain('className="brand-mark">FC</div>');
    expect(facilitatorSource).toContain("Live overview");
    expect(facilitatorSource).toContain("Replay &amp; debrief");
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

  it("keeps workshop and facilitator as dedicated React entry points", () => {
    expect(workshopEntry).toContain('src="/src/main.tsx"');
    expect(facilitatorEntry).toContain('src="/src/main.tsx"');
  });
});
