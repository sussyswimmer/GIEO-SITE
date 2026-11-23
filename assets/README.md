# assets/ : drop files here before running Claude Code

```
assets/
  logo/                 GIEO logo. SVG preferred (TODO(logo-svg)); PNG ok for now
  brand/                Canva pitch deck exported as PDF + PNG pages; brand guidelines if they exist
  photos/
    products/           the Nối Bag (brocade handbag) and the Nếp Keychain (lipstick holder). No person in frame
    brocade/            flat, straight-on photos of the cloth (the Collections swatch; 3D textures later)
    journal/            season photos (trips, workshops, the stall), numbered 01-, 02-, ...: the Journal grid shows them in id order
    artisans/           artisans at work: hands, looms, a back view. No recognisable face
    team/               optional team portraits. The team are minors: GIEO's consent for each photo first
    SOURCES.md          where each photo came from (album, original, crop)
  raw/artcraft/         outputs from ArtCraft jobs (Claude Code writes the jobs in artcraft/jobs.md)
  video/                the "Nhìn lại một mùa GIEO" recap video file if GIEO can send it
  consent.csv           filename,consent(yes/no),notes   one row for EVERY photo, with or without people
```

## The photo rule (`docs/09-feedback.md` F3)

A real GIEO photo may be used when no person in it can be recognised. Hands and a back view are fine. No face of a child or a teenager, ever, without GIEO's consent for that photo; the team are minors too. A frame that fails this does not enter the repo at all.

- **Every photo needs a `consent.csv` row**, products and cloth included. `scripts/process-images.mjs` treats a missing row as no: the photo gets a manifest entry with `consent: false` and no file is written to `public/img/`. Anything other than `yes` also counts as no.
- "yes" means two things at once: GIEO sent the photo for the website, and the frame shows no identifiable person.
- Each photo is listed in `photos/SOURCES.md` with its album, original and crop.
- A photo also needs alt text, `photos.<id>.alt` in both `src/content/en.json` and `vi.json`, or the pages skip it. The id is the file's path under its collection folder, without the extension, in lowercase with `-` for anything that is not a letter or digit (`journal/01-loom-weaver.jpg` is `01-loom-weaver`). Ids must be unique across all folders.
- Alt text says what is visible and nothing else: no place names, no ethnic group, no "our artisans".
- `npm run images` writes the photos to `public/img/` with all metadata stripped and rewrites `src/lib/photos-manifest.json`. Pages look a photo up by its id.

Today: thirteen frames, chosen from the 663 GIEO shared in November 2026 (the Lotte Mall Tây Hồ stall, the Mai Châu trip, the inspection trip to Mai Châu).

Where to get them:
- Canva deck: ask GIEO to share it with edit/view access to your account, or send a PDF export (the link we have returns "permission denied").
- Facebook photos/video: the page is login-walled, so download from your own logged-in browser or ask GIEO's Media team for originals (much higher quality than Facebook's compressed copies).
- Photos: GIEO shared three albums in November 2026. The files here are web-size copies (long edge at most 2400 px), not originals; ask GIEO's Media team for the originals if a photo ever has to run larger than that.
