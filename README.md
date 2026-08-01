# PrintFlow ERP

Internal ERP for digital printing, large format, signage, acrylic fabrication,
CNC, laser cutting, UV printing, stickers, vehicle wraps, and exhibition stands.

Stack: **Next.js 14 (App Router)** + **Supabase** (DB, Auth, Storage) + **Tailwind CSS**,
deployed on **Vercel**, version-controlled on **GitHub**. 100% free tier to start.

---

## 1. Prerequisites

- Node.js 18+ installed
- A free [Supabase](https://supabase.com) account
- A free [GitHub](https://github.com) account
- A free [Vercel](https://vercel.com) account
- VS Code (or any editor)

---

## 2. Database setup (if you haven't already)

1. Create a new Supabase project.
2. Go to **SQL Editor** → paste in `database/schema.sql` → Run.
3. Go to **Authentication → Users** → create your first user (check "Auto Confirm User").
4. Copy that user's UUID, then run in SQL Editor:
   ```sql
   update public.staff set role = 'admin', full_name = 'Your Name'
   where id = 'paste-your-uuid-here';
   ```

---

## 3. Local project setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.local.example .env.local
```

Open `.env.local` and fill in your values from
**Supabase Dashboard → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

```bash
# 3. Run the dev server
npm run dev
```

Visit **http://localhost:3000/login** and sign in with the user you created in
step 2. You should land on the dashboard, see the sidebar, and be able to add
a lead on the Leads page.

---

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial PrintFlow ERP scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/printflow-erp.git
git push -u origin main
```

---

## 5. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo.
2. Under **Environment Variables**, add the same two variables from `.env.local`.
3. Click **Deploy**.

Vercel will auto-redeploy every time you push to `main` — no extra config needed.

---

## 6. Project structure

```
app/
  login/                 -> Sign in page
  dashboard/
    layout.tsx           -> Sidebar + auth guard + current user info
    page.tsx             -> Overview / KPI cards
    leads/                -> Leads list + create form (first working module)
    customers/            -> (scaffolded, build next)
lib/supabase/
  client.ts               -> Browser Supabase client
  server.ts               -> Server Component Supabase client
middleware.ts             -> Protects /dashboard routes, redirects logged-in
                              users away from /login
database/
  schema.sql              -> Full Postgres schema + RLS policies
```

---

## 7. What's built vs. what's next

**Working now:**
- Auth (login/logout), protected dashboard routes
- Role display from `staff` table
- Live KPI counts on the overview page
- Leads: create + list (writes to `customers` + `leads` tables)

**Next modules to build (same pattern as Leads):**
- Customers directory (edit/search)
- Quotations (line-item builder, PDF export, approve/reject/revise)
- Job Orders (auto-created from an approved quotation)
- Production board (Kanban across `production_orders.stage`)
- Quality Control checklist
- Deliveries
- Invoices + Payments (with the auto payment-status sync already in the DB)

Each module follows the same pattern already used in `app/dashboard/leads/`:
a server-rendered page for the list + a client component form for creating
records. Once you're comfortable with how Leads works, the rest will feel
very repetitive to build.
