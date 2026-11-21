"""Approved email-preview generation shared by the unified Design Library."""
from pathlib import Path
import json
import re
from typing import Any

EMAIL_MODULES_DIR = Path()
SERVICE_PRODUCTS_PATH = Path()

class SyncError(RuntimeError):
    pass

def display_path(path):
    return path.as_posix()

def configure_source(email_dir):
    global EMAIL_MODULES_DIR, SERVICE_PRODUCTS_PATH
    EMAIL_MODULES_DIR = Path(email_dir) / 'modules'
    SERVICE_PRODUCTS_PATH = Path(email_dir) / 'skill/references/service-products.json'

def fail(message: str) -> None:
    raise SyncError(message)

def read_text(path: Path) -> str:
    if not path.exists():
        fail(f"Fehlende Quelle: {display_path(path)}")
    return path.read_text(encoding="utf-8")

def strip_email_runtime(html: str, source: Path) -> str:
    cleaned = re.sub(
        r"\n?<script\b[^>]*\bsrc=\"\.\./token-runtime\.js\"[^>]*>\s*</script>\s*$",
        "",
        html.strip(),
        flags=re.S,
    ).strip()

    if "<script" in cleaned:
        fail(
            f"{display_path(source)} enthaelt unerwartete <script>-Tags und kann nicht sicher "
            "in content-data.js eingebettet werden."
        )

    return cleaned

def indent_block(value: str, prefix: str) -> str:
    return "\n".join(f"{prefix}{line}" if line else line for line in value.splitlines())

def build_service_products() -> list[dict[str, str]]:
    payload = json.loads(read_text(SERVICE_PRODUCTS_PATH))
    products = payload.get("products")
    if not isinstance(products, list):
        fail("email-builder/skill/references/service-products.json enthaelt kein gueltiges 'products'-Array.")

    result: list[dict[str, str]] = []
    required_keys = ["id", "original_snippet_name", "title", "description", "icon_url", "target_url"]

    for index, product in enumerate(products, start=1):
        if not isinstance(product, dict):
            fail(f"service-products.json: Produkt #{index} ist kein Objekt.")
        missing = [key for key in required_keys if key not in product]
        if missing:
            fail(
                f"service-products.json: Produkt #{index} fehlt Pflichtfelder: {', '.join(missing)}."
            )

        result.append(
            {
                "id": str(product["id"]),
                "originalSnippetName": str(product["original_snippet_name"]),
                "title": str(product["title"]),
                "description": str(product["description"]),
                "iconUrl": str(product["icon_url"]),
                "targetUrl": str(product["target_url"]),
            }
        )

    return result

def build_email_modules_map() -> dict[str, str]:
    module_map: dict[str, str] = {}
    module_files = sorted(EMAIL_MODULES_DIR.glob("*/preview.html"), key=lambda path: path.parent.name + ".html")
    if not module_files:
        fail("Es wurden keine E-Mail-Preview-Module unter email-builder/modules/*/preview.html gefunden.")

    for path in module_files:
        module_map[path.parent.name] = strip_email_runtime(read_text(path), path)

    return module_map

def build_email_library_html(item: dict[str, Any], email_modules: dict[str, str]) -> str:
    section_id = f"email-{item['id']}"
    rows: list[str] = []

    for module_name in item.get("modules", []):
        module_html = email_modules.get(module_name)
        if module_html is None:
            fail(
                f"content-data.js referenziert das E-Mail-Modul '{module_name}', "
                "aber unter email-builder/modules wurde keine passende HTML-Datei gefunden."
            )

        indented_module_html = indent_block(module_html, "        ")
        rows.append(
            "\n".join(
                [
                    '  <div class="test-module-row">',
                    f'    <div class="module-copy" data-module="{module_name}">',
                    f'      <button class="module-copy__button" type="button" aria-label="{module_name} kopieren" title="{module_name} kopieren">',
                    '        <svg class="module-copy__icon module-copy__icon--default" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
                    '        <span class="module-copy__icon--success" aria-hidden="true"></span>',
                    "      </button>",
                    "    </div>",
                    '    <div class="test-module-frame">',
                    f'      <div class="test-email-preview" data-email-preview-module="{module_name}">',
                    indented_module_html,
                    "      </div>",
                    "    </div>",
                    "  </div>",
                ]
            )
        )

    return "\n".join(
        [
            f'<section class="test-section" id="{section_id}">',
            "\n\n".join(rows),
            "</section>",
        ]
    )

def build_service_products_library_html(item: dict[str, Any], email_modules: dict[str, str]) -> str:
    module_name = "servicetiles"
    module_html = email_modules.get(module_name)
    if module_html is None:
        fail(
            "Der Service-Tiles-Bereich referenziert das E-Mail-Modul 'servicetiles', "
            "aber unter email-builder/modules wurde keine passende HTML-Datei gefunden."
        )

    indented_module_html = indent_block(module_html, "                  ")
    return "\n".join(
        [
            '<section class="test-section" id="email-servicetiles">',
            '            <div class="test-module-row">',
            '              <div class="test-module-frame">',
            '                <div class="email-service-library">',
            '                  <div class="test-email-preview" data-email-preview-module="servicetiles">',
            indented_module_html,
            '                  </div>',
            '                </div>',
            '              </div>',
            '            </div>',
            '          </section>',
        ]
    )
