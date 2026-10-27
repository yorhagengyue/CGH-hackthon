# The demo video

Remotion 4 project. Every scene is a real screen recording (web app via Playwright, iPhone app via the iOS simulator)
inside a phone or browser frame, with a one-second title card and one caption. Two compositions: `Demo` (1920×1080)
and `DemoPortrait` (1080×1920). `Sample` is the 20-second style check cut from screenshots.

```bash
cd videos
npm install
npm run preview          # Remotion Studio
npm run render:sample    # out/sample.mp4
npm run render           # out/demo-1080p.mp4 (needs media/ recordings)
```

| Path | What |
|---|---|
| `src/scenes/index.ts` | The edit: one entry per feature (title, icon, caption, seconds, media file) |
| `src/SceneView.tsx` | Title card → footage → caption, 300 ms fades, phone / browser frames |
| `src/components/` | Icons, text styles (Manrope), intro and outro cards |
| `script.md` | The script for review |
| `record/ios.sh`, `record/web.mjs` | How the recordings are made (simulator `recordVideo`, Playwright `recordVideo`) |
| `assets/` | Logo and screenshots (Remotion's public dir); `media/` holds recordings and is not committed |
