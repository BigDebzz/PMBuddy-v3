# PM Buddy

**Project management for people who aren't project managers.**

PM Buddy is a web app that takes your existing project documents — a plan, a proposal, a brief, even a WhatsApp message — and turns them into a structured project with milestones, a task board, risks, a communication plan, and downloadable reports. No PM training required.

Built by a PMP-certified programs manager who kept watching smart people run projects with no structure — not because they didn't care, but because the tools assumed they already knew how to manage projects.

---

## What it does

**Upload your document, get a structured project**
Drop in a PDF, Word doc, or paste any text. PM Buddy reads it and automatically creates your project — milestones, risks, team, timeline — without you filling in a single form.

**Kanban task board**
Tasks and milestones live on the same board across To Do, In Progress, and Done columns. Flag blockers, add notes, track overdue items. Move things with one click.

**Plain English throughout**
No "RACI matrix." No "RAID log." No "methodology selection." Just: what are you building, what could go wrong, who needs to know, and what's next.

**AI-generated documents**
Generate a PM Plan, Progress Report, Funder/Grant Report, and Benefits Document from your live project data. Download as Word or PDF.

**Health check**
PM Buddy scores your project out of 100 and tells you exactly what's missing and how to fix it.

**Team and stakeholder management**
Invite team members, manage roles, track stakeholders, set reminders.

**Campaign support**
Create short-term campaigns and initiatives with their own structured plans.

**Validation tool**
Answer honest questions about your idea and get a detailed report with a score, strengths, gaps, and recommended next steps. Supports hackathon and startup modes.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Create React App) |
| Backend / DB | Supabase (auth, database, storage) |
| AI | Google Gemini API |
| Email | Brevo (transactional + newsletter) |
| Hosting | Vercel |
| PWA | Service worker + Web App Manifest |

---

## Project structure

```
PMBuddy-v3/
├── api/
│   ├── gemini.js              # AI text generation (Gemini API)
│   ├── broadcast.js           # Newsletter broadcast to all users
│   ├── invite.js              # Team invite emails
│   ├── notify.js              # Project notifications
│   ├── check-milestones.js    # Cron: milestone reminders
│   ├── check-inactive-users.js
│   ├── check-inactive-users-weekly.js
│   └── send-reminder.js
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── service-worker.js
│   ├── about.html
│   ├── privacy.html
│   └── terms.html
├── src/
│   ├── components/
│   │   ├── AuthScreen.js          # Login / signup
│   │   ├── LandingScreen.js       # Marketing page
│   │   ├── Dashboard.js           # Main hub
│   │   ├── ProjectWizard.js       # New project creation (5-step wizard)
│   │   ├── ProjectWorkspace.js    # Full project view (5 tabs)
│   │   ├── DocumentImport.js      # Import project from document
│   │   ├── BroadcastEmail.js      # Admin newsletter tool
│   │   ├── PMBuddyAssistant.js    # Floating AI chat
│   │   ├── DocumentGenerator.js   # Standalone doc generation
│   │   ├── QuestionWizard.js      # Validation question flow
│   │   ├── ResultsDashboard.js    # Validation report
│   │   ├── CampaignWizard.js      # Campaign creation
│   │   ├── QuickDoc.js            # Quick document creator
│   │   ├── RemindersPanel.js      # Project reminders
│   │   ├── TeamTab.js             # Team management
│   │   └── FeedbackButton.js      # In-app feedback
│   ├── data/
│   │   ├── questions.js           # Validation question sets
│   │   └── analysis.js            # Validation scoring logic
│   └── lib/
│       ├── supabase.js            # Supabase client
│       ├── gemini.js              # Gemini wrapper (validation)
│       ├── analytics.js           # Event tracking
│       └── icons.js               # Icon components
├── CONTEXT.md                     # Full project context (read before building)
├── package.json
└── vercel.json
```

---

## Environment variables

Set these in Vercel (Settings → Environment Variables):

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `BREVO_API_KEY` | Brevo email API key |

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production — `pmbuddy-v3.vercel.app` |
| `dev` | Active development — auto-deploys to preview URL |

All new work goes to `dev`. Test on the Vercel preview URL. Merge to `main` when confirmed working.

---

## Supabase tables

| Table | Purpose |
|---|---|
| `pm_projects` | All project data (scope, timeline, risks, milestones, tasks, team, compliance, planning, history, insights) |
| `projects` | Validation reports (hackathon / startup) |
| `documents` | Generated PM plans, reports, quick docs |
| `project_members` | Team invites and roles |
| `feedback` | In-app feedback submissions |

---

## How this is built

PM Buddy is built by a non-developer using a chat-based coding workflow: describe the feature to Claude, receive full component code, commit manually to GitHub via the web interface or GitHub Desktop.

**Before starting any new session:** share `CONTEXT.md` with Claude first, then the relevant component file(s). Claude works from the actual current code, not memory.

**Commit message convention:**
- `feat:` new feature
- `fix:` bug fix
- `refactor:` restructure without behaviour change
- `chore:` config, dependencies, non-code changes

---

## Links

- **Production:** https://pmbuddy-v3.vercel.app
- **About:** https://pmbuddy-v3.vercel.app/about.html
- **Privacy Policy:** https://pmbuddy-v3.vercel.app/privacy.html
- **Terms of Service:** https://pmbuddy-v3.vercel.app/terms.html

---

*PM Buddy — Built in Nigeria. Built for everyone running a project without a PM degree.*
