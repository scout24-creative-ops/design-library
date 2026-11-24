const data = window.designLibraryData;

const state = {
  section: "email",
  item: "logo",
};



const topNavLinks = Array.from(document.querySelectorAll("[data-main-nav]"));
const homeTrigger = document.querySelector("[data-home-trigger]");
const sidebarEyebrow = document.getElementById("ft-sidebar-eyebrow");
const sidebarNav = document.getElementById("ft-sidebar-nav");
const contentRoot = document.getElementById("ft-content");
const layoutRoot = document.getElementById("ft-layout");

const LP_BLEED_MODULES = new Set(["hero-bleed-flex", "hero-bleed-flex-centered"]);
const LP_REMOTE_STYLESHEETS = data.lpStylesheets || [];

const EMAIL_HERO_SIDEBAR_ITEMS = new Set(["heros-left", "heros-center", "heros-fakeforms"]);
const DEFAULT_ROUTE = { section: "email", item: "logo" };
const EMAIL_BUTTONS_ITEM = { id: "buttons", label: "Buttons", kind: "emailButtons" };
const EMAIL_BUTTON_VARIANTS = [
  ["button-filled-brand", "Filled Brand"],
  ["button-filled-default", "Filled Default"],
  ["button-outline-strong", "Outline Strong"],
  ["button-outline-weak", "Outline Weak"],
];

let previewSerial = 0;
function sizePreview(host) {
  const frame = host.querySelector('iframe');
  const canvas = host.querySelector('.ft-preview-canvas');
  if (!frame || !canvas) return;
  const width = Number(frame.dataset.canvasWidth || frame.dataset.viewportWidth);
  const left = Number(frame.dataset.canvasLeft || 0);
  const height = Number(frame.dataset.contentHeight || 240);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  frame.style.left = `${-left}px`;
}

function mountPreview(host, request) {
  if (host.querySelector('iframe')) return;
  const width = data.layout[request.channel].referenceViewports.desktop;
  const key = `preview-${++previewSerial}`;
  const query = new URLSearchParams({...request, key});
  const frame = document.createElement('iframe');
  frame.src = `./preview.html?${query}`;
  frame.title = `${request.module || request.element} · Originalgröße`;
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.dataset.previewKey = key;
  frame.dataset.viewportWidth = String(width);
  frame.style.width = `${width}px`;
  frame.style.height = '240px';
  host.innerHTML = '';
  host.classList.add('ft-viewport-host');
  host.tabIndex = 0;
  host.setAttribute('role', 'region');
  host.setAttribute('aria-label', `${request.module || request.element} – Modulvorschau in Originalgröße, horizontal scrollbar`);
  const canvas = document.createElement('div');
  canvas.className = 'ft-preview-canvas';
  canvas.appendChild(frame);
  host.appendChild(canvas);
  sizePreview(host);
}

