import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  date,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core'

const id = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID())
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

// ---------------------------------------------------------------------------
// Members and auth (Better Auth uses `members` as its user model)
// ---------------------------------------------------------------------------

export const members = pgTable('members', {
  id: id(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(true),
  image: text('image'),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  phone: text('phone'),
  isActive: boolean('is_active').notNull().default(true),
  personalLinkToken: text('personal_link_token').unique(),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactEmail: text('emergency_contact_email'),
  notifyEmail: boolean('notify_email').notNull().default(true),
  notifySms: boolean('notify_sms').notNull().default(true),
  diet: text('diet'),
  legacyId: text('legacy_id').unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

export const accounts = pgTable('accounts', {
  id: id(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const verifications = pgTable('verifications', {
  id: id(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

// ---------------------------------------------------------------------------
// Sites and hike ideas
// ---------------------------------------------------------------------------

export type SiteSource = { label: string; url: string }

export const sites = pgTable('sites', {
  id: id(),
  name: text('name').notNull(),
  region: text('region'),
  area: text('area'), // park, forest or wilderness, e.g. "Inyo National Forest"
  description: text('description'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  difficulty: text('difficulty'),
  distanceMiles: doublePrecision('distance_miles'),
  elevationGainFt: integer('elevation_gain_ft'),
  campElevationFt: integer('camp_elevation_ft'),
  peakElevationFt: integer('peak_elevation_ft'),
  photos: text('photos').array().notNull().default([]),
  trailInfoUrl: text('trail_info_url'),
  // Permit rules
  permitType: text('permit_type', { enum: ['rolling', 'fixed_date', 'lottery'] }),
  permitAdvanceDays: integer('permit_advance_days'),
  permitOpenTime: text('permit_open_time').notNull().default('07:00'),
  permitFixedOpenDate: text('permit_fixed_open_date'), // "MM-DD"
  permitLotteryOpen: text('permit_lottery_open'), // "MM-DD"
  permitLotteryClose: text('permit_lottery_close'),
  permitLotteryResults: text('permit_lottery_results'),
  permitCost: doublePrecision('permit_cost'),
  permitUrl: text('permit_url'),
  permitEntryPoint: text('permit_entry_point'),
  permitGroupSizeLimit: integer('permit_group_size_limit'),
  permitNotes: text('permit_notes'),
  // Scores (100-point system: scenery 35, experience 25, access 20, permit 20)
  sceneryScore: integer('scenery_score'),
  experienceScore: integer('experience_score'),
  accessScore: integer('access_score'),
  permitScore: integer('permit_score'),
  totalScore: integer('total_score'),
  rankingNotes: text('ranking_notes'),
  sources: jsonb('sources').$type<SiteSource[]>().notNull().default([]),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  legacyId: text('legacy_id').unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const hikeIdeas = pgTable('hike_ideas', {
  id: id(),
  memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  link: text('link'),
  notes: text('notes'),
  status: text('status', { enum: ['new', 'approved', 'declined'] }).notNull().default('new'),
  draft: jsonb('draft').$type<Record<string, unknown>>(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'set null' }),
  reviewedById: text('reviewed_by_id').references(() => members.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: createdAt(),
})

// ---------------------------------------------------------------------------
// Trip years and planning
// ---------------------------------------------------------------------------

export const TRIP_STAGES = ['kickoff', 'dates', 'site', 'permits', 'group', 'trip', 'archive'] as const
export type TripStage = (typeof TRIP_STAGES)[number]

export type TripLogistics = {
  trailhead?: string
  parking?: string
  shuttle?: string
  nightBefore?: string
  permitPickup?: string
  meetTime?: string
  notes?: string
}

export const tripYears = pgTable('trip_years', {
  id: id(),
  year: integer('year').notNull().unique(),
  stage: text('stage', { enum: TRIP_STAGES }).notNull().default('kickoff'),
  datePollDeadline: date('date_poll_deadline'),
  sitePollDeadline: date('site_poll_deadline'),
  attendanceDeadline: date('attendance_deadline'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'set null' }),
  maxSiteVotes: integer('max_site_votes').notNull().default(5),
  logistics: jsonb('logistics').$type<TripLogistics>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const tripBackupSites = pgTable(
  'trip_backup_sites',
  {
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    rank: integer('rank').notNull(),
  },
  (t) => [primaryKey({ columns: [t.tripYearId, t.siteId] })],
)

export const blackoutDates = pgTable('blackout_dates', {
  id: id(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  note: text('note'),
  createdAt: createdAt(),
})

export const dateOptions = pgTable(
  'date_options',
  {
    id: id(),
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
  },
  (t) => [uniqueIndex('date_options_trip_start_idx').on(t.tripYearId, t.startDate)],
)

export const DATE_RESPONSES = ['yes', 'maybe', 'no'] as const
export type DateResponse = (typeof DATE_RESPONSES)[number]

export const dateResponses = pgTable(
  'date_responses',
  {
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    dateOptionId: text('date_option_id')
      .notNull()
      .references(() => dateOptions.id, { onDelete: 'cascade' }),
    status: text('status', { enum: DATE_RESPONSES }).notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.dateOptionId] })],
)

export const siteVotes = pgTable(
  'site_votes',
  {
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tripYearId, t.memberId, t.siteId] })],
)

export const comments = pgTable(
  'comments',
  {
    id: id(),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }),
    tripYearId: text('trip_year_id').references(() => tripYears.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('comments_site_idx').on(t.siteId), index('comments_trip_idx').on(t.tripYearId)],
)

export const ATTENDANCE = ['in', 'maybe', 'out'] as const
export type Attendance = (typeof ATTENDANCE)[number]

export const attendance = pgTable(
  'attendance',
  {
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ATTENDANCE }).notNull(),
    notes: text('notes'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.tripYearId, t.memberId] })],
)

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------

export const permitWindows = pgTable(
  'permit_windows',
  {
    id: id(),
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    targetStartDate: date('target_start_date').notNull(),
    opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('permit_windows_unique_idx').on(t.tripYearId, t.siteId, t.targetStartDate)],
)

export const PERMIT_OUTCOMES = ['pending', 'got_it', 'sold_out', 'failed'] as const
export type PermitOutcome = (typeof PERMIT_OUTCOMES)[number]

export const permitAttempts = pgTable('permit_attempts', {
  id: id(),
  windowId: text('window_id')
    .notNull()
    .references(() => permitWindows.id, { onDelete: 'cascade' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
  priority: integer('priority').notNull(),
  outcome: text('outcome', { enum: PERMIT_OUTCOMES }).notNull().default('pending'),
  confirmationNumber: text('confirmation_number'),
  notes: text('notes'),
  updatedAt: updatedAt(),
})

export const permitVolunteers = pgTable(
  'permit_volunteers',
  {
    tripYearId: text('trip_year_id')
      .notNull()
      .references(() => tripYears.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.tripYearId, t.memberId] })],
)

export const lotteryEntries = pgTable('lottery_entries', {
  id: id(),
  tripYearId: text('trip_year_id')
    .notNull()
    .references(() => tripYears.id, { onDelete: 'cascade' }),
  lotteryName: text('lottery_name').notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'set null' }),
  memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
  datesRequested: text('dates_requested'),
  closesOn: date('closes_on'),
  resultsOn: date('results_on'),
  result: text('result', { enum: ['not_entered', 'entered', 'won', 'lost'] })
    .notNull()
    .default('entered'),
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

// ---------------------------------------------------------------------------
// Group logistics
// ---------------------------------------------------------------------------

export const gearItems = pgTable('gear_items', {
  id: id(),
  tripYearId: text('trip_year_id')
    .notNull()
    .references(() => tripYears.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantityNeeded: integer('quantity_needed').notNull().default(1),
  notes: text('notes'),
  createdAt: createdAt(),
})

export const gearClaims = pgTable(
  'gear_claims',
  {
    gearItemId: text('gear_item_id')
      .notNull()
      .references(() => gearItems.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.gearItemId, t.memberId] })],
)

export const rides = pgTable('rides', {
  id: id(),
  tripYearId: text('trip_year_id')
    .notNull()
    .references(() => tripYears.id, { onDelete: 'cascade' }),
  driverId: text('driver_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  seats: integer('seats').notNull(),
  departureCity: text('departure_city'),
  departureTime: text('departure_time'),
  notes: text('notes'),
  createdAt: createdAt(),
})

export const rideRiders = pgTable(
  'ride_riders',
  {
    rideId: text('ride_id')
      .notNull()
      .references(() => rides.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.rideId, t.memberId] })],
)

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

export const pastTrips = pgTable('past_trips', {
  id: id(),
  year: integer('year').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'set null' }),
  locationName: text('location_name'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  hikeMiles: doublePrecision('hike_miles'),
  elevationGainFt: integer('elevation_gain_ft'),
  campElevationFt: integer('camp_elevation_ft'),
  albumUrl: text('album_url'),
  coverPhotoUrl: text('cover_photo_url'),
  notes: text('notes'),
  legacyId: text('legacy_id').unique(),
  createdAt: createdAt(),
})

export const pastTripAttendees = pgTable(
  'past_trip_attendees',
  {
    pastTripId: text('past_trip_id')
      .notNull()
      .references(() => pastTrips.id, { onDelete: 'cascade' }),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.pastTripId, t.memberId] })],
)

// ---------------------------------------------------------------------------
// Notifications, settings, audit
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    kind: text('kind').notNull(),
    dedupeKey: text('dedupe_key').notNull(),
    memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
    recipient: text('recipient').notNull(),
    channel: text('channel', { enum: ['email', 'sms'] }).notNull(),
    subject: text('subject'),
    status: text('status', { enum: ['sent', 'skipped', 'failed'] }).notNull(),
    error: text('error'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('notifications_dedupe_idx').on(t.dedupeKey, t.channel)],
)

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
})

/** Small private images (e.g. photos of the crew), kept out of the public repo; served only to members. */
export const media = pgTable('media', {
  name: text('name').primaryKey(),
  contentType: text('content_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  updatedAt: updatedAt(),
})

export const auditLog = pgTable('audit_log', {
  id: id(),
  memberId: text('member_id').references(() => members.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
})
