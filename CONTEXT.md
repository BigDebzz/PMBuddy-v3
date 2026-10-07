# PM Buddy: project context

Read this first in any new session, then the specific files you will change. Last updated October 2026.

## What it is
PM Buddy turns existing project documents into a structured project (milestones, tasks, risks, team, reports) for people who are not project managers. Built by a non-developer working through Claude. Production: https://pmbuddy.app

## Current focus
- **Project management features are the priority.** The goal is more visitors who become users, and keeping the people who sign up.
- **QuickDoc is on hold.** Do not spend time on it. Its code stays in `src/components/QuickDoc.js`.
- **Simplicity first:** short flows, plain English, no jargon, accessible. Every question must earn its place.

## Design
- The interface follows the **Studio** direction. Read `DESIGN.md` (rules) and `BrandGuidelines.md` (values) before any UI change. Use CSS variables only (see `src/index.css`), use `Icon` for every icon (no emoji or symbols), and support light and dark (`ThemeToggle`). Restyle one screen at a time and add repeated mistakes to the Drift log in `DESIGN.md`.
- Fonts (Albert Sans, Schibsted Grotesk) are hosted in `public/fonts/` with `fonts.css`. Do not load fonts from Google.
- Emails and exported documents cannot use CSS variables. Use the fixed Studio hex values there.

## Stack
- React 18, Create React App (`npm run build` outputs `build/`). `CI=true` makes ESLint warnings fail the build, so unused variables break it.
- Supabase: auth, database (client in `src/lib/supabase.js`)
- Anthropic Claude API (migrated from Gemini in Sept 2026)
- Brevo for email, Vercel for hosting and cron jobs
- Cloudflare for the domain (`pmbuddy.app`), DNS and email forwarding
- Google Cloud (OAuth consent screen for "Sign in with Google"), Google Search Console, Google Analytics 4 (only after cookie consent)
- `docx` and `pdfmake` (lazy loaded) for real Word and PDF downloads
- PWA: `public/service-worker.js` and `public/manifest.json`

## Workflow
- `main` = production. `dev` = work in progress, auto-deploys to a Vercel preview URL.
- All changes go to `dev` first, get tested on the preview, then merge to `main` only when the owner says "merge". One task per commit.
- Commit style: `feat:`, `fix:`, `refactor:`, `chore:`.
- Before committing, run `git status`. Another session may have unfinished work in the same folder (see Loose ends). Commit only your own changes. For a shared file, commit the `HEAD` version plus your edits (`git show HEAD:file`, edit, `git hash-object -w`, `git update-index --cacheinfo`).
- Preview URLs sit behind Vercel login protection. Browser console errors about `manifest.json` and `vercel.com/sso-api` on previews are harmless noise.
- Vercel CLI is installed and linked. Use `vercel.cmd logs <deployment-url> --no-follow` to read function errors.
- Testing pattern used so far: temporarily replace `src/index.js` with a harness (mock `fetch` and the Supabase client), run `npm start` on port 3456, drive it in the browser, then `git checkout -- src/index.js` and stop the server.

## Domain, email and sign-in setup
- **Domain:** `pmbuddy.app`, bought at Cloudflare. DNS: two `A` records (`@` and `www`) to `76.76.21.21`, set to "DNS only" (grey cloud). Added to the Vercel project `pmbuddy-v3`.
- **Redirects** (`vercel.json`): `pmbuddy-v3.vercel.app` and `www.pmbuddy.app` redirect permanently to `pmbuddy.app`. `/api/` is excluded so cron jobs keep working.
- **SEO:** `public/sitemap.xml`, `public/robots.txt`, canonical tags on the four public pages. Search Console property for `pmbuddy.app` is verified and the sitemap is submitted. `public/og-image.png` is still missing.
- **Receiving email:** Cloudflare Email Routing forwards `hello@pmbuddy.app` to the owner's Gmail. Its MX and SPF records are locked by Cloudflare, so do not edit them.
- **Sending email:** the domain is authenticated in Brevo (DKIM and DMARC). All code sends as `PM Buddy <hello@pmbuddy.app>`. Brevo's free plan allows 300 emails a day and cannot turn off link tracking, so first emails from the new domain may land in spam until reputation builds.
- **Supabase auth:** Site URL `https://pmbuddy.app`; redirect URLs include `https://pmbuddy.app/**` and the old vercel.app address.
- **Google sign-in:** the OAuth client lives in a Google Cloud project under "No Organization" (not "Debbie's Corner"). Branding (name, logo, links to `pmbuddy.app` pages) is published. The callback URL is the Supabase one.

