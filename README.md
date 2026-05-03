# GrantAI 🎯
**Your AI Grant Officer**

> $800B in grants go unclaimed every year. GrantAI fixes that.

<img width="1919" height="802" alt="image" src="https://github.com/user-attachments/assets/bdd72253-33e1-41df-aa6d-ef91a42e5a18" />

---

## ✨ Features

| Feature | Description |
|---|---|
| 📸 **Vision Onboarding** | Upload a photo — Claude reads it and builds your nonprofit profile instantly |
| 🎯 **Autopilot Mode** | Describe your org in one sentence, get matched grants + a drafted application in 8 seconds |
| 🧠 **Neural Network Visualization** | Cinematic animated background on every page |
| 📊 **Win Probability Scoring** | Animated gauge showing your likelihood of winning each grant |
| 🌌 **Grant Universe** | Heatmap visualization of all your matched grants by fit score |
| ⚔️ **Battle Mode** | Compare two grants head-to-head with AI verdicts |
| 🎤 **Pitch Perfect** | Voice-based pitch analyzer with radar chart scoring |
| ⏰ **Deadline Pressure Cooker** | Compact strip showing grants expiring within 30 days |
| 💬 **Ask Claude** | Floating AI chat assistant on every authenticated page — streams real-time answers with your grant context |
| ✍️ **Application Workspace** | Full draft editor with inline AI rewrites (more compelling, more concise, stronger opening) |

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite + TailwindCSS + Framer Motion + shadcn/ui
- **Backend:** Express.js + Node.js with SSE streaming
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** Claude Sonnet 4 (vision + streaming chat + grant matching)
- **Monorepo:** pnpm workspaces with shared type-safe API contract (OpenAPI + Orval codegen)
- **Built with:** Replit Agent in 24 hours

---

## 🏆 Built For

**Replit's 10 Year Buildathon**, in partnership with Anthropic.

---

## 🎬 Demo

[Live App](your-url-here) | [Demo Video](loom-link)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- Anthropic API key (or Replit AI Integrations)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/grantai.git
cd grantai

# Install dependencies
pnpm install

# Set environment variables
cp .env.example .env
# Fill in DATABASE_URL, AI_INTEGRATIONS_ANTHROPIC_BASE_URL, AI_INTEGRATIONS_ANTHROPIC_API_KEY, SESSION_SECRET

# Push database schema
pnpm --filter @workspace/db run push

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the frontend (in a separate terminal)
pnpm --filter @workspace/grant-ai run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic API base URL (via Replit AI Integrations) |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `SESSION_SECRET` | Secret for session signing |

---

## 📁 Project Structure

```
grantai/
├── artifacts/
│   ├── api-server/          # Express.js backend
│   │   └── src/routes/      # API routes: users, grants, matches, chat, vision, autopilot, battle, pitch
│   └── grant-ai/            # React + Vite frontend
│       └── src/
│           ├── pages/       # Dashboard, Grant Detail, Application Workspace, Battle, Showcase
│           └── components/  # AskClaude, VisionModal, AutopilotModal, GrantUniverse, WinGauge...
├── lib/
│   ├── api-spec/            # OpenAPI contract (source of truth)
│   ├── api-client-react/    # Generated React Query hooks
│   ├── api-zod/             # Generated Zod validation schemas
│   ├── db/                  # Drizzle ORM schema + migrations
│   └── integrations-anthropic-ai/  # Anthropic SDK client wrapper
└── pnpm-workspace.yaml
```

---

## 🔑 Key AI Features Explained

### Vision Onboarding
Claude's vision API reads an uploaded image (logo, team photo, field work) and extracts org name, mission, location, focus areas, and funding needs — no typing required. The profile is built in seconds with animated phase transitions.

### Autopilot Mode
One sentence → Claude matches against the full grants database → ranks by fit score and win probability → drafts a 300-word application. All in ~8 seconds with a cinematic loading experience.

### Ask Claude Chat
A floating assistant on every authenticated page. Each message is sent with the user's full profile + top 5 matched grants as context, so Claude's answers reference specific grant names, deadlines, and fit reasoning. Responses stream token-by-token with a typewriter effect.

---

## 📜 License

MIT — build on it, ship it, win grants with it.

---

*Built in 24 hours for Replit's 10 Year Buildathon 🏗️*
