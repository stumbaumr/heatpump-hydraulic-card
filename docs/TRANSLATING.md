# Translating the card

The card ships with English and German. More languages are welcome, and a translation does not have to be complete: every text that is missing falls back to English, so a first pull request can cover the most visible texts and others can complete it later.

There are two different things people call "translating":

- **Your own wording, only for your installation.** Use `texts` in the card configuration, see [Custom texts and languages](../README.md#custom-texts-and-languages) and [TEXTS.md](TEXTS.md). Nothing to install, nothing to send in. This covers the card, but not the visual editor.
- **A language that is built in for everybody.** This page. The language is then selected automatically from the Home Assistant profile language, and the visual editor speaks it, too.

## What is translated

All of it lives in [`dist/heatpump-hydraulic-card.js`](../dist/heatpump-hydraulic-card.js), near the top, in three places:

| Constant | Content | Size today |
|---|---|---|
| `HFC_LANGUAGES` | The name of the language, written in that language (`pl: 'Polski'`). It appears in the language list of the editor. | one line |
| `HFC_I18N` | Texts on the card: titles, modes, tile names, tooltips and the detail drawer. | 149 texts |
| `HFC_EDITOR` | Labels and help texts of the visual editor. | 167 texts |

The English block (`en`) is the reference. Entity names that come from your integration, the state texts of presets and the values themselves are not part of this and are shown as they are.

## Add a language

1. Fork the repository and open `dist/heatpump-hydraulic-card.js`. There is no build step, the file is edited directly.
2. Add the language to `HFC_LANGUAGES`, with a lowercase code (`pl`, `nl`, `pt-br`):

   ```js
   const HFC_LANGUAGES = { en: 'English', de: 'Deutsch', pl: 'Polski' };
   ```

3. Copy the `en` block of `HFC_I18N`, paste it below the `de` block, rename it to your code and translate the texts. Do the same with `HFC_EDITOR`. Texts you do not translate: delete the line, do not leave English text in it. The check below lists what is still missing.
4. Keep the placeholders exactly as they are in English: `{sources}` in `energy_missing` and `{h}` in `timeline_title` and `timeline_aria`. Words may move around them.
5. Run the check:

   ```bash
   npm run i18n:check
   npm run i18n:check -- --missing pl
   ```

   The first command fails on unknown keys, empty texts, changed placeholders and a missing language name, and prints the coverage per language. The second lists the texts that are still missing for your language.
6. Look at the result. Set `language: pl` in a card configuration, or switch the Home Assistant profile language, and open the card and its editor. `npm run dev` starts the demo with simulated data, no Home Assistant needed.
7. Add a changelog fragment `changelog.d/translation-pl.md` with one line, for example `- Polish translation of the card and the editor.` Do not edit `README.md` or `CHANGELOG.md`, see [CONTRIBUTING.md](../CONTRIBUTING.md).
8. Open the pull request. The checks run `npm run i18n:check` automatically.

## Without Git

Translate the texts of the card into the YAML format of [TEXTS.md](TEXTS.md) (the editor labels can follow in a second step) and post it in a [translation issue](https://github.com/Sturmi77/heatpump-hydraulic-card/issues/new?template=translation.yml). The maintainer adds it to the card and credits you in the release notes. A language of this kind is easy to test first with `texts` in your own configuration.

## Tips

- **Short texts.** The labels sit in a drawing and in narrow tiles. Keep them about as long as the English ones; German is the longest language today and fits. If a text does not fit, use a common abbreviation.
- **Heat pump terms.** Use the words your installer and your heat pump's own app use (flow and return temperature, buffer, DHW, defrost). Consistency matters more than literal accuracy.
- **Plain text only.** Values are shown as text and escaped; no markup.
- **Leave it out when unsure.** A missing text shows the English one, which is better than a wrong one.

## When new texts are added

A new text is added to the English block and to German. Every other language shows the English text until it is translated. `npm run i18n:check` lists the gaps per language, and a short pull request closes them.
