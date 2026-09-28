import { FacilitatorApp } from "./FacilitatorApp";
import { ParticipantApp } from "./ParticipantApp";

export default function App() {
  return window.location.pathname.startsWith("/facilitator") ? <FacilitatorApp /> : <ParticipantApp />;
}
