"""Run: python -m unittest discover -s tests -p 'test_mega_pa2.py' (requires Pillow)."""
import importlib.util,pathlib,unittest
from PIL import Image
SCRIPT=pathlib.Path(__file__).resolve().parents[1]/'scripts'/'repack-mega-overworld-pa2.py'
spec=importlib.util.spec_from_file_location('mega_pa2',SCRIPT)
qa=importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
class MegaPA2Tests(unittest.TestCase):
    def test_lossless_and_safety_padding(self):
        im=Image.new('RGBA',(256,256),(0,0,0,0))
        im.putpixel((63,20),(84,211,12,255))
        packed,frames,geometry=qa.repack(im,'swampert','normal')
        self.assertEqual(packed.size,(384,384))
        self.assertEqual(packed.getpixel((79,36)),(84,211,12,255))
        self.assertEqual(packed.getpixel((80,36))[3],0)
        self.assertTrue(frames[0]['needsReview'])
        self.assertIn('right',frames[0]['touches'])
        self.assertFalse(geometry['geometryReview'])
        for row in range(4):
            for col in range(4):
                source=im.crop((col*64,row*64,col*64+64,row*64+64))
                result=packed.crop((col*96+16,row*96+16,col*96+80,row*96+80))
                self.assertEqual(source.tobytes(),result.tobytes())
    def test_garchomp_shiny_non_destructive_width_padding(self):
        im=Image.new('RGBA',(254,256),(255,100,0,255))
        packed,frames,geometry=qa.repack(im,'garchomp','shiny')
        self.assertTrue(geometry['geometryReview'])
        self.assertEqual(geometry['rightTransparentPad'],2)
        self.assertEqual(packed.getpixel((3*96+16+63,36))[3],0)
        with self.assertRaises(ValueError):
            qa.repack(Image.new('RGBA',(254,256)),'scizor','shiny')
    def test_16_frame_edge_metadata(self):
        im=Image.new('RGBA',(256,256),(0,0,0,0))
        im.putpixel((64,1),(1,2,3,255))
        _,frames,_=qa.repack(im,'scizor','shiny')
        self.assertEqual(len(frames),16)
        self.assertIn('left',frames[1]['touches'])
        self.assertFalse(any(f.get('battleReady',False) for f in frames))
if __name__=='__main__':unittest.main()
