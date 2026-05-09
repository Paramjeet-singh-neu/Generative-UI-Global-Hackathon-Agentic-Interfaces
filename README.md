# CoachMe+

**Agentic boxing coaching** for the **Generative UI Global Hackathon: Agentic Interfaces**. CoachMe+ uses **TwelveLabs** (Pegasus video analysis + Marengo similarity search) and **Gemini** behind a **LangGraph** deep agent. Analysis results land in shared agent state (`coaching_data`, `coaching_status`, `coaching_score_history`, …) so the **CopilotKit** canvas updates from the same snapshot the model sees — not from ad-hoc chat parsing. **Generative UI** appears in both places: a rich **`/coach`** surface (score rings, drills, correction timeline, automatic progress after two clips) and chat tools (`highlightTechnique`, `generateDrill`, `showComparison`).

![Hackathon Banner](apps/frontend/public/banner.jpg)

## Highlights

- **AG-UI / shared state** — Backend tool `analyze_boxing_clip` returns `Command(update=…)`; the UI reads `useAgent().state` via `mergeAgentState`. Intermediate **`coaching_status: analyzing`** is emitted while Pegasus runs.
- **TwelveLabs** — Official SDK in `apps/agent/src/twelvelabs_client.py`; schema-guided JSON; **`search_similar_techniques`** for reference clips. **`COACHME_USE_CACHE=1`** loads `apps/agent/src/coaching_cache.json` for demos without calling the API.
- **Video on canvas** — After **`analyze_boxing_clip`**, `coaching_data.video_url` comes from **`hls.video_url`** when streaming was enabled at upload. Cached demos: **`COACHME_DEMO_VIDEO_URL`**. HLS in Chrome/Firefox uses **`hls.js`** in `CorrectionMarker`; Safari uses native HLS; MP4 uses `<video src>`.
- **Coach mode** — Set **`COACHME_SKIP_NOTION=1`** in `apps/agent/.env` so the agent loads boxing tools (`apps/agent/main.py`, `apps/agent/src/agent.py`).
- **Tests** — **`npm test`** runs **`pytest`** (score history + Pegasus JSON parsing) and **`vitest`** (`mergeAgentState` / coaching fields).

## Stack (short)

| Layer | Role |
|--------|------|
| **Next.js** (`apps/frontend`) | `/coach` canvas, CopilotKit v2, `useFrontendTool` renderers |
| **LangGraph** (`apps/agent`) | Deep agent + `Command` state updates; `apps/agent/src/runtime.py` |
| **Gemini** | Default LLM — key in `.env` and `apps/agent/.env` |
| **TwelveLabs** | Pegasus + Marengo — `TWELVELABS_API_KEY`, `TWELVELABS_INDEX_ID` in `apps/agent/.env` |
| **CopilotKit Intelligence** | Threads, BFF, LangGraph deployment URL — see `.env.example` |

Model/runtime tweaks: [dev-docs/model-switching.md](dev-docs/model-switching.md).

## Quick start

1. **Env:** `cp .env.example .env` and `cp .env.example apps/agent/.env` (or sync keys per [`apps/agent/.env.example`](apps/agent/.env.example)).
2. Set **`GEMINI_API_KEY`** in **both** files. In **`apps/agent/.env`** set **`COACHME_SKIP_NOTION=1`**, **`TWELVELABS_API_KEY`**, and **`TWELVELABS_INDEX_ID`**. Optional: **`COACHME_USE_CACHE=1`**.
3. **`npm install`** then **`npm run dev`** (Docker + Intelligence stack + UI + agent on port **8133**).
4. Open **`http://localhost:3010/coach`**. Use **Load mock JSON** for an offline UI pass, or ask the coach to run **`analyze_boxing_clip`** with a real TwelveLabs **`video_id`**.

**Shortcuts on `/coach`:** **⌘/Ctrl+K** focuses chat · **⌘/Ctrl+M** loads mock JSON.

**Indexes:** `npm run verify:twelvelabs` from the repo root.

**Tests:** **`npm test`**.

Pre-flight **`scripts/check-env.sh`** skips Notion when **`COACHME_SKIP_NOTION=1`**. If something fails, see [dev-docs/troubleshooting.md](dev-docs/troubleshooting.md).

## Generative UI (this app)

CoachMe+ uses **controlled** React components driven by agent state (scores, drills, markers) plus **frontend tools** for chat-rendered cards. For the broader “controlled → declarative → open” picture, see the [CopilotKit Generative UI docs](https://docs.copilotkit.ai/generative-ui).

## Routes

| Path | Description |
|------|-------------|
| **`/`** | Hub with link to CoachMe+ |
| **`/coach`** | CoachMe+ canvas + CopilotKit sidebar |

## Project layout (CoachMe+)

| Area | Path |
|------|------|
| Boxing tools + score history | `apps/agent/src/agent.py`, `apps/agent/src/coachme_score_history.py` |
| TwelveLabs client | `apps/agent/src/twelvelabs_client.py` |
| System prompt | `apps/agent/src/prompts.py` (`COACHME_PROMPT`) |
| Coach route | `apps/frontend/src/app/coach/page.tsx` |
| Coaching UI | `apps/frontend/src/components/coaching/` |
| Types + state merge | `apps/frontend/src/lib/coaching/types.ts`, `apps/frontend/src/lib/leads/state.ts` |
| Tests | `apps/agent/tests/`, `apps/frontend/src/lib/leads/state.test.ts` |

## Documentation

Additional setup and architecture notes: [`dev-docs/`](dev-docs/) — [Setup](dev-docs/setup.md), [Architecture](dev-docs/architecture.md), [Threads](dev-docs/threads.md), [Troubleshooting](dev-docs/troubleshooting.md).

## License

MIT.

---

> **CoachMe+** — Generative UI Global Hackathon: Agentic Interfaces.
