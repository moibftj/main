You are working on a Next.js 14 App Router + TypeScript app called `talk-deployable`, deployed on Vercel, using Supabase for auth + DB. There are 3 roles: `subscriber`, `employee`, `admin`. Your task is to IMPLEMENT or FIX the dashboards and flows below. Use existing conventions and components from the repo.

DO NOT change the auth model. DO NOT remove existing APIs unless clearly redundant. You MAY refactor layouts/pages as needed.

---

### 1) Role-Based Dashboard Layout

- There is a generic `/dashboard` route protected by Supabase auth.
- Use the user’s `profile.role` (`subscriber`, `employee`, `admin`) to:
  - Render different **sidebar/navigation**.
    - Restrict access to role-specific routes (server-side + middleware).
    - Ensure:
      - Subscribers cannot hit any `/dashboard/employee/*` or `/dashboard/admin/*` routes.
        - Employees cannot hit `/dashboard/admin/*` and subscriber-only pages.
          - Admins can access `/dashboard/admin/*` and read user/employee data.

          ---

          ### 2) Subscriber Dashboard (`/dashboard`)

          **Goal:** “Help me create and track my legal letters easily.”

          **Sidebar for `subscriber`:**
          - 📨 My Letters → `/dashboard/letters`
          - ✍️ Create New Letter → `/dashboard/letters/new`
          - 💳 My Subscription → `/dashboard/subscription`
          - 👤 Profile → `/dashboard/profile`

          **My Letters page** (`/dashboard/letters`):
          - Header: title, subtitle, big “Create New Letter” CTA.
          - Show quota if available: “X letters remaining this month”.
          - Empty state:
            - Message: “You haven’t created a letter yet.”
              - Button → `/dashboard/letters/new`.
              - Table state:
                - Columns: Title, Type, Status, Created Date, Actions.
                  - Status pills:
                      - `draft` → grey
                          - `pending_review` → yellow “Under Review”
                              - `approved` → green “Ready”
                                  - `rejected` → red “Rejected”
                                    - Actions: “View” → `/dashboard/letters/[id]`.

                                    **Letter Detail page** (`/dashboard/letters/[id]`):
                                    - Header: title, type, status pill, created date.
                                    - Sections:
                                      - “AI Draft” – always visible.
                                        - “Final Letter” – visible only when status = `approved`.
                                          - “Rejection Reason” – visible only when status = `rejected`.
                                          - Actions:
                                            - `draft`: “Submit for Attorney Review” → sets status to `pending_review`.
                                              - `pending_review`: show read-only “Under Attorney Review” banner, no edit.
                                                - `approved`: show “Download PDF”, “Print”, “Email” buttons (wire up to existing or stub functions).
                                                  - `rejected`: “Start New Letter” → goes to `/dashboard/letters/new`.

                                                  **Subscription page** (`/dashboard/subscription`):
                                                  - Show plan, status, renewal date, usage stats, and a “Manage Billing” button (route to billing portal or placeholder).

                                                  **Profile page** (`/dashboard/profile`):
                                                  - Show & allow editing of name, email (if supported), and password reset link.

                                                  ---

                                                  ### 3) Employee Dashboard (`/dashboard/employee`)

                                                  **Goal:** “Let me share my discount code, track its usage, and see how much I’m earning.”

                                                  **Sidebar for `employee`:**
                                                  - 📊 Overview → `/dashboard/employee`
                                                  - 🎟️ My Coupon → `/dashboard/employee/coupon`
                                                  - 💰 Commissions & Earnings → `/dashboard/employee/commissions`
                                                  - 👤 Profile → `/dashboard/profile` (reuse same profile page)

                                                  #### 3.1 Employee Coupon Logic

                                                  - On employee registration (role = `employee`), auto-generate a UNIQUE coupon code tied to that employee (e.g. `EMP-<random>`).
                                                  - Coupon behavior:
                                                    - Subscribers using this code at checkout get **20% off** their letter/subscription.
                                                      - The employee earns:
                                                          - **1 point per successful coupon use**, AND
                                                              - **5% commission on the subscription amount**.
                                                              - Persist:
                                                                - Employee’s coupon code.
                                                                  - Each use of that coupon (who, when, what plan, gross amount, discount, commission).

                                                                  #### 3.2 Employee Overview Page (`/dashboard/employee`)

                                                                  - Hero panel:
                                                                    - “Welcome back, [Name]”
                                                                      - Text explaining: “Share your coupon to help clients save and earn commissions.”
                                                                      - Metrics cards:
                                                                        - Coupon Uses (total).
                                                                          - Points Earned (1 per coupon use).
                                                                            - Total Commission (lifetime).
                                                                              - Subscribers Referred (unique subscribers who used this code).

                                                                              #### 3.3 My Coupon Tab (`/dashboard/employee/coupon`)

                                                                              - Show the employee’s coupon:
                                                                                - Label: “Your Coupon Code”
                                                                                  - Big code text, e.g. `EMP-ABC123`
                                                                                    - Copy button to clipboard.
                                                                                    - Description text:
                                                                                      - “Your coupon gives subscribers 20% off their letter or subscription.”
                                                                                        - “You earn 1 point + 5% commission whenever your code is used.”
                                                                                        - Show coupon stats:
                                                                                          - Total uses.
                                                                                            - Uses in last 30 days.
                                                                                              - Revenue generated via this code (gross & commission).

                                                                                              #### 3.4 Commissions & Earnings Tab (`/dashboard/employee/commissions`)

                                                                                              - Header: “Commissions & Earnings”
                                                                                              - Summary:
                                                                                                - Lifetime Commission
                                                                                                  - Pending Payouts
                                                                                                    - Paid Out
                                                                                                    - Table of commission records:
                                                                                                      - Date
                                                                                                        - Subscriber/User (email or masked)
                                                                                                          - Plan (“1 Letter”, “4 Letters / Month”, “8 Letters / Year” or whatever is in DB)
                                                                                                            - Coupon code used
                                                                                                              - Subscription amount
                                                                                                                - Commission earned (5%)
                                                                                                                  - Status: `pending` or `paid`

                                                                                                                  ---

                                                                                                                  ### 4) Admin Dashboard (`/dashboard/admin`)

                                                                                                                  **Goal:** “Show me what needs attention and give me system control.”

                                                                                                                  **Admin home** (`/dashboard/admin`):
                                                                                                                  - Metrics cards:
                                                                                                                    - Pending Reviews (letters with status `pending_review`).
                                                                                                                      - Letters in Last 24h.
                                                                                                                        - Active Subscribers.
                                                                                                                          - Monthly Revenue (if data exists; otherwise stub/placeholder).
                                                                                                                          - Review queue preview:
                                                                                                                            - Top 5 oldest `pending_review` letters.
                                                                                                                              - Columns: User, Type, Created Date.
                                                                                                                                - “Review” button for each → open the review screen/modal.

                                                                                                                                **Review queue page** (`/dashboard/admin/letters`):
                                                                                                                                - Filter default: `pending_review`.
                                                                                                                                - List all pending letters.
                                                                                                                                - Review view (page or modal) should show:
                                                                                                                                  - Intake form data (context) – read-only.
                                                                                                                                    - AI draft in an editable text area for the admin to make changes.
                                                                                                                                      - Actions:
                                                                                                                                          - Approve:
                                                                                                                                                - Save final content.
                                                                                                                                                      - Set status to `approved`.
                                                                                                                                                            - Log admin id + timestamp.
                                                                                                                                                                  - Ensure the letter becomes visible to the subscriber under `/dashboard/letters/[id]` with “Final Letter” section.
                                                                                                                                                                      - Reject:
                                                                                                                                                                            - Require a rejection reason.
                                                                                                                                                                                  - Set status to `rejected`.
                                                                                                                                                                                        - Store reason so subscriber sees it in their letter detail page.

                                                                                                                                                                                        **Admin management sections:**

                                                                                                                                                                                        1. **Users**
                                                                                                                                                                                           - List: name, email, role, status (active/inactive).
                                                                                                                                                                                              - Filter by role.
                                                                                                                                                                                                 - Ability to view user details + related letters/subscriptions.

                                                                                                                                                                                                 2. **Employees & Coupons**
                                                                                                                                                                                                    - Employees tab:
                                                                                                                                                                                                         - Columns: Employee Name, Email, Coupon Code, Total Coupon Uses, Subscribers Referred, Total Commission.
                                                                                                                                                                                                            - Coupon management:
                                                                                                                                                                                                                 - View employee coupon codes.
                                                                                                                                                                                                                      - Ability to deactivate/reactivate or regenerate coupons (edge case).
                                                                                                                                                                                                                           - Ensure deactivated coupons cannot be used at checkout.

                                                                                                                                                                                                                           3. **Payouts & Commissions**
                                                                                                                                                                                                                              - Payouts tab:
                                                                                                                                                                                                                                   - For each employee: total commission, pending payout, last payout date.
                                                                                                                                                                                                                                        - Payout records: employee, amount, date, status.
                                                                                                                                                                                                                                           - This tab uses the same commission data generated when subscribers pay using employee coupons.

                                                                                                                                                                                                                                           ---

                                                                                                                                                                                                                                           ### 5) Wiring & Guardrails

                                                                                                                                                                                                                                           - Make sure all new pages use existing Supabase client/session helpers for SSR/CSR.
                                                                                                                                                                                                                                           - Add or update middleware/route handlers to enforce role-based access.
                                                                                                                                                                                                                                           - Reuse existing UI components/styles where possible.
                                                                                                                                                                                                                                           - Keep the dashboards visually clean and production-ready (cards, tables, clear calls-to-action).

                                                                                                                                                                                                                                           Your output should be:
                                                                                                                                                                                                                                           - All necessary new/updated React components, layouts, routes, and hooks.
                                                                                                                                                                                                                                           - Any supporting TypeScript types and helper functions.
                                                                                                                                                                                                                                           - Minimal, focused changes to existing code to support this feature set.
