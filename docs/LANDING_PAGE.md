# HireFlow AI — Landing Page Build Spec

> A build brief for an **award-winning, motion-rich, single-page** marketing site for HireFlow AI.
> You'll build this later in Claude Code — this doc is the blueprint: positioning, section-by-section
> copy, the centerpiece workflow animation, the motion system, and a step-by-step build plan.
> **No page is built yet.** The resume-builder is a **roadmap** item (not shipped) — feature it as "coming soon."

---

## 0. TL;DR — what you're building

A one-page site that makes visitors feel: *"this is the ultimate job-hunt tool."* One dark, warm, editorial canvas. Big Instrument-Serif headlines, amber glow, mono microcopy. The **hero** hooks; the **animated workflow pipeline** (Upload → Extract → Personalize → Send → Track) is the star and does the explaining through motion, not paragraphs. Scroll-driven storytelling, restrained palette, purposeful animation. Built with **React + Framer Motion** (recommended) or **vanilla HTML + GSAP ScrollTrigger**.

**Positioning line:** *Your entire job-outreach pipeline, on autopilot — from a messy recruiter spreadsheet to personalized, paced, tracked outreach.*

---

## 1. Positioning & narrative

| | |
|---|---|
| **Product** | HireFlow AI |
| **Category** | Job-hunt outreach automation |
| **One-liner** | Turn a spreadsheet of recruiters into personalized, paced, tracked cold emails — without the grind. |
| **Who it's for** | Job seekers & new grads doing outreach at scale (10s–100s of HRs), tired of manual mail-merge + spreadsheet tracking. |
| **Core promise** | You bring the list. HireFlow extracts, personalizes, sends at a human pace, and tracks every reply — end to end. |
| **Tone** | Confident, calm, premium, a little editorial. **Not** hypey/startup-loud. Think "quiet luxury" for software. |

**Four pillars (the spine of the whole page):**
1. **Extract** — drop any Excel/CSV, even messy; it finds the right columns and who each person is.
2. **Personalize** — mail-merge into your template; clean, human, per-recipient.
3. **Send, paced** — a human-like drip with a daily cap and random order, so Gmail never flags you.
4. **Track** — live send toasts + an application pipeline (Replied → OA → R1/R2/R3 → Offer).

**+ Roadmap:** **Resume builder** — a tailored resume per job profile, auto-attached to each email. *(Coming soon — show it as a teaser, not a live feature.)*

---

## 2. Visual system (match the app exactly)

Pull these straight from the product so the site and app feel like one brand.

**Palette (warm-dark, amber):**
```
bg          #0c0a08   (near-black, warm)
surface     #15110d
surfaceHi   #1d1813
border      #2a231c
borderHi    #3d352b
text        #f5efe4   (warm off-white)
textDim     #a39685
textMuted   #6b6053
accent      #e8a838   (amber / gold — the one hero color)
accentDim   #9c7321
accentSoft  rgba(232,168,56,0.12)
success     #7ba368   (muted green)
danger      #c45a4a   (muted red)
info        #6892b8   (muted blue)
```

**Type:**
```
Display  'Instrument Serif'  — big editorial headlines (this carries the "award-winning" feel)
Body     'Inter Tight'       — 300–600 weights
Mono     'JetBrains Mono'    — labels, eyebrows, stats, code-y microcopy (UPPERCASE, letter-spaced)
```
Fonts link:
`https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`

**Texture & depth:**
- Very subtle film grain/noise overlay (2–4% opacity) over `bg`.
- Soft radial amber glows behind the hero and the pipeline (blurred `accent` at ~8–12% opacity).
- Hairline `border` dividers; cards on `surface`/`surfaceHi` with 1px `border`, ~10–14px radius.
- Generous whitespace. Let the serif breathe (big line-height, large sizes).

---

## 3. Motion system (the "award-winning" part)

**Principles**
- Motion *explains and rewards*, never decorates for its own sake.
- Everything animates on **transform + opacity** only (never layout props) for 60fps.
- One signature move repeated (the "amber trace" — a line/particle that draws along a path in `accent`).
- Respect `prefers-reduced-motion`: swap scroll-scrubbed animation for simple fades, disable looping/parallax.

