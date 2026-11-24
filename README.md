# Design Library

E-Mail, Landing Page und Foundations:
https://scout24-creative-ops.github.io/design-library/

Dieses Repository enthält die Oberfläche, ihre Generatoren und Prüfungen sowie
alle veröffentlichten Dateien. GitHub Pages liefert `main` direkt aus `/` aus.
Die Dateien der Oberfläche werden hier direkt gepflegt. Es gibt kein zweites
Library-Quellrepo und keinen Kopierschritt in ein separates Veröffentlichungsrepo.

## Wo liegt was?

- `index.html`, `app.js`, `styles.css`: die gepflegte Library-Oberfläche.
- `content-data.js`, `lp-module-markup.js`, `lp-shadow-styles.js`,
  `email-preview-styles.css`, `manifest.json`: erzeugte Vorschauen; nicht manuell ändern.
- `library-data/`: Einordnung der Module in der Navigation.
- `scripts/`: Erzeugung aus den kanonischen Quellen.
- `tests/`: Navigation, Quelltreue, Erzeugung und optionale Browserprüfung.
- `AGENTS.md`: Regeln für Änderungen mit ChatGPT oder Codex.

Die Originalmodule bleiben in `email-builder` und `lp-builder`. Die gemeinsamen
Design-Tokens bleiben in `design-system`. Das Repo kopiert weder Builder-Quellen
noch den gemeinsamen Token-Quellbestand in eine zweite gepflegte Bibliothek.

## Button-Vorschauen

Unter E-Mail zeigt die UI-Kategorie **Buttons** die vier vorhandenen
Button-Klassen aus `email-preview-styles.css`. Unter Landing Page / **Buttons & Links**
werden die einzelnen Buttons unverändert aus dem kanonischen Komponentenblock
abgeleitet. Jede Variante steht in einer eigenen Zeile mit eigenem Copy-Symbol;
es kopiert ausschließlich das HTML dieser Variante. Diese Komponentenansicht
ändert weder den Modulbestand noch installierte Builder oder E-Mail-Snippets.

## Navigation und Vorschauen

**Foundations** sammelt gemeinsame Gestaltungswerte und **Text & Lists**.
Die doppelten LP-Kategorien **Colors & Surfaces** und **SVG-Komponente** sind
entfernt; Farben stehen unter Foundations, Diagramme bleiben unter Landing Page.
Alte Deep Links zu den verschobenen/entfernten Kategorien führen zum passenden
aktuellen Bereich. Die internen `tokens`-Adressen bleiben kompatibel.

Aktive Hauptnavigation: Charcoal und fett; inaktive Einträge: Grau und normal.
Copy-Symbole stehen im Layout direkt oberhalb ihrer Vorschau, bei kleinen
Elementen linksbündig, bei ganzen Modulen am rechten Rand des Vorschau-Rahmens.
Sie überlagern das Modul nicht und gehören nicht zu seinem kopierten Inhalt.

Die COSMA-Icon-Schrift wird im Dokument und in den isolierten LP-Vorschauen
geladen. Die Produkttabelle nutzt zusätzlich ihre bestehende öffentliche
Stylesheet-Abhängigkeit aus `public/LP Builder – Contentful/lpbuilder-bridge/`;
es gibt keine lokale Kopie dieses Stylesheets und keine Änderung der Auslieferung.
Der Sticky Footer bleibt nur innerhalb der Vorschau statisch sichtbar.
Zwei zusätzliche Accordion-Beispiele ergänzen die drei kanonischen Paare in der
Browser-Vorschau zu fünf Einträgen; das extrahierte Original bleibt unverändert.

## Farben für Kolleg:innen

Die Farbübersicht zeigt getrennte LP- und E-Mail-Akzentfarben sowie einmalig die
gemeinsamen neutralen Farben. Werte werden aus der zentralen Token-Datei gelesen;
die Library pflegt keine eigenen Farbwerte. Technische Rollen wie Text-, Rahmen-
und Hover-Tokens bleiben in der zentralen Quelle erhalten und werden hier nicht
als zusätzliche Farbauswahl gezeigt. Welche Palette an einem bestimmten Slot
einsetzbar ist, bestimmt weiterhin der jeweilige Modulvertrag.

## Aktualisieren

Die drei Quellrepos müssen als lesbare Checkouts vorliegen. Standardmäßig werden
sie neben diesem Repo erwartet; abweichende Pfade sind explizit möglich:

```sh
python3 scripts/sync_design_library_sources.py \
  --email-builder-dir ../email-builder \
  --lp-builder-dir ../lp-builder \
  --design-system-dir ../design-system
python3 scripts/sync_design_library_sources.py --check
EMAIL_BUILDER_DIR=../email-builder LP_BUILDER_DIR=../lp-builder DESIGN_SYSTEM_DIR=../design-system \
  python3 -m unittest discover -s tests
node tests/test_library_routes.cjs
```

