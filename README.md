# cubefaster

Interactive CFOP cheatsheet with timer, scramble generator, case trainer, and themed case images.

## File structure

```
cubefaster/
├── index.html          ← the main cheatsheet (served at /)
├── case_editor.html    ← the case image builder tool (served at /case_editor.html)
├── scrambles.js        ← case database + scramble generator (loaded by index.html)
├── images/             ← SVG case images (themeable)
│   ├── dot.svg
│   ├── i-shape.svg
│   ├── ...
│   └── z-perm.svg
└── README.md
```

## Timer modes

The timer has two modes (toggle button in the timer panel):

- **WCA Random** — generates a standard 20-move random scramble. Good for full solves.
- **Case Trainer** — generates scrambles that produce a specific OLL or PLL case. Use the chips below to pick which cases you want to drill (e.g., just Sune + Antisune, or all 7 OLL corners).

Trainer scrambles work by **inverting** each case's solving algorithm and applying random AUF + y-rotation, so the same case never produces the same scramble twice.

### Progressive hints

In Case Trainer mode the case name is **hidden by default** — you have to recognize it yourself. Hit the **Hint** button (or press **H**) to reveal information one stage at a time:

1. First press: shows the **case name** (e.g. "Pi", "Sune")
2. Each subsequent press: reveals **one more chunk** of the algorithm

Chunks are split intelligently — triggers like `(R U R' U)` stay together as a single chunk, while loose moves are revealed individually. So a Sune (`(R U R' U) (R U2 R')`) takes 3 presses to fully reveal: name → first trigger → second trigger. A Pi (`R U2 (R2 U' R2 U' R2) U2 R`) takes 6 presses since the loose moves around the trigger reveal one at a time.

## How case images work

The main page (`index.html`) has a tiny loader script that finds every `.alg-card[data-case="X"]` element, fetches `images/X.svg`, and **inlines** the SVG into the DOM. That way the SVG inherits the page's CSS variables (`--case-yellow`, `--case-dark`, etc.) and themes work correctly.

If you used `<img src="...">` instead, browsers sandbox the SVG and CSS variables wouldn't reach it. Inlining avoids that.

## Adding/updating a case image

1. Open `case_editor.html` in your browser.
2. Build the case by clicking stickers (Paint mode) or click two top stickers to draw arrows (Arrow mode).
3. Make sure the **Themeable (CSS vars)** toggle is selected.
4. Type the filename (e.g. `pi`) and click **Download SVG**.
5. Move the downloaded file into the `images/` folder, overwriting any existing version.
6. Refresh the cheatsheet — the new image appears.

## Adding a new alg card with an image

In the appropriate section, add:

```html
<div class="alg-card" data-case="my-case-name">
  <div class="alg-name">My Case</div>
  <div class="alg-desc">...</div>
  <div class="alg-body">
    <div class="alg-moves">R U R' U'</div>
    ...
  </div>
</div>
```

Then create `images/my-case-name.svg` with the editor.

If you want this case to be drillable in the trainer, also add it to the `CASES` object in `scrambles.js`.

## Hosting on GitHub Pages

1. Push to a public repo named `cubefaster` (or anything).
2. Settings → Pages → Source: Deploy from branch → main / (root) → Save.
3. Visit `https://USERNAME.github.io/cubefaster/`.