**Techniques to use (pick, don't use all at once)**
- **Scroll-reveal**: sections fade + rise 16–24px, staggered children (60–90ms stagger).
- **Text mask reveal** for the hero headline (each line clips up from a mask).
- **Scroll-scrubbed pipeline** (the centerpiece — see §5): the email "packet" advances as you scroll.
- **Count-up** stats (e.g., "588 contacts in one drop").
- **Magnetic / glow CTA** buttons (subtle cursor attraction + amber glow on hover).
- **Cursor spotlight**: faint radial `accentSoft` following the cursor on dark sections.
- **Marquee** of company-type words or contact rows, slow, low-contrast.
- **SVG line-draw**: `stroke-dashoffset` 1→0 for connectors as they enter view.

**Timing & easing (defaults)**
```
reveal:      450–650ms, ease [0.16, 1, 0.3, 1]  (expo-out)
stagger:     70ms
hover:       180ms, ease-out
scrub:       tied to scroll progress (no fixed duration)
loop idle:   6–10s, ease-in-out, infinite (hero ambient only)
```

**Libraries (recommend)**
- **React path:** Framer Motion (`motion`, `useScroll`, `useTransform`, `whileInView`, `AnimatePresence`) + optionally Lenis for smooth scroll.
- **Vanilla path:** GSAP + ScrollTrigger + (optional) Lottie for any pre-baked complex bits.
- Keep it lean — no heavy 3D unless you want a single WebGL hero (optional stretch).

---

## 4. Page structure — sections, copy, motion

Order top → bottom. Copy is ready-to-use (swap freely).

### 4.1 Nav (sticky, minimal)
- Left: wordmark **HireFlow** (Instrument Serif) + small amber dot.
- Right: `Workflow` · `Features` · `Roadmap` · **Get started** (accent button).
- Behavior: transparent at top; on scroll, `surface` bg + backdrop-blur + hairline bottom border fade in.

### 4.2 Hero
- **Eyebrow (mono, uppercase):** `THE JOB-HUNT COPILOT`
- **Headline (serif, huge):**
  > Send hundreds of *personal* cold emails. Sound like you wrote every one.
- **Subhead (body, textDim):**
  > HireFlow turns a spreadsheet of recruiters into personalized, paced, tracked outreach — extraction to inbox to interview, all in one place.
- **CTAs:** primary **Start sending** (accent) · ghost **See how it works** (scrolls to §5).
- **Motion:** headline text-mask reveal on load; ambient hero animation behind (see §6 for 3 options); soft amber radial glow; subtle parallax on the glow vs. text.

### 4.3 The problem (short, one screen)
- **Serif line:** *The outreach works. The grind doesn't.*
- Three mono bullets with tiny icons, low-key:
  - `COPY-PASTE` — mail-merging names by hand.
  - `SPREADSHEET HELL` — tracking replies in 12 tabs.
  - `SPAM FLAGS` — blasting too fast, getting throttled.
- **Motion:** each bullet slides in on scroll; a faint "messy" scribble that straightens into a clean line as you scroll (transition into §4.4).

### 4.4 THE WORKFLOW — centerpiece animated pipeline
**This is the section that "explains how it works through animation."** Full spec in **§5**. Headline:
- **Eyebrow:** `HOW IT WORKS`
- **Serif:** *One drop. Five moves. Zero busywork.*
- Then the scroll-scrubbed pipeline.

### 4.5 Feature deep-dives (alternating rows)
Four rows, image/animation on one side, copy on the other, alternating L/R. Each gets a small self-contained animation.

1. **Extraction that reads messy sheets**
   > Drop any Excel or CSV — banner rows, typo'd headers, honorifics and all. HireFlow finds company, name, email, and role, and even tags each contact as HR, recruiter, exec, or founder.
   *Anim:* raw spreadsheet rows (with a junk "title" row) → columns snap into labeled fields; a stray `Ms.` peels off a name.

2. **Personalization that stays human**
   > Your template, merged per recipient. `{{first_name}}`, `{{company}}`, and the role you're applying for — swapped cleanly, honorifics stripped, every email reading like you meant it.
   *Anim:* `Hi {{first_name}},` morphs to `Hi Neha,`; `{{company}}` → `Acme`.

3. **A send queue that won't get you flagged**
   > Emails drip out one at a time, in random order, at a human pace you set — with a daily cap. Pause, resume, cancel anytime. It survives restarts and never sends twice.
   *Anim:* envelopes released one-by-one along a timeline; a pace dial; a "cap 100/day" meter filling.

4. **Track every application to the offer**
   > The moment a mail sends, it lands in your tracker. Follow each one through Replied → OA → Interview R1/R2/R3 → Offer, with live toasts as they go out.
   *Anim:* a row's stage checkboxes fill in sequence; sent/failed toasts pop in the corner.

### 4.6 "Watch it work" — live toast moment
A short, delightful beat: mock the app UI (or a stylized frame) and let **sent / failed / stuck toasts** animate in the corner, exactly like the product. Copy: *Real-time, every send.*

### 4.7 Roadmap — Resume builder (teaser)
- **Eyebrow:** `COMING SOON`
- **Serif:** *Soon: a resume that rewrites itself for every role — and rides along on the email.*
  > Point HireFlow at a job profile; it tailors your resume to match and attaches it automatically to the outreach. One pipeline, application-ready.
- **Motion:** a resume document that re-lays-out its bullets/keywords per role, then folds into a paperclip on an envelope. Add a subtle `IN DEVELOPMENT` mono tag so it reads as roadmap, not live.

### 4.8 Final CTA
- **Serif:** *Your next role is a spreadsheet away.*
- Primary **Start sending** + one-line reassurance (mono): `Your Gmail · your list · your pace.`
- Big amber glow; the signature amber trace draws underneath the headline.

### 4.9 Footer
- Wordmark, tiny tagline, minimal links (Workflow, Features, Roadmap, GitHub), copyright. Mono, low contrast.

---

## 5. Centerpiece spec — the animated workflow pipeline

The single most important animation. Goal: as the visitor scrolls this section, an **email "packet" travels through 5 stages**, each stage lighting up and playing a micro-animation, so the whole product is understood in ~6 seconds of scrolling.

**Layout**
- Desktop: horizontal pipeline, 5 nodes on a connecting line, section is `position: sticky` while an inner track scrolls (scroll-scrub).
- Mobile: vertical pipeline, top → bottom, same scrub idea.

**The 5 stages (node = SVG icon + mono label + one-line caption + micro-anim):**
| # | Stage | Icon idea | Micro-animation when active |
|---|---|---|---|
| 1 | **Upload** | tray / file-down | a spreadsheet file drops into a tray; a banner/junk row greys out and is skipped |
| 2 | **Extract** | columns → fields | scattered cells fly into labeled slots (Company · Name · Email · Role); a small `HR` tag stamps on |
| 3 | **Personalize** | merge braces | `{{first_name}}` flips to `Neha`, `{{company}}` to `Acme`; a `Ms.` honorific peels away |
| 4 | **Send** | paper plane / envelope | envelopes release **one at a time** along a dotted path; a pace dial ticks; `100/day` meter |
| 5 | **Track** | checklist / kanban | Replied → OA → R1 → R2 → R3 checkboxes fill in sequence; result flips to `OFFER` (green) |

**The connecting motion (the signature move)**
- An **amber line** (`accent`, `stroke-dasharray`) draws left→right (or top→down) as scroll progresses (`stroke-dashoffset` mapped to scroll).
- An **email packet** (small envelope/glowing dot) rides the line; its position = scroll progress. As it reaches each node, that node "activates" (scale 1→1.04, icon anim plays, label brightens `textDim`→`text`, a soft `accentSoft` halo).
- Passed stages stay lit; upcoming stages sit dim.

**Implementation notes**
- **React/Framer:** wrap the section in a tall spacer; `const { scrollYProgress } = useScroll({ target, offset: ["start start","end end"] })`. Map `scrollYProgress` (0→1) to: the packet's `x/y` (useTransform), the line's `pathLength` (Framer supports `pathLength` on `motion.path`), and each node's active state (activate when progress crosses its threshold: 0.1, 0.3, 0.5, 0.7, 0.9).
- **GSAP:** `ScrollTrigger` with `pin: true`, `scrub: 1`; a timeline that moves the packet along a `MotionPath`, tweens `pathLength`/`drawSVG`, and toggles node classes at labels.
- Keep the SVG a single artboard so the packet can follow one path. ~1200×260 (desktop), reflow to vertical on mobile.
- **Reduced motion:** render all 5 nodes lit + a static connecting line; no scrub, no packet.

**Fallback if you want it simpler first:** build it as an **auto-playing loop** (6–8s) instead of scroll-scrubbed — same visuals, `AnimatePresence`/GSAP timeline on `repeat: -1`. Ship that, upgrade to scroll-scrub later.

---

## 6. Hero animation — pick one

1. **Contact stream (recommended, on-brand):** faint dots (contacts) drift in from the left, get "tagged" (tiny HR/CTO labels), and flow rightward into a single amber stream that becomes the pipeline. Ties the hero to §5.
2. **Amber aurora mesh:** a slow, blurred gradient mesh (bg → accentDim) drifting behind the headline. Cheapest, very elegant, always-safe.
3. **Live app peek:** a subtly animating, stylized mock of the dashboard (rows populating, a toast popping). More literal; more work.

Start with **#2** for guaranteed elegance, upgrade to **#1** if time allows.

---

## 7. Copy bank (swap freely)

**Headline options**
- *Send hundreds of personal cold emails. Sound like you wrote every one.*
- *From spreadsheet to interview — one pipeline.*
- *Outreach at scale. Personal at heart.*
- *The job hunt, on autopilot. The voice, still yours.*

**Subheads**
- *Extraction to inbox to interview — HireFlow runs the whole outreach pipeline so you can just… apply.*
- *Drop your recruiter list. We handle the rest — personalize, pace, send, track.*

**Feature blurbs** — see §4.5 (ready to lift).

**CTA microcopy**
- `Start sending` · `See how it works` · `Your Gmail · your list · your pace.`

**Stats to feature (count-up)** — use real, honest numbers:
- `588` contacts parsed from one messy sheet
- `100 / day` paced, cap-protected sends
- `5` stages, fully automated
- `0` double-sends, ever

---

## 8. Tech stack & scaffold (recommended)

**Recommended:** Vite + React + Framer Motion + Tailwind (or plain CSS-in-JS to reuse the app's tokens). Single page, statically deployable.

```
landing/
  index.html            # fonts link + root
  src/
    main.jsx
    App.jsx             # section composition
    theme.js            # paste the palette + fonts from §2
    sections/
      Nav.jsx  Hero.jsx  Problem.jsx  Workflow.jsx
      Features.jsx  ToastMoment.jsx  Roadmap.jsx  CTA.jsx  Footer.jsx
    components/
      Pipeline.jsx      # §5 centerpiece
      Reveal.jsx        # whileInView fade+rise wrapper
      Magnetic.jsx      # CTA hover
      GrainOverlay.jsx  Glow.jsx
    assets/
      icons/  *.svg     # 5 stage icons
      pipeline.svg      # single artboard for the scrub
```

- **Alternative (self-contained):** one `index.html` with inline CSS + GSAP via `<script>` — good if you'd rather deploy a single file.
- **Deploy:** Vercel or Netlify (drag-and-drop). Add OG image + favicon (amber dot on `bg`).

---

## 9. Build plan (do it in this order in Claude Code)

1. **Scaffold** the Vite+React app; drop in `theme.js` (palette+fonts from §2), grain overlay, base layout + smooth scroll (Lenis optional).
2. **Static layout first** — build every section (§4) with real copy, no motion. Get spacing/typography feeling premium (this is 80% of the "award-winning" look).
3. **Reveal system** — add the `Reveal` wrapper (fade+rise, stagger) to all sections.
4. **Hero animation** — start with option #2 (aurora), wire the headline mask reveal + CTA glow.
5. **The Pipeline (§5)** — build the SVG artboard, then the auto-loop version, then upgrade to scroll-scrub. This is the hero deliverable — spend the most time here.
6. **Feature micro-animations** (§4.5) — one per row, `whileInView`.
7. **Toast moment** (§4.6) + **Roadmap teaser** (§4.7).
8. **Polish** — `prefers-reduced-motion`, responsive (mobile pipeline = vertical), keyboard focus states, lazy-load below-the-fold, check 60fps (only transform/opacity).
9. **Meta** — title, description, OG image, favicon; **deploy**.

---

## 10. Accessibility & performance (non-negotiables)

- Honor `prefers-reduced-motion` everywhere (static fallbacks defined per section above).
- Semantic HTML (`header/nav/main/section/footer`, one `h1`), real focus rings, alt text on meaningful SVGs, `aria-hidden` on decorative motion.
- Animate only `transform`/`opacity`; `will-change` sparingly; lazy-load offscreen assets; keep JS lean.
- Color contrast: `text` on `bg` is fine; don't put `textMuted` on small body copy.

---

## 11. The "award-winning" bar (what good looks like)

Restraint + one confident idea, executed cleanly: **big editorial serif type, a nearly-monochrome warm-dark palette with a single amber accent, generous space, and motion that tells the product's story (the pipeline) instead of decorating.** If a visitor scrolls once and *understands the whole product from the animation alone*, it's working. Cut anything that doesn't serve that.

---

## 12. Out of scope (for now)

- The **resume builder** is **not built** — landing shows it as a roadmap teaser only (§4.7).
- No real auth/app embedding on the landing; the CTA can link to the app or a waitlist.
