"""Read current canonical LP markup; keep production CSS on its existing public URL."""
from pathlib import Path
import json
import hashlib
import re

LP_DIR=Path()
TOKENS_PATH=Path()
MARKUP_MARKER='window.designLibraryLpModuleMarkup = '
CSS_MARKER='window.designLibraryLpShadowCss = '
PUBLIC_STYLESHEETS=[
    'https://www.static-immobilienscout24.de/fro/core/8.5.0/css/core.min.css',
    'https://scout24-creative-ops.github.io/lp-builder/runtime/contentful/lpbuilder-bridge.css',
]
LP_PAGE_SPECS=[
    {'id':'heros','label':'Heros','modules':['hero-bleed-flex','hero-bleed-flex-centered','hero-split']},
    {'id':'teaser','label':'Teaser','modules':['teaser-2col','teaser-3col','teaser-4col','teaser-split-image-right','teaser-split-image-left','teaser-split-colour-image-right','teaser-split-colour-image-left','pricing-list','choice-card-list','choice-card-expand-list','content-cards-2col','content-cards-3col','card-carousel']},
    {'id':'process','label':'Steps','modules':['steps-3col','steps-4col']},
    {'id':'benefits','label':'Benefits','modules':['benefits-2col','benefits-3col']},
    {'id':'accordion','label':'Accordion','modules':['accordion']},
    {'id':'counter','label':'Counter','modules':['counter-animated']},
    {'id':'video','label':'Video','modules':['video--youtube']},
    {'id':'callouts','label':'Callouts','modules':['callout--base','callout--illu','callout--expert']},
    {'id':'service-tiles','label':'Service Tiles','modules':['servicetiles']},
    {'id':'tables','label':'Tables','modules':['product-comparison-table']},
    {'id':'team-professional','label':'Team Professional','modules':['b2b-package-list']},
    {'id':'action-tiles','label':'Action Tiles','modules':['action-tiles_rle']},
    {'id':'handbook','label':'Handbook','modules':['handbook-category-card','handbook-step-media']},
    {'id':'diagrams','label':'Diagramme','modules':['static-inline-svg-diagram-section']},
    {'id':'sticky-footer','label':'Sticky Footer','modules':['lp-sticky-footer']},
    {'id':'text-lists','label':'Text & Lists','modules':[], 'elementGroups':[
        {'label':'Text','layout':'stack','elements':['headline-variants','text-variants','text-links']},
        {'label':'Lists','layout':'stack','elements':['list-plain','list-ordered','list-nested','list-bullet','checkmark-list']}]},
    {'id':'buttons-links','label':'Buttons & Links','modules':[], 'elementGroups':[
        {'label':'Buttons & Links','layout':'stack','elements':['buttons','chevron-link']}]},
    {'id':'colors','label':'Colors & Surfaces','modules':[], 'elementGroups':[
        {'label':'Farben und Flächen','layout':'stack','elements':['colors','surfaces']}]},
    {'id':'svg','label':'SVG-Komponente','modules':[], 'elementGroups':[
        {'label':'Statisches SVG','layout':'stack','elements':['static-inline-svg-diagram']}]},
]
SELECTED_LP_MODULE_IDS=[m for p in LP_PAGE_SPECS for m in p['modules']]
SELECTED_LP_ELEMENT_IDS=[e for p in LP_PAGE_SPECS for g in p.get('elementGroups',[]) for e in g['elements']]


def configure_source(lp_dir,tokens_path):
    global LP_DIR,TOKENS_PATH
    LP_DIR=Path(lp_dir);TOKENS_PATH=Path(tokens_path)


def blocks(kind):
    text=(LP_DIR/'modules/component-library.html').read_text()
    pattern=re.compile(r'<!--\s*LP_'+kind+r'_START:\s*([\w-]+)\s*-->(.*?)<!--\s*LP_'+kind+r'_END:\s*\1\s*-->',re.S)
    result={m[1]:m[2].strip() for m in pattern.finditer(text)}
    if len(result)!=len(list(pattern.finditer(text))):raise ValueError('Duplicate canonical blocks')
    return result


