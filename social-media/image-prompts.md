# Image prompts

Paste any of these into ChatGPT, Gemini, Copilot or Midjourney to generate the
picture yourself. They are written for the plain boxes-and-arrows look of a
school project diagram: clear, labelled, and readable at the size LinkedIn
shows it.

**Two things to check before posting any generated image.** Image models spell
badly, so read every word in the picture: a diagram with "Nepla" or "Diaster"
in it undoes the point. And LinkedIn crops to roughly 1200x627, so keep
important content away from the edges.

If a model produces mangled text, the reliable fix is to ask for fewer labels
and shorter ones, or to generate the picture without text and add the labels
yourself.

---

## 1. How it works — the main diagram

> Best for the launch post. This is the school-project flowchart look.

```
A clean, simple flowchart diagram on a dark charcoal background, drawn in the
style of a neat school project poster. Left to right flow with three labelled
stages connected by arrows.

STAGE 1 on the left, a vertical stack of four small rounded rectangles labelled
"BIPAD Nepal", "USGS", "GDACS", "NASA". Above them a heading "DATA SOURCES".

STAGE 2 in the middle, one larger rounded rectangle labelled "SERVER" with
three short lines of text inside reading "Check", "Combine", "Store". Above it
a heading "PROCESSING".

STAGE 3 on the right, a simple outline drawing of a smartphone showing a small
map with three coloured dots on it, red, orange and green. Above it a heading
"YOUR PHONE".

Thin white arrows connect stage 1 to stage 2, and stage 2 to stage 3. Flat
vector illustration, no gradients, no shadows, no photorealism. Colour palette
limited to dark charcoal background, white text, one blue accent and one red
accent. Generous empty space. Wide 16:9 composition.
```

---

## 2. The debugging post — bugs and fixes

> Pairs with `linkedin-debugging-post.md`.

```
A simple two column comparison diagram on a dark charcoal background, in the
style of a tidy school project poster. Flat vector illustration.

Left column headed "WHAT I SAW", containing three small rounded boxes stacked
vertically with short labels: "Site looks fine", "Buttons do nothing", "No
error message".

Right column headed "WHAT WAS WRONG", containing three matching boxes:
"Scripts blocked", "React never started", "Silent failure".

A thin white arrow points from each left box to the box beside it on the right.
At the bottom, one wide box spanning both columns reading "THE DANGEROUS BUGS
ARE THE QUIET ONES".

No gradients, no shadows, no photorealism. Dark charcoal background, white
text, one red accent for the left column and one green accent for the bottom
box. Plenty of empty space. Wide 16:9 composition.
```

---

## 3. The casualty figures story

> For the single-bug post. The strongest one to lead with.

```
A simple side by side comparison illustration on a dark charcoal background, in
the style of a clear school project poster. Flat vector, no photorealism.

On the left, a small rounded box containing the large number "28" in white,
with a small caption underneath reading "What my app showed".

On the right, a small rounded box containing the large number "1300" in red,
with a small caption underneath reading "What the news reported".

Between them a large white question mark. Below both boxes, one wide box
spanning the full width containing the words "SAME DISASTER. DIFFERENT
SOURCES."

Dark charcoal background, white text, one red accent. No gradients, no shadows.
Lots of empty space around the numbers so they read clearly when small. Wide
16:9 composition.
```

---

## 4. Hand-drawn variant

> If you want it to look sketched on paper rather than designed.

```
A hand drawn flowchart on white grid paper, in the style of a student's
notebook sketch, photographed from directly above. Drawn with a black fine
liner pen with slightly uneven lines.

Three labelled boxes connected left to right by hand drawn arrows. The first
box is labelled "SOURCES", the second "SERVER", the third "PHONE". A small
simple sketch of a mountain with a warning triangle beside the third box. One
red highlighter mark underlining the word "PHONE".

Natural soft daylight, subtle paper texture, no colour other than black ink,
the red highlighter and the pale blue grid lines. Wide 16:9 composition, shot
flat with no perspective distortion.
```

---

## 5. Phone mockup

> For the install post. Ask for no text on the screen, then screenshot the real
> app over it if you want the interface shown accurately.

```
A single modern smartphone shown straight on, centred, floating on a dark
charcoal background. The screen is a plain dark surface with a simple map on it
showing three small glowing dots in red, orange and green, and no text
anywhere.

Soft even lighting, a subtle reflection on the glass, thin bezels, no hands, no
desk, no other objects. Minimal product photography style. Generous empty space
to the left and right of the phone. Wide 16:9 composition.
```

---

## Tips that actually matter

**Ask for fewer words.** Every extra label is another chance at a spelling
mistake. Four or five short labels is the practical limit.

**Say the aspect ratio.** Add "wide 16:9" or "1200 by 630 pixels" or the model
will give you a square that LinkedIn crops badly.

**Repeat the constraints.** "No gradients, no shadows, no photorealism" is
worth saying even when it feels redundant. Models drift toward glossy 3D
renders unless told not to.

**Keep the palette to three colours.** Dark background, white text, one accent.
More than that and it stops looking deliberate.

**Generate four and pick one.** Text placement is close to random. It is
quicker to regenerate than to fight one image into shape.

**If the words come out wrong**, ask for the diagram with empty boxes and add
the text yourself in any slide tool. That is usually faster than a sixth
attempt.

---

## Already made, if you would rather not generate anything

- `workflow.png` — the three-stage diagram, 2400x1350
- `workflow-1200.png` — same, sized for a LinkedIn card
- `og-card.png` — the link preview card, used automatically when you post the
  URL
