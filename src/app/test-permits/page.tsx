'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Site, PermitReminder } from '@/lib/types'

// Client-side permit calculation (mirrors server logic)
function calculatePermitOpenDatetime(site: Site, tripStartDate: Date): Date {
  const openTime = site.permit_open_time || '07:00'
  const [hours, minutes] = openTime.split(':').map(Number)
  const tripYear = tripStartDate.getFullYear()

  let openDate: Date

  switch (site.permit_type) {
    case 'rolling': {
      const advanceDays = site.permit_advance_days || 180
      openDate = new Date(tripStartDate)
      openDate.setDate(openDate.getDate() - advanceDays)
      break
    }

    case 'fixed_date': {
      if (!site.permit_fixed_open_date) {
        throw new Error('No permit_fixed_open_date set')
      }
      const [month, day] = site.permit_fixed_open_date.split('-').map(Number)
      let openYear = tripYear
      const fixedDateThisYear = new Date(tripYear, month - 1, day)
      if (fixedDateThisYear > tripStartDate) {
        openYear = tripYear - 1
      }
      openDate = new Date(openYear, month - 1, day)
      break
    }

    case 'lottery': {
      if (!site.permit_lottery_open) {
        throw new Error('No permit_lottery_open set')
      }
      const [month, day] = site.permit_lottery_open.split('-').map(Number)
      let lotteryYear = tripYear
      const lotteryDateThisYear = new Date(tripYear, month - 1, day)
      if (lotteryDateThisYear > tripStartDate) {
        lotteryYear = tripYear - 1
      }
      openDate = new Date(lotteryYear, month - 1, day)
      break
    }

    default:
      throw new Error(`Unknown permit type: ${site.permit_type}`)
  }

  // Set time (this is approximate - actual server uses timezone conversion)
  openDate.setHours(hours, minutes, 0, 0)
  return openDate
}

function calculateReminderDatetime(permitOpenDatetime: Date): Date {
  const reminder = new Date(permitOpenDatetime)
  reminder.setDate(reminder.getDate() - 1)
  return reminder
}

function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  })
}

