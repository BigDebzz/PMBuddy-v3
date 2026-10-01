# PM Buddy: project context

Read this first in any new session, then the specific files you will change.

## What it is
PM Buddy turns existing project documents into a structured project (milestones, tasks, risks, team, reports) for people who are not project managers. Built by Deborah Akpokighe (non-developer, works through Claude). Production: https://pmbuddy-v3.vercel.app

## Current focus
- **Project management features are the priority.**
- **QuickDoc is on hold.** Do not spend time on it. Its code stays in `src/components/QuickDoc.js`.

## Stack
- React 18, Create React App (`npm run build` outputs `build/`)
- Supabase: auth, database (client in `src/lib/supabase.js`)
- Anthropic Claude API (migrated from Gemini in Sept 2026)
- Brevo for email, Vercel for hosting and cron jobs
- PWA: `public/service-worker.js` and `public/manifest.json`

## Workflow
- `main` = production. `dev` = work in progress, auto-deploys to a Vercel preview URL.
- All changes go to `dev` first, get tested on the preview, then merge to `main` only when the owner says so.
- Commit style: `feat:`, `fix:`, `refactor:`, `chore:`.
- Preview URLs sit behind Vercel login protection. Browser console errors about `manifest.json` and `vercel.com/sso-api` on previews are harmless noise.
- Vercel CLI is installed and linked. Use `vercel.cmd logs <deployment-url> --no-follow` to read function errors.

## How AI works
- Every AI feature calls `POST /api/claude` (`api/claude.js`) with `{ prompt, mode?, documentBase64?, documentMediaType? }` and an `Authorization: Bearer <supabase token>` header. Response: `{ result: "text" }`.
- The server checks the Supabase token (401 if missing), then the daily limit (429), then calls Claude.
- **Model tiers:** `mode: 'document'` or an attached file uses `claude-sonnet-5-5` (max 8000 tokens). Everything else uses `claude-haiku-4-5-20251001` (max 2000 tokens). Heavy jobs must pass `mode: 'document'`.
- **Daily limit:** per user, default 20 requests, set by `AI_DAILY_LIMIT`. Counts live in the Supabase table `ai_usage` (`user_id`, `day`, `count`). If the table is unreachable the limit fails open so the app keeps working.
- Document import sends the file as base64 straight to Claude. The old Google file upload (`api/upload.js`) was removed.
- Claude replies can contain several content blocks. The server joins all `text` blocks.
- Any new component that calls `/api/claude` must send the auth header (see `getAuthHeader` in `ProjectWizard.js`).

## Environment variables (Vercel, all environments)
`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BREVO_API_KEY`, optional `AI_DAILY_LIMIT`. `GEMINI_API_KEY` is no longer used and can be deleted.

## Supabase tables
`pm_projects` (all project data), `projects` (validation reports), `documents` (generated plans and reports), `project_members` (invites, roles), `feedback`, `chat_messages` (assistant chat), `ai_usage` (daily AI counts).

## Code map
- `src/App.js`: screen routing (landing, auth, dashboard, invite, project open, validation flow)
- `src/components/Dashboard.js`: main hub, document viewer and editor
- `ProjectWizard.js`, `DocumentImport.js`, `CampaignWizard.js`: ways to create a project
- `ProjectWorkspace.js` (largest file): the project view, tasks, goal, health check, reports, plans
- `PMBuddyAssistant.js`: floating AI chat
- `TeamTab.js`, `RemindersPanel.js`: team and reminders
- `QuestionWizard.js`, `ResultsDashboard.js`, `src/data/`: idea validation tool
- `api/`: serverless functions. `claude.js` (AI), `invite.js`, `notify.js`, `send-reminder.js`, `broadcast.js`, and cron jobs `check-milestones.js`, `check-inactive-users.js`, `check-inactive-users-weekly.js` (schedules in `vercel.json`)

## Local setup notes (Windows)
- PowerShell blocks `npm` and `vercel` scripts. Use `npm.cmd` and `vercel.cmd`, or the full command with `.cmd`.
- Build check before pushing: `npm.cmd run build`.
- `gh` CLI is installed and logged in as BigDebzz.

## Known loose ends
- `src/data/analysis.js` still lists "Gemini API" as a suggested tool for founders. That is advice content, not the app's own AI. Leave it unless the owner wants it changed.
- Set a monthly spend limit in the Anthropic console (owner action).
