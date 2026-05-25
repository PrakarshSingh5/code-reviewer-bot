# 🤖 ReviewBot — AI-Powered Code Review GitHub App

A GitHub App that listens to pull request events, analyzes code diffs using Claude (Anthropic), and automatically posts structured inline review comments — bugs, security issues, and suggestions — directly on the PR.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20 |
| Language | **TypeScript** |
| Framework | Express |
| GitHub SDK | `@octokit/app` + `@octokit/rest` |
| LLM | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Config | `js-yaml` + `micromatch` |
| Deployment | Railway / Fly.io |

---

## Project Structure

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
│   │   ├── llmService.ts         # Claude API — analyze diffs, chunk, filter
│   │   └── reviewer.ts           # Post GitHub Review + failure comments
│   └── utils/
│       └── signature.ts          # HMAC-SHA256 webhook verification
├── src/__tests__/
│   ├── signature.test.ts
│   └── llmService.test.ts
├── reviewbot.yml                 # Example config (place in target repos)
├── .env.example                  # Environment variable template
├── tsconfig.json
├── .eslintrc.json
└── package.json
```

---

## Quick Start

### 1. Clone & install

```bash
git clone <your-repo-url>
cd ai-code-review-bot
npm install
```

### 2. Create a GitHub App

1. Go to **GitHub → Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set **Webhook URL** to your ngrok/Railway URL: `https://<your-url>/webhook`
3. Set a **Webhook secret** (random string)
4. Required permissions:
   - **Pull requests**: Read & Write
   - **Contents**: Read-only (to read `reviewbot.yml`)
5. Subscribe to events: **Pull request**
6. Generate and download a **private key** (.pem file)

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:

```env
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

> **Tip:** For the private key, replace actual newlines with `\n` when pasting into a single-line env var.

### 4. Run locally

```bash
# Dev mode with hot-reload
npm run dev

# In another terminal, expose via ngrok
ngrok http 3000
```

### 5. Run tests

```bash
npm test
```

### 6. Build for production

```bash
npm run build    # Compiles TypeScript → dist/
npm start        # Runs dist/index.js
```

---

## Config File (`reviewbot.yml`)

Place this file in the root of any repo where the app is installed:

```yaml
enabled: true
skip_files:
  - "**/*.lock"
  - "**/dist/**"
  - "**/*.min.js"
min_severity: suggestion   # bug | security | suggestion | nitpick
max_comments: 10
```

---

## Flow

```
PR opened/updated
  → Webhook → HMAC verify
  → Fetch diff (GitHub API)
  → Read reviewbot.yml
  → Send diff to Claude (chunked if large)
  → Filter by severity + max_comments
  → Post inline review comments + summary
```

---

## Deployment (Railway)

1. Push to GitHub
2. Create a new Railway project → **Deploy from GitHub repo**
3. Add all env vars from `.env.example` in Railway dashboard
4. Railway auto-builds and deploys on every push

---

## Milestones

| Week | Goal |
|------|------|
| 1 | GitHub App registered, webhook handler + HMAC verify, diff fetched |
| 2 | LLM integration, inline comments posted to a real PR |
| 3 | Config file, error handling, deployed to Railway, README + demo GIF |
