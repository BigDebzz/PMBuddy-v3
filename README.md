# PM Buddy

**Project management for people who aren't project managers.**

PM Buddy is a web app that takes your existing project documents — a plan, a proposal, a brief, even a WhatsApp message — and turns them into a structured project with milestones, a task board, risks, a communication plan, and downloadable reports. No PM training required.

Built by a PMP-certified programs manager who kept watching smart people run projects with no structure — not because they didn't care, but because the tools assumed they already knew how to manage projects.

---

## What it does

**Start a project in three short steps, or upload what you already have**
Name it, say who is on it and when, and PM Buddy suggests the key steps. Or drop in a PDF, Word doc, or paste any text, and PM Buddy builds the project for you. People named in the document can be invited with one tick.

**Keep it up to date with new information**
Paste a message from your team or a funder, or upload a new document. PM Buddy suggests the changes (new tasks, new dates, new risks), and nothing changes until you approve.

**Kanban task board with notes**
Tasks and milestones live on the same board across To Do, In Progress, and Done. Flag blockers, add notes to a task, keep shared project notes, track overdue items.

**Plain English throughout**
No "RACI matrix." No "RAID log." Small (i) pointers explain every term in a sentence or two. Just: what are you building, what could go wrong, who needs to know, and what's next.

**Reports and documents you can refine**
Create a team update, funder report, investor update, or personal progress report from your live project. Ask the AI to make it shorter, add detail, or change the tone, undo any change, edit by hand, then download a real Word or PDF file.

**Health check**
PM Buddy scores your project out of 100 and tells you exactly what's missing and how to fix it.

**Team and stakeholder management**
Invite team members, manage roles, track stakeholders. Everyone gets a notification when something changes.

**Weekly summary**
Each Monday, a short email with where your projects stand and one tip. One click to unsubscribe, or turn it off in Settings.

**Voice input**
A microphone button on the main text boxes. It works on phones and keeps listening through pauses.

**Validation tool**
Answer honest questions about your idea and get a detailed report with a score, strengths, gaps, and recommended next steps. Supports hackathon and startup modes.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App) |
| Backend / DB | Supabase (auth, database, storage) |
| AI | Anthropic Claude API (Sonnet for documents, Haiku for small tasks) |
| Documents | `docx` (Word) and `pdfmake` (PDF), loaded only when someone downloads |
| Email | Brevo (sending), Cloudflare Email Routing (receiving at `hello@pmbuddy.app`) |
| Domain / DNS | Cloudflare (`pmbuddy.app`) |
| Hosting | Vercel |
| Analytics | Google Analytics 4, only after the visitor accepts cookies |
| PWA | Service worker + Web App Manifest |

---

## Project structure

```
PMBuddy-v3/
├── api/
│   ├── claude.js                  # AI text generation (Claude API), model tiers + daily limit
│   ├── broadcast.js               # Newsletter to all users who have not unsubscribed
│   ├── invite.js                  # Team invite emails
│   ├── notify.js                  # Project notifications
│   ├── send-reminder.js
│   ├── unsubscribe.js             # One-click unsubscribe from marketing emails
│   ├── weekly-summary.js          # Cron: Monday summary of each person's projects, plus a tip
│   ├── fortnightly-report.js      # Cron: numbers for the owner, every second Monday
│   ├── check-milestones.js        # Cron: milestone and task reminders
│   ├── check-inactive-users.js    # Cron: nudge for people with no project
│   ├── check-inactive-users-weekly.js
│   ├── _shared.js                 # Unsubscribe links, postal address, opt-out check
│   └── _summary.js                # Summary email and tips
├── public/
│   ├── index.html, about.html, privacy.html, terms.html
│   ├── fonts/                     # Self-hosted fonts and their licences
│   ├── sitemap.xml, robots.txt
│   ├── manifest.json, service-worker.js
│   └── site.css, site.js          # Styling and theme switch for the static pages
├── src/
│   ├── components/
│   │   ├── AuthScreen.js          # Login / signup (age and terms tick)
│   │   ├── LandingScreen.js       # Marketing page
│   │   ├── Dashboard.js           # Main hub, sidebar, settings
│   │   ├── ProjectWizard.js       # New project (3 steps)
│   │   ├── DocumentImport.js      # Import a project from a document
│   │   ├── ProjectWorkspace.js    # Full project view (5 tabs)
│   │   ├── UpdateProject.js       # Add new information to a project
│   │   ├── NextSteps.js           # Checklist at the top of a new project
│   │   ├── ProjectNotes.js        # Shared notes on the task board
│   │   ├── InfoTip.js             # The (i) pointers
│   │   ├── ReportBuilder.js       # Team, funder, investor, personal reports
│   │   ├── DocView.js             # View, refine with AI, edit, download a document
│   │   ├── ProfileForm.js         # Profile and "what will you use this for"
│   │   ├── CookieBanner.js        # Accept or decline analytics cookies
│   │   ├── PMBuddyAssistant.js    # Floating AI chat
│   │   ├── TeamTab.js, RemindersPanel.js
│   │   ├── QuestionWizard.js, ResultsDashboard.js   # Validation tool
│   │   ├── BroadcastEmail.js      # Admin newsletter tool
│   │   ├── CampaignWizard.js      # Campaigns (not linked from the dashboard)
│   │   ├── QuickDoc.js            # Quick documents (on hold)
│   │   └── FeedbackButton.js
│   ├── data/                      # Validation questions and scoring
│   └── lib/
│       ├── supabase.js, analytics.js, consent.js
│       ├── useSpeech.js           # Voice to text, used by every microphone button
│       ├── invite.js              # Sends a project invite
│       ├── reportFacts.js         # Facts and prompts for each report type
│       ├── docModel.js, docFormats.js, docExport.js, docStyle.js   # Word and PDF
│       └── glossary.js            # Wording for the (i) pointers
├── CONTEXT.md                     # Full project context (read before building)
├── DESIGN.md, BrandGuidelines.md  # Design rules
├── package.json
└── vercel.json                    # Redirects, rewrites, function limits, cron schedules
```

