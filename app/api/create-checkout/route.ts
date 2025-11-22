import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { planType, couponCode } = body

    let discount = 0
    let employeeId = null
    let isSuperUserCoupon = false

    if (couponCode) {
      // Check employee coupons in database (including special promo codes)
      const { data: coupon } = await supabase
        .from('employee_coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single()

      if (coupon) {
        discount = coupon.discount_percent
        employeeId = coupon.employee_id

        // If 100% discount, mark as super user
        if (discount === 100) {
          isSuperUserCoupon = true
        }
      }
    }

    const planConfig: Record<string, { price: number, letters: number, planType: string }> = {
      'one_time': { price: 299, letters: 1, planType: 'one_time' },
      'standard_4_month': { price: 299, letters: 4, planType: 'standard_4_month' },
      'premium_8_month': { price: 599, letters: 8, planType: 'premium_8_month' }
    }

    const selectedPlan = planConfig[planType]
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const basePrice = selectedPlan.price
    const discountAmount = (basePrice * discount) / 100
    const finalPrice = basePrice - discountAmount

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: planType,
        plan_type: selectedPlan.planType,
        status: 'active',
        price: finalPrice,
        discount: discountAmount,
        coupon_code: couponCode || null,
        remaining_letters: selectedPlan.letters,
        credits_remaining: selectedPlan.letters,
        last_reset_at: new Date().toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (subError) throw subError

    if (isSuperUserCoupon) {
      await supabase
        .from('profiles')
        .update({ is_super_user: true })
        .eq('id', user.id)
    }

    if (couponCode) {
      await supabase
        .from('coupon_usage')
        .insert({
          user_id: user.id,
          coupon_code: couponCode,
          employee_id: employeeId,
          discount_percent: discount,
          amount_before: basePrice,
          amount_after: finalPrice
        })
    }

    if (employeeId && subscription && !isSuperUserCoupon) {
      const commissionAmount = finalPrice * 0.05 
      
      await supabase
        .from('commissions')
        .insert({
          employee_id: employeeId,
          subscription_id: subscription.id,
          subscription_amount: finalPrice,
          commission_rate: 0.05,
          commission_amount: commissionAmount,
          status: 'pending'
        })

      // Update coupon usage count and add +1 point
      const { data: currentCoupon } = await supabase
        .from('employee_coupons')
        .select('usage_count')
        .eq('code', couponCode)
        .single()

      await supabase
        .from('employee_coupons')
        .update({
          usage_count: (currentCoupon?.usage_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('code', couponCode)
    }

    return NextResponse.json({ 
      success: true,
      subscriptionId: subscription.id,
      letters: selectedPlan.letters,
      message: 'Subscription created successfully'
    })

  } catch (error) {
    console.error('[v0] Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
