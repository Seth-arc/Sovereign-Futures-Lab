import { useEffect, useRef, useState } from "react";

export type ReferenceSurface = "orientation" | "bridge" | "case-file";

const REFERENCE_PATH = "/kuvera_debt_management_office.html";

const TITLES: Record<ReferenceSurface, string> = {
  orientation: "Debt Management Office orientation",
  bridge: "Debt Management Office learning bridge",
  "case-file": "Kuvera case file",
};

function alignOrientationCopy(referenceDocument: Document) {
  const title = referenceDocument.getElementById("onboardingTitle");
  const body = referenceDocument.getElementById("onboardingBody");
  const where = referenceDocument.getElementById("onboardingWhere");
  if (!title || !body || !where) return;

  const setContent = (nextTitle: string, nextBody: string, nextWhere: string) => {
    if (title.textContent !== nextTitle) title.textContent = nextTitle;
    if (body.innerHTML !== nextBody) body.innerHTML = nextBody;
    const whereMarkup = `<span class="mk"></span>${nextWhere}`;
    if (where.innerHTML !== whereMarkup) where.innerHTML = whereMarkup;
  };

  if (title.textContent === "What you are here to do") {
    setContent(
      "What you are here to do",
      "You are the <b>Debt Management Office (DMO)</b> inside Kuvera’s Finance Ministry. You maintain the claims record, request evidence, map dependencies, and prepare a recommendation. Treasury, Legal, creditors, the Official Creditor Committee (OCC), and IMF staff are represented by the exercise or facilitator.<br><br>The live room uses the eight-stage process shown behind this orientation. The facilitator unlocks each new stage; every earlier unlocked stage remains available for revision.",
      "Role · Debt Management Office",
    );
  } else if (title.textContent === "Casework starts with the facilitator") {
    setContent(
      "Casework starts with the facilitator",
      "Orientation and the Learning Bridge do <b>not</b> use casework time. The top-right counter remains <b>Casework · 20:00 · waiting</b> until the facilitator begins the exercise.<br><br>Inside the case, two separate institutional deadlines still matter: a USD 750m maturity in six weeks and the IMF Board horizon in eleven weeks. Workshop minutes do not convert into scenario days or weeks.",
      "Look top right · Casework clock",
    );
  } else if (title.textContent === "Every step is open") {
    setContent(
      "Facilitator-paced, revisitable steps",
      "The <b>Process flow</b> on the left is the workshop’s single navigation model. The facilitator unlocks each new stage through Socratic dialogue.<br><br>You may return to any unlocked stage. Locked stages remain visibly marked <b>Await facilitator</b>, so the rail always reflects the live workshop state.",
      "Look left · Process flow",
    );
  } else if (title.textContent === "Every decision carries a reason") {
    setContent(
      "Every decision carries a reason",
      "Each decision stage combines a structured choice with a short written rationale. Save your work before moving on.<br><br>The facilitator’s after-action report reconstructs what you chose, what evidence was available, what you requested, and what remained unresolved at that moment.",
      "Look centre · Decision workspace",
    );
  } else if (title.textContent === "Cite what you actually read") {
    setContent(
      "Use the complete Case File",
      "The <b>Case File</b> in the top right holds the country profile, indicators, contracts, creditor landscape, Common Framework process, and evidence basis.<br><br>It remains available throughout the exercise without resetting or replacing your live workshop work.",
      "Look top right · Case file",
    );
  } else if (title.textContent === "Nothing here is yours alone") {
    setContent(
      "Requests create a record",
      "Use <b>Communications</b> to open the Evidence stage once the facilitator has released it. Routine institutional requests return through authored scenario rules; unusual requests go to the facilitator acting in the named institutional role.<br><br>Every request and response is timestamped for the after-action review.",
      "Look top right · Communications",
    );
  } else if (title.textContent === "Two advisors, on call") {
    setContent(
      "Two advisors, on call",
      "<b>Amara Okoye</b> covers the country, creditor architecture, and Common Framework sequence. <b>Daniel Mensah</b> covers contracts, restricted accounts, effective control (practical limits on Kuvera’s use of cash), disclosure, and Comparability of Treatment.<br><br>Open AI advisors from the lower-left control. Their answers are grounded in evidence available in your case record and cannot choose your recommendation or reveal hidden state.",
      "Look bottom left · AI advisors",
    );
  } else if (title.textContent === "The debrief is the point") {
    setContent(
      "The debrief is the point",
      "The final participant stage records what changed your reasoning. The facilitator then uses the private after-action reviews to reconstruct decisions, evidence use, realistic consequences, unresolved risks, and what would have changed if you had acted differently.<br><br>Nothing is scored or ranked.",
      "Step 8 · Reflection, then facilitator debrief",
    );
  }
}