---

## Environment variables

Set these in Vercel (Settings → Environment Variables). Never put them in the code.

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `AI_DAILY_LIMIT` | Optional. AI requests per user per day (default 20) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (also signs unsubscribe links) |
| `BREVO_API_KEY` | Brevo email API key |

The postal address printed in marketing emails is set in `api/_shared.js` (`POSTAL_ADDRESS`). Until it is filled in, the weekly summary does not send.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production — `pmbuddy.app` |
| `dev` | Active development — auto-deploys to a Vercel preview URL |

All new work goes to `dev`. Test on the Vercel preview URL. Merge to `main` only when confirmed working and the owner says to.

---

## Supabase tables

| Table | Purpose |
|---|---|
| `pm_projects` | All project data (scope, timeline, risks, milestones, tasks, team, compliance, planning, history, insights). Shared notes live in `scope.boardNotes`. |
| `projects` | Validation reports (hackathon / startup) |
| `documents` | Generated PM plans, reports, quick docs |
| `project_members` | Team invites and roles |
| `feedback` | In-app feedback submissions |
| `chat_messages` | PM Buddy Assistant chat history |
| `ai_usage` | Per-user daily AI request counts (enforces `AI_DAILY_LIMIT`) |
| `user_flags` | One-time email flags |

User profile and email choices (name, role, use case, age confirmation, unsubscribe) are stored on the user's Supabase account, not in a table.

---

## Privacy

- Sign-up asks people to confirm they are 16 or older and agree to the Terms and Privacy Policy.
- Fonts are hosted on this site, so visitors' browsers do not contact Google to load them.
- Google Analytics only runs after someone presses Accept. "Cookie settings" in the footer lets them change their mind.
- The feedback form (Tally) loads only when the feedback button is pressed.
- Marketing emails carry an unsubscribe link, and people can switch them off in Settings.

---

## How this is built

PM Buddy is built by a non-developer working with Claude as the developer. Work happens on the `dev` branch, one task per commit, and the owner reviews it on the Vercel preview before saying "merge".

**Before starting any new session:** read `CONTEXT.md` first, then the relevant files. Work from the actual current code, not memory.

**Before pushing:** run `CI=true npm run build`. It treats warnings as errors, so unused variables fail the build.

**Commit message convention:**
- `feat:` new feature
- `fix:` bug fix
- `refactor:` restructure without behaviour change
- `chore:` config, dependencies, non-code changes

---

## Links

- **Production:** https://pmbuddy.app
- **About:** https://pmbuddy.app/about.html
- **Privacy Policy:** https://pmbuddy.app/privacy.html
- **Terms of Service:** https://pmbuddy.app/terms.html
- **Contact:** hello@pmbuddy.app

---

*PM Buddy. Built for everyone running a project without a PM degree.*