def load_module_metadata():
    available=blocks('MODULE')
    if len(SELECTED_LP_MODULE_IDS)!=len(set(SELECTED_LP_MODULE_IDS)) or set(available)!=set(SELECTED_LP_MODULE_IDS):
        raise ValueError('LP navigation must cover every canonical module exactly once')
    lock=json.loads((LP_DIR/'runtime-lock.json').read_text())
    entry=next(x for x in lock['files'] if x['path']=='runtime/contentful/lpbuilder-bridge.css')
    if hashlib.sha256((LP_DIR/entry['path']).read_bytes()).hexdigest()!=entry['sha256']:
        raise ValueError('Public bridge does not match current runtime lock')
    return [{'id':m,'source':'lp-builder/modules/component-library.html'} for m in SELECTED_LP_MODULE_IDS]


def build_lp_content_section(metadata):
    if [x['id'] for x in metadata]!=SELECTED_LP_MODULE_IDS:raise ValueError('LP metadata mismatch')
    items=[]
    for p in LP_PAGE_SPECS:
        item={**p,'kind':'lpElements' if p.get('elementGroups') else 'lpModules'}
        items.append(item)
    return {'label':'LP-Module','items':items}


def build_lp_element_data():
    available=blocks('COMPONENT')
    if set(SELECTED_LP_ELEMENT_IDS)!=set(available):raise ValueError('Component navigation mismatch')
    return {key:{'markup':available[key],'copyPayload':available[key],'copyLabel':key} for key in SELECTED_LP_ELEMENT_IDS}


def extract_module_markup(ids):
    available=blocks('MODULE')
    return {name:available[name] for name in ids}


def build_lp_shadow_styles():
    t=json.loads(TOKENS_PATH.read_text());lp=t['colors']['palette']['lp'];shared=t['colors']['palette']['shared'];sem=t['colors']['semantic']['lp']
    variables={**{'--brand-'+k:v for k,v in lp.items()},
        '--gray-100':shared['white'],'--gray-200':shared['sand'],'--gray-250':sem['hoverSoft'],
        '--gray-300':shared['grey2'],'--gray-400':sem['borderSoft'],'--gray-650':sem['borderWeak'],
        '--gray-700':shared['grey5'],'--gray-850':sem['textMuted'],'--gray-1000':shared['charcoal'],
        '--color-background-brand':'var(--brand-teal)','--color-background-default':'var(--gray-100)',
        '--color-background-weak':'var(--gray-250)','--color-border-default':'var(--gray-400)',
        '--color-text-charcoal':'var(--gray-1000)','--color-text-default':'var(--gray-1000)',
        '--color-text-inversive':'var(--gray-100)','--color-text-weak':'var(--gray-650)',
        '--border-radius-400':t['radius']['16'],'--border-radius-600':t['radius']['24'],
        '--border-radius-rounded':t['radius']['pill']}
    return '/* Preview containment only. Production bridge is linked, never duplicated. */\n:host{'+''.join(k+':'+v+';' for k,v in variables.items())+'''
--module-content-max:1170px;--module-content-max-mobile:374px;}
*{box-sizing:border-box;}
.frame-root{width:100%;color:var(--gray-1000);font-family:"Make It Better",Arial,sans-serif;}
.frame-root:not(.frame-root--element)>*{width:min(100%,var(--module-content-max));margin-left:auto;margin-right:auto;}
.frame-root .lpb-hero{width:100%!important;margin-left:0!important;margin-right:0!important;}
.frame-root .lpb-hero--bleed:not(.lpb-hero--centered) .lpb-hero__content{max-width:var(--module-content-max);}
.frame-root img[src=""]{visibility:hidden;}
@media(max-width:740px){.frame-root:not(.frame-root--element)>*{width:min(100%,var(--module-content-max-mobile));}}
'''


def render_markup_assignment(markup):
    return '// Generated from lp-builder/modules/component-library.html.\n'+MARKUP_MARKER+json.dumps(markup,ensure_ascii=False,indent=2)+';\n'


def render_shadow_assignment(css):
    return '// Generated preview containment. No copy of production bridge CSS.\n'+CSS_MARKER+json.dumps(css,ensure_ascii=False)+';\n'
