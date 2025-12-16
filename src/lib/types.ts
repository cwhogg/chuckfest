// ChuckfestAI Database Types

export type Database = {
  public: {
    Tables: {
      members: {
        Row: Member
        Insert: MemberInsert
        Update: MemberUpdate
      }
      sites: {
        Row: Site
        Insert: SiteInsert
        Update: SiteUpdate
      }
      votes: {
        Row: Vote
        Insert: VoteInsert
        Update: VoteUpdate
      }
      comments: {
        Row: Comment
        Insert: CommentInsert
        Update: CommentUpdate
      }
      trip_years: {
        Row: TripYear
        Insert: TripYearInsert
        Update: TripYearUpdate
      }
      date_options: {
        Row: DateOption
        Insert: DateOptionInsert
        Update: DateOptionUpdate
      }
      date_availability: {
        Row: DateAvailability
        Insert: DateAvailabilityInsert
        Update: DateAvailabilityUpdate
      }
      past_trips: {
        Row: PastTrip
        Insert: PastTripInsert
        Update: PastTripUpdate
      }
      past_trip_attendees: {
        Row: PastTripAttendee
        Insert: PastTripAttendeeInsert
        Update: PastTripAttendeeUpdate
      }
      permit_reminders: {
        Row: PermitReminder
        Insert: PermitReminderInsert
        Update: PermitReminderUpdate
      }
      reminders_log: {
        Row: ReminderLog
        Insert: ReminderLogInsert
        Update: ReminderLogUpdate
      }
    }
  }
}

