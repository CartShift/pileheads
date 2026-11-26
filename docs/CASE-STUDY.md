# PILEHEADS: from physical card game to real-time multiplayer product

*A product engineering case study: game design, state consistency, interactive UX and full-stack delivery.*

## The idea

PILEHEADS started from a simple question: **can a physical-first card game preserve its tactile, fast and social feeling when people play remotely?**

The product combines a custom 54-card deck with a browser tabletop. It supports local bots, private multiplayer rooms, multiple card designs, a printable playtest kit, and a newer React-based interface. The physical game and the digital simulator inform each other: the simulator helps test rules, while real tabletop expectations shape the UX.

**My role:** product concept and iteration, game-rule design, full-stack implementation, UI/UX direction, integration testing and deployment.

## The engineering challenge

The hard part was not drawing cards on a screen. It was maintaining one understandable game state while different players act at different times.

- **Fast interventions:** SNAP and SLAM can happen between normal turns. The next player must not be delayed by a visual effect or a pending animation.
- **Hidden information:** each player must see their own hand without accidentally receiving the hidden deck or another player's concealed cards.
- **Complex rules:** face-up, hand and blind layers, grouped special cards, DUMP targets, four-of-a-kind burns and optional endgame variants produce unusual edge cases.
- **Cross-device UX:** players must understand physical events, even when they only see a small mobile screen.
- **Safe evolution:** the original Classic simulator needed to remain usable while a React/Next.js tabletop was introduced.

## What I built

### Deterministic rules engine

The canonical JavaScript engine validates moves, handles bot turns and supports seeded simulations. Rather than copying gameplay rules into each view, both Classic and React consume the same logic.

### Server-authoritative multiplayer

Online rooms use a Node API backed by Neon PostgreSQL. The server validates moves and uses room revisions to handle conflicting requests. Seat-specific views keep hidden cards private, and reconnect logic restores the shared table.

### Real-time feedback with recovery

Authenticated WebSocket updates tell clients about room changes and social reactions. HTTP remains the path for game commands and a fallback for recovery. This separates **what happened** from **how it is presented**.

### Two versions of the tabletop

The original vanilla JavaScript interface focuses on tactile, physical-card interaction. A Next.js 16 / React 19 / TypeScript version explores a modern component-based table, responsive layout and event-driven motion. Both are served from one Node/Render deployment, not separate game services.

### Testing the unusual cases

The project includes engine regressions, multiplayer/privacy checks, browser acceptance and deterministic balance experiments. These tests help isolate regressions such as stale SNAP opportunities, wrong card-layer selection, out-of-order state updates and confusing animation sequences.

## Architecture at a glance

```text
Classic browser                 React / Next.js browser
       \                              /
        \-- canonical game rules ---/
                 |
          online room commands
                 |
        authoritative Node API
                 |
        Neon PostgreSQL + revision
                 |
        WebSocket room update
                 |
          both browsers render
```

See the [detailed architecture](ARCHITECTURE.md).

## Decisions and lessons

**Fairness before effects.** Visual feedback only describes a committed action. It must never determine priority, interrupt the next turn, expose hidden cards or misrepresent what moved.

**Protect the trusted version during a redesign.** The React interface was added alongside the Classic game so it could be tested against established behavior rather than replacing it prematurely.

**Simulation is evidence, not player research.** Seeded bot matches are useful for identifying balance risks and reproducing loops. They do not prove that a game feels fun or fair to humans.

**Use the smallest operational architecture that fits.** A static Next export and a single Render Node service avoid maintaining separate frontends and cross-origin infrastructure. The costs are a coupled deployment and the limitations of the hosting tier.

**Build for observation.** Explicit room revisions, health/readiness probes, regression suites and scoped production checks make it easier to distinguish an animation bug from an engine or network error.

## Technology

JavaScript · TypeScript · React 19 · Next.js 16 · Node.js 24 · WebSockets · Neon PostgreSQL · HTML/CSS · Motion · browser integration tests · GitHub Actions · Render.

## Status

PILEHEADS is an **actively developed playtest product**, not a certified commercial multiplayer service. CI includes automated checks; actual production readiness, visual polish on physical devices, accessibility and live two-device play require separate acceptance evidence.

**Explore:** [Classic tabletop](https://stack-card-game-t7vx.onrender.com/pilehead/index.html) · [React tabletop](https://stack-card-game-t7vx.onrender.com/play) · [Deck gallery](https://stack-card-game-t7vx.onrender.com/pilehead/gallery.html) · [Rules](pilehead-design.md)

*The URLs are the configured Render host; their live availability must be checked before linking them from a public portfolio.*
