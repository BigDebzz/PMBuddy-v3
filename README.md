# 📋 PM Buddy v2

> A smart project management and validation tool for builders, entrepreneurs, hackathon teams, and anyone who wants to build the right thing and manage it properly.

**Live demo:** [pmbuddy-v.vercel.app](https://pmbuddy-v.vercel.app)

---

## What PM Buddy Does

PM Buddy guides you through 4 different modes depending on where you are:

| Mode | Who it's for | Questions | Time |
|---|---|---|---|
| ⚡ Hackathon | Teams building at a hackathon | 7 | 5 min |
| 🚀 Startup | Founders building for the long term | 12 | 10 min |
| 💡 Entrepreneur | Solo builders validating an idea | 10 | 8 min |
| 📋 Project Management | Anyone managing a project properly | 9 | 8 min |

Each mode gives you:
- A validation score with strengths and risks
- An action plan or sprint plan tailored to your situation
- Methodology recommendation (Agile, Scrum, Kanban)
- Real-world proof points from African and global startups
- Best practices backed by research from 21,000+ startup founders

---

## What Makes This Different

- **No fluff.** Every question is there for a reason. Every output is actionable.
- **Built for African markets.** Nigerian regulators, local case studies, realistic market context.
- **PM built in from day one.** Not just validation — execution. Milestones, risks, quality standards, compliance.
- **Completely free.** No paywalls, no credits, no sign-up required.

---

## 🚀 Deploy to GitHub + Vercel (Step by Step)

### STEP 1 — Install Node.js
1. Go to https://nodejs.org
2. Download the **LTS version**
3. Install it (click through defaults)
4. Open Terminal (Mac) or Command Prompt (Windows)
5. Type `node --version` — you should see `v18` or higher

---

### STEP 2 — Test it locally first
1. Unzip the `pmbuddy-v2` folder onto your Desktop
2. Open Terminal and navigate to it:
```bash
cd Desktop/pmbuddy-v2
npm install
npm start
```
3. Your browser will open at `http://localhost:3000`
4. Test all 4 modes to make sure everything works
5. Press `Ctrl+C` to stop

---

### STEP 3 — Create a GitHub repository
1. Go to https://github.com and log in
2. Click **+** → **New repository**
3. Name it: `pmbuddy-v2`
4. Set to **Public**
5. Do NOT check "Add a README" (we already have one)
6. Click **Create repository**

---

### STEP 4 — Push code to GitHub
In your terminal, inside the `pmbuddy-v2` folder:
```bash
git init
git add .
git commit -m "Initial commit — PM Buddy v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pmbuddy-v2.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your actual GitHub username.

Refresh your GitHub page — you should see all your files there.

---

### STEP 5 — Deploy to Vercel
1. Go to https://vercel.com
2. Click **Sign Up** → **Continue with GitHub**
3. Authorize Vercel
4. Click **Add New → Project**
5. Find `pmbuddy-v2` in the list → click **Import**
6. Vercel auto-detects everything — do not change any settings
7. Click **Deploy**
8. Wait 1–2 minutes...
9. 🎉 Your app is live at `https://pmbuddy-v2-yourusername.vercel.app`

---

### STEP 6 — Update the app in future
Any time you change files:
```bash
git add .
git commit -m "Describe what you changed"
git push
```
Vercel auto-redeploys within 30 seconds. No extra steps.

---

## 📁 File Structure

```
pmbuddy-v2/
├── public/
│   └── index.html              # HTML entry point
├── src/
│   ├── components/
│   │   ├── LandingScreen.js    # Home page with 4 mode cards
│   │   ├── QuestionWizard.js   # Question flow with tooltips and progress
│   │   └── ResultsDashboard.js # Tabbed results with score, plan, proof points
│   ├── data/
│   │   ├── questions.js        # All 38 questions across 4 modes
│   │   └── analysis.js         # Scoring engine, roadmaps, best practices
│   ├── App.js                  # Main app and navigation
│   ├── index.js                # React entry point
│   └── index.css               # Design system (white bg, black fonts)
├── .gitignore
├── package.json
├── vercel.json                 # Vercel deployment config
└── README.md                   # This file
```

---

## 🛠️ Customising the App

| What you want to change | Where to look |
|---|---|
| Questions in any mode | `src/data/questions.js` |
| Scoring logic | `src/data/analysis.js` |
| Real-world examples | `src/data/analysis.js` — proof points functions |
| Best practices text | `src/data/analysis.js` — best practices functions |
| Colours and fonts | `src/index.css` — CSS variables at the top |
| App name | `src/components/LandingScreen.js` and `src/App.js` |
| Landing page text | `src/components/LandingScreen.js` |

---

## 🗺️ Roadmap (Agile Phases)

### Phase 1 — Complete ✅
- 4 modes (Hackathon, Startup, Entrepreneur, PM)
- 38 questions with tooltips and best practice callouts
- Scoring engine with strengths, risks, and recommendations
- White background, black fonts, professional design
- Mobile responsive

### Phase 2 — Next Sprint
- Supabase authentication (email + password login)
- Save and reload projects from database
- Competitor research (live web search built into question flow)
- Drag and drop interactive PM board

### Phase 3 — Future
- PDF export of full report
- Team collaboration (share project with co-founders)
- Progress tracking dashboard
- Nigerian regulatory compliance checker

---

## 💰 Cost to Run

| Service | Cost |
|---|---|
| Vercel hosting | Free |
| GitHub | Free |
| **Total** | **$0/month** |

---

## 🌍 Built For

Entrepreneurs, hackathon teams, freelancers, and small businesses — especially in Nigeria and across Africa.

---

PM Buddy · Free forever · Built for builders 🌍