// ============================================
// MEMBERS
// ============================================
export type Member = {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export type MemberInsert = {
  id?: string
  name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  is_active?: boolean
  created_at?: string
}

export type MemberUpdate = Partial<MemberInsert>

// ============================================
// SITES
// ============================================
export type SiteDifficulty = 'easy' | 'moderate' | 'strenuous'
export type SiteStatus = 'active' | 'archived'
export type PermitType = 'rolling' | 'fixed_date' | 'lottery'

export type Site = {
  id: string
  name: string
  region: string | null
  description: string | null
  latitude: number | null
  longitude: number | null
  permit_url: string | null
  difficulty: SiteDifficulty | null
  distance_miles: number | null
  elevation_gain_ft: number | null
  peak_elevation_ft: number | null
  photos: string[] | null
  status: SiteStatus
  created_at: string
  // Permit rule fields
  permit_type: PermitType | null
  permit_advance_days: number | null
  permit_open_time: string
  permit_fixed_open_date: string | null
  permit_lottery_open: string | null
  permit_lottery_close: string | null
  permit_lottery_results: string | null
  permit_cost: number | null
  permit_notes: string | null
}

export type SiteInsert = {
  id?: string
  name: string
  region?: string | null
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  permit_url?: string | null
  difficulty?: SiteDifficulty | null
  distance_miles?: number | null
  elevation_gain_ft?: number | null
  peak_elevation_ft?: number | null
  photos?: string[] | null
  status?: SiteStatus
  created_at?: string
  permit_type?: PermitType | null
  permit_advance_days?: number | null
  permit_open_time?: string
  permit_fixed_open_date?: string | null
  permit_lottery_open?: string | null
  permit_lottery_close?: string | null
  permit_lottery_results?: string | null
  permit_cost?: number | null
  permit_notes?: string | null
}

export type SiteUpdate = Partial<SiteInsert>

// ============================================
// VOTES
// ============================================
export type Vote = {
  id: string
  member_id: string
  site_id: string
  created_at: string
}

export type VoteInsert = {
  id?: string
  member_id: string
  site_id: string
  created_at?: string
}

export type VoteUpdate = Partial<VoteInsert>

// ============================================
// COMMENTS
// ============================================
export type Comment = {
  id: string
  member_id: string
  site_id: string
  text: string
  created_at: string
}

export type CommentInsert = {
  id?: string
  member_id: string
  site_id: string
  text: string
  created_at?: string
}

export type CommentUpdate = Partial<CommentInsert>

// ============================================
// TRIP_YEARS
// ============================================
export type TripYearStatus = 'planning' | 'dates_open' | 'dates_locked' | 'site_locked' | 'complete'

export type TripYear = {
  id: string
  year: number
  status: TripYearStatus
  date_voting_opens: string | null
  date_voting_deadline: string | null
  final_start_date: string | null
  final_end_date: string | null
  final_site_id: string | null
  created_at: string
}

export type TripYearInsert = {
  id?: string
  year: number
  status?: TripYearStatus
  date_voting_opens?: string | null
  date_voting_deadline?: string | null
  final_start_date?: string | null
  final_end_date?: string | null
  final_site_id?: string | null
  created_at?: string
}

export type TripYearUpdate = Partial<TripYearInsert>

// ============================================
// DATE_OPTIONS
// ============================================
export type DateOption = {
  id: string
  trip_year_id: string
  start_date: string
  end_date: string
  label: string | null
}

export type DateOptionInsert = {
  id?: string
  trip_year_id: string
  start_date: string
  end_date: string
  label?: string | null
}

export type DateOptionUpdate = Partial<DateOptionInsert>

// ============================================
// DATE_AVAILABILITY
// ============================================
export type AvailabilityStatus = 'available' | 'unavailable' | 'maybe'

export type DateAvailability = {
  id: string
  member_id: string
  date_option_id: string
  status: AvailabilityStatus
  updated_at: string
}

export type DateAvailabilityInsert = {
  id?: string
  member_id: string
  date_option_id: string
  status: AvailabilityStatus
  updated_at?: string
}

export type DateAvailabilityUpdate = Partial<DateAvailabilityInsert>

// ============================================
// PAST_TRIPS
// ============================================
export type PastTrip = {
  id: string
  year: number
  start_date: string | null
  end_date: string | null
  site_id: string | null
  location_name: string | null
  hike_miles: number | null
  elevation_gain_ft: number | null
  campsite_elevation_ft: number | null
  album_url: string | null
  cover_photo_url: string | null
  notes: string | null
  created_at: string
}

export type PastTripInsert = {
  id?: string
  year: number
  start_date?: string | null
  end_date?: string | null
  site_id?: string | null
  location_name?: string | null
  hike_miles?: number | null
  elevation_gain_ft?: number | null
  campsite_elevation_ft?: number | null
  album_url?: string | null
  cover_photo_url?: string | null
  notes?: string | null
  created_at?: string
}

export type PastTripUpdate = Partial<PastTripInsert>

// ============================================
// PAST_TRIP_ATTENDEES
// ============================================
export type PastTripAttendee = {
  id: string
  past_trip_id: string
  member_id: string
}

export type PastTripAttendeeInsert = {
  id?: string
  past_trip_id: string
  member_id: string
}

export type PastTripAttendeeUpdate = Partial<PastTripAttendeeInsert>

// ============================================
// PERMIT_REMINDERS
// ============================================
export type PermitReminderStatus = 'pending' | 'reminder_sent' | 'booked' | 'missed' | 'cancelled'

export type PermitReminder = {
  id: string
  trip_year_id: string
  site_id: string
  target_trip_date: string
  permit_open_datetime: string
  reminder_datetime: string
  status: PermitReminderStatus
  created_at: string
}

export type PermitReminderInsert = {
  id?: string
  trip_year_id: string
  site_id: string
  target_trip_date: string
  permit_open_datetime: string
  reminder_datetime: string
  status?: PermitReminderStatus
  created_at?: string
}

export type PermitReminderUpdate = Partial<PermitReminderInsert>

// ============================================
// REMINDERS_LOG
// ============================================
export type ReminderType = 'permit_opening' | 'date_voting'

export type ReminderLog = {
  id: string
  reminder_type: ReminderType
  reference_id: string | null
  sent_at: string
  recipient_count: number | null
  email_subject: string | null
}

export type ReminderLogInsert = {
  id?: string
  reminder_type: ReminderType
  reference_id?: string | null
  sent_at?: string
  recipient_count?: number | null
  email_subject?: string | null
}

export type ReminderLogUpdate = Partial<ReminderLogInsert>

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================
export type VoteWithDetails = Vote & {
  member: Member
  site: Site
}

export type CommentWithMember = Comment & {
  member: Member
}

export type DateOptionWithAvailability = DateOption & {
  date_availability: (DateAvailability & { member: Member })[]
}

export type PastTripWithDetails = PastTrip & {
  site: Site | null
  past_trip_attendees: (PastTripAttendee & { member: Member })[]
}

export type TripYearWithDetails = TripYear & {
  final_site: Site | null
  date_options: DateOption[]
}

export type SiteWithVotes = Site & {
  votes: Vote[]
  comments: Comment[]
}
