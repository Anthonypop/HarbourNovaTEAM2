# NovaClear · HarbourNova Team 2

**Pass the work. Not the customer.**

NovaClear gives every multi-team case one named **Case Captain** who keeps the case from start to finish. Only the tasks move between teams. This repo is the "Make it real" demo for our pitch.

Live demo: https://harbournovateam2.vercel.app/

## The four screens

| Route | Who it is for | What it shows |
|---|---|---|
| `#/story` | Judges | Case HN-26-0135 played twice. **Before:** the case itself hops through 5 teams (4 owner changes, 51.0 h, satisfaction 1/5). **After:** the case tag stays with Mei and only task slips travel (0 owner changes, 1 story told). |
| `#/speak` | Customer (phone) | SPEAK intake. The customer explains once, by voice or text. The app asks one question, reads back "Here is what I heard", then names the owner. |
| `#/track` | Customer (phone) | The tracker. It shows who owns the case, a 4-step progress line and the four-part update: what happened, who owns it, what happens next, and when. |
| `#/console` | Case Captain and team leads | The management app. Unclaimed tasks with live waiting clocks; auto-assign (right skill, on shift, has room, fewest open tasks, ties broken at random); a confirm window with escalation to the team lead; plain updates to approve (billing lines need a person); and an audit trail. |

Approving an update in the Console moves the customer tracker on. Open both in the same browser to show this live.

## Evidence used (HarbourNova case pack)

- 46% of surveyed customers had to repeat their information (55 of 120, Customer Feedback).
- 29% repeat contact (139 of 480, Service Request Data).
- About 642 h of waiting against about 201 h of work (Process Timeline).
- HN-26-0102 (C04): 4 teams, 0 owner changes, 36.7 h, 4/5. One person kept the customer updated.

People, task names and the 20-second confirm window are illustrative demo data.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs dist/
```

Stack: Vite, React, TypeScript, plain CSS, Geist fonts and Lucide icons. Everything runs in the browser, with no backend. Voice input uses the browser Web Speech API (Chrome, Edge, Safari); typing works everywhere.

## Deploy

`vercel.json` sets the Vite build (`npm run build` → `dist`). Vercel deploys each push to `main`.
