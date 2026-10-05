# Design skills: sources

These are third-party Claude Code skills, copied into the project on 2026-10-06 so everyone on the team uses the same versions.
Each folder keeps its upstream license file.
To update a skill, copy it again from the commit shown below and re-apply any changes listed under "Local changes".

| # | Skill (folder) | Upstream | Commit | License | Local changes |
|---|---|---|---|---|---|
| 1 | `frontend-design` | anthropics/skills `skills/frontend-design` | 683bc88e56f3 | Apache-2.0 (LICENSE.txt) | none |
| 2 | `apple-design` | emilkowalski/skills `skills/apple-design` | e8a175de22ae | MIT | none |
| 3 | `beautiful-shadows` | MengTo/Skills `agent-skills/web-design/beautiful-shadows` | d11f4384af1a | MIT | `demo/` (images, sample page) left out |
| 4 | `accessibility` | addyosmani/web-quality-skills `skills/accessibility` | afa8da942115 | MIT | none |
| 5 | `design-crit` | Superfuture/design-review `design-review/skills/design-review` | d4d2609b53fc | **no license published** | Renamed from `design-review` because gstack's `/design-review` already uses that name. Removed §0 "usage ping" (sent an anonymous ID to superfuture-metrics.pages.dev on every run). Removed §5 "Pro mode" (sent code and markup to a third-party worker; also showed an upsell). |
| 6 | `emil-design-eng` | emilkowalski/skills `skills/emil-design-eng` | e8a175de22ae | MIT | none |
| 7 | `shadcn` | shadcn-ui/ui `skills/shadcn` | 0e3abd65a977 | MIT | `agents/`, `assets/`, `evals/` (non-Claude metadata) left out |
| 8 | `adapt` | pbakaus/impeccable `.claude/skills/impeccable/reference/adapt.md` | 87a6ab0c145a | Apache-2.0 | Pulled out of the larger `impeccable` skill as a standalone skill, web only. Added frontmatter, removed the link to native platforms, and changed the `/impeccable polish` handoff to `better-interface` / `design-crit`. |
| 9 | `better-interface` + `better-accessibility`, `better-colors`, `better-layout`, `better-typography`, `better-ui`, `better-writing`, `interface-review` | jakubkrehel/skills `skills/*` | 267330e1adfc | MIT | `agents/` (Codex metadata) left out. `better-interface` hands work to the six `better-*` skills, so they come with it. |
| 10 | `interaction-design` | wshobson/agents `plugins/ui-design/skills/interaction-design` | 46891e7e60da | MIT | none |

## Overlaps with globally installed skills

- `frontend-design` is also installed as the `frontend-design:frontend-design` plugin. The two have different names, so they don't conflict.
- gstack's `/design-review` (live site QA plus fixes) is a different skill from `design-crit` (critique only).
- `interface-review` sets `disable-model-invocation: true`, so it runs only when you call it with `/interface-review`. It reviews uncommitted changes, branches, and PRs.
