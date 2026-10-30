"""Tests for Stage3 strict no-fake-8-dir readiness gate."""
import importlib.util,pathlib,unittest
from PIL import Image
P=pathlib.Path(__file__).resolve().parents[1]/'scripts'/'validate-mega-eightdir.py'
s=importlib.util.spec_from_file_location('mega8',P)
qa=importlib.util.module_from_spec(s);s.loader.exec_module(qa)
class Stage3Tests(unittest.TestCase):
 def setUp(self):
  self.project={'format':'pkmsvv-mega-stage3-draft','version':1,'draft':{},'approved':{},'battleReady':False}
 def test_original_cardinals_do_not_count_as_finished(self):
  q=qa.check(self.project,'scizor','normal')
  self.assertEqual(q['originalWalkFrames'],16)
  self.assertEqual(q['requiredManual'],208)
  self.assertEqual(len(q['missing']),208)
  self.assertFalse(q['candidateComplete'])
  self.assertFalse(q['battleReady'])
 def test_fake_approval_without_png_fails(self):
  k='scizor|normal|Walk|front-left|0'
  self.project['approved'][k]=True
  q=qa.check(self.project,'scizor','normal')
  self.assertIn(k+': missing approved PNG',q['invalid'])
 def test_unknown_draft_not_mistaken_for_approved(self):
  self.project['draft']['scizor|normal|Walk|front-left|0']='notpng'
  q=qa.check(self.project,'scizor','normal')
  self.assertEqual(q['authoredAndApproved'],0)
 def test_bad_format_rejected(self):
  with self.assertRaises(ValueError):qa.check({},'scizor','normal')
if __name__=='__main__':unittest.main()
