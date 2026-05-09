# CoachMe+ — Judge evaluation (Generative UI Global Hackathon)

This document maps the submission to the **published judging criteria**: *working code*, *originality*, and *effective use of generative UI*, plus the hackathon stack (AG-UI, CopilotKit, A2UI, MCP).

---

## One-line thesis

**CoachMe+ is not “chat in, chat out.”** Video is analyzed with TwelveLabs (Pegasus + Marengo); the agent writes **structured coaching state** and invokes **frontend-rendered tools** so the athlete sees **forms, timelines, comparisons, and drill cards** — a full coaching workspace generated from **what’s in the clip**, not a transcript.

---

## Rubric (how a judge would score this)

### 1. Working code — **Strong**

| Evidence | Where |
|----------|--------|
| End-to-end path | Next.js → BFF `/api/copilotkit` → LangGraph (`apps/agent`) → shared agent state → `/coach` canvas |
| Video analysis | `apps/agent/src/twelvelabs_client.py` (normalized JSON contract + optional `video_duration`) |
| Agent tools | `analyze_boxing_clip` (`Command(update=…)`), `search_similar_techniques`, CoachMe prompt |
| Demo reliability | `COACHME_USE_CACHE=1` loads `apps/agent/src/coaching_cache.json` when TwelveLabs is slow |
| Loading UX | Intermediate emit → `coaching_status: "analyzing"` before Pegasus/cache returns |

**Risk:** Judges only see “working” if env is set (`GEMINI_API_KEY`, `TWELVELABS_*`, `COACHME_SKIP_NOTION=1`, Docker Intelligence for full `npm run dev`). Mitigation: cache mode + mock JSON path.

### 2. Originality — **Strong**

| Differentiator | Why it matters |
|----------------|----------------|
| **Sports / boxing** | Rare vs. generic productivity CRM submissions |
| **Video → UI** | Ground truth is pixels over time, not a paragraph |
| **Impossible-as-chat-only** | Correction timeline + scores + drills are **spatial and interactive** |

### 3. Generative UI (effective use) — **Strong**

| Pattern | Implementation |
|---------|----------------|
| **Shared state canvas** | LangGraph state mirrored to React via CopilotKit **`useAgent`** / AG-UI snapshots |
| **Controlled gen UI** | `useFrontendTool`: `highlightTechnique`, `generateDrill`, `showComparison` |
| **AG-UI** | CopilotKit runtime + LangGraph agent bridge (`apps/bff`) |
| **A2UI** | `injectA2UITool: true` in BFF |
| **MCP Apps** | BFF registers MCP server; run `npm run dev:full` for MCP surface |

---

## Protocols checklist (submission form)

Suggested wording:

> **AG-UI** — Agent ↔ frontend via CopilotKit runtime and LangGraph agent transport.  
> **CopilotKit** — React integration, generative UI, shared agent state.  
> **A2UI** — Enabled in `apps/bff` (`injectA2UITool: true`).  
> **MCP** — Optional MCP Apps surface via BFF config (`dev:full`).

---

## Transparency (recommended for description field)

TwelveLabs Pegasus/Marengo patterns may trace to prior CoachMe+ / video-AI work; **CopilotKit layer, LangGraph CoachMe tools, React `/coach` canvas, frontend tools, session state** were built for this hackathon scope.

---

## Fast demo for judges

```bash
cp .env.example .env && cp .env apps/agent/.env
# Set GEMINI_API_KEY, COACHME_SKIP_NOTION=1, TWELVELABS_* as needed.
# Optional: COACHME_USE_CACHE=1 in apps/agent/.env

npm run dev
```

Open **`http://localhost:3010/coach`**. Helper: **`npm run judge:coachme`**.

---

## Simulated overall placement

Against a typical global field: **finalist tier** if the demo runs cleanly on stage and the story above is narrated clearly. Winning usually requires **flawless demo execution** plus this **generative UI narrative**.
