import { lazy, Suspense } from "react";

const FacilitatorApp = lazy(() => import("./FacilitatorApp").then(({ FacilitatorApp: component }) => ({ default: component })));
const ParticipantApp = lazy(() => import("./ParticipantApp").then(({ ParticipantApp: component }) => ({ default: component })));

export default function App() {
  return <Suspense fallback={<main className="center-page"><p role="status">Loading workshop…</p></main>}>
    {window.location.pathname.startsWith("/facilitator") ? <FacilitatorApp /> : <ParticipantApp />}
  </Suspense>;
}
