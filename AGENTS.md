# Eine Design Library in einem Repo

Arbeitsort für die gesamte Library ist dieses Repo: Oberfläche, Generatoren,
Navigation, Prüfungen und veröffentlichte Dateien. Keine zweite Library unter
`design-system/design-library` oder in einem separaten Contentful-Verzeichnis
anlegen. GitHub Pages bleibt auf `main` und `/`; URL und Root-Dateipfade erhalten.

## Quellen und Zuständigkeit

- Original-E-Mail-Module: `email-builder/modules/<id>/preview.html`;
  Styles `modules/preview.css`, Produkte `skill/references/service-products.json`.
- Original-LP-Module und Komponenten: `lp-builder/modules/component-library.html`.
- Gemeinsame Tokens/Regeln: `design-system/tokens/brands/immoscout24.json` und
  dortige Arbeitsanweisungen. Keine zweite gepflegte Token-Quelle hier anlegen.
- UI direkt hier: `index.html`, `app.js`, `styles.css`.
- Erzeugte Dateien direkt hier: `content-data.js`, `lp-module-markup.js`,
  `lp-shadow-styles.js`, `email-preview-styles.css`, `manifest.json`.

Generator mit `--email-builder-dir`, `--lp-builder-dir`, `--design-system-dir`
auf die tatsächlich verfügbaren Checkouts richten. Fehlende Quellen als Blocker
benennen; keine archivierten Quellen als stillen Ersatz verwenden. Erzeugte
Module nicht manuell korrigieren, sondern in ihrem zuständigen Builder-Repo.

## Änderungen und Prüfung

1. Zuständige Originalquelle oder UI ändern; keine weiteren Quellkopien erstellen.
2. Bei Modul-/Token-Änderungen `scripts/sync_design_library_sources.py` ausführen.
   Bei reinen UI-Änderungen genügt `--refresh-manifest` ohne Quell-Checkouts.
3. Drift-Prüfung `--check`, Python-Tests und `node tests/test_library_routes.cjs`.
4. Änderungen in diesem Repo als PR reviewen. Kein automatischer Merge.
5. Nach Merge die tatsächlich veröffentlichte Library prüfen.

Die CI prüft den vorhandenen Snapshot ohne Zugriff auf private Repos. Vollständige
Quelltreue nur bei tatsächlich vorhandenen drei Quell-Checkouts behaupten. Ein
lokaler Dateistand oder PR ist kein Nachweis einer erfolgten Veröffentlichung.

`--email-only` erhält alle LP- und Token-Inhalte und darf weder LP- noch
Design-System-Quellen benötigen. Das Manifest enthält nur Bereiche, Modulzahlen
und einen Fingerabdruck der darstellungsrelevanten Ausgabe; keine privaten
Quellmetadaten oder Zugangsdaten veröffentlichen. Vorherige interne Manifeste,
Screenshots, Templates oder Archive werden nicht in dieses öffentliche Repo kopiert.

## Darstellung und Bestandsschutz

Die Farbenansicht richtet sich an Kolleg:innen: LP-/E-Mail-Akzentfarben getrennt,
gemeinsame neutrale Farben einmalig und ein Hinweis auf die Modulregeln.
Technische semantische Alias-/Hover-/Rahmenfarben nicht wieder als zusätzliche
Standardauswahl aufnehmen. Alle angezeigten Farbwerte aus der zentralen Quelle
ableiten; diese UI-Auswahl ändert weder Tokens noch Modulfreigaben.


Alle kanonischen Module genau einmal in der Navigation abdecken. Modulmarkup
unverändert extrahieren. Modulvorschauen in sandboxed Iframes mit eigenen Referenz-Viewports isolieren. Die Library-Oberfläche besitzt ein unabhängiges Layout; sie darf Containerbreiten und Breakpoints im Iframe nicht verändern. Nur die vorhandenen
sicheren Preview-Interaktionen für Accordion, Counter und YouTube verwenden;
keine Tracking-/Produktionsskripte laden. Produktions-CSS bleibt an den bestehenden
CoreCSS- und LP-Bridge-URLs verlinkt; keine zweite gepflegte Bridge-CSS erzeugen.
Zusätzliche Vorschau-CSS darf nur die Einbettung betreffen.

Keine installierten Skills, Iterable-Snippets, Salesforce-Inhalte, Contentful-Seiten
oder öffentlichen Builder-Runtime-Dateien durch einen Library-Auftrag ändern.
Das bisherige Repo unter `s24-creative-ops` bleibt mit seinen Weiterleitungen und
Assets bestehen; es ist keine Entwicklungsquelle.
