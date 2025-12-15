'use client'

import { useEffect, useState, useCallback } from 'react'
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
}

interface ReminderLog {
  id: string
  reminder_type: string
  reference_id: string
  recipient_count: number
  email_subject: string
  sent_at: string
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  dates_open: 'bg-yellow-100 text-yellow-800',
  dates_locked: 'bg-green-100 text-green-800',
  trip_complete: 'bg-gray-100 text-gray-800',
  completed: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  reminder_sent: 'bg-blue-100 text-blue-800',
  booked: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
}

export default function AdminPage() {
  const [tripYear, setTripYear] = useState<TripYear | null>(null)
  const [dateOptions, setDateOptions] = useState<DateOption[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [reminders, setReminders] = useState<PermitReminder[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([])
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">ChuckfestAI Admin</h1>
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
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="trip-year">Trip Year</TabsTrigger>
            <TabsTrigger value="dates">Dates</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
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
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Final Trip Dates</p>
                        <p className="text-xl font-bold text-green-800">
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
                    <Alert className="border-yellow-500 bg-yellow-50">
                      <AlertDescription className="text-yellow-800">
                        Dates are already locked. Be careful if changing.
                      </AlertDescription>
                    </Alert>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-600 font-medium">Current Dates</p>
                      <p className="text-xl font-bold text-green-800">
                        {formatDate(tripYear.final_start_date)} - {formatDate(tripYear.final_end_date!)}
                      </p>
                    </div>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SECTION 5: Quick Actions */}
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
