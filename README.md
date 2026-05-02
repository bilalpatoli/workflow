# Workflow

AI-generated SOP training videos with quizzes, checklists, and manager dashboards.

## Structure

```
workflow/
├── apps/
│   ├── web/        # Person B — Next.js portal on Butterbase
│   └── api/        # Person A — Video generation pipeline
├── agents/         # Person C — Z.AI prompt agents
├── prompts/        # Raw prompt templates (markdown)
└── demo/           # Demo SOP input + recordings
```

## Owners

- **Kyle** — `apps/api/` video pipeline. Z.AI orchestration (planner → script → scene breakdown), Seedance per-scene clips, ElevenLabs TTS, FFmpeg stitch. Owns `/api/generate-video`.
- **Bilal** — `apps/web/` portal on Butterbase. Auth, DB schema (companies → SOPs → trainings → trainees → quiz_attempts), upload flow, training viewer, manager dashboard. Owns the Butterbase MCP integration.
- **Zo** — `agents/` + `prompts/` + `demo/`. Script, quiz, QA, checklist, retraining agents. Demo SOP, 3-slide deck, 2-min demo video, pitch.

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

See each app's README for details.
