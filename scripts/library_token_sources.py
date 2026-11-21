from typing import Any

def build_tokens_snapshot(canonical_tokens: dict[str, Any]) -> dict[str, Any]:
    shared_palette = canonical_tokens["colors"]["palette"]["shared"]
    lp_palette = canonical_tokens["colors"]["palette"]["lp"]
    email_palette = canonical_tokens["colors"]["palette"]["email"]
    typography = canonical_tokens["typography"]

    # Colleague-facing palette, not a catalogue of technical role aliases.
    # Values always come from the canonical source; usage stays module-specific.
    colors = {
        "usage": (
            "LP und E-Mail haben eigene Akzentfarben. Neutrale Farben gelten für "
            "beide Builder. Welche Farben du für Hintergründe, Buttons oder Texte "
            "verwenden kannst, legt das jeweilige Modul fest."
        ),
        "groups": [
            {
                "title": "LP-Akzentfarben",
                "items": [
                    {"name": label, "value": lp_palette[name]}
                    for name, label in [
                        ("teal", "Teal"), ("yellow", "Gelb"), ("blue", "Blau"),
                        ("purple", "Lila"), ("orange", "Orange"),
                    ]
                ],
            },
            {
                "title": "E-Mail-Akzentfarben",
                "items": [
                    {"name": label, "value": email_palette[name]}
                    for name, label in [
                        ("teal", "Teal"), ("yellow", "Gelb"), ("blue", "Blau"),
                        ("red", "Orange"),
                    ]
                ],
            },
            {
                "title": "Neutrale Farben · LP & E-Mail",
                "items": [
                    {"name": label, "value": shared_palette[name]}
                    for name, label in [
                        ("charcoal", "Charcoal"), ("white", "Weiß"), ("sand", "Sand"),
                        ("grey1", "Grau 1"), ("grey2", "Grau 2"), ("grey3", "Grau 3"),
                        ("grey4", "Grau 4"), ("grey5", "Grau 5"), ("grey6", "Grau 6"),
                    ]
                ],
            },
        ],
    }

    heading_labels = {
        "xxl": "Heading XXL bold",
        "xl": "Heading XL bold",
        "l": "Heading L bold",
        "m": "Heading M bold",
        "s": "Heading S bold",
        "xs": "Heading XS bold",
    }
    body_labels = {
        "standard": "P Standard",
        "tabular": "P Tabular",
        "hint": "P Hint",
    }
    typography_snapshot = {
        "sample": "Make It Better",
        "sourceLabel": "makeitbetter.css",
        "sourceUrl": "https://www.static-immobilienscout24.de/fro/make-it-better/1.0.0/makeitbetter.css",
        "headingItems": [
            {
                "name": f"heading-{name}",
                "label": heading_labels[name],
                "desktop": values["desktop"],
                "mobile": values["mobile"],
            }
            for name, values in typography["heading"].items()
        ],
        "bodyItems": [
            {
                "name": f"body-{name}",
                "label": body_labels[name],
                "desktop": values["desktop"],
                "mobile": values["mobile"],
            }
            for name, values in typography["body"].items()
        ],
    }

    radius = [
        {"name": name, "value": value}
        for name, value in canonical_tokens["radius"].items()
    ]
    spacing = [
        {"name": f"spacing-{name}", "value": value}
        for name, value in canonical_tokens["spacing"].items()
    ]
    borders = [
        {"name": name, "value": value}
        for name, value in canonical_tokens["borders"].items()
    ]

    lp_formats = canonical_tokens["imageFormats"]["lp"]
    ratios = [
        {
            "ratio": "16:9",
            "title": "16:9",
            "primarySize": lp_formats["heroSplit"],
            "secondarySize": lp_formats["heroSplitHiRes"],
            "usage": "LP Hero Split",
            "badge": "",
        },
        {
            "ratio": "4:3",
            "title": "4:3",
            "primarySize": "",
            "secondarySize": "",
            "usage": "Canonical image ratio",
            "badge": "",
        },
    ]

    return {
        "colors": colors,
        "typography": typography_snapshot,
        "radius": radius,
        "spacing": spacing,
        "borders": borders,
        "ratios": ratios,
    }
