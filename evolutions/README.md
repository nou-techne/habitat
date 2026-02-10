# Evolutions

Development history of the Habitat patronage accounting system, organized by roadmap phases and sprint deliverables.

## Structure

```
evolutions/
├── roadmaps/           ← Strategic planning documents (4 versions)
│   ├── ROADMAP.md                              (Sprints 0-20: Design)
│   ├── ROADMAP_EVOLUTION_2026-02-09.md         (Sprints 21-50: Implementation)
│   ├── ROADMAP_PHASE3_2026-02-09.md            (Sprints 51-60: Infrastructure)
│   └── ROADMAP_TIO_INTEGRATED_2026-02-10.md    (Sprints 61-132+: Current)
└── sprints/            ← Sprint deliverable artifacts
    ├── production/     (Sprints 115-117)
    ├── enhancements/   (Sprints 118-122)
    └── cloud-credits/  (Sprints 123-126+)
```

## Timeline

| Phase | Sprints | Version | Focus |
|-------|---------|---------|-------|
| Design | 0-20 | 0.1 | REA ontology, seven-layer pattern stack, compliance framework |
| Implementation | 21-50 | 0.2 | Schemas, API specs, event bus, operating agreement templates |
| Infrastructure | 51-60 | 0.3.x | Deployment, frontend foundation, UI components |
| Foundation → Interface | 61-100 | 0.3.x-0.4.x | Seven layers built bottom-up (State → View) |
| Validation | 101-108 | 0.5.0 | 134 tests, 88% coverage, performance benchmarks |
| Production | 109-120 | 1.0.0 | Deployment, Q1 allocation, enhancements |
| Ecosystem | 121-132+ | 1.1.0 | API docs, multi-coop, $CLOUD credits, Superfluid |

See `journal/CHANGELOG.md` for detailed per-sprint changes.
