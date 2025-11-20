'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import type { Letter } from '@/lib/database.types'

export function LetterActions({ letter }: { letter: Letter }) {
  const [loading, setLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmitForReview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/letters/${letter.id}/submit`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        if (data?.needsSubscription) {
          // User out of letters → send to subscription page
          router.push('/dashboard/subscription')
          return
        }
        throw new Error(data?.error || 'Failed to submit letter for review')
      }

      router.refresh()
      alert('Letter submitted for attorney review.')
    } catch (err) {
      console.error('[v0] Error submitting for review:', err)
      alert('Failed to submit letter for review.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/letters/${letter.id}/pdf`)
      if (!response.ok) throw new Error('Failed to generate PDF')
      
      const html = await response.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${letter.title.replace(/[^a-z0-9]/gi, '_')}.html`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[v0] Download error:', err)
      alert('Failed to download letter')
    }
  }

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      alert('Please enter recipient email')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/letters/${letter.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail,
          message: emailMessage
        })
      })

      if (!response.ok) throw new Error('Failed to send email')

      const data = await response.json()
      alert(data.message || 'Email sent successfully!')
      setShowEmailModal(false)
      setRecipientEmail('')
      setEmailMessage('')
    } catch (err) {
      console.error('[v0] Email error:', err)
      alert('Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {letter.status === 'draft' && (
          <Button onClick={handleSubmitForReview} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit for Attorney Review'}
          </Button>
        )}
        
        {letter.status === 'approved' && (
          <>
            <Button variant="outline" onClick={handleDownloadPDF}>
              Download PDF
            </Button>
            
            <Button variant="outline" onClick={() => setShowEmailModal(true)}>
              Send via Email
            </Button>
          </>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Send Letter via Email</h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="recipientEmail">Recipient Email</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  placeholder="recipient@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="emailMessage">Additional Message (Optional)</Label>
                <Textarea
                  id="emailMessage"
                  placeholder="Add a personal message to accompany the letter..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEmailModal(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSendEmail}
                  disabled={loading || !recipientEmail}
                >
                  {loading ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
