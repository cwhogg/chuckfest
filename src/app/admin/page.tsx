'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TripYear {
  id: string
  year: number
  status: string
  final_start_date: string | null
  final_end_date: string | null
  created_at: string
}

interface DateOption {
  id: string
  trip_year_id: string
  start_date: string
  end_date: string
}

interface Site {
  id: string
  name: string
  region: string | null
  permit_type: string
  permit_open_days_before: number | null
  permit_open_date: string | null
  photos: string[] | null
}

interface PermitReminder {
  id: string
  trip_year_id: string
  site_id: string
  target_trip_date: string
  permit_open_datetime: string
  reminder_datetime: string
  status: string
  site?: Site
}

interface Member {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
  avatar_url: string | null
}

interface ReminderLog {
  id: string
  reminder_type: string
  reference_id: string
  recipient_count: number
  email_subject: string
  sent_at: string
}

interface PastTrip {
  id: string
  year: number
  location_name: string | null
  album_url: string | null
  cover_photo_url: string | null
}

const statusColors: Record<string, string> = {
  planning: 'bg-[#e8f0e6] text-[#2d5016]',
  dates_open: 'bg-[#f5e6c8] text-[#5c4033]',
  dates_locked: 'bg-[#e8f0e6] text-[#4a5d42]',
  trip_complete: 'bg-[#e8dcc8] text-[#5c4033]',
  completed: 'bg-[#e8dcc8] text-[#5c4033]',
  pending: 'bg-[#f5e6c8] text-[#5c4033]',
  reminder_sent: 'bg-[#e8f0e6] text-[#2d5016]',
  booked: 'bg-[#e8f0e6] text-[#4a5d42]',
  missed: 'bg-[#f5e0dc] text-[#7a4a52]',
  cancelled: 'bg-[#e8dcc8] text-[#7a7067]',
}

