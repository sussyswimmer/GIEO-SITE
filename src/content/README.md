# GIEO site copy

All visible words live here, in two files with identical key trees:

- `en.json`: English copy
- `vi.json`: Vietnamese copy (diacritics as GIEO wrote them)
- `_meta.json`: lists which keys are DRAFT and which are TODO. Edit it when you change a status.

Components read strings by key. Never hard-code copy in components.

## Key tree

| Namespace | Holds |
|---|---|
| `meta` | site name, page title, meta description |
| `nav` | navigation labels, language switch, skip link, menu buttons |
| `home` | sections H0 to H8 of the home page: `hero`, `meaning`, `craft`, `partner`, `nextGen`, `pillars`, `visionMission`, `journal`, `involve` |
| `collections` | collections page |
| `about` | about page: story, departments, partner, team heading |
| `getInvolved` | shop, mentor, partner, volunteer, donate, and community programs |
| `contact` | contact page and mailto form labels |
| `footer` | footer lines and labels |
| `common` | shared labels |

Contact details (email, Instagram and Facebook addresses) are not copy. They live in code as constants.

## How GIEO edits copy

1. Open `src/content/en.json` and `src/content/vi.json`.
2. Change the value on the same key path in both files. Keep the structure identical.
3. Run `node scripts/check-content.mjs`. It must print `OK`.
4. Tell the developer which keys changed.

Do not rename or move keys without updating every component that reads them.

## DRAFT, TODO and verbatim

- **Verbatim**: the string comes word for word from GIEO's own copy (`docs/02-content.md`, `docs/01-brand.md`, `CLAUDE.md`). It is not listed in `_meta.json`.
- **DRAFT**: a string the docs do not give word for word. Button labels, form labels, page intros, product name translations and the Vietnamese versions of English-only copy are DRAFT. Every DRAFT key path is listed under `draftKeys` in `_meta.json`. GIEO must approve these before launch.
- **TODO(tag)**: content is not known yet. The value is `""` and the key is listed under `todo` with a tag. Tags come from `docs/00-open-questions.md`, plus `copy-vi` for missing Vietnamese lines. Current TODOs:
  - `home.journal.closing` (VI), tag `copy-vi`
  - `about.teamHeading`, tag `team`
  - `getInvolved.volunteer.body`, tag `volunteer`
  - `getInvolved.donate.body`, tag `donate`

A TODO renders nothing in production. Do not fill a TODO with a guess.

## Rules the checker enforces

`node scripts/check-content.mjs` fails when:

1. `en.json` and `vi.json` have different key trees.
2. A non-empty string outside `draftKeys` does not appear word for word in the client docs.
3. A string is not Unicode NFC.
4. A key in `draftKeys` or `todo` does not exist.

It warns, without failing, when a DRAFT string contains a digit. Statistics must never be invented. Use a TODO(stat) instead.

## Spelling

- English copy: `H'mong`
- Vietnamese copy: `H'Mông`
- Partner name: `Chie Dù Pù Dù Pà` in both languages.
