# Futureslab post-copy setup guide

Use this checklist after copying the complete `futureslab` folder into its destination GitHub repository.

> [!IMPORTANT]
> Keep `futureslab` intact as one directory. Do not merge its files into the parent repository's existing root unless `futureslab` is intended to become the repository root.

## 1. Verify the copied folder

- [ ] Open PowerShell.
- [ ] Change to the copied `futureslab` directory. Replace the example path with its actual location.

```powershell
Set-Location -LiteralPath "C:\path\to\your-repository\futureslab"
Get-Location
npm pkg get name
```

The package name should be:

```text
"sovereign-room-futureslab"
```

- [ ] List all copied files, including hidden files.

```powershell
Get-ChildItem -Force
```

- [ ] Confirm that the following items are present:

  - `package.json`
  - `package-lock.json`
  - `index.html`
  - `about.html`
  - `src`
  - `public`
  - `workshop`
  - `facilitator`
  - `supabase`
  - `docs`
  - `vercel.json`
  - `.env.example`

## 2. Install and verify locally

Run every command in this section from inside the copied `futureslab` directory.

- [ ] Install the locked dependencies.

```powershell
npm install
```

- [ ] Run the automated tests.

```powershell
npm test
```

- [ ] Create the production build.

```powershell
npm run build
```

- [ ] Check production dependencies for known vulnerabilities.

```powershell
npm audit --omit=dev
```

- [ ] Start the local development server.

```powershell
npm run dev
```

- [ ] Open and inspect these local routes:

  - `http://localhost:5173/`
  - `http://localhost:5173/workshop/`
  - `http://localhost:5173/facilitator/`
  - `http://localhost:5173/about`

- [ ] Test the standard participant entry flow from `/`:

  1. Select **Enter**.
  2. Enter the participant's name, organization, email address, and workshop code.
  3. Accept the privacy consent statement.
  4. Submit the modal.
  5. Confirm that `/workshop/` opens without displaying a second login form.
  6. Confirm that the browser address does not contain the participant's name or email address.

Stop the development server by returning to PowerShell and pressing `Ctrl+C`.

## 3. Commit the folder to GitHub

Run these commands from the parent Git repository—not from an unrelated directory.

- [ ] Change to the repository root.

```powershell
Set-Location -LiteralPath "C:\path\to\your-repository"
```

- [ ] Review the files Git detected.

```powershell
git status
```

- [ ] Stage and commit Futureslab.

```powershell
git add futureslab
git commit -m "Add Futureslab workshop platform"
git push
```

Do not commit any of the following:

- `.env.local`
- `node_modules`
- `dist`
- API keys
- Supabase service-role keys
- generated reports
- participant exports

## 4. Create and configure the Supabase project

Use the full [deployment and rehearsal runbook](./DEPLOYMENT.md) while completing this section.

- [ ] Create a Supabase project in the region approved for workshop data.
- [ ] Open the Supabase SQL editor.
- [ ] Run `supabase/migrations/202609280001_futureslab.sql` once.
- [ ] Enable anonymous authentication for participants.
- [ ] Enable email OTP authentication for the facilitator.
- [ ] Configure the production Site URL and permitted Vercel preview URLs.
- [ ] Confirm that facilitator access is restricted to `snguna@aiddata.wm.edu`.
- [ ] Configure the daily 30-day data-retention purge described in `DEPLOYMENT.md`.

## 5. Configure the AI provider

Futureslab prefers Groq when it is configured. OpenAI can be configured as an alternative.

> [!CAUTION]
> AI provider keys are server-side Supabase secrets. Never place them in `.env.local`, a `VITE_*` variable, GitHub, or browser code.

- [ ] Configure the Groq secrets if using Groq.

```powershell
supabase secrets set GROQ_API_KEY=replace_me
supabase secrets set GROQ_ADVISOR_TEXT_MODEL=openai/gpt-oss-120b
supabase secrets set GROQ_TRANSCRIPTION_MODEL=whisper-large-v3-turbo
```

- [ ] Optionally configure OpenAI as an alternative.

```powershell
supabase secrets set OPENAI_API_KEY=replace_me
supabase secrets set OPENAI_ADVISOR_TEXT_MODEL=replace_with_an_available_model
supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
```

- [ ] Deploy the two Supabase Edge Functions.

```powershell
supabase functions deploy advisor-chat
supabase functions deploy transcribe
```

