# Where each photo came from

GIEO shared three albums in November 2026. Thirteen frames were chosen from 663. Every frame here
shows no identifiable person. Files are web-size copies (long edge at most 2400 px), cropped as listed.
Crop boxes are fractions of the original frame: x, y, width, height.

| File | Album | Original | Crop |
|---|---|---|---|
| products/bag-rows.jpg | Lotte Mall Tây Hồ stall, 22-23/8/2026 | album item 37 | 0.22, 0.36, 0.78, 0.64 (removes the neighbouring stall) |
| products/bag-pink.jpg | Lotte Mall Tây Hồ stall | album item 10 | 0.10, 0.25, 0.90, 0.75 |
| products/lipstick-rows.jpg | Lotte Mall Tây Hồ stall | album item 20 | 0.12, 0.50, 0.30, 0.27 (removes the person behind the table) |
| products/lipstick-on-bag.jpg | Lotte Mall Tây Hồ stall | album item 182 | 0.36, 0.22, 0.26, 0.25 (removes the printed sheets and the person) |
| brocade/nep-cloth.jpg | Inspection trip (Mai Châu) | DSCF1237.JPG | 0.30, 0.30, 0.70, 0.55 |
| journal/01-loom-weaver.jpg | Mai Châu trip, GIEO 2026 | DSCF3872.JPG | 0.34, 0.10, 0.66, 0.90 (removes a distant passer-by) |
| journal/02-stilt-house.jpg | Mai Châu trip | DSCF3681.JPG | whole frame |
| journal/03-heddles.jpg | Inspection trip | DSCF1430.JPG | whole frame |
| journal/04-sewing-hands.jpg | Inspection trip | DSCF1385.JPG | whole frame |
| journal/05-cloth-on-loom.jpg | Mai Châu trip | DSCF3897.JPG | whole frame |
| journal/06-valley.jpg | Mai Châu trip | DSCF3768.JPG | whole frame |
| artisans/loom-cloth.jpg | Mai Châu trip | DSCF3895.JPG | whole frame |
| artisans/sewing-cloth.jpg | Inspection trip | DSCF1365.JPG | whole frame |

Not used, and not in the repo: every frame with a recognisable face (467 of the 663 show children or
teenagers), and every frame of another group's stall.

To add a photo: put the file under `assets/photos/<collection>/`, add a row to `assets/consent.csv`,
add `photos.<id>.alt` to both `src/content/*.json` files, then run `npm run images`.
