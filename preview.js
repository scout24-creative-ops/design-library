// Each document has its own real CSS viewport. Catalogue UI never sets module geometry.
const data = window.designLibraryData;
const params = new URLSearchParams(location.search);
const channel = params.get('channel');
const moduleName = params.get('module') || '';
const elementId = params.get('element') || '';
const key = params.get('key') || '';
const root = document.getElementById('preview-root');
const contentRoot = root;

function escapeHtml(value) {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stylesheet(href) {
  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    link.onload = () => resolve(true); link.onerror = () => resolve(false);
    document.head.appendChild(link);
  });
}

function measure() {
  const bounds = root.getBoundingClientRect();
  const height = Math.max(1, Math.ceil(Math.max(root.scrollHeight, bounds.height)));
  // Remove empty outer gutters, keeping the real desktop viewport and every
  // rendered module edge (including full-bleed content) at one CSS pixel per pixel.
  let left = bounds.left;
  let right = bounds.right;
  root.querySelectorAll('*').forEach(element => {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      left = Math.min(left, rect.left);
      right = Math.max(right, rect.right);
    }
  });
  const canvasLeft = Math.max(0, Math.floor(left));
  const canvasWidth = Math.max(1, Math.min(innerWidth, Math.ceil(right)) - canvasLeft);
  window.parent.postMessage({type:'design-library-preview', key, height,
    width:innerWidth, canvasLeft, canvasWidth}, '*');
}

function emailMarkup() {
  if (moduleName.startsWith('button-')) {
    const variants = {'button-filled-brand':'Filled Brand','button-filled-default':'Filled Default',
      'button-outline-strong':'Outline Strong','button-outline-weak':'Outline Weak'};
    if (!variants[moduleName]) return '';
    return `<section class="module"><div class="module__inner"><a class="${moduleName}" href="#">${variants[moduleName]}</a></div></section>`;
  }
  for (const item of data.sections.email.items) {
    if (!(item.modules || []).includes(moduleName) && moduleName !== 'servicetiles') continue;
    const template = document.createElement('template'); template.innerHTML = item.libraryHtml || '';
    const node = Array.from(template.content.querySelectorAll('[data-email-preview-module]'))
      .find(node => node.dataset.emailPreviewModule === moduleName);
    if (node) return node.innerHTML;
  }
  return '';
}

function lpMarkup() {
  if (moduleName) return window.designLibraryLpModuleMarkup[moduleName] || '';
  const element = data.lpElements[elementId];
  if (!element) return '';
  if (elementId === 'buttons') {
    const index = Number(params.get('variant'));
    return Array.from(element.markup.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g), match => match[0])[index] || '';
  }
  return element.markup;
}

async function start() {
  if (!['email','lp'].includes(channel)) throw new Error('Unknown preview channel');
  const markup = channel === 'email' ? emailMarkup() : lpMarkup();
  if (!markup) throw new Error('Unknown module');
  const font = data.tokens.typography.sourceUrl;
  let styles;
  let lpStyle;
  if (channel === 'email') {
    root.className = 'preview-canvas';
    root.style.width = `min(100%, ${data.layout.email.containerMaxWidth}px)`;
    root.style.margin = '0 auto';
    styles = [font, './email-preview-styles.css'];
  } else {
    root.className = 'frame-root ' + (innerWidth >= 669 ? 'sizes-desktop' : 'sizes-palm');
    lpStyle = document.createElement('style');
    lpStyle.textContent = window.designLibraryLpShadowCss.replace(/:host\b/g, ':root');
    styles = [font, ...data.lpStylesheets, ...(data.lpModuleStylesheets[moduleName] || [])];
  }
  const loading = styles.map(stylesheet);
  if (lpStyle) document.head.appendChild(lpStyle);
  root.innerHTML = markup;
  if (channel === 'email') hydrateEmailServiceProducts();
  if (moduleName === 'accordion') addAccordionPreviewExamples(root);
  if (channel === 'lp') initLpAccordion(root);
  root.addEventListener('click', event => {
    if (event.target.closest('a[href]')) event.preventDefault();
  });
  new ResizeObserver(measure).observe(root);
  root.addEventListener('load', measure, true);
  await Promise.all(loading);
  await document.fonts.ready;
  if (channel === 'lp') {
    await new Promise(resolve => {
      const script = document.createElement('script');
      script.src = data.lpRuntime;
      script.onload = () => { window.LPBuilderRuntime?.init(root); resolve(); };
      script.onerror = resolve; document.head.appendChild(script);
    });
  }
  root.dataset.ready = 'true';
  measure();
}

start().catch(error => {
  root.textContent = 'Vorschau konnte nicht geladen werden.';
  root.dataset.error = error.message;
  measure();
});

function hydrateEmailServiceProducts() {
  const host = contentRoot.querySelector("[data-email-service-products]");
  if (!host) return;

  host.innerHTML = data.serviceProducts
    .map(
      (product) => `
        <article class="servicetiles-card">
          <a class="servicetiles-card__link" href="${escapeHtml(product.targetUrl || "")}" target="_blank" rel="noopener noreferrer">
            <div class="servicetiles-card__panel">
              <div class="servicetiles-card__header">
                <img class="servicetiles-card__icon" src="${escapeHtml(product.iconUrl || "")}" alt="" width="32" height="32" loading="lazy" />
              </div>
              <h3 class="servicetiles-card__title">${escapeHtml(product.title || "")}</h3>
              <p class="module__body servicetiles-card__body">${escapeHtml(product.description || "")}</p>
            </div>
          </a>
        </article>
      `,
    )
    .join("");
}


function initLpAccordion(root) {
  root.querySelectorAll(".accordion__trigger").forEach((trigger) => {
    const item = trigger.closest(".accordion__item");
    const panel = item ? item.querySelector(".accordion__panel") : null;
    if (!item || !panel || trigger.dataset.ftBound === "true") return;

    trigger.dataset.ftBound = "true";
    trigger.setAttribute("aria-expanded", "false");
    panel.style.maxHeight = "0px";

    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      if (isOpen) {
        item.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        panel.style.maxHeight = "0px";
      } else {
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
  });
}


function addAccordionPreviewExamples(root) {
  const accordion = root.querySelector(".accordion");
  const original = accordion?.querySelector(".accordion__item");
  if (!original || accordion.children.length >= 5) return;
  const examples = [
    ["Wo finde ich weitere Informationen?", "Über die verlinkten Inhalte gelangen Sie zu weiterführenden Informationen und passenden Services."],
    ["An wen kann ich mich bei Fragen wenden?", "Nutzen Sie die auf der jeweiligen Seite angegebenen Kontaktmöglichkeiten für Ihr Anliegen."],
  ];
  examples.slice(0, 5 - accordion.children.length).forEach(([question, answer], offset) => {
    const item = original.cloneNode(true);
    const trigger = item.querySelector(".accordion__trigger");
    const panel = item.querySelector(".accordion__panel");
    const id = `library-accordion-extra-${offset + 1}`;
    trigger.id = `${id}-trigger`;
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${id}-panel`);
    item.querySelector(".accordion__question").textContent = question;
    panel.id = `${id}-panel`;
    panel.setAttribute("aria-labelledby", trigger.id);
    panel.querySelector("p").textContent = answer;
    accordion.appendChild(item);
  });
}

