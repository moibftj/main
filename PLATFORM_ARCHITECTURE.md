# Complete Platform Architecture & Workflow Breakdown

## 🏗️ System Architecture Overview

**Key Feature**: All subscriber-generated letters go through a **mandatory admin review process** in a dedicated admin area before being finalized.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Access Layer                        │
│  Authentication → Role Detection → Dashboard Routing             │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────┬──────────────────────┬──────────────────────┐
│   SUBSCRIBER    │      EMPLOYEE        │       ADMIN          │
│   Dashboard     │      Dashboard       │      Dashboard       │
│ /dashboard/     │ /dashboard/          │ /dashboard/          │
│ letters         │ commissions          │ admin/letters        │
│                 │                      │ (Review Area)        │
└─────────────────┴──────────────────────┴──────────────────────┘
```

---

## 🔐 1. USER AUTHENTICATION & AUTHORIZATION

### **File**: `/app/auth/login/page.tsx`

**Purpose**: Handles user login and role-based routing

**Process Flow**:
```
1. User enters email/password
2. Supabase Auth validates credentials
3. System fetches user profile with role
4. User redirected based on role
```

**Code Breakdown**:

```typescript
// 1. CREATE SUPABASE CLIENT (inside handler)
const supabase = createClient()

// 2. SIGN IN WITH SUPABASE AUTH
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// 3. FETCH USER ROLE FROM PROFILES TABLE
let result = await supabase
  .from('profiles')
  .select('role')
  .eq('id', authData.user.id)
  .maybeSingle()

// 4. RETRY LOGIC (profile might not exist yet)
if (!result.data && retries < 3) {
  await new Promise(resolve => setTimeout(resolve, 500))
  // Retry...
}

// 5. API FALLBACK (create profile if missing)
if (!result.data) {
  const apiResponse = await fetch('/api/create-profile', {
    method: 'POST',
    body: JSON.stringify({ userId: authData.user.id })
  })
}

