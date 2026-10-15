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
