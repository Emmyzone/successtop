# SuccessTop website

React + Vite + TypeScript + Tailwind, with Supabase for the database, image storage and admin login. It deploys as a **Render Static Site**, so there is no server to go to sleep.

## Status

Built so far:
- Public site: Home, Menu, Offers, Branches, About, Contact, 404
- Supabase schema, security rules (RLS), storage buckets and seed data
- Cart, product variations, WhatsApp ordering, enquiry form, order-request logging
- Admin dashboard at `/admin`: login, products (with photos and size options), categories, branches, offers, site text and images, order requests and enquiries, and staff accounts.

Nothing here has been run against a live Supabase project yet, and `npm install` / `npm run build` have not been run (the build sandbox had no internet). Run them yourself and tell me about any error.

## 1. Prerequisites
- Node.js 18 or newer
- A Supabase project (this one can share a project with other sites: every table, function and bucket here starts with `bst_` / `bst-`)
- A GitHub account and a Render account

## 2. Install
```bash
npm install
cp .env.example .env     # then fill in the two Supabase values
```

## 3. Set up Supabase
1. In the Supabase dashboard open **SQL Editor** and run, in order:
   1. `supabase/migrations/001_schema.sql`
   2. `supabase/migrations/002_rls_and_storage.sql`
   3. `supabase/migrations/003_seed.sql`
   4. `supabase/migrations/005_admin_helpers.sql` (adds what the Staff page needs)
2. Copy **Project URL** and the **publishable / anon key** (Project Settings > API) into `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Never put the `service_role` key in `.env`, in GitHub, or in Render's frontend variables.
4. Authentication > Providers > Email: turn **off** "Allow new users to sign up" so nobody can register themselves.

The seed adds the 5 categories, the 2 branches and default site text. It adds no products, prices or offers.

## 4. Create the first administrator
1. Dashboard > Authentication > Users > **Add user** (tick Auto Confirm User). Use your own email and a strong password.
2. Open `supabase/migrations/004_first_admin.sql.example`, replace the email with yours, and run it in the SQL Editor. It should show one row with `role = admin`.
3. Every user created later starts as an inactive staff account. The main admin activates staff on the Staff page of the admin dashboard.
4. Sign in at `/admin` (for example http://localhost:5173/admin).

## 5. Run locally
```bash
npm run dev       # http://localhost:5173
npm run build     # type-checks, then builds into dist/
npm run preview
```

## 6. Deploy on Render
1. Push the project to GitHub (`.env` is git-ignored).
2. Render > New > **Static Site** > pick the repo.
3. Build command: `npm install && npm run build`   Publish directory: `dist`
4. Environment: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optionally `VITE_SITE_URL` (your live address, no trailing slash).
5. Redirects/Rewrites tab: add a **Rewrite** from `/*` to `/index.html` (this makes refreshes on `/products` etc. work). `render.yaml` already contains this rule if you use Blueprints.
6. Test: open the live site, visit `/products`, refresh the page, and check the cart and WhatsApp button.

## 7. Testing WhatsApp ordering
- Add an item to the cart, press **Send order on WhatsApp**. WhatsApp opens to `https://wa.me/2347067877868` with the order typed out.
- If the website could save the request you will see a reference like `BST-AB12CD`. If not, you are told, and you can still continue on WhatsApp.
- A saved request means "the customer asked to order". It does not mean confirmed or paid. The website cannot read WhatsApp messages.

## 8. Supabase free plan notes
Free projects can pause after about a week of no activity, and have storage and database limits. If the site shows "could not be loaded", open the Supabase dashboard and restore the project, or upgrade. Check Supabase's current plan limits.

## 9. Troubleshooting
- **Blank menu / "not connected"**: the two `VITE_` variables are missing. On Render, add them and redeploy (they are baked in at build time).
- **Menu empty**: no products added yet.
- **Order not saved**: confirm all three SQL files ran without errors.
- **404 on refresh**: add the Rewrite rule in step 6.5.
