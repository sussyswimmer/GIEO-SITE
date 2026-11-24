# GIEO Brand Reference

**Sources used:** GIEO Org Info Google Doc (EN + VI tabs, team job descriptions), GIEO Facebook page (logo avatar, 20/10 Vietnamese Women's Day post, "Nhìn lại một mùa GIEO" season recap video post). Added in November 2026 (`09-feedback.md`): GIEO's first feedback message, their printed Nối Nếp leaflet as photographed on the stall table, and three photo albums (the Lotte Mall Tây Hồ stall, the Mai Châu trip, the inspection trip to Mai Châu).

**Not accessible:** the Canva pitch deck (`DAG_bPa2c2o`) returned "permission denied" both through the Canva API and in the browser. Every hex value below is eyedropped from screenshots of the logo and the 20/10 post, so treat them as close estimates. GIEO's own doc says all public work MUST follow their branding guidelines: before launch, compare these tokens against the deck or their brand kit and correct them in `src/styles/tokens.css` only.

---

## 1. Identity facts (use exactly, never embellish)

| Field | Value |
|---|---|
| Full name | Girls' Initiative for Education and Opportunities (GIEO) |
| Meaning | "gieo" is Vietnamese for **to sow**: planting seeds of hope, opportunity and lasting change for girls in rural and mountainous Vietnam |
| Who runs it | A student-led social initiative founded and operated by high school students in Hanoi |
| Support | Selected for the **IB Global Youth Action Fund** (International Baccalaureate) |
| Product partner | **Chie Dù Pù Dù Pà**, an enterprise founded in 2011 that works with ethnic minority communities on traditional handicrafts (doc also spells it "Chie Dupudupa"; use "Chie Dù Pù Dù Pà") |
| Community | H'mong women brocade artisans and their children, especially daughters |
| Products | Contemporary lifestyle products made with traditional brocade weaving. Today that is one collection, **Nối Nếp**, made with Chie Dù Pù Dù Pà: the **Nối Bag** / Túi Nối (brocade handbag, id `bag`) and the **Nếp Keychain** / Móc Nếp (lipstick holder, id `lipstick`). The names come from GIEO's printed leaflet (`09-feedback.md` F2) and are DRAFT until GIEO confirms them for the web. GIEO makes nothing else today: no mug, no coaster. The leaflet also lists a zip wallet, a fold wallet and prices; none of them is on the site until GIEO asks. Each collection uses one ethnic group's pattern; profits from it go back to that group |
| Email | gieovietnam2026@gmail.com |
| Instagram | @gieo.vietnam |
| Facebook | facebook.com/gieo.vietnam (page: "GIEO - Girls' Initiative for Education and Opportunities") |
| Hashtags | #gieovietnam #socialenterprise #nonprofit #womenempowerment #educationempowerment |

Spelling: English copy uses **H'mong**, Vietnamese copy uses **H'Mông** (both as in GIEO's doc). Keep each language consistent.

**Open, for GIEO (`00-open-questions.md` #13):** GIEO's Org Info doc says H'mong throughout, and so does the site copy taken from it. The Nối Nếp leaflet and GIEO's info sheet say the patterns come from the weaving of the Thái people in Chiềng Châu, Mai Châu. Until GIEO settles it, their own sentences stay exactly as they wrote them, and anything new about the products (collection copy, labels, alt text) names no ethnic group.

Pronunciation (for voiceover): "gieo" is one syllable. Hanoi accent: roughly "zeh-oo" said fast.

## 2. Logo

Observed on the Facebook avatar:
- Wordmark "GIEO" in a high-contrast didone serif, deep plum ink. The "I" is a thin calligraphic swash rather than a straight stem.
- A fine single-line lotus illustration in blush pink sits behind the "E-O", with faint line-art above it (looks like soft ridges; confirm with GIEO).
- Sits on a warm cream circle.

Rules:
- Get the vector (SVG) from GIEO. **Never redraw or retype the wordmark.** Until the SVG arrives, use `assets/logo/` raster with a `TODO(logo-svg)` comment.
- Clear space: the height of the "O" on all sides. Minimum width 96 px on screen.
- Light backgrounds: plum wordmark. Dark/photo backgrounds: cream wordmark, lotus line stays blush.
- The lotus line-art is the brand's motion hook: it can be drawn on (SVG stroke animation) and it is the shape the 3D lotus resolves into.

## 3. Color tokens (estimated, verify)

| Token | Hex | Where it was seen | Use |
|---|---|---|---|
| `--plum-ink` | `#2E2340` | Logo wordmark | Headlines on light, logo, primary buttons |
| `--cream` | `#F7F0EA` | Logo background | Page background (default) |
| `--paper` | `#F2F1EF` | 20/10 post background | Alternate section background |
| `--blush-line` | `#E6B3C2` | Logo lotus line-art | Hairlines, dividers, icon strokes |
| `--lotus-pink` | `#EE6FA0` | 20/10 lotus, "Việt Nam" italic | Accent words, links, 3D petal tips |
| `--petal-soft` | `#F7B9CF` | 20/10 lotus inner petals | 3D petal base, hover fills |
| `--peach-glow` | `#FBD5B4` | 20/10 blurred sun | Radial glow backgrounds |
| `--stem-mint` | `#6FD3A8` | 20/10 lotus stem | Sprout, stem, "growth" accents only (sparingly) |
| `--ink` | `#1C1A1E` | 20/10 display type | Body headings on paper |
| `--ink-soft` | `#6E6A70` | 20/10 body italic | Body text, captions |

Brocade thread colors are **not** in this table on purpose. Sample them from GIEO's real product photos (`assets/photos/products/`) and add them as `--thread-1..n`. Do not invent "H'mong colors".

Contrast: `--lotus-pink` on `--cream` fails WCAG AA for body text. Use it only at 24 px+ or for decorative accents; links in body copy use `--plum-ink` with a pink underline.

## 4. Typography

Observed in the 20/10 post:
- **Display:** a condensed, high-contrast didone serif in near-black ("Ngày Phụ Nữ", "20 10").
- **Accent:** the same serif in italic, in lotus pink ("Việt Nam").
- **Body:** a light, italic humanist sans in grey.

Web choice (all must render Vietnamese diacritics perfectly):
- Display: **Playfair Display** (Google Fonts, `vietnamese` subset), weights 400 to 600, tracking `-0.02em`, tight leading `0.95` at hero sizes. Italic for accent words.
- Body/UI: **Be Vietnam Pro** (built for Vietnamese), weights 300/400/500.
- If GIEO's brand kit names a different display font, swap it in, but only if it passes the diacritics test below.

Diacritics test string (render it at 96 px and 16 px, check stacked marks do not clip or collide):
`Ngày Phụ Nữ Việt Nam · thổ cẩm H'Mông · Chie Dù Pù Dù Pà · Gieo mầm hy vọng · ỗ ữ ặ ẫ ợ`

Scale (fluid, `clamp`, from a 375 px to a 1440 px screen): `src/styles/tokens.css` holds the values. After GIEO's feedback (`09-feedback.md` F1) the four display sizes are about 10 % smaller than the redesign set them: the hero word is content width / 2.6 (134 px at 390, 504 px at 1440×900), mega 50 to 180 px, h2 50 to 119 px, quote 29 to 65 px. Nothing else changed size: h3 24 to 36 px, h4 20 to 24 px, lead 18 to 26 px, body 16 to 18 px. Line length 60 to 72 characters.

## 5. Visual language

- **Airy and editorial.** Lots of cream space, big serif headlines, small calm body text.
- **Soft blurred glows** (peach to blush radial gradients) as atmosphere, like the "sun" in the 20/10 post.
- **Three motifs, one story:** the seed/sprout (GIEO opens every post with a sprout), the thread/brocade (the craft), the lotus (the logo; the girls' future in bloom).
- **3D style = the 20/10 lotus made real:** soft, matte, airbrushed gradients, gentle rim light, pastel. Think "illustration with depth", not chrome, not photoreal, not neon. No black backgrounds.
- **Photos:** warm, natural light, real hands at work. Never staged poverty. A real GIEO photo may be used when no person in it can be recognised (§7.1). On the page a photo is a print (`PhotoPrint`): a thin cream mat, `--round-print` corners, a soft contact shadow (`--elev-print`, `--elev-print-plum` on plum), a slight tilt, set loosely beside the copy like the still-lifes.
- **Brocade:** only real cloth from GIEO / Chie Dù Pù Dù Pà photos or scans. Credit it. The 3D films and portraits show plain weave; the Collections showroom draws a calm two-tone diamond lattice after the products' photos. Never a pattern with a claimed meaning.

## 6. Voice

- Warm, hopeful, humble. Vietnamese posts use "chúng mình" (friendly "we"). Vietnamese first, English second. Posts sign off "- GIEO".
- Lines from GIEO's own posts you may reuse verbatim:
  - "This is GIEO, so far."
  - "Here's to everything we've shared, everything we've learned, and everything still waiting to grow."
  - "Every single thread, every careful stitch, and every piece of woven fabric tells the quiet, enduring story of a Vietnamese woman."
  - VI: "Từng sợi chỉ đan, từng mũi khâu dệt, từng mảnh vải thêu đều là một câu chuyện bền bỉ về người phụ nữ Việt Nam."
- Avoid: pity framing, "saving" or "helping the poor" language, white-savior imagery, hype words ("revolutionary"), and any statistic GIEO has not given you.

## 7. Ethics guardrails (non-negotiable)

1. **Minors.** Many of the girls are children, and the GIEO team are minors too. The rule (`09-feedback.md` F3, which replaces `08-fuller.md`'s "no photos of people"): a real GIEO photo may be used when no person in it can be recognised. Hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for that photo. Never pair a child's face with her full name, village or school. Every photo in the repo has a `yes` row in `assets/consent.csv` (a missing row counts as no) and a source in `assets/photos/SOURCES.md`; a frame that fails the rule does not enter the repo. Alt text says what is visible and nothing else: no place names, no ethnic group, no "our artisans". A product photo carries its product's name and kind and one partner credit line; no other photo has a caption.
2. **No invented numbers.** No "500 girls supported" unless GIEO provides it. Use `TODO(stat)` placeholders that render nothing in production.
3. **Cultural accuracy.** Say "inspired by traditional H'mong brocade" (GIEO's phrasing) only where GIEO's own copy says it. For the Nối Nếp products name no ethnic group until GIEO answers `00-open-questions.md` #13. Do not claim patterns mean things unless GIEO or the artisans say so.
4. **IB.** Mention "IB Global Youth Action Fund" in text. Do not use the IB logo unless GIEO confirms permission.
5. **Partner credit.** Chie Dù Pù Dù Pà is named wherever products appear.
