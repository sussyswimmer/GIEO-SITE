# Open Questions for GIEO (ask before launch)

Claude Code: build with sensible placeholders for each of these, mark them `TODO(<tag>)`, and never block a phase on them.

| # | Question | Tag | Placeholder until answered |
|---|---|---|---|
| 1 | Can we get edit/view access to the Canva pitch deck, or a PDF export of it? (Exact brand colors, fonts, extra copy.) | `brand` | Estimated tokens in `01-brand.md` |
| 2 | Logo as SVG (wordmark + lotus separately if possible)? | `logo-svg` | Raster from Facebook avatar |
| 3 | How do people buy products right now? (Shopee, Facebook DMs, Google Form, in person?) | `shop` | "Order via Instagram / email" button |
| 4 | How can people donate, if at all? Bank transfer, MoMo, PayPal? | `donate` | Hide donate CTA, show "Partner with us" |
| 5 | Product photos for each item, ideally on plain background + one flat scan of the brocade pattern per collection. **Partly answered (November 2026):** GIEO said the main products are the bag and the lipstick holder (and nothing else) and shared photos of both on their stall table. Still missing: plain-background shots of each product and a flat, straight-on scan of the cloth | `products` | The Nối Bag and the Nếp Keychain modelled in 3D after the stall photos (plain weave in the films, a calm diamond lattice in the showroom); the stall photos themselves as prints on Collections |
| 6 | Which photos from the season recap video / trips have consent for public web use? **Partly answered (November 2026):** GIEO shared three albums for the website (the Lotte Mall Tây Hồ stall, the Mai Châu trip, the inspection trip to Mai Châu; 663 frames) but gave no consent photo by photo. See #17 | `photos` | Only frames in which no person can be recognised: hands, a back view, cloth, landscapes, products. Thirteen so far, each with a row in `assets/consent.csv` and a source in `assets/photos/SOURCES.md` (rule: `09-feedback.md` F3) |
| 7 | Team list (names, roles, school, optional photo) for an About page | `team` | Department cards only (Community Dev, Product Dev, Business Dev, Marketing, Media, HR) |
| 8 | Any real impact numbers they want public (scholarships, workshops, kits delivered, artisans partnered) | `stat` | No numbers shown |
| 9 | Domain? (e.g. gieovietnam.org) | `domain` | Vercel preview URL |
| 10 | Default language: Vietnamese or English? | `lang` | Detect from browser, VI fallback |
| 11 | Mentor sign-up: who receives it (email, Google Form)? | `mentor` | `mailto:gieovietnam2026@gmail.com` |
| 12 | Permission to mention/link the IB Global Youth Action Fund page and use any IB mark | `ib` | Text mention + link only |

## Added after GIEO's first feedback (November 2026, `09-feedback.md`)

| # | Question | Tag | Placeholder until answered |
|---|---|---|---|
| 13 | H'Mông or Thái? The Nối Nếp leaflet and GIEO's info sheet say the patterns come from the weaving of the Thái people in Chiềng Châu, Mai Châu. The site copy GIEO wrote says H'mong (VI: H'Mông) throughout. Which should the site say? | `ethnic-group` | GIEO's own sentences stay exactly as they wrote them. The collection copy, the product labels and every alt text name no ethnic group |
| 14 | Are these names right for the web: the collection Nối Nếp, Nối Bag / Túi Nối, Nếp Keychain / Móc Nếp? And what are the exact English tagline and body line on the leaflet? (The first word of each is hidden in our photo of it.) | `product-names` | Names and kinds as printed on the leaflet, all DRAFT. EN tagline "Connecting craft. Connecting people. Connecting futures." and EN body "Products crafted from canvas and handwoven fabrics.", both DRAFT |
| 15 | The leaflet also lists a zip wallet and a fold wallet. Should the site show them? | `wallets` | Not shown, not modelled, and cropped out of the product photos: GIEO named only the bag and the lipstick holder as main products |
| 16 | Should the site show prices? | `prices` | No prices anywhere |
| 17 | Consent photo by photo for any frame with a recognisable face, the team included (the team are minors too) | `consent-faces` | No such frame is in the repo. 467 of the 663 shared frames show the face of a child or a teenager and are left out |
| 18 | May the Mai Châu photos be captioned with the place? | `place` | No captions except the product name, kind and partner credit on product photos. Alt text names no place |
