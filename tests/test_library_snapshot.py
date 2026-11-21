"""Standalone checks work without access to the private source repositories."""
import hashlib
import json
from pathlib import Path
import re
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sync_design_library_sources as sync

class LibrarySnapshot(unittest.TestCase):
    def test_sections_and_unique_navigation(self):
        data=sync.read_data(ROOT/'content-data.js')
        self.assertEqual(['email','lp','tokens'],list(data['sections']))
        html=(ROOT/'index.html').read_text()
        for name in data['sections']:
            self.assertEqual(html.count(f'data-main-nav="{name}"'),1)
        self.assertNotIn('data-main-nav="agents"',html)
        self.assertNotIn('data-main-nav="learning"',html)
        self.assertFalse((ROOT/'design-library').exists())

    def test_snapshot_fingerprint_and_privacy(self):
        manifest=json.loads((ROOT/'manifest.json').read_text())
        self.assertEqual({'name','sections','moduleCounts','buildDigest'},set(manifest))
        names=['content-data.js','email-preview-styles.css','lp-module-markup.js','lp-shadow-styles.js','index.html','app.js','styles.css','preview.html','preview.js']
        actual=hashlib.sha256(json.dumps({n:(ROOT/n).read_text() for n in names},sort_keys=True,ensure_ascii=False).encode()).hexdigest()
        self.assertEqual(actual,manifest['buildDigest'])
        self.assertEqual({'email':38,'lp':34},manifest['moduleCounts'])

    def test_all_lp_payloads_are_reachable_and_unique(self):
        data=sync.read_data(ROOT/'content-data.js')
        payload=json.loads((ROOT/'lp-module-markup.js').read_text().split('window.designLibraryLpModuleMarkup = ',1)[1].strip().removesuffix(';'))
        selected=[m for page in data['sections']['lp']['items'] for m in page.get('modules',[])]
        self.assertEqual(selected,list(payload))
        self.assertEqual(len(selected),len(set(selected)))
        elements=[e for section in ('lp','tokens') for page in data['sections'][section]['items'] for group in page.get('elementGroups',[]) for e in group['elements']]
        self.assertEqual(elements,list(data['lpElements']))

    def test_html_local_assets_exist(self):
        for ref in re.findall(r'(?:href|src)="\./([^"#?]+)"',(ROOT/'index.html').read_text()):
            self.assertTrue((ROOT/ref).is_file(),ref)

    def test_generator_rejects_non_snapshot_writes(self):
        with patch.object(sync,'generate',return_value={'app.js':'overwrite'}),patch.object(sys,'argv',['sync']),patch.object(Path,'write_text') as writer:
            with self.assertRaises(ValueError):sync.main()
            writer.assert_not_called()

if __name__=='__main__':unittest.main()
