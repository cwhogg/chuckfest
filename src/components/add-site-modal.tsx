'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface GeneratedSite {
  name: string
  region: string
  description: string
  latitude: number
  longitude: number
  permit_url: string
  permit_type: string
  permit_advance_days: number
  permit_open_time: string
  permit_cost: number
  permit_entry_point: string
  difficulty: string
  distance_miles: number
  elevation_gain_ft: number
  peak_elevation_ft: number
  permit_notes: string
  photos: string[]
  status: string
}

interface AddSiteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSiteAdded: () => void
}

export function AddSiteModal({ open, onOpenChange, onSiteAdded }: AddSiteModalProps) {
  const [siteName, setSiteName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null)

  const handleGenerate = async () => {
    if (!siteName.trim()) {
      toast.error('Please enter a site name')
      return
    }
    if (!imageUrl.trim()) {
      toast.error('Please enter an image URL')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/sites/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName, imageUrl }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate site details')
      }

      setGeneratedSite(data.site)
      toast.success('Site details generated!')
    } catch (error) {
      console.error('Error generating site:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate site details')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!generatedSite) return

    setSaving(true)
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatedSite),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save site')
      }

      toast.success(`${generatedSite.name} added successfully!`)
      handleClose()
      onSiteAdded()
    } catch (error) {
      console.error('Error saving site:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save site')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSiteName('')
    setImageUrl('')
    setGeneratedSite(null)
    onOpenChange(false)
  }

  const handleStartOver = () => {
    setGeneratedSite(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Site</DialogTitle>
        </DialogHeader>

        {!generatedSite ? (
          // Step 1: Enter name and image URL
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                placeholder="e.g., Thousand Island Lake"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                disabled={generating}
              />
              <p className="text-sm text-stone-500">
                Enter the name of a Sierra Nevada backpacking destination
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={generating}
              />
              <p className="text-sm text-stone-500">
                Paste a URL to a photo of this location
              </p>
            </div>

            {imageUrl && (
              <div className="mt-4">
                <Label>Image Preview</Label>
                <div className="mt-2 rounded-lg overflow-hidden border border-stone-200">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating || !siteName.trim() || !imageUrl.trim()}>
                {generating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Details'
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Preview and confirm
          <div className="space-y-4 py-4">
            <div className="bg-stone-50 rounded-lg p-4 space-y-3">
              {/* Image preview */}
              {generatedSite.photos?.[0] && (
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={generatedSite.photos[0]}
                    alt={generatedSite.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* Name and region */}
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{generatedSite.name}</h3>
                <p className="text-sm text-stone-600">{generatedSite.region}</p>
              </div>

              {/* Description */}
              <div>
                <Label className="text-stone-500">Description</Label>
                <Textarea
                  value={generatedSite.description}
                  onChange={(e) => setGeneratedSite({ ...generatedSite, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-500">Distance:</span>{' '}
                  <span className="font-medium">{generatedSite.distance_miles} mi</span>
                </div>
                <div>
                  <span className="text-stone-500">Elevation Gain:</span>{' '}
                  <span className="font-medium">{generatedSite.elevation_gain_ft?.toLocaleString()} ft</span>
                </div>
                <div>
                  <span className="text-stone-500">Peak Elevation:</span>{' '}
                  <span className="font-medium">{generatedSite.peak_elevation_ft?.toLocaleString()} ft</span>
                </div>
                <div>
                  <span className="text-stone-500">Difficulty:</span>{' '}
                  <span className={`font-medium capitalize ${
                    generatedSite.difficulty === 'easy' ? 'text-green-600' :
                    generatedSite.difficulty === 'moderate' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {generatedSite.difficulty}
                  </span>
                </div>
              </div>

              {/* Coordinates */}
              <div className="text-sm">
                <span className="text-stone-500">Coordinates:</span>{' '}
                <span className="font-medium">
                  {generatedSite.latitude?.toFixed(4)}, {generatedSite.longitude?.toFixed(4)}
                </span>
              </div>

              {/* Permit info */}
              <div className="border-t border-stone-200 pt-3 space-y-1">
                {generatedSite.permit_entry_point && (
                  <div className="text-sm bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
                    <span className="text-amber-700 font-medium">Entry Point:</span>{' '}
                    <span className="font-semibold text-amber-900">{generatedSite.permit_entry_point}</span>
                    <p className="text-xs text-amber-600 mt-0.5">Select this trailhead when booking permits</p>
                  </div>
                )}
                <div className="text-sm">
                  <span className="text-stone-500">Permit Type:</span>{' '}
                  <span className="font-medium capitalize">{generatedSite.permit_type?.replace('_', ' ')}</span>
                </div>
                <div className="text-sm">
                  <span className="text-stone-500">Advance Booking:</span>{' '}
                  <span className="font-medium">{generatedSite.permit_advance_days} days</span>
                </div>
                <div className="text-sm">
                  <span className="text-stone-500">Opens At:</span>{' '}
                  <span className="font-medium">{generatedSite.permit_open_time} PT</span>
                </div>
                <div className="text-sm">
                  <span className="text-stone-500">Cost:</span>{' '}
                  <span className="font-medium">${generatedSite.permit_cost}</span>
                </div>
                {generatedSite.permit_notes && (
                  <div className="text-sm">
                    <span className="text-stone-500">Notes:</span>{' '}
                    <span className="text-stone-700">{generatedSite.permit_notes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleStartOver}>
                Start Over
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Site'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
