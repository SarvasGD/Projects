# HDMS Prototype
A minimal proof-of-concept for the Hearthstone Deck Matchup Simulator.

## What it does

- Accepts two Standard deck codes.
- Decodes them using the official `deckstrings` library.
- Estimates a "win path profile" for each deck (aggro / midrange / control / combo / mixed) based on mana curve heuristics.
- Runs a Monte Carlo simulation where each game samples a win path for each deck and compares their strengths.
- Outputs winrates, average turns, average HP on win, win path distributions, and turn distribution.

## What it does NOT do

- Implement full Hearthstone rules.
- Use real card effects or game state.
- Persist decks or test history.
- Provide winlines.

This is a **skeleton** to validate the UI and the concept of multiple win paths. The real engine will be built separately.

## Getting started

```
npm install
npm run dev
```

Open http://localhost:3000.

## Deck codes to test

Use any Standard deck codes. For example, you can find codes in the conversation history or on HSReplay.

## Next steps

See `docs/05_task_pack.md` in the main HDMS documentation for the full roadmap.