Provider model names and availability can change. Confirm the current model identifiers in the selected provider's dashboard before rehearsal.

## 6. Configure the local environment

Return to the `futureslab` directory.

```powershell
Set-Location -LiteralPath "C:\path\to\your-repository\futureslab"
```

- [ ] Create the uncommitted local environment file.

```powershell
Copy-Item -LiteralPath ".env.example" -Destination ".env.local"
notepad .env.local
```

- [ ] Enter the public Supabase browser configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_FORCE_LOCAL_MODE=false
```

The Supabase anonymous key is intended for browser use with the project's row-level security policies. Do not use the service-role key here.

- [ ] Save `.env.local`.
- [ ] Build and run the configured application again.

```powershell
npm run build
npm run dev
```

## 7. Connect GitHub to Vercel

- [ ] Import the GitHub repository into Vercel.
- [ ] Set the Vercel root directory correctly:

  - If `futureslab` is a directory inside the repository, set **Root Directory** to `futureslab`.
  - If the contents of `futureslab` are the repository root, leave **Root Directory** empty.

- [ ] Add these environment variables to Vercel for Production and Preview:

  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_FORCE_LOCAL_MODE=false`

- [ ] Confirm that no Groq, OpenAI, or Supabase service-role key has been added to Vercel as a `VITE_*` variable.
- [ ] Deploy the Vercel project.

## 8. Validate the deployed application

- [ ] Open the deployed `/` route.
- [ ] Confirm that the landing animation, theme control, About modal, entry modal, and transition work.
- [ ] Join through the landing modal and confirm there is no second participant login.
- [ ] Confirm that `/about` works.
- [ ] Sign into `/facilitator/` using `snguna@aiddata.wm.edu`.
- [ ] Create a separate **REHEARSAL** session.
- [ ] Join the rehearsal from at least three separate browser profiles.
- [ ] Test facilitator stage controls, clock controls, injects, evidence requests, and institutional replies.
- [ ] Test typed advisor messages and push-to-talk voice interaction.
- [ ] Greet both advisors and confirm their distinct personalities and response cadence.
- [ ] Confirm responses reveal progressively and appear immediately when reduced motion is enabled.
- [ ] Play both advisor welcomes and confirm Amara and Daniel have distinct voices on the actual workshop devices while their transcripts remain visible.
- [ ] Confirm that research-backed advisor answers include an expandable Sources section with claim ID, source ID, title, exact page reference, and source classification.
- [ ] Confirm an ordinary process or contract question does not retrieve policy proposals, while an explicit policy/reform question may retrieve a proposal that is clearly labeled as such.
- [ ] Confirm Supabase Edge Function logs show only approved research claim IDs and never `CLAIM-CF-PROGRESS-001` or `SRC-CF-PROGRESS`.
- [ ] Ask the four research boundary questions (all Chinese loans collateralized; MoU creates cash relief; World Bank options are current law; CoT is one haircut formula) and confirm deterministic "No" answers with structured sources.
- [ ] Ask a question that relies on `Progress debt treatments_CF.docx` and confirm a source-gap response with no citation.
- [ ] Confirm provider payloads contain only bounded card fields and short excerpts, never repository paths, source files, PDFs, DOCX files, or full report bodies.
- [ ] Test the scripted advisor fallback by temporarily making the selected provider unavailable.
- [ ] Submit a participant recommendation.
- [ ] Begin the facilitator debrief.
- [ ] Generate an individual after-action report.
- [ ] Export PDF, printable HTML, JSON, and participant CSV files.
- [ ] Confirm that participant reports remain accessible only to the facilitator.
- [ ] Confirm that the projected comparison view can anonymize participant identities.
- [ ] Create a distinct **LIVE** session for October 14, 2026. Do not reuse the rehearsal session.

## Completion check

Setup is complete when all of the following are true:

- [ ] `npm test` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `npm audit --omit=dev` reports zero known production vulnerabilities.
- [ ] The landing page is the only participant identity and consent gate.
- [ ] Participants can join and resume their exercise.
- [ ] The facilitator can authenticate, create sessions, control pacing, and monitor participants.
- [ ] Voice advisors work and fall back safely when an AI provider is unavailable.
- [ ] Facilitator reports and exports work.
- [ ] Rehearsal and live session data remain separate.
- [ ] No private API key is visible in browser code, browser storage, or browser network requests.
