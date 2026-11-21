"""Read current canonical LP markup; link the reviewed, versioned production CSS release."""
from pathlib import Path
import json
import hashlib
import re

LP_DIR=Path()
TOKENS_PATH=Path()
MARKUP_MARKER='window.designLibraryLpModuleMarkup = '
CSS_MARKER='window.designLibraryLpShadowCss = '
PUBLIC_BRIDGE_PATH='releases/contentful/layout-v1/lpbuilder-bridge.css'
PUBLIC_STYLESHEETS=[
    'https://www.static-immobilienscout24.de/fro/core/8.5.0/css/core.min.css',
    'https://www.static-immobilienscout24.de/fro/cosma-ui-icons/6.20.0/s24-icons.css',
    'https://scout24-creative-ops.github.io/lp-builder/'+PUBLIC_BRIDGE_PATH,
]
# The comparison module has its own already-published bridge. Keep both public
# deliveries intact; load this dependency only in that module's isolated preview.
MODULE_STYLESHEETS={
    'product-comparison-table': [
        'https://scout24-creative-ops.github.io/public/LP%20Builder%20%E2%80%93%20Contentful/lpbuilder-bridge/lpbuilder-bridge.css',
    ],
}
FOUNDATION_PAGE_SPECS=[
    {'id':'text-lists','label':'Text & Lists','kind':'lpElements','modules':[], 'elementGroups':[
        {'label':'Text','layout':'stack','elements':['headline-variants','text-variants','text-links']},
        {'label':'Lists','layout':'stack','elements':['list-plain','list-ordered','list-nested','list-bullet','checkmark-list']}]},
]
# These duplicate categories were explicitly removed from the Library. The
# canonical Builder components remain untouched and are checked below.
OMITTED_LP_ELEMENT_IDS={'colors','surfaces','static-inline-svg-diagram'}
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
    {'id':'buttons-links','label':'Buttons & Links','modules':[], 'elementGroups':[
        {'label':'Buttons & Links','layout':'stack','elements':['buttons','chevron-link']}]},
]
SELECTED_LP_MODULE_IDS=[m for p in LP_PAGE_SPECS for m in p['modules']]
SELECTED_LP_ELEMENT_IDS=[e for p in LP_PAGE_SPECS+FOUNDATION_PAGE_SPECS for g in p.get('elementGroups',[]) for e in g['elements']]


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
    manifest=json.loads((LP_DIR/Path(PUBLIC_BRIDGE_PATH).parent/'manifest.json').read_text())
    release=(LP_DIR/PUBLIC_BRIDGE_PATH).read_bytes()
    if manifest['stylesheet']!=PUBLIC_BRIDGE_PATH or len(release)!=manifest['bytes'] or hashlib.sha256(release).hexdigest()!=manifest['sha256']:
        raise ValueError('Versioned public bridge does not match its release manifest')
    if manifest['base']['path']!=entry['path'] or manifest['base']['sha256']!=entry['sha256']:
        raise ValueError('Layout release does not preserve the protected bridge baseline')
    return [{'id':m,'source':'lp-builder/modules/component-library.html'} for m in SELECTED_LP_MODULE_IDS]


def build_lp_content_section(metadata):
    if [x['id'] for x in metadata]!=SELECTED_LP_MODULE_IDS:raise ValueError('LP metadata mismatch')
    items=[]
    for p in LP_PAGE_SPECS:
        item={**p,'kind':'lpElements' if p.get('elementGroups') else 'lpModules'}
        items.append(item)
    return {'label':'Landing Page','items':items}


def build_lp_element_data():
    available=blocks('COMPONENT')
    if set(SELECTED_LP_ELEMENT_IDS) & OMITTED_LP_ELEMENT_IDS or set(SELECTED_LP_ELEMENT_IDS) | OMITTED_LP_ELEMENT_IDS != set(available):
        raise ValueError('Component navigation mismatch')
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
    layout=t['layout']['lp']
    rules='/* Preview containment only. Production module CSS stays linked. */\n:host{'+''.join(k+':'+v+';' for k,v in variables.items())+'}\n'
    rules+='*{box-sizing:border-box;}\n.frame-root{display:flow-root;width:100%%;max-width:%dpx;margin:0 auto;padding:0 %dpx;color:var(--gray-1000);font-family:"Make It Better",Arial,sans-serif;}\n' % (layout['containerMaxWidth'],layout['paddingInline'][0]['value'])
    for step in layout['paddingInline'][1:]:
        rules+='@media(min-width:%dpx){.frame-root{padding-left:%dpx;padding-right:%dpx;}}\n' % (step['minWidth'],step['value'],step['value'])
    # The catalogue makes the normally scroll-triggered footer inspectable.
    rules+='.frame-root .lpb-sticky-footer{position:relative!important;inset:auto!important;transform:none!important;transition:none!important;z-index:0!important;}\n'
    return rules



def render_markup_assignment(markup):
    return '// Generated from lp-builder/modules/component-library.html.\n'+MARKUP_MARKER+json.dumps(markup,ensure_ascii=False,indent=2)+';\n'


def render_shadow_assignment(css):
    return '// Generated preview containment. No copy of production bridge CSS.\n'+CSS_MARKER+json.dumps(css,ensure_ascii=False)+';\n'
