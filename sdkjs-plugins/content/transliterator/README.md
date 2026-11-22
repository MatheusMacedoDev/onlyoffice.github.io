# Transliterator

Transliterator converts selected Cyrillic or Greek text to Latin, or Latin text back to Cyrillic, using the selected transliteration standard. It is available in ONLYOFFICE Document Editor, Spreadsheet Editor, and Presentation Editor.

## Supported standards and directions

| Direction | Available standards |
| --- | --- |
| Cyrillic to Latin | Passport (ICAO 9303), GOST 7.79 System B, ISO 9 |
| Latin to Cyrillic | GOST 7.79 System B, ISO 9 |
| Greek to Latin | Greek (ELOT 743) |

Passport (ICAO 9303) is one-way in the plugin. Greek ELOT 743 is exposed as Greek-to-Latin; reverse transliteration is not offered because Latin spellings can correspond to multiple Greek characters.

## Using the plugin

1. Open **Plugins** and select **Transliterator**.
2. Select text in a document or presentation, or select cells in a spreadsheet.
3. Choose a direction and standard. The panel shows a preview of the conversion.
4. Choose **Replace selection** to apply it, **Copy** to copy the preview, or **Refresh preview** to read the current selection again.

While the panel is open, the **Transliterate** context-menu command is also available for a selection in editors that expose the plugin context menu.

## Transliteration behavior and design decisions

- The matcher uses the **longest matching sequence** first. This lets multiletter spellings such as `shch` be treated as one mapping rather than several shorter ones.
- Case is preserved where possible: single-letter mappings have explicit upper- and lowercase entries, while multiletter matches also recognize uppercase and title-case spellings.
- Characters with no mapping are kept as they are, so punctuation, spaces, and unsupported letters are not discarded.
- The Cyrillic tables prioritize **Russian**. Where a mapping is ambiguous between Russian and Ukrainian usage, Russian usage takes precedence. Ukrainian-specific letters such as `І`, `Ї`, `Є`, and `Ґ` are not currently mapped and remain unchanged unless mappings are added. This can make Latin-to-Cyrillic output ambiguous or unsuitable for Ukrainian text.
- Reverse transliteration is not always lossless: different Cyrillic characters may share a Latin spelling in a standard. The order of duplicate mappings therefore matters.

## Editing or adding table entries

The JSON files are in [`scripts/tables/`](scripts/tables/):

- `icao.json` — Passport (ICAO 9303)
- `gost779b.json` — GOST 7.79 System B
- `iso9.json` — ISO 9
- `elot743.json` — Greek (ELOT 743)

Each file has a `table` array of two-item rows in this order:

```json
{
  "table": [
    ["Latin spelling", "Cyrillic or Greek character"]
  ]
}
```

For example, Russian multicharacter mappings can be written as `["Shch", "Щ"]` and `["shch", "щ"]`. Include both uppercase and lowercase rows for single-character mappings. The matcher automatically creates uppercase and title-case forms for multicharacter source spellings.

Rows are used in both directions where the UI supports them: the first item is the source for Latin-to-Cyrillic, and the second item is the source for Cyrillic-to-Latin. If multiple rows have the same source spelling in a direction, the **last row wins**. Keep this in mind when adding entries that share a Latin spelling; choose the intended Russian mapping and order collisions deliberately.

After changing a table, update [`tests.html`](tests.html) with cases for the new mapping and its supported direction(s). To add a completely new table, register its JSON file in `TABLE_FILES` in `scripts/translit.js`, then add its label and supported directions in `scripts/plugin.js`.

## Tests

[`tests.html`](tests.html) is a browser-based test page for fixed transliteration cases and table coverage. Open it in a browser to run the suite after changing transliteration behavior or table data.
