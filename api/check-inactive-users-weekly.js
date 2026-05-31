{
  "buildCommand": "npm run build",
  "outputDirectory": "build",
  "framework": "create-react-app",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/gemini.js": { "maxDuration": 60 },
    "api/send-reminder.js": { "maxDuration": 15 },
    "api/check-milestones.js": { "maxDuration": 60 },
    "api/notify.js": { "maxDuration": 15 },
    "api/check-inactive-users.js": { "maxDuration": 30 },
    "api/check-inactive-users-weekly.js": { "maxDuration": 60 }
  },
  "crons": [
    {
      "path": "/api/check-milestones",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/check-inactive-users",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/check-inactive-users-weekly",
      "schedule": "0 10 * * 1"
    }
  ]
}
