# Stage 7 — fix QA ordering

Run 46123128151 failed because mega-phase3.test.cjs reads patched vendor dev.html before prepare:lan has applied the patches. Move the complete legacy test suite after actual compilation, retaining all assertions. Original 4 native combat cases previously passed. New eight-variant / natural expiry results pending. Permission request sent; no grant yet. No changes to gameplay, assets, saves, production or Beta deployment.
