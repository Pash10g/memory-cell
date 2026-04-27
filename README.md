# MemoryCell — AI Chat with Persistent Memory

An AI chat assistant with **persistent long-term memory**, built on top of the [**`@mongodb-developer/vercel-ai-memory`**](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory) package and the [Vercel AI SDK](https://sdk.vercel.ai). MemoryCell remembers facts, past conversations, and user preferences across sessions — just like a real assistant would.

> 📦 Powered by [`@mongodb-developer/vercel-ai-memory`](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory) — a drop-in memory toolkit for Vercel AI SDK agents.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPash10g%2Fmemory-cell&env=MONGODB_URI,VOYAGE_API_KEY,AI_GATEWAY_API_KEY&envDescription=Required%20API%20keys%20for%20MemoryCell&envLink=https%3A%2F%2Fgithub.com%2FPash10g%2Fmemory-cell%23environment-variables&project-name=memory-cell&repository-name=memory-cell)

---

## Features

- 🧠 **Persistent memory** — semantic, episodic, procedural, and session memory layers, provided by [`@mongodb-developer/vercel-ai-memory`](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory)
- 💬 **Multi-session chat** — browse and resume past conversations from the sidebar
- ⚡ **Streaming responses** — real-time token streaming via Vercel AI Gateway
- 🔍 **Memory trace** — see which memories the AI recalled for each response
- 🌙 **Dark/light mode** — full theme support

## How It Works

MemoryCell is a showcase for the [**`@mongodb-developer/vercel-ai-memory`**](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory) package, which provides ready-made memory tools for any [Vercel AI SDK](https://sdk.vercel.ai) agent. The package exposes the following tools to the LLM:

| Memory Type | Description |
|---|---|
| `semantic_save` / `semantic_search` | Stores and recalls facts about the user (name, preferences, goals) |
| `episodic_save` / `episodic_search` | Records significant events and outcomes |
| `procedural_save` / `procedural_search` | Stores how-to knowledge and workflows |
| `session_append` / `session_recent` | Saves and restores conversation turns |
| `scratchpad_write` / `scratchpad_read` | Temporary working notes during multi-step tasks |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `VOYAGE_API_KEY` | ✅ | [Voyage AI](https://dash.voyageai.com/api-keys) key for generating memory embeddings |
| `AI_GATEWAY_API_KEY` | ✅ | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key for LLM routing |
| `AI_MODEL` | ❌ | AI model name (default: `google/gemini-3.1-flash-lite-preview`) |

See [`.env.example`](.env.example) for a template.

## Setup

### 1. MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user and whitelist your IP (or use `0.0.0.0/0` for Vercel)
3. Copy the connection string — this is your `MONGODB_URI`
4. The app will automatically create the required collections and vector search indexes on first run

### 2. Voyage AI

1. Sign up at [voyageai.com](https://www.voyageai.com)
2. Generate an API key at [dash.voyageai.com/api-keys](https://dash.voyageai.com/api-keys)
3. This is your `VOYAGE_API_KEY`

### 3. Vercel AI Gateway

1. Enable AI Gateway in your [Vercel dashboard](https://vercel.com/docs/ai-gateway)
2. Generate an API key — this is your `AI_GATEWAY_API_KEY`

## Getting Started (Local Development)

```bash
# Clone the repo
git clone https://github.com/Pash10g/memory-cell.git
cd memory-cell

# Install dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env.local

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Tech Stack

- [**`@mongodb-developer/vercel-ai-memory`**](https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory) — the memory engine at the heart of MemoryCell
- [Next.js 16](https://nextjs.org) — React framework
- [Vercel AI SDK](https://sdk.vercel.ai) — AI streaming & agent tools
- [Voyage AI](https://www.voyageai.com) — Text embeddings
- [MongoDB Atlas](https://www.mongodb.com/atlas) — storage backend used by `@mongodb-developer/vercel-ai-memory`
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) — UI components
