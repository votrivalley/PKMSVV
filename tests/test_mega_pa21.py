"""Standalone source-independent checks for PA2.1 edge bleed removal."""
import importlib.util,pathlib,unittest
from PIL import Image
path=pathlib.Path(__file__).resolve().parents[1]/'scripts'/'mega-pa21-bleed-filter.py'
spec=importlib.util.spec_from_file_location('mega_pa21',path)
qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
class PA21Tests(unittest.TestCase):
 def test_removes_only_detached_edge_fragment(self):
    im=Image.new('RGBA',(64,64));px=im.load()
    for y in range(12,52):
     for x in range(12,52):px[x,y]=(12,46,240,255)
    for y in range(24,31):px[63,y]=(9,120,9,255)
    cleaned,removed=qa.clean(im)
    self.assertEqual(sum(x['area'] for x in removed),7)
    self.assertEqual(cleaned.getpixel((63,27))[3],0)
    self.assertEqual(cleaned.getpixel((25,25)),im.getpixel((25,25)))
 def test_do_not_cut_main_body_at_boundary(self):
    im=Image.new('RGBA',(64,64));px=im.load()
    for y in range(22,43):
     for x in range(0,64):px[x,y]=(6,100,180,255)
    cleaned,removed=qa.clean(im)
    self.assertFalse(removed)
    self.assertEqual(im.tobytes(),cleaned.tobytes())
 def test_no_source_fake_repair(self):
    im=Image.new('RGBA',(254,256))
    norm,padded=qa.normalize(im,'garchomp','shiny')
    self.assertEqual(norm.size,(256,256))
    self.assertTrue(padded)
    self.assertEqual(norm.getpixel((255,100))[3],0)
if __name__=='__main__':unittest.main()
