# Cube Draft Timer

A PWA pick timer for Magic: The Gathering cube drafts. It runs on iPhone, Android, iPad and laptops, and works offline once installed.

## Features
- Configurable packs, cards per pack and cards per pick.
- The timer starts at a set time and gets shorter each pick, down to a minimum. It resets every pack.
  Defaults: 60s, −5s per pick, 10s minimum.
- A review period between packs (default 60s) that tells players which way the next pack passes.
- Pass direction for pack 1, with optional alternating (left → right → left).
- The last card of each pack is untimed (optional).
- An optional deck-building timer at the end.
- When time runs out, the alarm sounds for 5 seconds (adjustable; 0 = until Next is tapped) and the screen flashes until someone taps **Next**. Android also vibrates.
- A warning beep before time runs out (default 10s) and ticks during the last 3 seconds.
- Optional spoken instructions ("Open pack 1. Pick 1. Pass left.").
- Built-in presets, and you can save your own.
- Keeps the screen awake with the Screen Wake Lock API.
- Survives reloads: the draft state is saved and resumes using the clock, so the time stays accurate.
- Keyboard shortcuts on laptops: `Space` pauses or resumes, `Enter`/`→` goes to the next step, `←` goes back.

## Development
```sh
npm install
npm run dev      # http://localhost:5173 (also exposed on your LAN for phone testing)
npm test         # engine unit tests
npm run build    # production build in dist/
npm run preview  # serve the production build
```

The draft logic lives in `src/engine/draft.ts` as pure, tested functions: settings go in, a list of steps comes out.
`src/lib/useDraftRunner.ts` runs the timer, sounds and saved state on top of it.

## Deploying
`dist/` is a static site that uses relative paths, so it works on GitHub Pages, Netlify, Vercel or Cloudflare Pages.
It must be served over HTTPS for installation and the service worker to work.

## Installing
- **iPhone/iPad:** open the URL in Safari, then tap Share → **Add to Home Screen**.
- **Android:** in Chrome, open the menu and tap **Install app**.
- **Desktop Chrome/Edge:** click the install icon in the address bar.

## iOS notes
- Web audio follows the silent switch, so turn silent mode off.
- iOS doesn't support vibration from web apps, so the alarm is sound plus a flashing screen.
- Keep the app open on screen during the draft. The wake lock keeps the screen on, but iOS pauses web apps that are
  in the background. The timer catches up correctly when you come back.
