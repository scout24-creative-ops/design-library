from typing import Any

def build_tokens_snapshot(canonical_tokens: dict[str, Any]) -> dict[str, Any]:
    shared_palette = canonical_tokens["colors"]["palette"]["shared"]
    lp_palette = canonical_tokens["colors"]["palette"]["lp"]
    lp_semantic = canonical_tokens["colors"]["semantic"]["lp"]
    typography = canonical_tokens["typography"]

    colors = {
        "groups": [
            {
                "title": "Accent Colors",
                "items": [
                    {"name": "Teal", "value": lp_palette["teal"]},
                    {"name": "Yellow", "value": lp_palette["yellow"]},
                    {"name": "Blue", "value": lp_palette["blue"]},
                    {"name": "Purple", "value": lp_palette["purple"]},
                    {"name": "Orange", "value": lp_palette["orange"]},
                ],
            },
            {
                "title": "Neutrals",
                "items": [
                    {"name": "Charcoal", "value": shared_palette["charcoal"]},
                    {"name": "White", "value": shared_palette["white"]},
                    {"name": "Sand", "value": shared_palette["sand"]},
                    {"name": "Grey 1", "value": shared_palette["grey1"]},
                    {"name": "Grey 2", "value": shared_palette["grey2"]},
                    {"name": "Grey 3", "value": shared_palette["grey3"]},
                    {"name": "Grey 4", "value": shared_palette["grey4"]},
                    {"name": "Grey 5", "value": shared_palette["grey5"]},
                    {"name": "Grey 6", "value": shared_palette["grey6"]},
                ],
            },
            {
                "title": "Semantic LP Colors",
                "items": [
                    {"name": name, "value": value}
                    for name, value in lp_semantic.items()
                ],
            },
        ]
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