## How AI works
- Every AI feature calls `POST /api/claude` (`api/claude.js`) with `{ prompt, mode?, documentBase64?, documentMediaType? }` and an `Authorization: Bearer <supabase token>` header. Response: `{ result: "text" }`.
- The server checks the Supabase token (401 if missing), then the daily limit (429), then calls Claude.
- **Model tiers:** `mode: 'document'` or an attached file uses `claude-sonnet-5-5` (max 8000 tokens). Everything else uses `claude-haiku-4-5-20251001` (max 2000 tokens). Heavy jobs must pass `mode: 'document'`. Do not change the models, `max_tokens` or the token-saving logic.
- **Daily limit:** per user, default 20 requests, set by `AI_DAILY_LIMIT`. Counts live in the Supabase table `ai_usage` (`user_id`, `day`, `count`). If the table is unreachable the limit fails open so the app keeps working.
- Document import sends the file as base64 straight to Claude. Claude replies can contain several content blocks. The server joins all `text` blocks.
- Any new component that calls `/api/claude` must send the auth header (see `getAuthHeader` in `ProjectWizard.js`).
- Keep AI use low: creating a project costs 1 request. There is no automatic brief any more.

## Environment variables (Vercel, all environments)
`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, optional `AI_DAILY_LIMIT`. `GEMINI_API_KEY` is no longer used and can be deleted. Never print or commit keys. Do not add or change variables without the owner.

## Supabase tables
`pm_projects` (all project data), `projects` (validation reports), `documents` (generated plans and reports), `project_members` (invites, roles), `feedback`, `chat_messages` (assistant chat), `ai_usage` (daily AI counts), `user_flags` (one-time email flags).

**User settings live in the Supabase auth user metadata, not a table:** `first_name`, `last_name`, `role`, `organisation`, `use_case`, `consent_given`, `age_confirmed`, `marketing_opt_out`, `last_summary_at`.

**Project extras live inside existing JSON columns:** shared task-board notes in `pm_projects.scope.boardNotes`; the change log in `history`; each task has `completedAt` set when it is marked done.

## What users can do (as built)
- **Create a project:** a 3-step flow (`ProjectWizard.js`: name and what it is for, who and when, key steps). The AI suggests steps. The draft is kept per user in `localStorage` (`pmb_wizard_draft_v2_<id>`). Or import a document (`DocumentImport.js`), which also offers to invite people named in it.
- **Add new information** (`UpdateProject.js`): paste a message or upload a file; the AI proposes changes; the user ticks what to apply; one history entry is written.
- **Next steps card** (`NextSteps.js`): add tasks, invite people, create a report. Ticks itself.
- **Task board** with shared **project notes** (`ProjectNotes.js`) and notes on each task card.
- **(i) pointers** (`InfoTip.js`, wording in `src/lib/glossary.js`) explain project terms in plain English.
- **Reports** (`ReportBuilder.js`, facts and prompts in `src/lib/reportFacts.js`): team update, funder report, investor update, personal progress report.
- **Documents:** every generated document opens in `DocView.js`, which lets the user ask the AI to change it (quick chips or free text), undo, edit by hand, and download real **.docx** and **.pdf** (`docFormats.js` builds both from the blocks in `docModel.js`; `docExport.js` triggers the download; `docStyle.js` holds the writing rules and refine prompt).
- **Voice input:** one shared hook, `src/lib/useSpeech.js`. It replaces the sentence on every update (Android repeats the whole sentence), restarts after pauses on phones, and stops after three silent runs.
- **Profile and onboarding question** in Settings (`ProfileForm.js`).
- **Invites:** `src/lib/invite.js` is the one place that sends a project invite.

## Emails
- **Transactional (no unsubscribe needed):** invites, task and milestone reminders, "done" notifications, the task digest.
- **Marketing (must carry unsubscribe and a postal address):** the newsletter (`broadcast.js`), the two "start your first project" nudges, and the weekly summary. Helpers are in `api/_shared.js`.
- **Unsubscribe:** the link goes to `/api/unsubscribe`, which checks an HMAC token and sets `marketing_opt_out` on the user. Settings has a matching "Weekly summary and tips" switch. All marketing jobs skip opted-out users.
- **`POSTAL_ADDRESS` in `api/_shared.js` is empty.** Until the owner provides a real postal address, the weekly summary will not send, and marketing emails go out without an address. Fill it in before relying on these emails.
- **Weekly summary** (`api/weekly-summary.js`, Mondays 07:00 UTC): each person's active projects (done this week, open, overdue, due in 7 days) plus one rotating tip (`TIPS` in `api/_summary.js`). Max 250 per run, skips anyone emailed in the last 6 days.
- **Fortnightly owner report** (`api/fortnightly-report.js`, Mondays 07:30 UTC, only sends on even ISO weeks) goes to `hello@pmbuddy.app`: sign-ups, activation, new projects, AI requests, opt-outs, use cases. Numbers only.
- Cron endpoints are plain `GET` URLs without authentication. De-duplication limits the harm. Add a cron secret later.

## Privacy and legal decisions
- Signup requires a tick: "I am 16 or older and agree to the Terms and Privacy Policy". Links point to `/terms.html` and `/privacy.html` (not `/terms`).
- Google Analytics loads only after the visitor presses Accept (`src/lib/consent.js`, `CookieBanner.js`). "Cookie settings" in the home page footer reopens the choice.
- The Tally feedback script loads only when the feedback button is pressed.
- No session replay tools. No public user content, so no DMCA agent is needed yet. Revisit subscription and renewal terms when pricing is added.

## Code map
- `src/App.js`: screen routing (landing, auth, dashboard, invite, project open, validation flow), cookie banner, feedback button
- `src/components/Dashboard.js`: main hub, sidebar, settings, document viewer
- `ProjectWizard.js`, `DocumentImport.js`: ways to create a project. `CampaignWizard.js` still exists but the Dashboard no longer links to it (only Quick Doc's "What next?" does).
- `ProjectWorkspace.js` (largest file): the project view and tabs, tasks, goal, health check, reports, plans
- `PMBuddyAssistant.js`: floating AI chat
- `TeamTab.js`, `RemindersPanel.js`: team and reminders
- `QuestionWizard.js`, `ResultsDashboard.js`, `src/data/`: idea validation tool
- `src/lib/`: `supabase.js`, `useSpeech.js`, `consent.js`, `invite.js`, `reportFacts.js`, `docModel.js`, `docFormats.js`, `docExport.js`, `docStyle.js`, `glossary.js`
- `api/`: serverless functions. `claude.js` (AI), `invite.js`, `notify.js`, `send-reminder.js`, `broadcast.js`, `unsubscribe.js`, and cron jobs `check-milestones.js`, `check-inactive-users.js`, `check-inactive-users-weekly.js`, `weekly-summary.js`, `fortnightly-report.js` (schedules in `vercel.json`). Files starting with `_` (`_shared.js`, `_summary.js`) are helpers, not web addresses.

## Local setup notes (Windows)
- PowerShell blocks `npm` and `vercel` scripts. Use `npm.cmd` and `vercel.cmd`, or the full command with `.cmd`.
- Build check before pushing: `CI=true npm.cmd run build`.
- Avoid `Get-Content`/`Set-Content` on source files (encoding damage). Use the edit tools or small Node scripts.
- `gh` CLI is installed and logged in as BigDebzz.
- `package-lock.json` is untracked on purpose. Do not commit it.

## Known loose ends
- **Postal address** for marketing emails is not set (see Emails).
- **Understand your data** (`DataStory.js`, `src/lib/dataFacts.js`, `datastory/`, `storyteller/`) is unfinished work from another session. Its files are untracked and `ProjectWorkspace.js` has uncommitted edits for it. Do not commit those unless the owner says it is finished.
- **Parked:** an SEO "Guides and templates" section (6 guides with templates, plus a weekly tip email). Plan saved in the assistant memory. Resume only when the owner asks.
- **Not started:** WhatsApp reminders (needs the Meta Business verification, an approved number and message templates; the owner does the setup).
- The PM Buddy chat opens on its own with a suggestion when a project opens, and covers half the screen on a phone. Proposed: show only a badge on small screens.
- Weekly summary covers projects people own, not ones they were invited to.
- `public/og-image.png` is missing, so shared links have no preview picture.
- `src/data/analysis.js` still lists "Gemini API" as a suggested tool for founders. That is advice content, not the app's own AI. Leave it unless the owner wants it changed.
- Set a monthly spend limit in the Anthropic console (owner action).
