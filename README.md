# 🤖 ReviewBot — AI-Powered Code Review GitHub App

A GitHub App that listens to pull request events, analyzes code diffs using **Gemini 2.5 Flash**, and automatically posts structured inline review comments — bugs, security issues, and suggestions — directly on the PR.

---

## ✨ Demo

> Open a PR on any repo where this app is installed → Bot automatically reviews the diff and posts inline comments like this:

```
🐛 [bug] Potential null reference on line 42 — check if `user` is defined before accessing `.id`
🔒 [security] Hardcoded API key detected — move to environment variable
💡 [suggestion] Consider using `Array.flat()` instead of nested loops here
```

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Language | **TypeScript** |
| Framework | Express |
| GitHub SDK | `@octokit/app` + `@octokit/rest` |
| LLM | Google Gemini 2.5 Flash (free tier) |
| Config | `js-yaml` + `micromatch` |
| Deployment | Railway / Fly.io / Render |

---

## 📁 Project Structure

```
.
├── src/
│   ├── index.ts                  # Entry point — starts Express server
│   ├── app.ts                    # Express app setup
│   ├── types/
│   │   └── index.ts              # Shared TypeScript interfaces & enums
│   ├── routes/
│   │   └── webhook.ts            # POST /webhook — HMAC verify + dispatch
│   ├── handlers/
│   │   └── eventHandler.ts       # pull_request / installation orchestration
│   ├── services/
│   │   ├── githubClient.ts       # Octokit App singleton (JWT + install token)
│   │   ├── githubApi.ts          # Fetch + filter PR files
│   │   ├── configLoader.ts       # Read reviewbot.yml from repo
│   │   ├── llmService.ts         # Gemini API — analyze diffs, chunk, filter
│   │   └── reviewer.ts           # Post GitHub Review + failure comments
│   └── utils/
│       └── signature.ts          # HMAC-SHA256 webhook verification
├── src/__tests__/
│   ├── signature.test.ts
│   └── llmService.test.ts
├── reviewbot.yml                 # Example config (place in target repos)
├── .env.example                  # Environment variable template
├── tsconfig.json
└── package.json
```

---

## 🚀 Quick Start (Run it yourself in ~10 minutes)

### Step 1 — Clone & install

```bash
git clone https://github.com/PrakarshSingh5/code-reviewer-bot
cd code-reviewer-bot
npm install
```

### Step 2 — Get a free Gemini API key

1. Go to **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)**
2. Click **"Create API key"**
3. Copy the key (starts with `AIzaSy...`)

Free tier: **1,500 requests/day, 15 req/min** — more than enough for testing.

### Step 3 — Expose your local server

```bash
# Terminal 1 — start the bot
npm run dev

# Terminal 2 — expose to the internet
ngrok http 3010
```

Copy the ngrok URL (e.g. `https://abc123.ngrok-free.app`)

### Step 4 — Create your GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Fill in:
   - **App name**: anything (e.g. `my-review-bot`)
   - **Homepage URL**: your GitHub profile URL
   - **Webhook URL**: `https://<your-ngrok-url>/webhook`
   - **Webhook Secret**: generate one with `openssl rand -hex 32` and paste it
3. Set permissions:
   - **Pull requests** → Read & Write
   - **Contents** → Read-only
4. Subscribe to events: ✅ **Pull request**
5. Click **Create GitHub App**
6. Note down the **App ID** shown on the next page
7. Scroll down → **Generate a private key** → a `.pem` file downloads

### Step 5 — Configure `.env`

```bash
cp .env.example .env
```

Convert your private key to one line:
```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' ~/Downloads/*.pem | pbcopy
```

Fill in `.env`:
```env
GITHUB_APP_ID=<your app id>
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n<paste key here>\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=<the secret you generated>
GEMINI_API_KEY=<your AIzaSy... key>
PORT=3010
NODE_ENV=development
```

### Step 6 — Install the App on a repo

1. Go to your GitHub App page → **Install App**
2. Install on your account → select a test repo
3. Click Install ✅

### Step 7 — Test it!

Open a Pull Request on the repo where you installed the app.

You should see in your terminal:
```
[Webhook] Received event: pull_request / action: opened
[EventHandler] Processing PR #1 on yourname/yourrepo
[LLM] Sending 1 chunk(s) to Gemini
[EventHandler] Review posted for PR #1
```

And on GitHub → your PR will have inline AI review comments! 🎉

---

## ⚙️ Config File (`reviewbot.yml`)

Place this file in the root of any repo where the app is installed to customise behaviour:

```yaml
enabled: true
skip_files:
  - "**/*.lock"
  - "**/dist/**"
  - "**/*.min.js"
  - "**/*.test.ts"
min_severity: suggestion   # bug | security | suggestion | nitpick
max_comments: 10
```

| Field | Default | Description |
|-------|---------|-------------|
| `enabled` | `true` | Turn the bot on/off per repo |
| `skip_files` | `[]` | Glob patterns of files to skip |
| `min_severity` | `suggestion` | Minimum severity to report |
| `max_comments` | `10` | Max inline comments per PR (capped at 50) |

---

## 🔄 How It Works

```
PR opened/updated
  → GitHub sends webhook to /webhook
  → HMAC-SHA256 signature verified
  → Respond 200 OK immediately (GitHub requires < 10s)
  → Fetch PR diff (GitHub API)
  → Read reviewbot.yml from the PR branch
  → Send diff to Gemini 2.5 Flash (chunked if large)
  → Filter by severity + max_comments cap
  → Post inline review comments + summary on PR
```

---

## ☁️ Deploy to Railway (Permanent URL — no ngrok needed)

1. Push this repo to GitHub
2. Go to **[railway.app](https://railway.app)** → New Project → Deploy from GitHub repo
3. Add all env vars from `.env.example` in the Railway dashboard
4. Railway gives you a permanent URL like `https://yourapp.railway.app`
5. Update your GitHub App's **Webhook URL** to `https://yourapp.railway.app/webhook`

Now the bot runs 24/7 without needing your laptop on! ✅

---

## 🧪 Run Tests

```bash
npm test
```

---

## ❓ Troubleshooting

| Error | Fix |
|-------|-----|
| `Invalid signature` | Webhook secret in `.env` doesn't match what's set in GitHub App settings |
| `secretOrPrivateKey must be an asymmetric key` | Private key in `.env` is still the placeholder — paste your real `.pem` content |
| `No installation ID in payload` | Webhook set on repo directly — should come from the GitHub App. Install the app on the repo. |
| `GEMINI_API_KEY is not set` | Add your Gemini key to `.env` |
| Bot not triggering | Check GitHub App → Webhook → Recent Deliveries for errors |
