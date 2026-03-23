# PM Buddy

Stop building on assumptions. Validate your idea and get an honest report in minutes.

## What it does

Two focused modes:

**Hackathon** — 6 questions, 4 minutes. Sprint plan, risk check, and pitch framework tailored to your timeline and team.

**Startup** — 10 questions, 8 minutes. Deep validation covering market, competitors, growth, scalability, and a 90-day roadmap.

## Deploy

```bash
npm install
npm start        # Test locally at localhost:3000
npm run build    # Build for production
```

Push to GitHub. Connect to Vercel. Deploy. Free.

## Google Analytics

Replace `G-XXXXXXXXXX` in `public/index.html` with your actual Google Analytics Measurement ID from analytics.google.com.

## File structure

```
src/
  components/
    LandingScreen.js      Landing page with 2 mode cards
    QuestionWizard.js     Question flow with auto-advance
    ResultsDashboard.js   Tabbed results report
  data/
    questions.js          All questions for both modes
    analysis.js           Scoring and output generation
  lib/
    analytics.js          Google Analytics event tracking
    icons.js              SVG icon components
  App.js
  index.js
  index.css
public/
  index.html              Add your Google Analytics ID here
```

## Built for builders

Free forever. No sign-up. No paywalls.
