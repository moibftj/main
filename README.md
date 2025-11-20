# Talk-To-My-Lawyer

A professional SaaS platform for AI-powered legal letter generation with attorney review.

## Features

### Three User Roles

**Subscribers**
- Generate AI-powered legal letters using Gemini AI
- Submit letters for attorney review
- Track letter status through 4-step pipeline
- Download letters as PDF/HTML
- Send approved letters via email
- Apply coupon codes for discounts
- Manage subscription plans

**Employees (Sales Affiliates)**
- Unique coupon codes (20% discount for subscribers)
- Earn 5% commission on subscriptions
- Track earnings and redemptions
- Social sharing for referrals
- Zero access to subscriber letters (enforced at RLS level)

**Admins**
- Review and approve/reject letter drafts with inline editing
- Edit letter content before approval
- Manage users across all roles
- Process commission payouts
- Analytics dashboard with key metrics
- Full system oversight

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth
- **AI**: Google Gemini for letter generation
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **TypeScript**: Full type safety

## Security

- Row Level Security (RLS) at database level
- Role-based middleware routing
- Employees completely blocked from letters table
- Immutable audit trail for commissions
- Multi-layer security (DB + Middleware + API)
- Secure API endpoints with auth verification

## Getting Started

### 1. Configure Environment Variables

You need to add the following environment variables in the **Vars** section of the v0 sidebar:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL_ID=gemini-2.0-pro-exp-02-05
\`\`\`

**Where to find these values:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**
4. Copy the "Project URL" (for `NEXT_PUBLIC_SUPABASE_URL`)
5. Copy the "anon public" key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
6. Get Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Database Setup

Run the SQL scripts in order (you can run these directly in v0 or in your Supabase SQL editor):

1. `scripts/001_setup_schema.sql` - Create tables and types
2. `scripts/002_setup_rls.sql` - Enable Row Level Security policies
3. `scripts/003_seed_data.sql` - Seed initial data (optional)
4. `scripts/004_create_functions.sql` - Create database functions

### 3. Deploy

Click **"Publish"** in v0 to deploy to Vercel, or push to GitHub and deploy manually.

## Environment Variables

See `.env.example` for the complete list:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=your_production_url
GEMINI_API_KEY=your_google_gemini_api_key
GEMINI_MODEL_ID=gemini-2.0-pro-exp-02-05
\`\`\`

## Subscription Plans

- **Single Letter**: $299 one-time
- **Monthly Plan**: $299/month (4 letters/month, billed yearly)
- **Annual Plan**: $599/year (8 letters/year, best value)

## Commission System

- Employees get unique 20% discount coupons
- 5% commission on each subscription
- Automatic commission tracking
- Admin-controlled payouts

## Letter Generation Flow

1. Subscriber selects letter type and fills out intake form
2. AI generates professional draft using Gemini (requires GEMINI_API_KEY)
3. Subscriber reviews draft and submits for attorney review
4. Admin reviews, edits content inline, and approves/rejects
5. Subscriber downloads approved letter as PDF or sends via email
6. Complete audit trail maintained in database

## Key Features Implemented

### AI Letter Generation
- Integration with Google Gemini API
- Multiple letter types (demand, cease & desist, contract breach, etc.)
- Intelligent context-aware generation
- Professional legal formatting

### PDF & Email Delivery
- HTML-based PDF generation
- Email delivery for approved letters
- Custom message support
- Recipient tracking

### Analytics Dashboard (Admin)
- Total users, letters, and revenue metrics
- Pending review queue size
- Top performing employees
- Recent activity feed
- Commission tracking

## API Endpoints

### Letter Management
- `POST /api/generate-letter` - Generate AI-powered letter content
- `POST /api/letters/[id]/submit` - Submit letter for attorney review
- `POST /api/letters/[id]/approve` - Approve letter (admin only)
- `POST /api/letters/[id]/reject` - Reject letter with feedback (admin only)
- `GET /api/letters/[id]/pdf` - Download letter as PDF/HTML
- `POST /api/letters/[id]/send-email` - Send letter via email

### Subscriptions & Payments
- `POST /api/create-checkout` - Create subscription with coupon code support

## File Structure

\`\`\`
app/
├── api/                      # API routes
│   ├── generate-letter/      # AI generation endpoint
│   ├── create-checkout/      # Subscription checkout
│   └── letters/[id]/         # Letter management
├── auth/                     # Authentication pages
├── dashboard/                # Role-based dashboards
│   ├── letters/              # Subscriber letter management
│   ├── commissions/          # Employee commission tracking
│   ├── coupons/              # Employee coupon management
│   └── admin/                # Admin-only features
components/                   # Reusable components
lib/                          # Utilities and helpers
scripts/                      # Database setup scripts
\`\`\`

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution:** Add the required environment variables in the **Vars** section of the v0 sidebar:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Find these values in your Supabase project's API settings.

### Error: "Failed to generate letter"

**Solution:** Add your `GEMINI_API_KEY` in the Vars section. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

### Users can't access their data

1. Check that user profiles exist in the `profiles` table
2. Verify the `role` field is set correctly
3. Ensure RLS policies are enabled (run `002_setup_rls.sql`)

### Authentication not working

1. Verify email confirmation is enabled in Supabase Auth settings
2. Check redirect URLs are configured correctly
3. Review Supabase Auth logs in the dashboard

## Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

## Support

For issues or questions, open a support ticket at [vercel.com/help](https://vercel.com/help)

## License

Proprietary - All rights reserved
