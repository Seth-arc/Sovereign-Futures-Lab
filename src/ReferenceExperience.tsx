import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { CASE_FACTS, CASE_FILE_SECTIONS, LEARNING_BRIDGE_CHAPTERS, ORIENTATION_STEPS } from "./scenario";

export type ReferenceSurface = "orientation" | "bridge" | "case-file";

const TITLES: Record<ReferenceSurface, string> = {
  orientation: "Debt Management Office orientation",
  bridge: "Debt Management Office learning bridge",
  "case-file": "Kuvera case file",
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function backgroundSiblings(root: HTMLElement): HTMLElement[] {
  const siblings = new Set<HTMLElement>();
  let current = root;
  while (current.parentElement && current.parentElement !== document.documentElement) {
    Array.from(current.parentElement.children).forEach((element) => {
      if (element !== current && element instanceof HTMLElement) siblings.add(element);
    });
    current = current.parentElement;
  }
  return [...siblings];
}

function trapFocus(event: ReactKeyboardEvent<HTMLElement>, onClose: () => void) {
  if (event.key === "Escape") {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => !element.hidden);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    event.currentTarget.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function useReferenceDialog(rootRef: RefObject<HTMLDivElement | null>, closeRef: RefObject<HTMLButtonElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previousOverflow = document.body.style.overflow;
    const siblings = backgroundSiblings(root);
    document.body.style.overflow = "hidden";
    siblings.forEach((element) => {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    window.requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      siblings.forEach((element) => {
        element.inert = false;
        element.removeAttribute("aria-hidden");
      });
    };
  }, [closeRef, rootRef]);
}

function Orientation({ onClose, onComplete, replayOnly }: { onClose: () => void; onComplete: () => void; replayOnly: boolean }) {
  const [index, setIndex] = useState(0);
  const step = ORIENTATION_STEPS[index];
  return (
    <div className="reference-learning-layout">
      <div className="reference-progress" role="progressbar" aria-label="Orientation progress" aria-valuemin={1} aria-valuemax={ORIENTATION_STEPS.length} aria-valuenow={index + 1}>
        {ORIENTATION_STEPS.map((item, itemIndex) => <span key={item.id} className={itemIndex <= index ? "complete" : ""} aria-hidden="true" />)}
      </div>
      <section className="reference-learning-card" aria-labelledby="orientation-step-title" aria-live="polite">
        <span className="eyebrow">Orientation · Step {index + 1} of {ORIENTATION_STEPS.length}</span>
        <h2 id="orientation-step-title">{step.title}</h2>
        {step.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        <div className="reference-location"><span aria-hidden="true" />{step.location}</div>
      </section>
      <footer className="reference-learning-footer">
        <button type="button" className="secondary-button" onClick={onClose}>Skip for now</button>
        <div>
          <button type="button" className="secondary-button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>Back</button>
          <button type="button" className="primary-button" onClick={() => index === ORIENTATION_STEPS.length - 1 ? onComplete() : setIndex((value) => value + 1)}>
            {index === ORIENTATION_STEPS.length - 1 ? (replayOnly ? "Return to workshop" : "Continue to Learning Bridge") : "Next"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function LearningBridge({ onClose, onComplete, replayOnly }: { onClose: () => void; onComplete: () => void; replayOnly: boolean }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const chapter = LEARNING_BRIDGE_CHAPTERS[index];
  const selected = answers[chapter.id];
  const answer = selected === undefined ? undefined : chapter.practice.options[selected];

  function moveTo(next: number) {
    setIndex(Math.max(0, Math.min(LEARNING_BRIDGE_CHAPTERS.length - 1, next)));
  }

  function handleTabKey(event: ReactKeyboardEvent<HTMLButtonElement>, tabIndex: number) {
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (tabIndex + 1) % LEARNING_BRIDGE_CHAPTERS.length;
    if (event.key === "ArrowLeft") next = (tabIndex - 1 + LEARNING_BRIDGE_CHAPTERS.length) % LEARNING_BRIDGE_CHAPTERS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = LEARNING_BRIDGE_CHAPTERS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    moveTo(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <div className="reference-bridge-layout">
      <header className="reference-bridge-intro">
        <span className="eyebrow">Learning Bridge · subject-matter grounding · About 6 minutes</span>
        <h2>Enter the case with a shared operating frame</h2>
        <p>Read each model, make one call on a parallel practice case, and read why. These examples do not reveal Kuvera's unresolved evidence.</p>
      </header>
      <div className="reference-tabs" role="tablist" aria-label="Learning Bridge chapters">
        {LEARNING_BRIDGE_CHAPTERS.map((item, itemIndex) => (
          <button key={item.id} id={`bridge-tab-${item.id}`} type="button" role="tab" aria-selected={itemIndex === index} aria-controls="bridge-panel" tabIndex={itemIndex === index ? 0 : -1} onKeyDown={(event) => handleTabKey(event, itemIndex)} onClick={() => moveTo(itemIndex)}>
            {itemIndex + 1}. {item.tab}<span>{answers[item.id] === undefined ? "Open" : "Practised"}</span>
          </button>
        ))}
      </div>
      <article id="bridge-panel" className="reference-bridge-panel" role="tabpanel" aria-labelledby={`bridge-tab-${chapter.id}`} tabIndex={0}>
        <aside>
          <span className="eyebrow">Chapter {index + 1} of {LEARNING_BRIDGE_CHAPTERS.length}</span>
          <strong>{chapter.type}</strong>
          <p>{chapter.objective}</p>
          <small>Practice on parallel cases, not Kuvera. Kuvera's account restrictions, facility linkage, disclosure permission, and assurance sufficiency remain for you to establish.</small>
        </aside>
        <div className="reference-bridge-content">
          <h3>{chapter.title}</h3>
          <p>{chapter.introduction}</p>
          <h4>Read the model</h4>
          <ol className="reference-model-list">{chapter.model.map((item) => <li key={item.label}><strong>{item.label}</strong><span>{item.detail}</span></li>)}</ol>
          <div className="reference-practice">
            <h4>Make the call</h4>
            <p>{chapter.practice.scenario}</p>
            <strong>{chapter.practice.question}</strong>
            <div className="reference-options" role="group" aria-label={chapter.practice.question}>
              {chapter.practice.options.map((option, optionIndex) => (
                <button key={option.label} type="button" aria-pressed={selected === optionIndex} onClick={() => setAnswers((current) => ({ ...current, [chapter.id]: optionIndex }))}>
                  <span>{String.fromCharCode(65 + optionIndex)}</span>{option.label}
                </button>
              ))}
            </div>
            {answer && <div className={answer.correct ? "reference-feedback correct" : "reference-feedback"} role="status"><strong>{answer.correct ? "That holds." : "Not quite."}</strong><p>{answer.feedback}</p><span>Carry this into the case: {chapter.takeaway}</span></div>}
          </div>
        </div>
      </article>
      <footer className="reference-learning-footer">
        <button type="button" className="secondary-button" onClick={onClose}>Skip for now</button>
        <div>
          <button type="button" className="secondary-button" disabled={index === 0} onClick={() => moveTo(index - 1)}>Back</button>
          <button type="button" className="primary-button" disabled={selected === undefined} onClick={() => index === LEARNING_BRIDGE_CHAPTERS.length - 1 ? onComplete() : moveTo(index + 1)}>
            {index === LEARNING_BRIDGE_CHAPTERS.length - 1 ? (replayOnly ? "Return to workshop" : "Continue to Mandate") : selected === undefined ? "Pick an answer to continue" : "Next chapter"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function CaseFile() {
  const [activeId, setActiveId] = useState(CASE_FILE_SECTIONS[0].id);
  const activeIndex = CASE_FILE_SECTIONS.findIndex((section) => section.id === activeId);
  const section = CASE_FILE_SECTIONS[activeIndex];

  function handleTabKey(event: ReactKeyboardEvent<HTMLButtonElement>, tabIndex: number) {
    let next: number | undefined;
    if (event.key === "ArrowRight") next = (tabIndex + 1) % CASE_FILE_SECTIONS.length;
    if (event.key === "ArrowLeft") next = (tabIndex - 1 + CASE_FILE_SECTIONS.length) % CASE_FILE_SECTIONS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = CASE_FILE_SECTIONS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActiveId(CASE_FILE_SECTIONS[next].id);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  return (
    <div className="reference-case-layout">
      <header className="reference-case-head">
        <div><span className="eyebrow">Case File</span><h2>Republic of Kuvera</h2></div>
        <div className="reference-case-meta"><span>Common Framework treatment request</span><span>Debt assessed unsustainable</span><span>IMF Board in {CASE_FACTS.imfBoardHorizonWeeks} weeks</span></div>
      </header>
      <div className="reference-case-tabs" role="tablist" aria-label="Case File sections">
        {CASE_FILE_SECTIONS.map((item, index) => <button key={item.id} id={`case-tab-${item.id}`} type="button" role="tab" aria-selected={item.id === activeId} aria-controls="case-panel" tabIndex={item.id === activeId ? 0 : -1} onKeyDown={(event) => handleTabKey(event, index)} onClick={() => setActiveId(item.id)}>{item.title}</button>)}
      </div>
      <article id="case-panel" className="reference-case-body" role="tabpanel" aria-labelledby={`case-tab-${section.id}`} tabIndex={0}>
        <span className="eyebrow">Section {activeIndex + 1} of {CASE_FILE_SECTIONS.length}</span>
        <h3>{section.title}</h3>
        <p className="reference-case-lead">{section.lead}</p>
        <dl className="reference-case-records">{section.records.map((record) => <div key={record.label}><dt>{record.label}</dt><dd><strong>{record.value}</strong><span>{record.detail}</span></dd></div>)}</dl>
        <section className="reference-boundaries" aria-labelledby={`case-boundaries-${section.id}`}><h4 id={`case-boundaries-${section.id}`}>Evidence boundary</h4><ul>{section.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}</ul></section>
      </article>
    </div>
  );
}

export function ReferenceExperience({ surface, onClose, onComplete, preparationComplete }: { surface: ReferenceSurface; onClose: () => void; onComplete: () => void; preparationComplete: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useReferenceDialog(rootRef, closeRef);
  return (
    <div ref={rootRef} className={`reference-experience reference-experience-${surface}`} role="dialog" aria-modal="true" aria-label={TITLES[surface]} tabIndex={-1} onKeyDown={(event) => trapFocus(event, onClose)}>
      <button ref={closeRef} type="button" className="reference-experience-dismiss" onClick={onClose}>Close {TITLES[surface]}</button>
      <div className="reference-experience-surface">
        {surface === "orientation" && <Orientation onClose={onClose} onComplete={onComplete} replayOnly={preparationComplete} />}
        {surface === "bridge" && <LearningBridge onClose={onClose} onComplete={onComplete} replayOnly={preparationComplete} />}
        {surface === "case-file" && <CaseFile />}
      </div>
    </div>
  );
}
