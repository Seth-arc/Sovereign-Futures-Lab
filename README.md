# Sovereign Room Futureslab

Workshop-focused demo for **A Data-Informed Simulation for African Foresight Practice**.

The application deliberately implements a bounded slice of the Sovereign Room method:

1. role and authority orientation;
2. role-visible evidence and uncertainty;
3. structured decisions with written rationale;
4. deterministic consequences;
5. an immutable submission history;
6. facilitator-led causal debrief and counterfactual review.

Routine evidence requests use authored responses and delays. A deliberately small exception desk lets the facilitator answer unusual requests in the voice of Treasury, Legal, the IMF, the Official Creditor Committee, or a creditor—without adding a general messaging system.

It is not a replacement for the full Sovereign Room platform. The participant surface follows `kuvera_debt_management_office.html`, and the facilitator surface follows `facilitator_interface_v1.html` as visual sources of truth. Their exact dark interface palette, Inter typography, shell geometry, AidData brandmark, Kuvera flag, institutional marks, and Amara/Daniel portraits are carried into this folder. Required image assets live under `public/assets` and `public/img`, while immutable copies of the source references live under `docs/interface-references`; moving the complete `futureslab` folder therefore preserves the implementation and its visual source of truth. Inter is loaded from the same Google Fonts endpoint used by the references and falls back to the reference system-font stack if that endpoint is unavailable.

Supabase Storage is intentionally not required for this workshop slice: microphone audio is discarded after transcription, and reports are regenerated from retained records and downloaded directly to the facilitator's device. This removes an unnecessary file-retention surface.

## Runtime surfaces

- `/` — exact Sovereign landing reference, including its topography motion engine, theme control, login transition, and integrated six-section About modal
- `/about` or `/about.html` — complete standalone About presentation with its original motion and navigation
- `/workshop/` — Debt Management Office exercise; the landing modal is the single participant identity and consent gate, and this route consumes its one-time browser handoff automatically
- `/facilitator/` — passwordless facilitator console, restricted to `snguna@aiddata.wm.edu`

## Local setup

The human operator runs commands in this repository:

```powershell
cd futureslab
npm install
Copy-Item .env.example .env.local
npm run dev
```

For offline UI rehearsal, set `VITE_FORCE_LOCAL_MODE=true`. Local mode keeps each participant's data only in that browser. It does not provide facilitator monitoring or cross-device synchronization.

## Cloud setup

1. Create a Supabase project.
2. Run `supabase/migrations/202609280001_futureslab.sql` in the SQL editor.
3. Enable anonymous sign-ins and email OTP sign-ins in Supabase Authentication.
4. Add the Vercel production and preview URLs to the Supabase redirect allow-list.
5. Deploy the Edge Functions in `supabase/functions/`.
6. Set function secrets for at least one AI provider; see `docs/DEPLOYMENT.md`.
7. Create a Vercel project from the GitHub repository, using `futureslab` as its root directory.
8. Configure the browser-safe variables from `.env.example` in Vercel.

Target dates: rehearsal-ready by **October 4, 2026** and live workshop delivery on **October 14, 2026**.

## Verification commands

These commands have not been run by the coding agent:

```powershell
cd futureslab
npm install
npm test
npm run build
```

Pass means the deterministic engine and reference-branding regression tests succeed, and Vite produces a production build without TypeScript errors.
