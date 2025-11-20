'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import type { Letter } from '@/lib/database.types'

export function ReviewLetterModal({ letter }: { letter: Letter & { profiles?: { full_name: string; email: string } } }) {
  const [isOpen, setIsOpen] = useState(false)
  const [finalContent, setFinalContent] = useState(letter.ai_draft_content || '')
  const [reviewNotes, setReviewNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleOpen = async () => {
    setIsOpen(true)
    
    // Transition letter to under_review status
    if (letter.status === 'pending_review') {
      try {
        await fetch(`/api/letters/${letter.id}/start-review`, {
          method: 'POST'
        })
        router.refresh()
      } catch (error) {
        console.error('[v0] Failed to start review:', error)
      }
    }
  }

  const handleSubmit = async () => {
    if (!action) return
    
    if (action === 'approve' && !finalContent.trim()) {
      alert('Final content is required for approval')
      return
    }
    
    if (action === 'reject' && !rejectionReason.trim()) {
      alert('Rejection reason is required')
      return
    }
    
    setLoading(true)
    try {
      const endpoint = action === 'approve' 
        ? `/api/letters/${letter.id}/approve`
        : `/api/letters/${letter.id}/reject`
      
      const body = action === 'approve'
        ? { finalContent, reviewNotes }
        : { rejectionReason, reviewNotes }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update letter')
      }

      setIsOpen(false)
      router.refresh()
    } catch (error: any) {
      console.error('[v0] Review error:', error)
      alert(error.message || 'Failed to update letter status')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={handleOpen}>
        Review Letter
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Review Letter</h2>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Letter Details */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Letter Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Type:</span> {letter.letter_type}</div>
              <div><span className="font-medium">From:</span> {letter.profiles?.full_name}</div>
              <div><span className="font-medium">Email:</span> {letter.profiles?.email}</div>
              <div><span className="font-medium">Status:</span> {letter.status}</div>
            </div>
          </div>

          {/* Editable Content */}
          <div>
            <Label htmlFor="content">Letter Content (Editable)</Label>
            <Textarea
              id="content"
              value={finalContent}
              onChange={(e) => setFinalContent(e.target.value)}
              className="min-h-[400px] font-mono text-sm mt-2"
              placeholder="Edit the letter content before approval..."
            />
          </div>

          {/* Review Notes (Internal) */}
          <div>
            <Label htmlFor="notes">Internal Review Notes</Label>
            <p className="text-xs text-slate-500 mb-2">These notes are for internal use only and will not be shown to the client</p>
            <Textarea
              id="notes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add any internal notes about this review..."
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Action Selection */}
          <div className="flex gap-4">
            <Button
              onClick={() => setAction('approve')}
              variant={action === 'approve' ? 'default' : 'outline'}
              className="flex-1"
            >
              Approve Letter
            </Button>
            <Button
              onClick={() => setAction('reject')}
              variant={action === 'reject' ? 'destructive' : 'outline'}
              className="flex-1"
            >
              Reject Letter
            </Button>
          </div>

          {/* Rejection Reason */}
          {action === 'reject' && (
            <div>
              <Label htmlFor="rejection" className="text-red-600">Rejection Reason (Client Will See This) *</Label>
              <Textarea
                id="rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this letter is being rejected..."
                rows={3}
                className="mt-2 border-red-300"
                required
              />
            </div>
          )}

          {/* Submit Button */}
          {action && (
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button onClick={() => { setAction(null); setRejectionReason('') }} variant="ghost">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || (action === 'reject' && !rejectionReason.trim())}
                className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {loading ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
