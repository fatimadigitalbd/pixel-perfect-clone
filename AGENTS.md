<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Single-shop app: roles live in `user_roles` (admin/staff); first signup becomes admin via trigger; RLS uses `is_member`/`has_role` — keeps privileges server-enforced.
- Customer uploads go through server functions (`src/lib/orders.functions.ts`) into the private `customer-files` bucket; staff download via short signed URLs — files are never public.
- Photo/card/document tools render client-side (canvas at 300 DPI, browser print for Bangla PDF) — avoids paid services and Bangla font issues in PDF libraries.
- Photo AI uses dynamically imported browser-only MODNet matting and ESRGAN super-resolution with preserved alpha; no generative image edits or customer-image upload — protects portrait identity, privacy, and avoids commercial-only licenses.
- Photo preparation keeps a session-local photo tray, imports every selected file as a print-ready portrait, and uses a separate sheet composer with pure millimetre layout geometry — preserves privacy and prevents new uploads replacing previous portraits.
- Print layout packs stamp copies in two-copy vertical columns and counts columns for the per-row limit — fills space alongside larger portraits without overlapping copies.
- Portrait AI sessions and upscale models are cached in browser-only modules, with an explicitly labeled non-AI resize mode — avoids repeated initialization without claiming invented detail.
- Scan images stay session-local; dynamic OpenCV and jscanify provide automatic corner detection and validated manual perspective correction — personal documents never leave the browser.
- Scanner card printing uses configurable physical dimensions on a 300-DPI A4 canvas — accommodates card formats without assuming all national IDs have the same size.
