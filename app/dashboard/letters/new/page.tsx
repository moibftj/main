"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { GenerationTrackerModal } from "@/components/generation-tracker-modal"

const LETTER_TYPES = [
  { value: "demand_letter", label: "Demand Letter", description: "Formal demand for payment or action" },
  { value: "cease_desist", label: "Cease and Desist", description: "Stop harmful or illegal activity" },
  { value: "contract_breach", label: "Contract Breach Notice", description: "Notify of contract violation" },
  { value: "eviction_notice", label: "Eviction Notice", description: "Legal notice to vacate property" },
  { value: "employment_dispute", label: "Employment Dispute", description: "Workplace issue resolution" },
  { value: "consumer_complaint", label: "Consumer Complaint", description: "Product or service complaint" },
]

export default function NewLetterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showTracker, setShowTracker] = useState(false)
  const [isGenerationFinished, setIsGenerationFinished] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState("")
  const [generatedLetterId, setGeneratedLetterId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewContent, setPreviewContent] = useState("")
  const [isFreeTrial, setIsFreeTrial] = useState(false)
  const [showPricingOverlay, setShowPricingOverlay] = useState(false)
  const [formData, setFormData] = useState({
    senderName: "",
    senderAddress: "",
    recipientName: "",
    recipientAddress: "",
    issueDescription: "",
    desiredOutcome: "",
    amountDemanded: "",
    supportingDocuments: "",
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setShowTracker(true)
    setIsGenerationFinished(false)
    setError(null)

    try {
      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType: selectedType,
          intakeData: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.needsSubscription) {
          setShowTracker(false)
          router.push("/dashboard/subscription")
          return
        }
        throw new Error(errorData.error || "Failed to generate letter")
      }

      const { content, letterId, isFreeTrial: isFree } = await response.json()

      setIsGenerationFinished(true)
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (!isFree) {
        router.push(`/dashboard/letters/${letterId}`)
        return
      }

      setPreviewContent(content)
      setGeneratedLetterId(letterId)
      setIsFreeTrial(isFree)
      setShowPreview(true)
      setShowPricingOverlay(isFree)
      setShowTracker(false)
    } catch (err: any) {
      console.error("[v0] Letter creation error:", err)
      setError(err.message || "Failed to create letter")
      setShowTracker(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitForReview = async () => {
    if (!generatedLetterId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/letters/${generatedLetterId}/submit`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to submit for review")

      router.push("/dashboard/letters")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <GenerationTrackerModal isOpen={showTracker} isFinished={isGenerationFinished} />

      <h1 className="text-3xl font-bold text-foreground mb-8">Create New Letter</h1>

      {showPreview ? (
        <div className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border p-6 relative">
            {showPricingOverlay && (
              <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="max-w-2xl w-full p-8">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-success/10 rounded-full mb-4">
                      <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">Your Letter is Ready!</h2>
                    <p className="text-muted-foreground">
                      This was your free trial. Subscribe to submit for attorney review and get your final letter.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="border rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all">
                      <h3 className="font-semibold text-lg mb-2">Single Letter</h3>
                      <div className="text-3xl font-bold text-primary mb-4">$299</div>
                      <p className="text-sm text-muted-foreground mb-4">One-time payment</p>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          1 Legal Letter
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Attorney Review
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          PDF Download
                        </li>
                      </ul>
                      <Button className="w-full" onClick={() => router.push("/dashboard/subscription")}>
                        Choose Plan
                      </Button>
                    </div>

                    <div className="border-2 border-primary rounded-lg p-6 relative hover:shadow-lg transition-all">
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                        POPULAR
                      </div>
                      <h3 className="font-semibold text-lg mb-2">Monthly</h3>
                      <div className="text-3xl font-bold text-primary mb-4">
                        $299<span className="text-lg text-muted-foreground">/mo</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Billed monthly</p>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          4 Letters/Month
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Attorney Review
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Priority Support
                        </li>
                      </ul>
                      <Button className="w-full" onClick={() => router.push("/dashboard/subscription")}>
                        Choose Plan
                      </Button>
                    </div>

                    <div className="border rounded-lg p-6 hover:border-primary hover:shadow-lg transition-all">
                      <h3 className="font-semibold text-lg mb-2">Yearly</h3>
                      <div className="text-3xl font-bold text-primary mb-4">
                        $599<span className="text-lg text-muted-foreground">/yr</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">Save $1,189/year</p>
                      <ul className="space-y-2 text-sm mb-6">
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          8 Letters/Year
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Attorney Review
                        </li>
                        <li className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Priority Support
                        </li>
                      </ul>
                      <Button className="w-full" onClick={() => router.push("/dashboard/subscription")}>
                        Choose Plan
                      </Button>
                    </div>
                  </div>

                  <div className="text-center">
                    <button
                      onClick={() => setShowPricingOverlay(false)}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      Preview letter draft
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h2 className="text-xl font-semibold mb-4">Attorney-Generated Draft</h2>
            <div className="prose max-w-none mb-6">
              <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed bg-muted p-4 rounded">
                {previewContent}
              </pre>
            </div>

            {!isFreeTrial && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-primary mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-foreground">Ready to Submit?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your letter will be reviewed by our legal team for accuracy and compliance. Once approved, you'll
                      be able to download, preview, and send it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {error && <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

            {!isFreeTrial && (
              <div className="flex gap-4">
                <Button onClick={handleSubmitForReview} disabled={loading} className="flex-1">
                  {loading ? "Submitting..." : "Submit for Review"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPreview(false)
                    setGeneratedLetterId(null)
                  }}
                >
                  Edit Form
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : !selectedType ? (
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Select Letter Type</h2>
          <div className="grid gap-4">
            {LETTER_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className="text-left p-4 border rounded-lg hover:bg-accent hover:border-primary/30 transition-colors"
              >
                <div className="font-medium text-foreground">{type.label}</div>
                <div className="text-sm text-muted-foreground mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{LETTER_TYPES.find((t) => t.value === selectedType)?.label}</h2>
              <button
                type="button"
                onClick={() => setSelectedType("")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Change type
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="senderName">Your Full Name</Label>
                  <Input
                    id="senderName"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="senderAddress">Your Address</Label>
                <Textarea
                  id="senderAddress"
                  rows={3}
                  value={formData.senderAddress}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="recipientAddress">Recipient Address</Label>
                <Textarea
                  id="recipientAddress"
                  rows={3}
                  value={formData.recipientAddress}
                  onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="issueDescription">Issue Description</Label>
                <Textarea
                  id="issueDescription"
                  rows={6}
                  placeholder="Describe the issue in detail. Include relevant dates, events, and any supporting information..."
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  required
                />
              </div>

              {selectedType === "demand_letter" && (
                <div>
                  <Label htmlFor="amountDemanded">Amount Demanded ($)</Label>
                  <Input
                    id="amountDemanded"
                    type="number"
                    step="0.01"
                    value={formData.amountDemanded}
                    onChange={(e) => setFormData({ ...formData, amountDemanded: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="desiredOutcome">Desired Outcome</Label>
                <Textarea
                  id="desiredOutcome"
                  rows={3}
                  placeholder="What resolution are you seeking?"
                  value={formData.desiredOutcome}
                  onChange={(e) => setFormData({ ...formData, desiredOutcome: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="supportingDocuments">Supporting Documents (Optional)</Label>
                <Textarea
                  id="supportingDocuments"
                  rows={2}
                  placeholder="List any contracts, invoices, emails, or other documents that support your case"
                  value={formData.supportingDocuments}
                  onChange={(e) => setFormData({ ...formData, supportingDocuments: e.target.value })}
                />
              </div>
            </div>

            {error && <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

            <div className="mt-6 flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Generating Letter..." : "Generate Legal Letter"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/letters")}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
