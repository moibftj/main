"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  const [selectedType, setSelectedType] = useState("")
  const [error, setError] = useState<string | null>(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
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
          router.push("/dashboard/subscription")
          return
        }
        if (errorData.needsSubscription) {
          router.push("/dashboard/subscription")
          return
        }
        throw new Error(errorData.error || "Failed to generate letter")
      }

      const { letterId } = await response.json()
      router.push(`/dashboard/letters/${letterId}?submitted=1`)
    } catch (err: any) {
      console.error("[v0] Letter creation error:", err)
      setError(err.message || "Failed to create letter")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-foreground mb-8">Create New Letter</h1>
      {!selectedType ? (
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
                {loading ? "Submitting..." : "Generate & Submit for Review"}
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
