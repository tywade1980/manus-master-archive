# Manus Master Archive — Wade (tywade1980)

> **Central data dump for every file, skill, script, system, and piece of code ever created by Manus for Wade.**
> Every future Manus session should push its outputs here at the end of the session.

---

## How to Use This Repo

At the end of every Manus session, tell Manus:
> *"Push everything you built this session to tywade1980/manus-master-archive"*

This ensures nothing is ever lost between sessions.

---

## Folder Structure

| Folder | Contents |
|--------|----------|
| `skills/` | All Manus Skills — modular SKILL.md files + scripts + references |
| `systems/` | Full system builds (Caroline AI app+server, Centauri OS, etc.) |
| `webapps/` | Full webapp builds (ConstructionPro, NextGenBuildPro, BMS, etc.) |
| `agents/` | AI agent configs, prompts, and pipelines |
| `configs/` | Config files, JSON state files, API key registry |
| `data/` | Data exports, spreadsheets, estimates, reports |
| `sessions/` | Per-session raw output folders (date-stamped) |
| `session-outputs/` | Polished session reports and proposals |
| `misc/` | Everything else |

---

## Skills Inventory (18 skills)

| Skill | Description | Status |
|-------|-------------|--------|
| `bgm-prompter` | Background music prompt crafting | Stub — no scripts |
| `canva-mcp` | Canva MCP integration guide | Stub — no scripts |
| `caroline-ai` | Caroline AI companion interface | Scripts present |
| `centauri-connectors` | RunPod, OpenHands, Aider connectors | Template present |
| `centauri-interlock` | Mandatory Centauri OS architectural standard | Full |
| `centauri-os` | Centauri OS design + voice command interfaces | Missing voice_commands.md |
| `construct-ai` | Master construction BI — orchestrates WCC + RSMeans | Stub — no scripts |
| `excel-generator` | Professional Excel spreadsheet creation | Stub — no scripts |
| `github-gem-seeker` | GitHub open source solution finder | Stub — no scripts |
| `gws-best-practices` | Google Workspace CLI best practices | Stub — no scripts |
| `internet-skill-finder` | Skill/plugin discovery tool | Script present |
| `neurorank` | NeuroRank™ emotionally intelligent cognitive system | Architecture doc present |
| `rsmeans-cost-estimator` | RSMeans construction cost estimation | Reference present |
| `runpod-connector` | RunPod GPU pod management (GraphQL API) | Full scripts present |
| `skill-creator` | Guide for creating/updating skills | Full |
| `skill-share` | Publish/receive skills via GitHub | Full scripts present |
| `wade-custom-carpentry` | WCC project management, estimates, proposals | Scripts + templates present |
| `wade-ecosystem` | Wade's full business/project context | Full references |
| `wade-telephony` | AI receptionist + smart in-call service | Stub — no scripts |

---

## Systems Inventory

| System | Path | Description |
|--------|------|-------------|
| Caroline AI | `systems/caroline-ai/` | Expo app (SDK 54) + FastAPI server v2 |

---

## Webapps Inventory

> **Note**: These folders exist but are currently empty. Code needs to be pushed here.

- `webapps/nextgenbuildpro` — NextGen BuildPro Android construction management app
- `webapps/constructpro` — ConstructionPro (Blitzy build)
- `webapps/bms` — BMS (Blitzy build)

---

## Key Projects Map

```
Wade Ecosystem
├── Caroline AI (voice-first companion)
│   ├── systems/caroline-ai/caroline-app-v2  (Expo SDK 54 mobile app)
│   ├── systems/caroline-ai/caroline-server-v2  (FastAPI + Dolphin Mistral on RunPod)
│   └── skills/caroline-ai  (Manus skill: messaging, voice gen, state sync)
│
├── Centauri OS (custom Android OS)
│   └── skills/centauri-os  (architecture + voice command spec)
│
├── NeuroRank™ (cognitive decision engine — patent pending)
│   └── skills/neurorank  (architecture doc + Mini Me Technologies LLC)
│
├── ConstructAI (construction business intelligence)
│   ├── skills/construct-ai  (orchestrator skill)
│   ├── skills/wade-custom-carpentry  (WCC ops, proposals, materials)
│   └── skills/rsmeans-cost-estimator  (cost data)
│
├── Wade Telephony (AI receptionist)
│   └── skills/wade-telephony  (call routing, smart in-call)
│
└── RunPod Infrastructure
    └── skills/runpod-connector  (GraphQL API wrapper)
```

---

*Last updated: Apr 24, 2026*
*Maintained by Claude Code on behalf of Wade (tywade1980)*