`--email-only` aktualisiert nur die E-Mail-Vorschauen, Produkte, E-Mail-Styles und
den Build-Fingerabdruck. LP-Vorschauen und Token-Anzeige bleiben erhalten; dafür
werden weder LP- noch Token-Quellen gelesen.

Für reine UI-Änderungen genügt anschließend `python3 scripts/sync_design_library_sources.py --refresh-manifest`. Das aktualisiert den Fingerabdruck ohne Zugriff auf Quellrepos; es ersetzt keinen Modul-/Token-Quellvergleich.

Änderungen werden in **diesem Repo** als PR geprüft und gemerged. Danach liefert
GitHub Pages denselben Stand aus. Es ist kein weiterer Veröffentlichungs-PR in
einem anderen Repo nötig. Der Build-Fingerabdruck im öffentlichen Manifest
beschreibt die darstellungsrelevanten Dateien; er enthält keine privaten Quellpfade.

## Prüfen und lokal ansehen

```sh
python3 -m unittest discover -s tests
node tests/test_library_routes.cjs
python3 -m http.server 8765
```

Ohne Quell-Checkouts laufen die eigenständigen Prüfungen; Quellvergleichstests
werden ausdrücklich übersprungen. Ein solcher Lauf belegt keine vollständige
Regenerierung. Die CI benötigt dafür weder private Quellen noch Zugangsdaten.
Die vorhandene Browserprüfung `node tests/check_browser.cjs` ist optional und
benötigt Playwright/Chromium sowie den lokalen Server; sie wartet auf externe LP-Styles.
`node tests/check_buttons.cjs` prüft die Button-Kategorien bei 1440 und 390 Pixeln,
ihre vertikale Anordnung und jeden Copy-Inhalt. Optional lässt sich über
`CHROMIUM_EXECUTABLE_PATH` ein vorhandenes Chromium verwenden.
`node tests/check_optimizations.cjs` prüft aktive Navigation, Copy-Abstände,
geladene 48px-Icons, alle fünf Accordion-Paare, Tabellen, Footer und Foundations
bei breiten und schmalen Library-Fenstern. Die CI führt beide Browserprüfungen aus und stellt Screenshots
und Diagnosen für 14 Tage als Workflow-Artefakt bereit.

## Bestehende Systeme

Die öffentliche Library-URL und alle vorhandenen Root-Dateiadressen bleiben
bestehen. Bestehende LP-Runtime-Dateien und Contentful-Assets werden hier nicht
verändert. Das alte öffentliche Library-Repo bleibt ausschließlich für die schon
veröffentlichten Weiterleitungen und historischen Asset-URLs bestehen.

## Verbindliche Vorschau-Geometrie

Alle Modulvorschauen erscheinen in Originalgröße, ohne Desktop-/Mobilumschaltung,
Skalierung oder automatischen Wechsel bei kleinen Browserfenstern. Zu breite
Vorschauen sind im eigenen Rahmen horizontal scrollbar, auch per Tastatur.
Die Library-Oberfläche bleibt unabhängig davon an das Browserfenster angepasst.

`preview.html` und `preview.js` rendern Originalmarkup in sandboxed Iframes mit
festen Desktop-Referenz-Viewports: LP 1600 px, E-Mail 1150 px. Die Module bleiben
dabei in ihren kanonischen Containern (LP maximal 1200 px inklusive 16/24/32 px
Padding, E-Mail maximal 600 px ohne zusätzliches Modul-Padding). Leere äußere
Viewport-Ränder werden bei der Einbettung ausgespart; gerenderte Modulflächen
und Full-Bleed-Inhalte bleiben bei 1:1-Größe erhalten. Die Einbettung ändert
weder den tatsächlichen Iframe-Viewport noch Modul-CSS oder Breakpoints.
Die responsiven Regeln der Originalmodule bleiben Teil ihrer Originalquellen;
die Library bietet keine gesonderte mobile Modulansicht mehr an.

Kopieraktionen stehen außerhalb der Vorschau und liefern unverändertes
kanonisches Markup. Die Bridge-CSS bleibt auf dem veröffentlichten Release
`lp-builder/releases/contentful/layout-v1/lpbuilder-bridge.css` festgelegt;
die JavaScript-Adresse und die produktive Frontend-Einbindung bleiben unverändert.

`node tests/check_layout.cjs` prüft alle 72 Module an ihren Desktop-Referenzbreiten
sowie die eingebettete Originalgröße und horizontale Erreichbarkeit bei breiten
und schmalen Library-Fenstern. Button-, Icon-, Tabellen-, Accordion- und
Navigationsprüfungen verwenden dieselben isolierten Dokumente.
