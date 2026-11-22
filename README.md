[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/cryptotainment/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/cryptotainment/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# The Meridian Mint Job — Heist Game

A top-down 2D heist game that runs in a desktop browser from static files, no network needed. You are a lone thief breaking into the Meridian Mint after hours: plan the job, sneak past the guards and their vision cones, dodge the sweeping security cameras, grab the loot, and escape to the getaway van.

## Play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static server).

- **Pick an entry point** on the briefing screen — Roof, Service Tunnel, or Front Lobby. Each changes where you start and how fast one guard patrols.
- **WASD / arrow keys** — move. **Shift** — sneak: slower, quieter, harder to spot. **Mouse click** — click to move.
- Guards patrol fixed routes with **vision cones**. Stand in a cone with a clear line of sight and their **detection meter** fills; break line of sight behind a crate, shelf or wall and it drains — a near miss can be recovered from.
- **Cameras** sweep back and forth with red cones. Being seen fills the **ALARM meter** in the HUD; a full meter is a lockdown and every guard hunts you. Stand next to a junction box (⚡) and press **E** to cut it — that camera goes dark for 10 seconds.
- **Dark shadow zones** slow detection. **Crates, shelves and walls block sight.**
- Collect **3 loot items** (gold bars, the jewel case, the mint ledger — the crown jewels on the last floor), then reach the glowing green **getaway van**. 3 levels, rising difficulty: more guards, more cameras, faster patrols, tighter cover. 3 lives — get caught and the level restarts.
- Sound is synthesised WebAudio only: footsteps, guard steps that get louder as he closes in, an alert sting, a pickup chime, a camera buzz. No audio files.

## Screenshots

Deterministic scenes of the game's own code: `game/index.html?shot=cover` (level 1 mid-play), `?shot=play` (level 2, guard closing in, alarm half full), `?shot=win` (level 3, escape reached, "Clean getaway!").

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