function formatDaysUntil(date: Date): string {
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} days ago`
  } else if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else {
    return `In ${diffDays} days`
  }
}

type ReminderWithSite = PermitReminder & { site: Site }

export default function TestPermitsPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<string>('')
  const [tripDate, setTripDate] = useState<string>('')
  const [results, setResults] = useState<{
    permitOpen: Date
    reminder: Date
  } | null>(null)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Email testing state
  const [testEmail, setTestEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null)

  // Upcoming reminders state
  const [upcomingReminders, setUpcomingReminders] = useState<ReminderWithSite[]>([])
  const [loadingReminders, setLoadingReminders] = useState(false)

  // Fetch sites on mount
  useEffect(() => {
    async function fetchSites() {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error fetching sites:', error)
        setError('Failed to load sites')
      } else {
        setSites(data as Site[])
      }
      setLoading(false)
    }

    fetchSites()
    fetchUpcomingReminders()
  }, [])

  // Fetch upcoming reminders
  async function fetchUpcomingReminders() {
    setLoadingReminders(true)
    try {
      const response = await fetch('/api/permit-reminders?upcoming=true&days=90')
      const data = await response.json()
      if (data.success) {
        setUpcomingReminders(data.reminders)
      }
    } catch (err) {
      console.error('Error fetching reminders:', err)
    }
    setLoadingReminders(false)
  }

  // Set default trip date to next July 15
  useEffect(() => {
    const now = new Date()
    let year = now.getFullYear()
    const july15 = new Date(year, 6, 15)
    if (now > july15) {
      year++
    }
    setTripDate(`${year}-07-15`)
  }, [])

  // Calculate when inputs change
  useEffect(() => {
    if (!selectedSiteId || !tripDate) {
      setResults(null)
      return
    }

    const site = sites.find(s => s.id === selectedSiteId)
    if (!site) {
      setResults(null)
      return
    }

    if (!site.permit_type) {
      setError('This site has no permit type configured')
      setResults(null)
      return
    }

    try {
      setError('')
      const tripStartDate = new Date(tripDate + 'T00:00:00')
      const permitOpen = calculatePermitOpenDatetime(site, tripStartDate)
      const reminder = calculateReminderDatetime(permitOpen)
      setResults({ permitOpen, reminder })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation error')
      setResults(null)
    }
  }, [selectedSiteId, tripDate, sites])

  const selectedSite = sites.find(s => s.id === selectedSiteId)

  // Send test email
  async function handleSendTestEmail(reminderId: string) {
    if (!testEmail) {
      setEmailResult({ success: false, message: 'Please enter a test email address' })
      return
    }

    setSendingEmail(true)
    setEmailResult(null)

    try {
      const response = await fetch('/api/email/permit-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permitReminderId: reminderId, testEmail })
      })

      const data = await response.json()
      setEmailResult({
        success: data.success,
        message: data.success ? data.message : data.error
      })
    } catch (err) {
      setEmailResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send email'
      })
    }

    setSendingEmail(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-4">Permit Calculator Test</h1>
        <p>Loading sites...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Permit Calculator Test</h1>
      <p className="text-gray-600 mb-8">
        Test permit open date calculations and email reminders for ChuckfestAI
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Select Site
            </label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            >
              <option value="">-- Select a site --</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} ({site.permit_type || 'no permit type'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Target Trip Start Date
            </label>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full p-2 border rounded-md"
            />
          </div>

          {/* Site Details */}
          {selectedSite && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Site Permit Rules</h3>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Permit Type:</dt>
                  <dd className="font-mono">{selectedSite.permit_type || 'N/A'}</dd>
                </div>
                {selectedSite.permit_type === 'rolling' && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Advance Days:</dt>
                    <dd className="font-mono">{selectedSite.permit_advance_days || 180}</dd>
                  </div>
                )}
                {selectedSite.permit_type === 'fixed_date' && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Fixed Open Date:</dt>
                    <dd className="font-mono">{selectedSite.permit_fixed_open_date || 'N/A'}</dd>
                  </div>
                )}
                {selectedSite.permit_type === 'lottery' && (
                  <>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Lottery Open:</dt>
                      <dd className="font-mono">{selectedSite.permit_lottery_open || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Lottery Close:</dt>
                      <dd className="font-mono">{selectedSite.permit_lottery_close || 'N/A'}</dd>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Open Time (PT):</dt>
                  <dd className="font-mono">{selectedSite.permit_open_time}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Cost:</dt>
                  <dd className="font-mono">
                    {selectedSite.permit_cost
                      ? `$${selectedSite.permit_cost}/person`
                      : 'Free'}
                  </dd>
                </div>
              </dl>
              {selectedSite.permit_notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-600">{selectedSite.permit_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Quick Test Dates */}
          <div className="pt-4">
            <h3 className="font-semibold mb-2 text-sm">Quick Test Dates</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Jul 15, 2025', value: '2025-07-15' },
                { label: 'Aug 1, 2025', value: '2025-08-01' },
                { label: 'Sep 1, 2025', value: '2025-09-01' },
                { label: 'Jul 15, 2026', value: '2026-07-15' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setTripDate(value)}
                  className={`px-3 py-1 rounded text-sm ${
                    tripDate === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
              {error}
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">
                  Permits Open
                </h3>
                <p className="text-lg font-mono">
                  {formatDate(results.permitOpen)}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {formatDaysUntil(results.permitOpen)}
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Send Reminder
                </h3>
                <p className="text-lg font-mono">
                  {formatDate(results.reminder)}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {formatDaysUntil(results.reminder)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Summary</h3>
                <p className="text-sm text-gray-600">
                  For a trip starting{' '}
                  <span className="font-semibold">
                    {new Date(tripDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  , permits for <span className="font-semibold">{selectedSite?.name}</span>{' '}
                  open on{' '}
                  <span className="font-semibold">
                    {results.permitOpen.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>{' '}
                  at <span className="font-semibold">{selectedSite?.permit_open_time} PT</span>.
                </p>
              </div>
            </div>
          )}

          {!results && !error && selectedSiteId && (
            <div className="p-4 bg-gray-50 rounded-lg text-gray-500">
              Select a site and trip date to see calculations
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      <div className="mt-12 pt-8 border-t">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming Permit Reminders</h2>
          <button
            onClick={fetchUpcomingReminders}
            disabled={loadingReminders}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {loadingReminders ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Test Email Input */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">Test Email Settings</h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter test email address"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1 p-2 border rounded-md"
            />
          </div>
          <p className="text-xs text-yellow-700 mt-2">
            Test emails will only be sent to this address, not to all members.
          </p>
          {emailResult && (
            <div className={`mt-2 p-2 rounded text-sm ${
              emailResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {emailResult.message}
            </div>
          )}
        </div>

        {upcomingReminders.length === 0 ? (
          <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">
            No upcoming reminders found.
            <br />
            <span className="text-sm">
              Generate reminders using the API: POST /api/permit-reminders
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-4 bg-white border rounded-lg shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{reminder.site.name}</h3>
                    <p className="text-sm text-gray-600">{reminder.site.region}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    reminder.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : reminder.status === 'reminder_sent'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {reminder.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Reminder Date</p>
                    <p className="font-mono">
                      {new Date(reminder.reminder_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDaysUntil(new Date(reminder.reminder_datetime))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Permits Open</p>
                    <p className="font-mono">
                      {new Date(reminder.permit_open_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDaysUntil(new Date(reminder.permit_open_datetime))}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a
                    href={`/api/email/permit-reminder/preview/${reminder.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                  >
                    Preview Email
                  </a>
                  <button
                    onClick={() => handleSendTestEmail(reminder.id)}
                    disabled={sendingEmail || !testEmail}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
                  >
                    {sendingEmail ? 'Sending...' : 'Send Test Email'}
                  </button>
                  {reminder.site.permit_url && (
                    <a
                      href={reminder.site.permit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-green-600 text-white hover:bg-green-700 rounded"
                    >
                      Recreation.gov
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
