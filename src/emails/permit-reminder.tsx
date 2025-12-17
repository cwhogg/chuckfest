import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export interface PermitReminderEmailProps {
  siteName: string
  siteRegion?: string
  permitOpenDatetime: string
  tripDates: string
  permitUrl?: string
  distanceMiles?: number
  elevationGainFt?: number
  peakElevationFt?: number
  permitNotes?: string
  permitCost?: number
  daysUntilOpen?: number // 1 = tomorrow, 3 = in 3 days
}

export default function PermitReminderEmail({
  siteName = 'East Lake',
  siteRegion = 'Hoover Wilderness',
  permitOpenDatetime = 'January 23, 2025 at 7:00 AM PT',
  tripDates = 'July 23-27, 2025',
  permitUrl = 'https://www.recreation.gov/permits/445856',
  distanceMiles = 4.4,
  elevationGainFt = 1576,
  peakElevationFt = 9476,
  permitNotes = 'Bear canister REQUIRED. Max group size 15.',
  permitCost = 8,
  daysUntilOpen = 1,
}: PermitReminderEmailProps) {
  // Generate dynamic text based on days until open
  const urgencyText = daysUntilOpen === 1
    ? "That's TOMORROW!"
    : `That's in ${daysUntilOpen} days!`
  const previewText = daysUntilOpen === 1
    ? `Permits for ${siteName} open tomorrow!`
    : `Permits for ${siteName} open in ${daysUntilOpen} days!`
  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with retro camping feel */}
          <Section style={header}>
            <Text style={headerPines}>. * . * .</Text>
            <Text style={logo}>Chuckfest</Text>
            <Text style={tagline}>Annual Backpacking Trip</Text>
          </Section>

          {/* Alert Banner */}
          <Section style={alertBanner}>
            <Text style={alertLabel}>PERMIT ALERT</Text>
          </Section>

          {/* Main Content */}
          <Section style={heroSection}>
            <Heading style={siteTitleStyle}>{siteName}</Heading>
            {siteRegion && <Text style={regionStyle}>{siteRegion}</Text>}

            {/* Permit Open Time Card */}
            <Section style={permitCard}>
              <Text style={permitCardLabel}>Permits Open</Text>
              <Text style={permitCardTime}>{permitOpenDatetime}</Text>
              <Text style={permitCardUrgent}>{urgencyText}</Text>
            </Section>
          </Section>

          {/* Divider */}
          <Section style={dividerSection}>
            <Text style={dividerText}>~ ~ ~</Text>
          </Section>

          {/* Trip Details */}
          <Section style={detailsSection}>
            <Text style={sectionTitle}>Trip Details</Text>
            <Section style={detailsCard}>
              <Section style={detailRow}>
                <Text style={detailLabel}>Booking For</Text>
                <Text style={detailValue}>{tripDates}</Text>
              </Section>
              {distanceMiles && (
                <Section style={detailRow}>
                  <Text style={detailLabel}>Distance</Text>
                  <Text style={detailValue}>{distanceMiles} miles one-way</Text>
                </Section>
              )}
              {elevationGainFt && (
                <Section style={detailRow}>
                  <Text style={detailLabel}>Elevation Gain</Text>
                  <Text style={detailValue}>{elevationGainFt.toLocaleString()} ft</Text>
                </Section>
              )}
              {peakElevationFt && (
                <Section style={detailRow}>
                  <Text style={detailLabel}>Camp Elevation</Text>
                  <Text style={detailValue}>{peakElevationFt.toLocaleString()} ft</Text>
                </Section>
              )}
              {permitCost !== undefined && (
                <Section style={detailRow}>
                  <Text style={detailLabel}>Permit Cost</Text>
                  <Text style={detailValue}>${permitCost}/person</Text>
                </Section>
              )}
            </Section>
          </Section>

          {/* CTA Button */}
          {permitUrl && (
            <Section style={ctaSection}>
              <Button style={ctaButton} href={permitUrl}>
                Book on Recreation.gov
              </Button>
            </Section>
          )}

          {/* Calendar Reminder */}
          <Section style={calendarSection}>
            <Text style={calendarTitle}>Calendar Reminder Attached</Text>
            <Text style={calendarText}>
              We've attached a .ics file that will alert you 15 minutes before permits open.
              Add it to your calendar so you don't miss the window!
            </Text>
          </Section>

          {/* Game Plan */}
          <Section style={gamePlanSection}>
            <Text style={sectionTitle}>Game Plan</Text>
            <Section style={checklistCard}>
              <Text style={checklistItem}>
                <span style={checkbox}>[ ]</span> Be online at <strong>6:55 AM PT</strong>
              </Text>
              <Text style={checklistItem}>
                <span style={checkbox}>[ ]</span> Log into recreation.gov <strong>in advance</strong>
              </Text>
              <Text style={checklistItem}>
                <span style={checkbox}>[ ]</span> Have payment info ready
              </Text>
              <Text style={checklistItem}>
                <span style={checkbox}>[ ]</span> Know your group size and entry date
              </Text>
            </Section>

            {permitNotes && (
              <Section style={notesBox}>
                <Text style={notesTitle}>Important Notes</Text>
                <Text style={notesText}>{permitNotes}</Text>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Hr style={footerHr} />
            <Text style={footerPines}>. * . * . * . * .</Text>
            <Text style={footerText}>Good luck out there!</Text>
            <Text style={footerBrand}>Sent with love by Chuckfest</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ===================
// RETRO CAMPING STYLES
// ===================

// Color Palette (matches app)
const colors = {
  cream: '#faf6f0',
  warmWhite: '#fffdf9',
  lightTan: '#e8dcc8',
  tan: '#c9b896',
  brown: '#5c4033',
  darkBrown: '#3d352e',
  mutedText: '#7a7067',
  forestGreen: '#2d5016',
  lightGreen: '#e8f0e6',
  amber: '#c9a227',
  lightAmber: '#f5e6c8',
}

const main = {
  backgroundColor: colors.cream,
  fontFamily: 'Georgia, "Times New Roman", serif',
}

const container = {
  backgroundColor: colors.warmWhite,
  margin: '0 auto',
  padding: '0',
  maxWidth: '560px',
  border: `2px solid ${colors.tan}`,
  borderRadius: '4px',
}

const header = {
  backgroundColor: colors.forestGreen,
  padding: '28px 32px 24px',
  textAlign: 'center' as const,
}

const headerPines = {
  color: colors.lightGreen,
  fontSize: '16px',
  letterSpacing: '8px',
  margin: '0 0 8px 0',
  opacity: '0.7',
}

const logo = {
  color: colors.warmWhite,
  fontSize: '36px',
  fontWeight: '400' as const,
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: '0',
  letterSpacing: '2px',
}

const tagline = {
  color: colors.lightGreen,
  fontSize: '12px',
  fontWeight: '400' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '3px',
  margin: '4px 0 0 0',
  opacity: '0.9',
}

const alertBanner = {
  backgroundColor: colors.amber,
  padding: '10px 32px',
  textAlign: 'center' as const,
}

const alertLabel = {
  color: colors.darkBrown,
  fontSize: '13px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '0',
}

const heroSection = {
  padding: '32px 32px 24px',
  textAlign: 'center' as const,
  backgroundColor: colors.warmWhite,
}

const siteTitleStyle = {
  color: colors.darkBrown,
  fontSize: '32px',
  fontWeight: '400' as const,
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: '0 0 4px 0',
  lineHeight: '1.2',
}

const regionStyle = {
  color: colors.mutedText,
  fontSize: '15px',
  fontStyle: 'italic' as const,
  margin: '0 0 24px 0',
}

const permitCard = {
  backgroundColor: colors.lightAmber,
  border: `2px solid ${colors.amber}`,
  borderRadius: '4px',
  padding: '20px 24px',
  margin: '0',
}

const permitCardLabel = {
  color: colors.brown,
  fontSize: '11px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '0 0 8px 0',
}

const permitCardTime = {
  color: colors.darkBrown,
  fontSize: '20px',
  fontWeight: '400' as const,
  fontFamily: 'Georgia, "Times New Roman", serif',
  margin: '0 0 8px 0',
}

const permitCardUrgent = {
  color: colors.brown,
  fontSize: '16px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
}

const dividerSection = {
  padding: '0',
  textAlign: 'center' as const,
}

const dividerText = {
  color: colors.tan,
  fontSize: '20px',
  letterSpacing: '8px',
  margin: '0',
}

const detailsSection = {
  padding: '24px 32px',
  backgroundColor: colors.cream,
}

const sectionTitle = {
  color: colors.brown,
  fontSize: '11px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textTransform: 'uppercase' as const,
  letterSpacing: '2px',
  margin: '0 0 16px 0',
}

const detailsCard = {
  backgroundColor: colors.warmWhite,
  border: `1px solid ${colors.lightTan}`,
  borderRadius: '4px',
  padding: '16px 20px',
}

const detailRow = {
  padding: '8px 0',
  borderBottom: `1px solid ${colors.lightTan}`,
}

const detailLabel = {
  color: colors.mutedText,
  fontSize: '12px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0 0 2px 0',
}

const detailValue = {
  color: colors.darkBrown,
  fontSize: '16px',
  fontWeight: '400' as const,
  margin: '0',
}

const ctaSection = {
  padding: '8px 32px 28px',
  textAlign: 'center' as const,
  backgroundColor: colors.cream,
}

const ctaButton = {
  backgroundColor: colors.forestGreen,
  color: colors.warmWhite,
  fontSize: '15px',
  fontWeight: '600' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  padding: '14px 28px',
  borderRadius: '4px',
  textDecoration: 'none',
  display: 'inline-block',
  border: `2px solid ${colors.forestGreen}`,
}

const calendarSection = {
  padding: '20px 32px',
  textAlign: 'center' as const,
  backgroundColor: colors.lightGreen,
  borderTop: `1px solid ${colors.tan}`,
  borderBottom: `1px solid ${colors.tan}`,
}

const calendarTitle = {
  color: colors.forestGreen,
  fontSize: '14px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0 0 8px 0',
}

const calendarText = {
  color: colors.darkBrown,
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const gamePlanSection = {
  padding: '24px 32px',
  backgroundColor: colors.warmWhite,
}

const checklistCard = {
  backgroundColor: colors.cream,
  border: `1px solid ${colors.lightTan}`,
  borderRadius: '4px',
  padding: '16px 20px',
  marginBottom: '16px',
}

const checklistItem = {
  color: colors.darkBrown,
  fontSize: '15px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0 0 12px 0',
  lineHeight: '1.4',
}

const checkbox = {
  color: colors.tan,
  fontFamily: 'monospace',
  marginRight: '10px',
}

const notesBox = {
  backgroundColor: colors.lightAmber,
  border: `1px solid ${colors.amber}`,
  borderRadius: '4px',
  padding: '16px',
}

const notesTitle = {
  color: colors.brown,
  fontSize: '12px',
  fontWeight: '700' as const,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  margin: '0 0 8px 0',
}

const notesText = {
  color: colors.darkBrown,
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
  backgroundColor: colors.cream,
}

const footerHr = {
  borderColor: colors.lightTan,
  margin: '0 0 20px 0',
}

const footerPines = {
  color: colors.tan,
  fontSize: '14px',
  letterSpacing: '6px',
  margin: '0 0 12px 0',
}

const footerText = {
  color: colors.brown,
  fontSize: '18px',
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontStyle: 'italic' as const,
  margin: '0 0 8px 0',
}

const footerBrand = {
  color: colors.mutedText,
  fontSize: '12px',
  margin: '0',
}