// 6. ROLE-BASED REDIRECT
switch (role) {
  case 'admin':
    router.push('/dashboard/admin/letters')
    break
  case 'employee':
    router.push('/dashboard/commissions')
    break
  case 'subscriber':
  default:
    router.push('/dashboard/letters')
    break
}
```

**Database Interactions**:
- Queries: `profiles` table for user role
- Trigger: `handle_new_user()` creates profile on signup
- RLS Policy: User can only read their own profile

---

## 🛡️ 2. MIDDLEWARE PROTECTION

### **File**: `/middleware.ts`

**Purpose**: Protects routes and enforces role-based access

**Process Flow**:
```
1. Every request passes through middleware
2. Check if route requires authentication
3. Verify user session with Supabase
4. Check user role from profile
5. Allow/deny access or redirect
```

**Code Breakdown**:

```typescript
export async function middleware(request: NextRequest) {
  const { supabase, response } = await updateSession(request)
  
  // GET USER SESSION
  const { data: { user } } = await supabase.auth.getUser()
  
  const path = request.nextUrl.pathname
  
  // PUBLIC ROUTES - anyone can access
  if (path === '/' || path.startsWith('/auth')) {
    return response
  }
  
  // REQUIRE AUTHENTICATION for /dashboard
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // GET USER ROLE
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  const role = profile?.role
  
  // ROLE-BASED ROUTING
  if (path.startsWith('/dashboard/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  if (path.startsWith('/dashboard/commissions') && !['employee', 'admin'].includes(role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // REDIRECT TO CORRECT DASHBOARD
  if (path === '/dashboard') {
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/dashboard/admin/letters', request.url))
    } else if (role === 'employee') {
      return NextResponse.redirect(new URL('/dashboard/commissions', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard/letters', request.url))
    }
  }
  
  return response
}
```

**Protected Routes**:
- `/dashboard/admin/*` → Admin only
- `/dashboard/commissions` → Employee + Admin
- `/dashboard/letters` → Subscriber + Admin
- `/dashboard/subscription` → Subscriber only

---

## 📝 3. SUBSCRIBER WORKFLOW: LETTER GENERATION

### **Dashboard**: `/app/dashboard/letters/page.tsx`

**Features**:
- View all generated letters
- Create new letters
- Check allowance/credits
- View letter status

### **API Endpoint**: `/app/api/generate-letter/route.ts`

**Complete Process Flow**:

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Authentication & Authorization                           │
└──────────────────────────────────────────────────────────────────┘
↓
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 401 Unauthorized

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'subscriber') return 403 Forbidden

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Free Trial Check                                        │
└──────────────────────────────────────────────────────────────────┘
↓
const { count } = await supabase
  .from('letters')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)

const isFreeTrial = (count || 0) === 0

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Subscription & Credit Check (if not free trial)         │
└──────────────────────────────────────────────────────────────────┘
↓
if (!isFreeTrial) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('credits_remaining, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription || subscription.credits_remaining <= 0) {
    return 403 "No letter credits remaining"
  }
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Create Letter Record (status: 'generating')             │
└──────────────────────────────────────────────────────────────────┘
↓
const { data: newLetter } = await supabase
  .from('letters')
  .insert({
    user_id: user.id,
    letter_type: letterType,
    title: `${letterType} - ${new Date().toLocaleDateString()}`,
    intake_data: intakeData,
    status: 'generating',  // ← Status set to generating
    created_at: NOW(),
    updated_at: NOW()
  })
  .select()
  .single()

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Call Google Gemini API                                  │
└──────────────────────────────────────────────────────────────────┘
↓
const prompt = buildPrompt(letterType, intakeData)
// Prompt includes: sender, recipient, issue, desired outcome

const response = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048
      }
    })
  }
)

const aiResult = await response.json()
const generatedContent = aiResult.candidates?.[0]?.content?.parts?.[0]?.text

┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Update Letter (status: 'pending_review')                │
└──────────────────────────────────────────────────────────────────┘
↓
await supabase
  .from('letters')
  .update({
    ai_draft_content: generatedContent,
    status: 'pending_review',  // ← Status updated to pending_review
    updated_at: NOW()
  })
  .eq('id', newLetter.id)

┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Deduct Letter Allowance (if not free trial)             │
└──────────────────────────────────────────────────────────────────┘
↓
if (!isFreeTrial) {
  const { data: canDeduct } = await supabase.rpc('deduct_letter_allowance', {
    u_id: user.id
  })
  // RPC function checks super_user status and deducts from subscription
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Log Audit Trail                                         │
└──────────────────────────────────────────────────────────────────┘
↓
await supabase.rpc('log_letter_audit', {
  p_letter_id: newLetter.id,
  p_action: 'created',
  p_old_status: 'generating',
  p_new_status: 'pending_review',
  p_notes: 'Letter generated successfully by AI'
})

┌──────────────────────────────────────────────────────────────────┐
│ STEP 9: Return Response to User                                 │
└──────────────────────────────────────────────────────────────────┘
↓
return {
  success: true,
  letterId: newLetter.id,
  status: 'pending_review',
  isFreeTrial,
  aiDraft: generatedContent
}
```

**Error Handling**:
```typescript
// If ANY error occurs during generation:
catch (generationError) {
  // Mark letter as failed
  await supabase
    .from('letters')
    .update({ 
      status: 'failed',
      updated_at: NOW()
    })
    .eq('id', newLetter.id)
  
  // Log failure in audit trail
  await supabase.rpc('log_letter_audit', {
    p_letter_id: newLetter.id,
    p_action: 'generation_failed',
    p_old_status: 'generating',
    p_new_status: 'failed',
    p_notes: `Generation failed: ${error.message}`
  })
  
  return 500 "AI generation failed"
}
```

---

## 💼 4. EMPLOYEE WORKFLOW: COMMISSION TRACKING

### **Dashboard**: `/app/dashboard/commissions/page.tsx`

**Features**:
- View personal coupons
- Track coupon usage
- See commission earnings
- View payment status

**Data Flow**:

```typescript
// EMPLOYEE SEES THEIR COUPONS
const { data: coupons } = await supabase
  .from('employee_coupons')
  .select('*')
  .eq('employee_id', user.id)

// COUPON USAGE TRACKING
const { data: usage } = await supabase
  .from('coupon_usage')
  .select(`
    *,
    subscription:subscriptions (
      price,
      plan_type,
      status
    )
  `)
  .eq('employee_id', user.id)

// COMMISSION RECORDS
const { data: commissions } = await supabase
  .from('commissions')
  .select(`
    *,
    subscription:subscriptions (
      user:profiles (
        email,
        full_name
      )
    )
  `)
  .eq('employee_id', user.id)
  .order('created_at', { ascending: false })
```

**Commission Creation Trigger**:

```sql
CREATE OR REPLACE FUNCTION create_commission_for_subscription()
RETURNS TRIGGER AS $$
DECLARE
    emp_id UUID;
BEGIN
    -- Only create commission if coupon_code is present
    IF NEW.coupon_code IS NOT NULL THEN
        -- Get employee_id from coupon
        SELECT employee_id INTO emp_id
        FROM employee_coupons
        WHERE code = NEW.coupon_code;
        
        IF emp_id IS NOT NULL THEN
            INSERT INTO commissions (
                employee_id,
                subscription_id,
                commission_rate,
                subscription_amount,
                commission_amount,
                status
            ) VALUES (
                emp_id,
                NEW.id,
                0.05, -- 5% commission rate
                NEW.price,
                NEW.price * 0.05,
                'pending'
            );
            
            -- Track coupon usage
            INSERT INTO coupon_usage (
                coupon_code,
                employee_id,
                user_id,
                subscription_id,
                amount_before,
                amount_after,
                discount_applied
            ) VALUES (
                NEW.coupon_code,
                emp_id,
                NEW.user_id,
                NEW.id,
                NEW.price / (1 - NEW.discount_percentage),
                NEW.price,
                NEW.price * NEW.discount_percentage
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires AFTER subscription insert
CREATE TRIGGER create_commission_on_subscription
    AFTER INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_commission_for_subscription();
```

---

## 👨‍💼 5. ADMIN WORKFLOW: LETTER REVIEW & APPROVAL

### **Dashboard**: `/app/dashboard/admin/letters/page.tsx`

**Features**:
- View all pending letters
- Review letters
- Edit letter content with AI assistance
- Approve or reject letters
- View audit trails

### **Complete Admin Review Process**:

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Views Pending Letters                             │
└──────────────────────────────────────────────────────────────────┘
↓
// Admin dashboard shows all letters with status = 'pending_review'
const { data: letters } = await supabase
  .from('letters')
  .select(`
    *,
    user:profiles!user_id (
      email,
      full_name
    )
  `)
  .eq('status', 'pending_review')
  .order('created_at', { ascending: true })

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Admin Clicks "Review" Button                            │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/start-review/route.ts

const { error } = await supabase
  .from('letters')
  .update({
    status: 'under_review',  // ← Status changed to under_review
    reviewed_by: admin.id,
    updated_at: NOW()
  })
  .eq('id', letterId)

// Log audit trail
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'review_started',
  p_old_status: 'pending_review',
  p_new_status: 'under_review',
  p_notes: 'Admin started reviewing the letter'
})

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Review Modal Opens (ReviewLetterModal Component)        │
└──────────────────────────────────────────────────────────────────┘
↓
// Component: /components/review-letter-modal.tsx

<ReviewLetterModal>
  {/* Display letter content */}
  <div className="letter-content">
    {letter.ai_draft_content}
  </div>
  
  {/* Admin editing area */}
  <Textarea 
    value={editedContent}
    onChange={(e) => setEditedContent(e.target.value)}
    rows={20}
  />
  
  {/* AI IMPROVEMENT SECTION */}
  <div className="ai-improve">
    <Input 
      placeholder="Enter improvement instruction..."
      value={instruction}
    />
    <Button onClick={handleAiImprove}>
      <Wand2 className="w-4 h-4" />
      AI Improve
    </Button>
  </div>
  
  {/* Action buttons */}
  <Button onClick={handleApprove}>Approve</Button>
  <Button onClick={handleReject}>Reject</Button>
</ReviewLetterModal>

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Admin Uses AI to Improve Letter (Optional)              │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/improve/route.ts

async function handleAiImprove() {
  setImproving(true)
  
  const response = await fetch(`/api/letters/${letter.id}/improve`, {
    method: 'POST',
    body: JSON.stringify({
      content: editedContent,
      instruction: instruction  // e.g., "Make tone more formal"
    })
  })
  
  const { improvedContent } = await response.json()
  
  // Show improved version in modal
  setEditedContent(improvedContent)
  setImproving(false)
}

// Backend calls Gemini API with improvement prompt
const improvedContent = await callGeminiAPI(content, instruction)

return { improvedContent }

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5A: Admin Approves Letter                                  │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/approve/route.ts

async function handleApprove() {
  const response = await fetch(`/api/letters/${letter.id}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      finalContent: editedContent,  // Admin's final edited version
      reviewNotes: notes
    })
  })
}

// Backend updates letter
const { error } = await supabase
  .from('letters')
  .update({
    status: 'completed',  // ← Status changed to completed
    final_content: finalContent,  // Approved content
    review_notes: reviewNotes,
    reviewed_by: admin.id,
    reviewed_at: NOW(),
    approved_at: NOW(),
    updated_at: NOW()
  })
  .eq('id', letterId)

// Log audit trail
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'under_review',
  p_new_status: 'completed',
  p_notes: reviewNotes || 'Letter approved by admin'
})

// SUBSCRIBER CAN NOW DOWNLOAD/VIEW THE LETTER

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5B: Admin Rejects Letter (Alternative)                     │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/reject/route.ts

const { error } = await supabase
  .from('letters')
  .update({
    status: 'rejected',  // ← Status changed to rejected
    rejection_reason: rejectionReason,
    review_notes: reviewNotes,
    reviewed_by: admin.id,
    reviewed_at: NOW(),
    updated_at: NOW()
  })
  .eq('id', letterId)

// Log audit trail
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'rejected',
  p_old_status: 'under_review',
  p_new_status: 'rejected',
  p_notes: `Rejection reason: ${rejectionReason}`
})

// SUBSCRIBER SEES REJECTION AND CAN REVISE
```

---

## 🔄 6. COMPLETE LETTER LIFECYCLE

```
┌─────────────┐
│   DRAFT     │ ← User creates but hasn't submitted
└──────┬──────┘
       ↓ User clicks "Generate"
┌─────────────┐
│ GENERATING  │ ← AI is creating content (Gemini API call)
└──────┬──────┘
       ↓ API Success
┌─────────────┐
│PENDING      │ ← Waiting for admin review
│REVIEW       │
└──────┬──────┘
       ↓ Admin clicks "Review"
┌─────────────┐
│UNDER_REVIEW │ ← Admin is reviewing/editing with AI assistance
└──────┬──────┘
       ↓ Admin clicks "Approve" or "Reject"
       │
   ┌───┴───┐
   ↓       ↓
┌─────┐ ┌─────┐
│COMP │ │REJEC│
│LETED│ │TED  │
└─────┘ └─────┘

SPECIAL STATUSES:
┌─────────┐
│ FAILED  │ ← Generation error, no allowance, API failure
└─────────┘
```

**Status Meanings**:
- **draft**: Initial state, user created but hasn't submitted
- **generating**: AI is creating the letter (Gemini API call in progress)
- **pending_review**: Letter generated, waiting in admin queue
- **under_review**: Admin has opened and is reviewing the letter
- **completed**: Admin approved, subscriber can download
- **rejected**: Admin rejected, subscriber must revise
- **failed**: Error occurred (AI failed, no credits, etc.)

---

## 🚀 COMPLETE FLOW SUMMARY

```
USER SIGNUP
    ↓
[handle_new_user() trigger creates profile with role]
    ↓
LOGIN
    ↓
[Middleware checks role and redirects to correct dashboard]
    ↓
┌──────────────┬───────────────────┬────────────────┐
│  SUBSCRIBER  │    EMPLOYEE       │     ADMIN      │
└──────────────┴───────────────────┴────────────────┘
       ↓                ↓                   ↓
Generate Letter   View Coupons      View Pending
       ↓                ↓              Letters
[Creating status] Track Usage            ↓
       ↓          View Commissions   Start Review
[AI Generation]                          ↓
       ↓                            [Under Review]
[Pending Review]                         ↓
       ↓                            Edit Content
       ↓←──────────────────────────Use AI Improve
       ↓                                 ↓
       ↓                            Approve/Reject
       ↓                                 ↓
[Completed/Rejected]            [Log Audit Trail]
       ↓                                 ↓
Download PDF                    [Update Status]
                                        ↓
                                  Notify User
```

---

**This is your complete platform architecture!** 🎉