export default function AdminPage() {
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [dateOptions, setDateOptions] = useState<DateOption[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [reminders, setReminders] = useState<PermitReminder[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
  const [pastTrips, setPastTrips] = useState<PastTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal states
  const [newYearDialogOpen, setNewYearDialogOpen] = useState(false)
  const [newMemberDialogOpen, setNewMemberDialogOpen] = useState(false)
  const [newYear, setNewYear] = useState(new Date().getFullYear() + 1)
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '' })
  const [selectedSites, setSelectedSites] = useState<string[]>([])
  const [selectedDateOption, setSelectedDateOption] = useState<string>('')
  const [datesUnlocked, setDatesUnlocked] = useState(false)
  const [photoInputs, setPhotoInputs] = useState<Record<string, string>>({})
  const [savingPhoto, setSavingPhoto] = useState<string | null>(null)
  const [coverPhotoInputs, setCoverPhotoInputs] = useState<Record<string, string>>({})
  const [savingCoverPhoto, setSavingCoverPhoto] = useState<string | null>(null)
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [editMemberForm, setEditMemberForm] = useState({ name: '', email: '', phone: '', avatar_url: '', is_active: true })
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const fetchData = useCallback(async () => {
    try {
      // Fetch current trip year
      const tripYearRes = await fetch('/api/trip-years?current=true')
      const tripYearData = await tripYearRes.json()
      if (tripYearData.success && tripYearData.tripYear) {
        setTripYear(tripYearData.tripYear)

        // Fetch date options for this trip year
        const dateOptionsRes = await fetch(`/api/date-options?tripYearId=${tripYearData.tripYear.id}`)
        const dateOptionsData = await dateOptionsRes.json()
        if (dateOptionsData.success) {
          setDateOptions(dateOptionsData.dateOptions)
        }

        // Fetch permit reminders for this trip year
        const remindersRes = await fetch(`/api/permit-reminders?tripYearId=${tripYearData.tripYear.id}`)
        const remindersData = await remindersRes.json()
        if (remindersData.success) {
          setReminders(remindersData.reminders || [])
        }
      }

      // Fetch sites
      const sitesRes = await fetch('/api/sites')
      const sitesData = await sitesRes.json()
      if (sitesData.success) {
        setSites(sitesData.sites)
      }

      // Fetch members
      const membersRes = await fetch('/api/members')
      const membersData = await membersRes.json()
      if (membersData.success) {
        setMembers(membersData.members)
      }

      // Fetch reminder logs
      const logsRes = await fetch('/api/reminders-log?limit=10')
      const logsData = await logsRes.json()
      if (logsData.success) {
        setReminderLogs(logsData.logs)
      }

      // Fetch past trips
      const pastTripsRes = await fetch('/api/past-trips')
      const pastTripsData = await pastTripsRes.json()
      if (pastTripsData.success) {
        setPastTrips(pastTripsData.trips || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      showMessage('error', 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const createTripYear = async () => {
    setActionLoading('createTripYear')
    try {
      const res = await fetch('/api/trip-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: newYear }),
      })
      const data = await res.json()

      if (data.success) {
        // Generate date options
        const genRes = await fetch('/api/date-options/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripYearId: data.tripYear.id }),
        })
        const genData = await genRes.json()

        showMessage('success', `Created Chuckfest ${newYear} with ${genData.dateOptions?.length || 0} date options`)
        setNewYearDialogOpen(false)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to create trip year')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const lockDates = async () => {
    if (!tripYear || !selectedDateOption) return

    const option = dateOptions.find(d => d.id === selectedDateOption)
    if (!option) return

    setActionLoading('lockDates')
    try {
      const res = await fetch(`/api/trip-years/${tripYear.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'dates_locked',
          final_start_date: option.start_date,
          final_end_date: option.end_date,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Trip dates locked!')
        setDatesUnlocked(false)
        setSelectedDateOption('')
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to lock dates')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const generateReminders = async () => {
    if (!tripYear || selectedSites.length === 0) return

    setActionLoading('generateReminders')
    try {
      const res = await fetch('/api/permit-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripYearId: tripYear.id,
          siteIds: selectedSites,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', data.message)
        setSelectedSites([])
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to generate reminders')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const updateReminderStatus = async (id: string, status: string) => {
    setActionLoading(`reminder-${id}`)
    try {
      const res = await fetch(`/api/permit-reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', `Reminder marked as ${status}`)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to update reminder')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const sendReminder = async (id: string) => {
    setActionLoading(`send-${id}`)
    try {
      const res = await fetch(`/api/permit-reminders/${id}/send`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', data.message)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to send reminder')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const addMember = async () => {
    setActionLoading('addMember')
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', data.message)
        setNewMemberDialogOpen(false)
        setNewMember({ name: '', email: '', phone: '' })
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to add member')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const toggleMemberActive = async (member: Member) => {
    setActionLoading(`member-${member.id}`)
    try {
      const res = await fetch(`/api/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !member.is_active }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', `${member.name} is now ${!member.is_active ? 'active' : 'inactive'}`)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to update member')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const openEditMember = (member: Member) => {
    setEditingMember(member)
    setEditMemberForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      avatar_url: member.avatar_url || '',
      is_active: member.is_active,
    })
    setEditMemberDialogOpen(true)
  }

  const saveMember = async () => {
    if (!editingMember) return

    setActionLoading('saveMember')
    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMemberForm.name,
          email: editMemberForm.email,
          phone: editMemberForm.phone || null,
          avatar_url: editMemberForm.avatar_url || null,
          is_active: editMemberForm.is_active,
        }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Member updated successfully')
        setEditMemberDialogOpen(false)
        setEditingMember(null)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to update member')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteMember = async () => {
    if (!editingMember) return

    setActionLoading('deleteMember')
    try {
      const res = await fetch(`/api/members/${editingMember.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Member deleted')
        setDeleteConfirmOpen(false)
        setEditMemberDialogOpen(false)
        setEditingMember(null)
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to delete member')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const sendTestEmail = async () => {
    setActionLoading('testEmail')
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        showMessage('success', data.message)
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to send test email')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const runReminderCheck = async () => {
    setActionLoading('reminderCheck')
    try {
      const res = await fetch('/api/admin/run-reminder-check', { method: 'POST' })
      const data = await res.json()

      if (data.success) {
        const msg = data.remindersFound === 0
          ? 'No due reminders found'
          : `Sent ${data.remindersSent}/${data.remindersFound} reminders`
        showMessage('success', msg)
        fetchData()
      } else {
        showMessage('error', data.errors?.join(', ') || 'Failed')
      }
    } catch (error) {
      showMessage('error', 'Failed to run reminder check')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const saveSitePhoto = async (siteId: string) => {
    const photoUrl = photoInputs[siteId]?.trim()
    if (!photoUrl) {
      showMessage('error', 'Please enter a photo URL')
      return
    }

    setSavingPhoto(siteId)
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: [photoUrl] }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Photo saved!')
        // Clear the input and refresh data
        setPhotoInputs(prev => ({ ...prev, [siteId]: '' }))
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to save photo')
      console.error(error)
    } finally {
      setSavingPhoto(null)
    }
  }

  const clearSitePhoto = async (siteId: string) => {
    setSavingPhoto(siteId)
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: null }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Photo cleared')
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to clear photo')
      console.error(error)
    } finally {
      setSavingPhoto(null)
    }
  }

  const saveCoverPhoto = async (tripId: string) => {
    const photoUrl = coverPhotoInputs[tripId]?.trim()
    if (!photoUrl) {
      showMessage('error', 'Please enter a photo URL')
      return
    }

    setSavingCoverPhoto(tripId)
    try {
      const res = await fetch(`/api/past-trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_photo_url: photoUrl }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Cover photo saved!')
        setCoverPhotoInputs(prev => ({ ...prev, [tripId]: '' }))
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to save cover photo')
      console.error(error)
    } finally {
      setSavingCoverPhoto(null)
    }
  }

  const clearCoverPhoto = async (tripId: string) => {
    setSavingCoverPhoto(tripId)
    try {
      const res = await fetch(`/api/past-trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_photo_url: null }),
      })
      const data = await res.json()

      if (data.success) {
        showMessage('success', 'Cover photo cleared')
        fetchData()
      } else {
        showMessage('error', data.error)
      }
    } catch (error) {
      showMessage('error', 'Failed to clear cover photo')
      console.error(error)
    } finally {
      setSavingCoverPhoto(null)
    }
  }

  const formatDate = (dateStr: string) => {
    // Add T12:00:00 to avoid timezone issues (YYYY-MM-DD is parsed as UTC midnight)
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf6f0] flex items-center justify-center">
        <div className="text-lg text-[#5c4033]">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f0]">
      {/* Header */}
      <header className="bg-[#fffdf9] border-b border-[#e8dcc8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/sites" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg
                className="w-8 h-8 text-[#2d5016]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2L2 22h20L12 2zm0 3l7.5 15h-15L12 5z"/>
              </svg>
              <span className="text-xl font-bold text-[#2d5016]">
                ChuckfestAI
              </span>
            </Link>
            <span className="text-[#c9b896]">|</span>
            <h1 className="text-xl font-semibold text-[#5c4033]">Admin</h1>
          </div>
        </div>
      </header>

      {/* Message Alert */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
            <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="trip-year" className="space-y-6">
          <TabsList className="grid grid-cols-7 w-full max-w-4xl">
            <TabsTrigger value="trip-year">Trip Year</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="site-images">Site Images</TabsTrigger>
            <TabsTrigger value="past-trips">Past Trips</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* SECTION 1: Current Trip Year */}
          <TabsContent value="trip-year" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Trip Year</CardTitle>
                <CardDescription>Manage the current or upcoming Chuckfest trip</CardDescription>
              </CardHeader>
              <CardContent>
                {tripYear ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-bold">Chuckfest {tripYear.year}</h2>
                      <Badge className={statusColors[tripYear.status] || 'bg-gray-100'}>
                        {tripYear.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {tripYear.final_start_date && tripYear.final_end_date && (
                      <div className="bg-[#e8f0e6] border border-[#c9d4c5] rounded-lg p-4">
                        <p className="text-sm text-[#4a5d42] font-medium">Final Trip Dates</p>
                        <p className="text-xl font-bold text-[#2d5016]">
                          {formatDate(tripYear.final_start_date)} - {formatDate(tripYear.final_end_date)}
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-gray-500">
                      Created: {formatDateTime(tripYear.created_at)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No active trip year found</p>
                    <Dialog open={newYearDialogOpen} onOpenChange={setNewYearDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>Create New Trip Year</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Trip Year</DialogTitle>
                          <DialogDescription>
                            Create a new Chuckfest trip year with auto-generated date options.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                              id="year"
                              type="number"
                              value={newYear}
                              onChange={(e) => setNewYear(parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setNewYearDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createTripYear} disabled={actionLoading === 'createTripYear'}>
                            {actionLoading === 'createTripYear' ? 'Creating...' : 'Create'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {tripYear && (
                  <div className="mt-6">
                    <Dialog open={newYearDialogOpen} onOpenChange={setNewYearDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Create New Trip Year</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Trip Year</DialogTitle>
                          <DialogDescription>
                            Create a new Chuckfest trip year with auto-generated date options.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="year">Year</Label>
                            <Input
                              id="year"
                              type="number"
                              value={newYear}
                              onChange={(e) => setNewYear(parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setNewYearDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createTripYear} disabled={actionLoading === 'createTripYear'}>
                            {actionLoading === 'createTripYear' ? 'Creating...' : 'Create'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 2: Set Trip Dates */}
          <TabsContent value="dates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Dates</CardTitle>
                <CardDescription>Set the final trip dates for Chuckfest {tripYear?.year}</CardDescription>
              </CardHeader>
              <CardContent>
                {!tripYear ? (
                  <p className="text-gray-500">Create a trip year first</p>
                ) : tripYear.final_start_date ? (
                  <div className="space-y-4">
                    {!datesUnlocked ? (
                      <div className="flex items-center gap-4 p-4 bg-[#e8f0e6] border border-[#c9d4c5] rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm text-[#4a5d42] font-medium">Current Dates</p>
                          <p className="text-xl font-bold text-[#2d5016]">
                            {formatDate(tripYear.final_start_date)} - {formatDate(tripYear.final_end_date!)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[#5c4033]">
                          <span>Dates locked</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDatesUnlocked(true)}
                          >
                            Unlock
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Alert className="border-orange-500 bg-orange-50">
                          <AlertDescription className="text-orange-800">
                            Dates unlocked for editing. Select a new date range and click Lock Dates to save.
                          </AlertDescription>
                        </Alert>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600 font-medium">Current Dates</p>
                          <p className="text-lg text-gray-700">
                            {formatDate(tripYear.final_start_date)} - {formatDate(tripYear.final_end_date!)}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Select New Date Range</Label>
                          <Select value={selectedDateOption} onValueChange={setSelectedDateOption}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a date range" />
                            </SelectTrigger>
                            <SelectContent>
                              {dateOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {formatDate(option.start_date)} - {formatDate(option.end_date)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={lockDates}
                            disabled={!selectedDateOption || actionLoading === 'lockDates'}
                          >
                            {actionLoading === 'lockDates' ? 'Saving...' : 'Lock Dates'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setDatesUnlocked(false)
                              setSelectedDateOption('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : dateOptions.length === 0 ? (
                  <p className="text-gray-500">No date options available. Try creating a new trip year.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Date Option</Label>
                      <Select value={selectedDateOption} onValueChange={setSelectedDateOption}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a date range" />
                        </SelectTrigger>
                        <SelectContent>
                          {dateOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {formatDate(option.start_date)} - {formatDate(option.end_date)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={lockDates}
                      disabled={!selectedDateOption || actionLoading === 'lockDates'}
                    >
                      {actionLoading === 'lockDates' ? 'Locking...' : 'Lock Dates'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {dateOptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>All Date Options</CardTitle>
                  <CardDescription>Generated Wed-Sun options for summer {tripYear?.year}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateOptions.map((option) => (
                        <TableRow key={option.id}>
                          <TableCell>{formatDate(option.start_date)}</TableCell>
                          <TableCell>{formatDate(option.end_date)}</TableCell>
                          <TableCell>Wed - Sun</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SECTION 3: Permit Reminders */}
          <TabsContent value="reminders" className="space-y-6">
            {/* Generate Reminders */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Reminders</CardTitle>
                <CardDescription>Select sites to generate permit reminders for</CardDescription>
              </CardHeader>
              <CardContent>
                {!tripYear?.final_start_date ? (
                  <p className="text-gray-500">Lock trip dates first before generating reminders</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                      {sites.map((site) => (
                        <div key={site.id} className="flex items-start space-x-2">
                          <Checkbox
                            id={site.id}
                            checked={selectedSites.includes(site.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedSites([...selectedSites, site.id])
                              } else {
                                setSelectedSites(selectedSites.filter((id) => id !== site.id))
                              }
                            }}
                          />
                          <div className="flex-1">
                            <label htmlFor={site.id} className="text-sm font-medium cursor-pointer">
                              {site.name}
                            </label>
                            <p className="text-xs text-gray-500">
                              {site.permit_type} • {site.region}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={generateReminders}
                        disabled={selectedSites.length === 0 || actionLoading === 'generateReminders'}
                      >
                        {actionLoading === 'generateReminders'
                          ? 'Generating...'
                          : `Generate Reminders (${selectedSites.length} sites)`}
                      </Button>
                      {selectedSites.length > 0 && (
                        <Button variant="ghost" onClick={() => setSelectedSites([])}>
                          Clear Selection
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Reminders</CardTitle>
                <CardDescription>Permit reminders for Chuckfest {tripYear?.year}</CardDescription>
              </CardHeader>
              <CardContent>
                {reminders.length === 0 ? (
                  <p className="text-gray-500">No reminders generated yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead>Permits Open</TableHead>
                        <TableHead>Reminder Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders
                        .sort((a, b) => new Date(a.reminder_datetime).getTime() - new Date(b.reminder_datetime).getTime())
                        .map((reminder) => (
                          <TableRow key={reminder.id}>
                            <TableCell className="font-medium">{reminder.site?.name || 'Unknown'}</TableCell>
                            <TableCell>{formatDateTime(reminder.permit_open_datetime)}</TableCell>
                            <TableCell>{formatDateTime(reminder.reminder_datetime)}</TableCell>
                            <TableCell>
                              <Badge className={statusColors[reminder.status] || 'bg-gray-100'}>
                                {reminder.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendReminder(reminder.id)}
                                  disabled={actionLoading === `send-${reminder.id}`}
                                >
                                  {actionLoading === `send-${reminder.id}` ? '...' : 'Send Now'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateReminderStatus(reminder.id, 'booked')}
                                  disabled={actionLoading === `reminder-${reminder.id}`}
                                >
                                  Booked
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateReminderStatus(reminder.id, 'cancelled')}
                                  disabled={actionLoading === `reminder-${reminder.id}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Reminders Log */}
            <Card>
              <CardHeader>
                <CardTitle>Reminders Log</CardTitle>
                <CardDescription>Recent email activity</CardDescription>
              </CardHeader>
              <CardContent>
                {reminderLogs.length === 0 ? (
                  <p className="text-gray-500">No reminders sent yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Recipients</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminderLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDateTime(log.sent_at)}</TableCell>
                          <TableCell>{log.email_subject}</TableCell>
                          <TableCell>{log.recipient_count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 4: Members */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>Manage Chuckfest group members</CardDescription>
                </div>
                <Dialog open={newMemberDialogOpen} onOpenChange={setNewMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Add Member</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={newMember.name}
                          onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newMember.email}
                          onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          value={newMember.phone}
                          onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewMemberDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={addMember}
                        disabled={!newMember.name || !newMember.email || actionLoading === 'addMember'}
                      >
                        {actionLoading === 'addMember' ? 'Adding...' : 'Add Member'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.phone || '-'}</TableCell>
                        <TableCell>
                          <Switch
                            checked={member.is_active}
                            onCheckedChange={() => toggleMemberActive(member)}
                            disabled={actionLoading === `member-${member.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditMember(member)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Edit Member Dialog */}
            <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Member</DialogTitle>
                  <DialogDescription>
                    Update member information or remove them from the group.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editMemberForm.name}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editMemberForm.email}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editMemberForm.phone}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, phone: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-avatar">Avatar URL</Label>
                    <Input
                      id="edit-avatar"
                      value={editMemberForm.avatar_url}
                      onChange={(e) => setEditMemberForm({ ...editMemberForm, avatar_url: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-active">Active Member</Label>
                    <Switch
                      id="edit-active"
                      checked={editMemberForm.is_active}
                      onCheckedChange={(checked) => setEditMemberForm({ ...editMemberForm, is_active: checked })}
                    />
                  </div>
                </div>
                <DialogFooter className="flex justify-between sm:justify-between">
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                    disabled={actionLoading === 'deleteMember'}
                  >
                    Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditMemberDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={saveMember}
                      disabled={!editMemberForm.name || !editMemberForm.email || actionLoading === 'saveMember'}
                    >
                      {actionLoading === 'saveMember' ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Member?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete {editingMember?.name}? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={deleteMember}
                    disabled={actionLoading === 'deleteMember'}
                  >
                    {actionLoading === 'deleteMember' ? 'Deleting...' : 'Delete'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* SECTION 5: Site Images */}
          <TabsContent value="site-images" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Images</CardTitle>
                <CardDescription>
                  Manage photos for each site. Paste image URLs from Wikimedia Commons or other sources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sites
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((site) => {
                      const hasPhoto = site.photos && site.photos.length > 0 && !site.photos[0].includes('placehold')
                      const currentPhoto = hasPhoto ? site.photos![0] : null

                      return (
                        <div key={site.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                            {currentPhoto ? (
                              <img
                                src={currentPhoto}
                                alt={site.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${site.id}/80/80`
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Site info and input */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{site.name}</h4>
                              {hasPhoto && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Has photo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{site.region}</p>

                            <div className="flex gap-2">
                              <Input
                                placeholder="Paste image URL here..."
                                value={photoInputs[site.id] || ''}
                                onChange={(e) => setPhotoInputs(prev => ({ ...prev, [site.id]: e.target.value }))}
                                className="text-sm h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveSitePhoto(site.id)}
                                disabled={savingPhoto === site.id || !photoInputs[site.id]?.trim()}
                              >
                                {savingPhoto === site.id ? '...' : 'Save'}
                              </Button>
                              {hasPhoto && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => clearSitePhoto(site.id)}
                                  disabled={savingPhoto === site.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>

                            {currentPhoto && (
                              <p className="text-xs text-gray-400 mt-1 truncate" title={currentPhoto}>
                                Current: {currentPhoto}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Finding Images</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p><strong>Wikimedia Commons:</strong> Search for &quot;[lake name] california&quot; at commons.wikimedia.org</p>
                <p><strong>Getting the URL:</strong> Click on an image, then right-click the full-size image and copy the image URL</p>
                <p><strong>URL format:</strong> Should end in .jpg, .jpeg, or .png (e.g., https://upload.wikimedia.org/...)</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 6: Past Trips Cover Photos */}
          <TabsContent value="past-trips" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Past Trip Cover Photos</CardTitle>
                <CardDescription>
                  Set cover photos for past trips. These appear on the Past Trips archive page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pastTrips
                    .sort((a, b) => b.year - a.year)
                    .map((trip) => {
                      const hasPhoto = !!trip.cover_photo_url

                      return (
                        <div key={trip.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                            {hasPhoto ? (
                              <img
                                src={trip.cover_photo_url!}
                                alt={trip.location_name || `${trip.year}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs text-center">
                                No cover
                              </div>
                            )}
                          </div>

                          {/* Trip info and input */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{trip.year}</h4>
                              <span className="text-sm text-gray-600">{trip.location_name || 'Unknown location'}</span>
                              {hasPhoto && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Has cover
                                </Badge>
                              )}
                            </div>
                            {trip.album_url && (
                              <p className="text-xs text-blue-600 mb-2">
                                <a href={trip.album_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  View album
                                </a>
                              </p>
                            )}

                            <div className="flex gap-2">
                              <Input
                                placeholder="Paste cover photo URL here..."
                                value={coverPhotoInputs[trip.id] || ''}
                                onChange={(e) => setCoverPhotoInputs(prev => ({ ...prev, [trip.id]: e.target.value }))}
                                className="text-sm h-8"
                              />
                              <Button
                                size="sm"
                                onClick={() => saveCoverPhoto(trip.id)}
                                disabled={savingCoverPhoto === trip.id || !coverPhotoInputs[trip.id]?.trim()}
                              >
                                {savingCoverPhoto === trip.id ? '...' : 'Save'}
                              </Button>
                              {hasPhoto && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => clearCoverPhoto(trip.id)}
                                  disabled={savingCoverPhoto === trip.id}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Clear
                                </Button>
                              )}
                            </div>

                            {trip.cover_photo_url && (
                              <p className="text-xs text-gray-400 mt-1 truncate" title={trip.cover_photo_url}>
                                Current: {trip.cover_photo_url}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                  {pastTrips.length === 0 && (
                    <p className="text-gray-500 text-center py-8">No past trips found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tips for Cover Photos</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-600 space-y-2">
                <p><strong>From Google Photos:</strong> Open an album, click a photo, then click the Share button and &quot;Get link&quot; (or right-click to copy image URL)</p>
                <p><strong>Best size:</strong> Landscape orientation works best (will be cropped to 16:9)</p>
                <p><strong>Falls back:</strong> If no cover photo is set, the page will use the linked site&apos;s photo if available</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 7: Quick Actions */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Testing and admin utilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="outline"
                    onClick={sendTestEmail}
                    disabled={actionLoading === 'testEmail'}
                  >
                    {actionLoading === 'testEmail' ? 'Sending...' : 'Send Test Email'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={runReminderCheck}
                    disabled={actionLoading === 'reminderCheck'}
                  >
                    {actionLoading === 'reminderCheck' ? 'Running...' : 'Run Reminder Check'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                  >
                    Open Supabase Dashboard
                  </Button>
                </div>

                <Separator />

                <div className="text-sm text-gray-500">
                  <p><strong>Send Test Email:</strong> Sends a sample permit reminder to EMAIL_TEST_RECIPIENT</p>
                  <p><strong>Run Reminder Check:</strong> Manually runs the cron job logic to check and send due reminders</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
