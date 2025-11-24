import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAuth, getAdminSession } from '@/lib/auth/admin-session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authError = await requireAdminAuth()
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()
    const adminSession = await getAdminSession()

    if (!adminSession?.userId) {
      return NextResponse.json({ error: 'Admin session missing' }, { status: 401 })
    }

    const { data: letter } = await supabase
      .from('letters')
      .select('status, reviewed_by')
      .eq('id', id)
      .single()

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    if (letter.reviewed_by && letter.reviewed_by !== adminSession?.userId) {
      return NextResponse.json(
        { error: 'This letter is already assigned to another admin for review.' },
        { status: 409 }
      )
    }

    if (!['pending_review', 'under_review'].includes(letter.status)) {
      return NextResponse.json(
        { error: 'Only letters pending review can be assigned to an admin.' },
        { status: 400 }
      )
    }

    const updates: {
      updated_at: string
      reviewed_by?: string
      status?: 'under_review'
    } = {
      updated_at: new Date().toISOString(),
    }

    if (!letter.reviewed_by) {
      updates.reviewed_by = adminSession?.userId
    }

    if (letter.status === 'pending_review') {
      updates.status = 'under_review'
    }

    if (updates.status || updates.reviewed_by) {
      const { error: updateError } = await supabase
        .from('letters')
        .update(updates)
        .eq('id', id)

      if (updateError) throw updateError
    }

    if (letter.status === 'pending_review') {
      await supabase.rpc('log_letter_audit', {
        p_letter_id: id,
        p_action: 'review_started',
        p_old_status: letter.status,
        p_new_status: 'under_review',
        p_notes: 'Admin started reviewing the letter'
      })
    }

    return NextResponse.json({ success: true, reviewedBy: adminSession?.userId })
  } catch (error) {
    console.error('[v0] Start review error:', error)
    return NextResponse.json(
      { error: 'Failed to start review' },
      { status: 500 }
    )
  }
}
