"""Current source fidelity and preview isolation replace the retired two-Library contract."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sync_design_library_sources as sync
import library_lp_sources as lp

EMAIL=Path(os.environ.get('EMAIL_BUILDER_DIR',ROOT.parent/'email-builder'))
LP=Path(os.environ.get('LP_BUILDER_DIR',ROOT.parent/'lp-builder'))


DESIGN_SYSTEM=Path(os.environ.get('DESIGN_SYSTEM_DIR',ROOT.parent/'design-system'))


@unittest.skipUnless((EMAIL/'modules/preview.css').is_file() and (LP/'modules/component-library.html').is_file() and (DESIGN_SYSTEM/'tokens/brands/immoscout24.json').is_file(), 'Full source check needs the three source checkouts')
class ContentfulDesignLibrarySyncTest(unittest.TestCase):
    def setUp(self):lp.configure_source(LP,DESIGN_SYSTEM/'tokens/brands/immoscout24.json')

    def test_all_outputs_belong_to_the_one_library(self):
        outputs=sync.generate(EMAIL,LP,design_system_dir=DESIGN_SYSTEM)
        self.assertTrue(all('/' not in name and not name.startswith('.') for name in outputs))
        self.assertEqual(ROOT, sync.OUTPUT)
        self.assertFalse((ROOT/'design-library').exists())

    def test_lp_categories_cover_every_current_module_exactly_once(self):
        actual=lp.extract_module_markup(lp.SELECTED_LP_MODULE_IDS)
        source=lp.blocks('MODULE')
        self.assertEqual(actual,source)
        self.assertEqual(34,len(actual))
        self.assertEqual(len(lp.SELECTED_LP_MODULE_IDS),len(set(lp.SELECTED_LP_MODULE_IDS)))

    def test_active_component_payloads_are_exact_canonical_markup(self):
        elements=lp.build_lp_element_data();canonical=lp.blocks('COMPONENT')
        self.assertEqual(10,len(elements))
        self.assertEqual(set(elements)|lp.OMITTED_LP_ELEMENT_IDS,set(canonical))
        self.assertEqual({'colors','surfaces','static-inline-svg-diagram'},lp.OMITTED_LP_ELEMENT_IDS)
        for key,payload in elements.items():
            self.assertEqual(canonical[key],payload['markup'])
            self.assertEqual(payload['markup'],payload['copyPayload'])

    def test_lp_uses_existing_public_css_and_only_preview_containment(self):
        css=lp.build_lp_shadow_styles()
        self.assertIn('https://scout24-creative-ops.github.io/lp-builder/releases/contentful/layout-v1/lpbuilder-bridge.css',lp.PUBLIC_STYLESHEETS)
        self.assertNotIn((LP/'runtime/contentful/lpbuilder-bridge.css').read_text().strip(),css)
        self.assertIn('Preview containment only',css)
        app=(ROOT/'app.js').read_text()
        self.assertIn("document.createElement('iframe')",app)
        self.assertIn("'sandbox', 'allow-scripts'",app)
        self.assertNotIn('host.attachShadow',app)
        self.assertIn('data.lpStylesheets',(ROOT/'preview.js').read_text())
        self.assertIn("data.layout[request.channel].referenceViewports[state.previewMode]",app)
        self.assertNotIn('tracking-script.js',app)

    def test_preview_module_copy_stays_outside_rendered_markup(self):
        app=(ROOT/'app.js').read_text()
        render=app.split('function renderLpElements',1)[1].split('function renderLpSection',1)[0]
        self.assertLess(render.index('renderModuleCopy'),render.index('ft-lp-shadow-host'))
        self.assertIn('renderModuleCopy(element.copyPayload',render)

    def test_public_manifest_and_generated_payloads(self):
        outputs=sync.generate(EMAIL,LP,design_system_dir=DESIGN_SYSTEM)
        manifest=json.loads(outputs['manifest.json'])
        self.assertEqual({'name','sections','moduleCounts','buildDigest'},set(manifest))
        self.assertEqual(64,len(manifest['buildDigest']))
        self.assertEqual({'email':38,'lp':34},manifest['moduleCounts'])
        data=json.loads(outputs['content-data.js'].split(sync.MARKER,1)[1].strip().removesuffix(';'))
        self.assertEqual(data['lpStylesheets'],lp.PUBLIC_STYLESHEETS)
        self.assertEqual(data['lpModuleStylesheets'],lp.MODULE_STYLESHEETS)
        self.assertEqual(outputs['email-preview-styles.css'],(EMAIL/'modules/preview.css').read_text())

    def test_generation_is_deterministic(self):
        self.assertEqual(sync.generate(EMAIL,LP,design_system_dir=DESIGN_SYSTEM),sync.generate(EMAIL,LP,design_system_dir=DESIGN_SYSTEM))


if __name__=='__main__':unittest.main()