export function ReferenceExperience({ surface, onClose, onComplete }: { surface: ReferenceSurface; onClose: () => void; onComplete: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const [referenceDocument, setReferenceDocument] = useState("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controller = new AbortController();
    void fetch(REFERENCE_PATH, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("REFERENCE_NOT_AVAILABLE");
        return response.text();
      })
      .then((html) => setReferenceDocument(html.replace(/<head>/i, '<head><base href="/">')))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setLoadError(true);
      });
    return () => {
      controller.abort();
      observerRef.current?.disconnect();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  function prepareReference() {
    const frame = frameRef.current;
    const referenceDocument = frame?.contentDocument;
    if (!referenceDocument) {
      setLoadError(true);
      return;
    }

    const onboarding = referenceDocument.getElementById("onboardingModal");
    const bridge = referenceDocument.getElementById("learningBridge");
    const caseFile = referenceDocument.getElementById("referenceOverlay");

    if (!onboarding || !bridge || !caseFile) {
      setLoadError(true);
      return;
    }

    let activeSurface: HTMLElement;
    if (surface === "orientation") {
      const orientationStyle = referenceDocument.createElement("style");
      orientationStyle.dataset.futureslabOrientation = "true";
      orientationStyle.textContent = "html,body{background:transparent!important}body::before{display:none!important}body>.app{visibility:hidden!important;pointer-events:none!important}";
      referenceDocument.head.append(orientationStyle);
      alignOrientationCopy(referenceDocument);
      activeSurface = onboarding;
    } else if (surface === "bridge") {
      onboarding.classList.remove("open");
      onboarding.setAttribute("aria-hidden", "true");
      referenceDocument.getElementById("replayBridge")?.click();
      activeSurface = bridge;
    } else {
      onboarding.classList.remove("open");
      onboarding.setAttribute("aria-hidden", "true");
      bridge.classList.remove("open");
      bridge.setAttribute("aria-hidden", "true");
      referenceDocument.getElementById("openReference")?.click();

      const casePanel = caseFile.querySelector<HTMLElement>(".ref-panel");
      const caseBody = caseFile.querySelector<HTMLElement>(".ref-body");
      if (!casePanel || !caseBody) {
        setLoadError(true);
        return;
      }

      // The preserved reference scales its full-viewport panel to 150%. In an
      // iframe that makes the overlay itself scroll as well as the dossier body.
      // Keep the authored scale, but size its logical viewport to the scaled
      // frame so the case-file body remains the single scroll region.
      const panelZoom = Number.parseFloat(
        referenceDocument.defaultView?.getComputedStyle(casePanel).getPropertyValue("zoom") || "1",
      ) || 1;
      const scaledViewport = 100 / panelZoom;
      referenceDocument.documentElement.style.overflow = "hidden";
      referenceDocument.body.style.overflow = "hidden";
      caseFile.style.setProperty("overflow", "hidden", "important");
      casePanel.style.setProperty("width", `${scaledViewport}vw`, "important");
      casePanel.style.setProperty("height", `${scaledViewport}vh`, "important");
      casePanel.style.setProperty("max-height", `${scaledViewport}vh`, "important");
      caseBody.style.setProperty("min-height", "0", "important");
      caseBody.style.setProperty("overflow", "auto", "important");
      caseBody.tabIndex = 0;
      caseBody.setAttribute("role", "region");
      caseBody.setAttribute("aria-label", "Kuvera case file contents");
      activeSurface = caseFile;
    }

    if (!activeSurface.classList.contains("open")) {
      setLoadError(true);
      return;
    }

    observerRef.current?.disconnect();
    let exitReported = false;
    observerRef.current = new MutationObserver(() => {
      if (surface === "orientation") alignOrientationCopy(referenceDocument);
      if (activeSurface.classList.contains("open") || exitReported) return;
      exitReported = true;
      if (surface === "orientation" && bridge.classList.contains("open")) onComplete();
      else if (surface === "bridge" && bridge.dataset.preparationExit === "complete") onComplete();
      else onClose();
    });
    observerRef.current.observe(activeSurface, surface === "orientation"
      ? { attributes: true, attributeFilter: ["class"], childList: true, characterData: true, subtree: true }
      : { attributes: true, attributeFilter: ["class"] });
  }

  return (
    <div className={`reference-experience reference-experience-${surface}`} role="dialog" aria-modal="true" aria-label={TITLES[surface]}>
      <button type="button" className="reference-experience-dismiss" onClick={onClose}>
        Close and return to preparation
      </button>
      {loadError ? (
        <div className="reference-experience-error" role="alert">
          <h2>{TITLES[surface]}</h2>
          <p>The preserved reference surface could not be loaded.</p>
          <button type="button" className="primary-button" onClick={onClose}>Return to workshop</button>
        </div>
      ) : referenceDocument ? (
        // This frame renders only the fixed, bundled reference document above.
        // It intentionally remains same-origin because the wrapper coordinates
        // its focus, completion state, and accessible case-file scroll region.
        <iframe
          ref={frameRef}
          srcDoc={referenceDocument}
          title={TITLES[surface]}
          onLoad={prepareReference}
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="reference-experience-loading" role="status">Loading {TITLES[surface]}…</div>
      )}
    </div>
  );
}
