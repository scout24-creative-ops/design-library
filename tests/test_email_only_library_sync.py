"""Preserve the original Email-only isolation guarantees with the unified generator."""
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import sync_design_library_sources as sync

EMAIL=Path(os.environ.get('EMAIL_BUILDER_DIR',ROOT.parent/'email-builder'))


@unittest.skipUnless((EMAIL/'modules/preview.css').is_file(), 'Email-only source check needs the Email checkout')
class EmailOnlySync(unittest.TestCase):
    def test_preserves_every_non_email_field_without_lp_source_access(self):
        before=sync.read_data(ROOT/'content-data.js')
        with patch.object(sync.lp,'configure_source',side_effect=AssertionError('LP accessed')):
            outputs=sync.generate(EMAIL,Path('/not-an-lp-checkout'),email_only=True)
        actual=json.loads(outputs['content-data.js'].split(sync.MARKER,1)[1].strip().removesuffix(';'))
        for key in before:
            if key=='sections':
                self.assertEqual(before[key]['lp'],actual[key]['lp'])
                self.assertEqual(before[key]['tokens'],actual[key]['tokens'])
            elif key!='serviceProducts':self.assertEqual(before[key],actual[key])
        self.assertNotIn('lp-module-markup.js',outputs)
        self.assertNotIn('lp-shadow-styles.js',outputs)

    def test_check_detects_drift_and_never_writes(self):
        argv=['sync','--email-builder-dir',str(EMAIL),'--email-only','--check']
        with patch.object(sys,'argv',argv),patch.object(sync,'generate',return_value={'manifest.json':'changed'}),patch.object(Path,'write_text') as writer:
            with self.assertRaises(SystemExit):sync.main()
            writer.assert_not_called()


if __name__=='__main__':unittest.main()