window.addEventListener('message', event => {
  const message = event.data;
  if (!message || message.type !== 'design-library-preview' || typeof message.key !== 'string') return;
  const frame = Array.from(contentRoot.querySelectorAll('iframe[data-preview-key]'))
    .find(frame => frame.contentWindow === event.source && frame.dataset.previewKey === message.key);
  if (!frame || message.width !== Number(frame.dataset.viewportWidth) ||
      !Number.isFinite(message.height) || message.height < 1 || message.height > 30000 ||
      !Number.isFinite(message.canvasLeft) || message.canvasLeft < 0 ||
      !Number.isFinite(message.canvasWidth) || message.canvasWidth < 1 ||
      message.canvasLeft + message.canvasWidth > message.width) return;
  frame.dataset.contentHeight = String(message.height);
  frame.dataset.canvasLeft = String(message.canvasLeft);
  frame.dataset.canvasWidth = String(message.canvasWidth);
  frame.style.height = `${message.height}px`;
  sizePreview(frame.parentElement.parentElement);
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function copyButton(value, label) {
  const escapedValue = escapeHtml(value);
  const escapedLabel = escapeHtml(label);

  return `
    <button
      class="ft-copy-button"
      type="button"
      data-copy-value="${escapedValue}"
      aria-label="${escapedLabel} kopieren"
      title="${escapedLabel} kopieren"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `;
}

function renderModuleCopy(copyValue, copyLabel = copyValue) {
  const escapedValue = escapeHtml(copyValue);
  const escapedLabel = escapeHtml(copyLabel);

  return `
    <div class="module-copy" data-module="${escapedValue}">
      <button class="module-copy__button" type="button" aria-label="${escapedLabel} kopieren" title="${escapedLabel} kopieren">
        <svg class="module-copy__icon module-copy__icon--default" viewBox="0 0 24 24">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="module-copy__icon--success" aria-hidden="true"></span>
      </button>
    </div>
  `;
}

async function copyText(value) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function renderTopNav() {
  topNavLinks.forEach((link) => {
    const isActive = state.section !== "home" && link.dataset.mainNav === state.section;
    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

// Hash routes stay intentionally small: #home or #<section>/<item>.
function getSectionItems(sectionKey) {
  const items = data.sections[sectionKey]?.items || [];
  if (sectionKey !== "email") return items;
  // Component examples belong to the UI, not the canonical module inventory.
  const footerIndex = items.findIndex((item) => item.id === "footer");
  const index = footerIndex < 0 ? items.length : footerIndex;
  return [...items.slice(0, index), EMAIL_BUTTONS_ITEM, ...items.slice(index)];
}

function getDefaultItem(sectionKey) {
  return getSectionItems(sectionKey)[0]?.id || null;
}

function normalizeRoute(sectionKey, itemId) {
  if (sectionKey === "foundations") sectionKey = "tokens";
  if (sectionKey === "lp" && itemId === "text-lists") sectionKey = "tokens";
  if (sectionKey === "lp" && itemId === "colors") return { section: "tokens", item: "colors" };
  if (sectionKey === "lp" && itemId === "svg") itemId = "diagrams";
  if (sectionKey === "lp" && itemId === "steps") itemId = "process";
  if (sectionKey === "home") return { ...DEFAULT_ROUTE };

  if (!data.sections[sectionKey]) {
    return { ...DEFAULT_ROUTE };
  }

  const items = getSectionItems(sectionKey);
  const resolvedItem = items.find((item) => item.id === itemId)?.id || getDefaultItem(sectionKey);

  if (!resolvedItem) {
    return { ...DEFAULT_ROUTE };
  }

  return {
    section: sectionKey,
    item: resolvedItem,
  };
}

function getHashForRoute(route) {
  return `#${encodeURIComponent(route.section)}/${encodeURIComponent(route.item)}`;
}

function replaceHash(hashValue) {
  const nextUrl = `${window.location.pathname}${window.location.search}${hashValue}`;
  window.history.replaceState(null, "", nextUrl);
}

function getRouteFromHash(hashValue = window.location.hash) {
  const rawHash = String(hashValue || "").replace(/^#/, "").trim();

  if (!rawHash || rawHash === "home") {
    return { ...DEFAULT_ROUTE };
  }

  const [rawSection = "", rawItem = ""] = rawHash.split("/");
  const sectionKey = decodeURIComponent(rawSection);
  const itemId = rawItem ? decodeURIComponent(rawItem) : null;

  return normalizeRoute(sectionKey, itemId);
}

function applyRoute(route) {
  state.section = route.section;
  state.item = route.item;
  render();
}

function syncRouteFromHash() {
  const currentHash = window.location.hash;
  const route = getRouteFromHash(currentHash);

  if (currentHash) {
    const normalizedHash = getHashForRoute(route);

    if (currentHash !== normalizedHash) {
      replaceHash(normalizedHash);
    }
  }

  applyRoute(route);
}

function navigateTo(sectionKey, itemId = null) {
  const route = normalizeRoute(sectionKey, itemId);
  const nextHash = getHashForRoute(route);

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
    return;
  }

  applyRoute(route);
}

function renderSidebarItem(item, extraClass = "") {
  const activeClass = item.id === state.item ? " is-active" : "";

  return `
    <button class="ft-sidebar__link${activeClass}${extraClass ? ` ${extraClass}` : ""}" type="button" data-sidebar-item="${item.id}">
      ${escapeHtml(item.label)}
    </button>
  `;
}

function formatLpCategoryLabel(category) {
  const labels = {
    hero: "Hero",
    teaser: "Teaser",
    steps: "Steps",
    content: "Content",
    callout: "Callouts",
    "social-proof": "Social Proof",
    tiles: "Tiles",
    utility: "Utility",
    media: "Media",
  };

  return labels[category] || category || "Other";
}

function getSectionNote(sectionKey, currentItem) {
  if (sectionKey === "lp") {
    return null;
  }

  return sectionKey === "email" ? null : currentItem.note;
}

function renderSidebar(items, label, sectionKey = state.section) {
  sidebarEyebrow.textContent = label;

  if (sectionKey === "email") {
    const fragments = [];
    let heroItems = [];

    const flushHeroItems = () => {
      if (!heroItems.length) return;
      const heroTarget = heroItems[0]?.id || "";
      const heroGroupActive = heroItems.some((item) => item.id === state.item);

      fragments.push(`
        <div class="ft-sidebar__group">
          <button class="ft-sidebar__link${heroGroupActive ? " is-active" : ""}" type="button" data-sidebar-item="${heroTarget}">
            Heros
          </button>
          ${
            heroGroupActive
              ? `
                <div class="ft-sidebar__group-items">
                  ${heroItems.map((item) => renderSidebarItem(item, "ft-sidebar__link--sub")).join("")}
                </div>
              `
              : ""
          }
        </div>
      `);
      heroItems = [];
    };

    items.forEach((item) => {
      if (EMAIL_HERO_SIDEBAR_ITEMS.has(item.id)) {
        heroItems.push(item);
        return;
      }

      flushHeroItems();
      fragments.push(renderSidebarItem(item));
    });

    flushHeroItems();
    sidebarNav.innerHTML = fragments.join("");
  } else if (sectionKey === "lp") {
    sidebarNav.innerHTML = items.map((item) => renderSidebarItem(item)).join("");
  } else {
    sidebarNav.innerHTML = items.map((item) => renderSidebarItem(item)).join("");
  }

  sidebarNav.querySelectorAll("[data-sidebar-item]").forEach((button) => {
    button.addEventListener("click", () => {
      navigateTo(state.section, button.dataset.sidebarItem);
    });
  });
}

function renderNote(note) {
  if (!note) return "";

  return `
    <section class="ft-note" aria-label="Hinweis">
      ${note.eyebrow ? `<p class="ft-note__eyebrow">${escapeHtml(note.eyebrow)}</p>` : ""}
      ${note.title ? `<span class="ft-note__label">${escapeHtml(note.title)}</span>` : ""}
      ${note.text ? `<p class="ft-note__text">${escapeHtml(note.text)}</p>` : ""}
    </section>
  `;
}

function renderValueCard(title, value, preview) {
  return `
    <article class="ft-token-card">
      <div class="ft-token-card__preview">${preview}</div>
      <div class="ft-token-card__meta">
        <h3 class="ft-token-card__title">${escapeHtml(title)}</h3>
        <div class="ft-value-row">
          <code>${escapeHtml(value)}</code>
          ${copyButton(value, title)}
        </div>
      </div>
    </article>
  `;
}

function renderPlainRow(title, metaHtml, previewHtml, copyValue, extraClass = "") {
  return `
    <article class="ft-plain-row${extraClass ? ` ${extraClass}` : ""}">
      <div class="ft-plain-row__preview">${previewHtml}</div>
      <div class="ft-plain-row__main">
        <h3 class="ft-plain-row__title">${escapeHtml(title)}</h3>
        ${metaHtml}
      </div>
      <div class="ft-plain-row__copy">
        ${copyButton(copyValue, title)}
      </div>
    </article>
  `;
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderTokenContent(itemId) {
  const { tokens } = data;

  if (itemId === "colors") {
    return `
      ${renderNote({ text: tokens.colors.usage })}
      <div class="ft-swatch-groups">
        ${tokens.colors.groups
          .map(
            (group) => `
              <section class="ft-swatch-group">
                <h3 class="ft-swatch-group__title">${escapeHtml(group.title)}</h3>
                <div class="ft-swatch-grid">
                  ${group.items
                    .map(
                      (item) => `
                        <article class="ft-token-card ft-swatch-card">
                          <div class="ft-swatch__chip" style="background:${escapeHtml(item.value)};"></div>
                          <div class="ft-token-card__meta">
                            <p class="ft-swatch__name">${escapeHtml(item.name)}</p>
                            <div class="ft-value-row">
                              <code>${escapeHtml(item.value)}</code>
                              ${copyButton(item.value, item.name)}
                            </div>
                          </div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")}
      </div>
    `;
  }

  if (itemId === "buttons") {
    return `
      <div class="ft-button-list">
        ${tokens.buttons.items
          .map((item) => {
            if (item.isLink) {
              return renderPlainRow(
                item.name,
                `<div class="ft-plain-row__meta"><code>${escapeHtml(item.name)}</code></div>`,
                `
                  <a class="ft-token-chevron-link" href="#0">
                    <img src="${escapeHtml(item.iconUrl)}" width="8" height="16" alt="" />
                    <span>${escapeHtml(item.name)}</span>
                  </a>
                `,
                item.name,
              );
            }

            return renderPlainRow(
              item.name,
              `<div class="ft-plain-row__meta"><code>${escapeHtml(item.name)}</code></div>`,
              `
                <div
                  class="ft-token-button-chip"
                  style="background:${escapeHtml(item.background)};color:${escapeHtml(item.color)};border:1px solid ${escapeHtml(item.border)};"
                >
                  ${escapeHtml(item.name)}
                </div>
              `,
              item.name,
            );
          })
          .join("")}
      </div>
    `;
  }

  if (itemId === "typography") {
    const rows = [
      ...tokens.typography.headingItems.map((item) => ({ ...item, fontWeight: 700 })),
      ...tokens.typography.bodyItems.map((item) => ({ ...item, fontWeight: 400 })),
    ];

    return `
      <div class="ft-content-stack">
        <section class="ft-type-source">
          <p class="ft-type-source__sample">${escapeHtml(tokens.typography.sample)}</p>
          <a class="ft-type-source__link" href="${escapeHtml(tokens.typography.sourceUrl)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(tokens.typography.sourceLabel)}
          </a>
        </section>

        <div class="ft-type-list">
          ${rows
            .map(
              (item) => `
                <article class="ft-type-row">
                  <div class="ft-type-row__column">
                    <p
                      class="ft-type-row__sample"
                      style="font-size:${escapeHtml(item.desktop.fontSize)};line-height:${escapeHtml(item.desktop.lineHeight)};font-weight:${item.fontWeight};"
                    >
                      ${escapeHtml(item.label)}
                    </p>
                    <div class="ft-type-row__meta">
                      <span>Desktop</span>
                      <span>Font-size ${escapeHtml(item.desktop.fontSize)}</span>
                      <span>Line-height ${escapeHtml(item.desktop.lineHeight)}</span>
                    </div>
                  </div>
                  <div class="ft-type-row__column">
                    <p
                      class="ft-type-row__sample"
                      style="font-size:${escapeHtml(item.mobile.fontSize)};line-height:${escapeHtml(item.mobile.lineHeight)};font-weight:${item.fontWeight};"
                    >
                      ${escapeHtml(item.label)}
                    </p>
                    <div class="ft-type-row__meta">
                      <span>Mobile</span>
                      <span>Font-size ${escapeHtml(item.mobile.fontSize)}</span>
                      <span>Line-height ${escapeHtml(item.mobile.lineHeight)}</span>
                    </div>
                  </div>
                  <div class="ft-type-row__copy">${copyButton(item.name, item.name)}</div>
                </article>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  if (itemId === "radius") {
    return `
      <div class="ft-plain-list">
        ${tokens.radius
          .map((item) =>
            renderPlainRow(
              item.name,
              `<div class="ft-plain-row__meta"><code>${escapeHtml(item.value)}</code></div>`,
              `<div class="ft-token-shape" style="border-radius:${escapeHtml(item.value)};"></div>`,
              item.value,
            ),
          )
          .join("")}
      </div>
    `;
  }

  if (itemId === "spacing") {
    return `
      <div class="ft-token-grid">
        ${tokens.spacing
          .map((item) =>
            renderValueCard(
              item.name,
              item.value,
              `<div class="ft-token-spacing"><div class="ft-token-spacing-bar" style="width:${escapeHtml(item.value)};"></div></div>`,
            ),
          )
          .join("")}
      </div>
    `;
  }

  if (itemId === "borders") {
    return `
      <div class="ft-token-grid">
        ${tokens.borders
          .map((item) => {
            const styleColor = item.name === "none" ? "transparent" : "#333333";
            const styleHeight = item.name === "none" ? "1px" : item.value;

            return renderValueCard(
              item.name,
              item.value,
              `<div class="ft-token-border-preview"><div class="ft-token-border-line" style="height:${escapeHtml(styleHeight)};background:${styleColor};"></div></div>`,
            );
          })
          .join("")}
      </div>
    `;
  }

  if (itemId === "ratios") {
    return `
      <div class="ft-ratio-grid">
        ${tokens.ratios
          .map((item) => {
            const parts = item.ratio.split(":").map(Number);
            const paddingTop =
              parts.length === 2 && parts[0] ? `${((parts[1] / parts[0]) * 100).toFixed(2)}%` : "56.25%";

            return `
              <article class="ft-ratio-card ft-token-card">
                <div class="ft-ratio-card__header">
                  <div class="ft-ratio-card__ratio">
                    <span>${escapeHtml(item.ratio)}</span>
                    ${item.badge ? `<span class="ft-ratio-card__badge">${escapeHtml(item.badge)}</span>` : ""}
                  </div>
                  ${copyButton(item.ratio, item.ratio)}
                </div>
                <h3 class="ft-ratio-card__title">${escapeHtml(item.title)}</h3>
                <div class="ft-ratio-preview">
                  <div class="ft-ratio-preview__box" style="padding-top:${paddingTop};">
                    <div class="ft-ratio-preview__box-inner">${escapeHtml(item.ratio)}</div>
                  </div>
                  <div class="ft-ratio-preview__sizes">
                    <p>${escapeHtml(item.primarySize)}</p>
                    ${item.secondarySize ? `<p>${escapeHtml(item.secondarySize)}</p>` : ""}
                  </div>
                </div>
                <p class="ft-ratio-card__usage">${escapeHtml(item.usage)}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  }

  return "";
}

function slugifyModuleName(value) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-").toLowerCase();
}

function renderEmailSection(item) {
  if (item.kind === "emailButtons") {
    return `<div class="ft-email-library ft-email-buttons">
      <div class="ft-lp-element-grid ft-lp-element-grid--stack">
        ${EMAIL_BUTTON_VARIANTS.map(([className, label]) => {
          const markup = `<a class="${className}" href="#">${label}</a>`;
          return `<div class="ft-lp-element-card" data-email-button="${className}">
            ${renderModuleCopy(markup, label)}
            <div class="test-module-frame"><div class="test-email-preview"><div class="ft-email-button-preview">${markup}</div></div></div>
          </div>`;
        }).join("")}
      </div>
    </div>`;
  }
  return `<div class="ft-email-library">${item.libraryHtml || ""}</div>`;
}

function getLpElementVariants(elementId) {
  const element = data.lpElements?.[elementId];
  if (!element) return [];
  if (elementId !== "buttons") return [element];
  // The canonical buttons block contains standalone anchors. Keep each anchor
  // verbatim so copying a variant never includes its neighbours or preview UI.
  return Array.from(element.markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g), (match, index) => ({
    markup: match[0], copyPayload: match[0],
    copyLabel: match[0].replace(/<[^>]*>/g, ""), index,
  }));
}

function renderLpElements(item) {
  const pageId = item.id || "";

  return `
    <div class="ft-lp-library ft-lp-elements" data-lp-page="${escapeHtml(pageId)}">
      ${(item.elementGroups || [])
        .map(
          (group) => `
            <section class="ft-lp-element-group" id="lp-${escapeHtml(pageId)}-${slugifyModuleName(group.label || "group")}">
              <h2 class="ft-lp-element-group__title">${escapeHtml(group.label || "")}</h2>
              <div class="ft-lp-element-grid ft-lp-element-grid--${escapeHtml(group.layout || "grid")}">
                ${(group.elements || [])
                  .map((elementId) => getLpElementVariants(elementId).map((element) => `
                      <div class="ft-lp-element-card" data-lp-element-card="${escapeHtml(elementId)}">
                        ${renderModuleCopy(element.copyPayload, element.copyLabel || elementId)}
                        <div class="test-module-frame">
                          <div
                            class="ft-lp-shadow-host"
                            data-lp-page="${escapeHtml(pageId)}"
                            data-lp-element="${escapeHtml(elementId)}"
                            ${element.index !== undefined ? `data-lp-button-index="${element.index}"` : ""}
                            data-lp-preview-name="${escapeHtml(elementId)}"
                            data-frame-id="lp-element-${escapeHtml(slugifyModuleName(elementId))}${element.index !== undefined ? `-${element.index}` : ""}"
                          ></div>
                        </div>
                      </div>
                    `).join(""))
                  .join("")}
              </div>
            </section>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderLpSection(item) {
  if (item.kind === "lpElements") {
    return renderLpElements(item);
  }

  const sectionId = `lp-${item.id}`;
  const pageId = item.id || "";

  return `
    <div class="ft-lp-library" data-lp-page="${escapeHtml(pageId)}">
      <section class="test-section" id="${escapeHtml(sectionId)}">
        ${(item.modules || [])
          .map((moduleName) => {
            const previewName = moduleName === "lp-sticky-footer" ? "sticky-footer" : moduleName;
            const frameId = moduleName === "lp-sticky-footer" ? "lp-sticky-footer" : `lp-${slugifyModuleName(moduleName)}`;
            const bleedClass = LP_BLEED_MODULES.has(moduleName) ? " test-module-row--bleed" : "";

            return `
              <div class="test-module-row${bleedClass}">
                ${renderModuleCopy(moduleName)}
                <div class="test-module-frame">
                  <div
                    class="ft-lp-shadow-host"
                    data-lp-page="${escapeHtml(pageId)}"
                    data-lp-module="${escapeHtml(moduleName)}"
                    data-lp-preview-name="${escapeHtml(previewName)}"
                    data-frame-id="${escapeHtml(frameId)}"
                  ></div>
                </div>
              </div>
            `;
          })
          .join("")}
      </section>
    </div>
  `;
}

function renderSectionContent(sectionKey, item) {
  if (item.kind === "lpElements") return renderLpElements(item);
  if (sectionKey === "tokens") {
    return renderTokenContent(item.id);
  }

  if (sectionKey === "email") {
    return renderEmailSection(item);
  }

  if (sectionKey === "lp") {
    return renderLpSection(item);
  }

  return "";
}

function renderSection() {
  const currentSection = data.sections[state.section];
  const items = getSectionItems(state.section);
  const currentItem = items.find((item) => item.id === state.item) || items[0];
  const noteHtml = renderNote(getSectionNote(state.section, currentItem));
  const sectionClass =
    state.section === "email" || state.section === "lp" || currentItem.kind === "lpElements"
      ? "ft-content-section ft-content-section--library"
      : "ft-content-section";

  state.item = currentItem.id;
  renderSidebar(items, currentSection.label, state.section);

  contentRoot.innerHTML = `
    ${noteHtml}

    <section class="${sectionClass}">
      ${renderSectionContent(state.section, currentItem)}
    </section>
  `;

  bindCopyButtons();
  bindModuleCopyButtons();
  hydrateEmailPreviewScopes();
  hydrateLpModulePreviews();
}

function render() {
  renderTopNav();
  layoutRoot.classList.remove("ft-layout--home", "ft-layout--agents");
  renderSection();
}

function bindCopyButtons() {
  contentRoot.querySelectorAll("[data-copy-value]").forEach((button) => {
    if (button.dataset.copyBound === "true") return;
    button.dataset.copyBound = "true";

    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue || "";
      if (!value) return;

      try {
        await copyText(value);
        button.classList.add("is-copied");
        window.setTimeout(() => {
          button.classList.remove("is-copied");
        }, 1200);
      } catch (error) {
        console.warn("copy failed", error);
      }
    });
  });
}

function bindModuleCopyButtons() {
  contentRoot.querySelectorAll(".module-copy").forEach((copy) => {
    if (copy.dataset.copyBound === "true") return;
    copy.dataset.copyBound = "true";

    const button = copy.querySelector(".module-copy__button");
    const moduleName = copy.dataset.module || "";
    if (!button || !moduleName) return;

    button.addEventListener("click", async () => {
      try {
        await copyText(moduleName);
        copy.classList.add("is-copied");
        window.setTimeout(() => {
          copy.classList.remove("is-copied");
        }, 1200);
      } catch (error) {
        console.warn("module copy failed", error);
      }
    });
  });
}

function hydrateEmailPreviewScopes() {
  contentRoot.querySelectorAll('.test-email-preview').forEach(host => {
    const name = host.dataset.emailPreviewModule || host.closest('[data-email-button]')?.dataset.emailButton;
    if (name) mountPreview(host, {channel:'email', module:name});
  });
}

function hydrateLpModulePreviews() {
  contentRoot.querySelectorAll('.ft-lp-shadow-host').forEach(host => {
    mountPreview(host, {channel:'lp', module:host.dataset.lpModule || '',
      element:host.dataset.lpElement || '', variant:host.dataset.lpButtonIndex || '0'});
  });
}

topNavLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const nextSection = link.dataset.mainNav;
    navigateTo(nextSection, getDefaultItem(nextSection));
  });
});

homeTrigger.addEventListener("click", (event) => {
  event.preventDefault();
  navigateTo(DEFAULT_ROUTE.section, DEFAULT_ROUTE.item);
});



window.addEventListener("hashchange", syncRouteFromHash);

syncRouteFromHash();
