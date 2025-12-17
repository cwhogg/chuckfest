import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

export interface PermitReminderEmailProps {
  siteName: string
  siteRegion?: string
  permitOpenDatetime: string // formatted string like "January 16, 2025 at 7:00 AM PT"
  tripDates: string // formatted string like "July 15-19, 2025"
  permitUrl?: string
  distanceMiles?: number
  elevationGainFt?: number
  peakElevationFt?: number
  permitNotes?: string
  permitCost?: number
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
}: PermitReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Permits for {siteName} open tomorrow at 7am PT!</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={logo}>ChuckfestAI</Text>
            <Text style={badge}>PERMIT ALERT</Text>
          </Section>

          {/* Hero */}
          <Section style={heroSection}>
            <Heading style={siteTitleStyle}>{siteName}</Heading>
            {siteRegion && <Text style={regionStyle}>{siteRegion}</Text>}

            <Section style={alertBox}>
              <Text style={alertEmoji}>&#9200;</Text>
              <Text style={alertTitle}>Permits Open TOMORROW!</Text>
              <Text style={alertDatetime}>{permitOpenDatetime}</Text>
            </Section>
          </Section>

          {/* Trip Details */}
          <Section style={detailsSection}>
            <Text style={sectionTitle}>Trip Details</Text>
            <Section style={detailsGrid}>
              <Section style={detailItem}>
                <Text style={detailLabel}>Booking For</Text>
                <Text style={detailValue}>{tripDates}</Text>
              </Section>
              {distanceMiles && (
                <Section style={detailItem}>
                  <Text style={detailLabel}>Distance</Text>
                  <Text style={detailValue}>{distanceMiles} miles</Text>
                </Section>
              )}
              {elevationGainFt && (
                <Section style={detailItem}>
                  <Text style={detailLabel}>Elevation Gain</Text>
                  <Text style={detailValue}>{elevationGainFt.toLocaleString()} ft</Text>
                </Section>
              )}
              {peakElevationFt && (
                <Section style={detailItem}>
                  <Text style={detailLabel}>Camp Elevation</Text>
                  <Text style={detailValue}>{peakElevationFt.toLocaleString()} ft</Text>
                </Section>
              )}
              {permitCost !== undefined && (
                <Section style={detailItem}>
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
                Go to Recreation.gov &rarr;
              </Button>
            </Section>
          )}

          {/* Calendar Reminder */}
          <Section style={calendarSection}>
            <Text style={calendarIcon}>&#128197;</Text>
            <Text style={calendarText}>
              We've attached a calendar reminder that will alert you 15 minutes before permits open.
              <strong> Add it to your calendar</strong> so you don't miss the window!
            </Text>
          </Section>

          {/* Instructions */}
          <Section style={instructionsSection}>
            <Text style={sectionTitle}>Game Plan</Text>
            <Section style={instructionsList}>
              <Text style={instructionItem}>
                <span style={checkmark}>&#10003;</span> Be online at <strong>6:55 AM PT</strong>
              </Text>
              <Text style={instructionItem}>
                <span style={checkmark}>&#10003;</span> Log into recreation.gov <strong>in advance</strong>
              </Text>
              <Text style={instructionItem}>
                <span style={checkmark}>&#10003;</span> Have payment info ready
              </Text>
              <Text style={instructionItem}>
                <span style={checkmark}>&#10003;</span> Know your group size and entry date
              </Text>
            </Section>

            {permitNotes && (
              <Section style={notesBox}>
                <Text style={notesTitle}>Important Notes</Text>
                <Text style={notesText}>{permitNotes}</Text>
              </Section>
            )}
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Sent by <strong>ChuckfestAI</strong>
            </Text>
            <Text style={footerLuck}>Good luck!</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f4f1eb',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
}

const header = {
  backgroundColor: '#2d5016',
  padding: '24px 32px',
  textAlign: 'center' as const,
}

const logo = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '700' as const,
  margin: '0 0 8px 0',
  letterSpacing: '-0.5px',
}

const badge = {
  display: 'inline-block',
  backgroundColor: '#fbbf24',
  color: '#78350f',
  fontSize: '11px',
  fontWeight: '700' as const,
  padding: '4px 12px',
  borderRadius: '12px',
  letterSpacing: '1px',
  margin: '0',
}

const heroSection = {
  padding: '32px 32px 24px',
  textAlign: 'center' as const,
}

const siteTitleStyle = {
  color: '#1a1a1a',
  fontSize: '32px',
  fontWeight: '700' as const,
  margin: '0 0 4px 0',
  lineHeight: '1.2',
}

const regionStyle = {
  color: '#666666',
  fontSize: '16px',
  margin: '0 0 24px 0',
}

const alertBox = {
  backgroundColor: '#fef3c7',
  border: '2px solid #f59e0b',
  borderRadius: '12px',
  padding: '24px',
  margin: '0',
}

const alertEmoji = {
  fontSize: '32px',
  margin: '0 0 8px 0',
}

const alertTitle = {
  color: '#92400e',
  fontSize: '24px',
  fontWeight: '700' as const,
  margin: '0 0 8px 0',
}

const alertDatetime = {
  color: '#b45309',
  fontSize: '18px',
  fontWeight: '600' as const,
  margin: '0',
}

const detailsSection = {
  padding: '24px 32px',
  backgroundColor: '#f9fafb',
}

const sectionTitle = {
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 16px 0',
}

const detailsGrid = {
  margin: '0',
}

const detailItem = {
  display: 'inline-block',
  width: '50%',
  verticalAlign: 'top' as const,
  padding: '0 0 12px 0',
}

const detailLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0 0 2px 0',
}

const detailValue = {
  color: '#1f2937',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0',
}

const ctaSection = {
  padding: '8px 32px 24px',
  textAlign: 'center' as const,
}

const calendarSection = {
  padding: '16px 32px 24px',
  textAlign: 'center' as const,
  backgroundColor: '#ecfdf5',
  borderTop: '1px solid #d1fae5',
  borderBottom: '1px solid #d1fae5',
}

const calendarIcon = {
  fontSize: '28px',
  margin: '0 0 8px 0',
}

const calendarText = {
  color: '#065f46',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const ctaButton = {
  backgroundColor: '#2d5016',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  padding: '14px 32px',
  borderRadius: '8px',
  textDecoration: 'none',
  display: 'inline-block',
}

const instructionsSection = {
  padding: '24px 32px',
  backgroundColor: '#ffffff',
}

const instructionsList = {
  margin: '0 0 20px 0',
}

const instructionItem = {
  color: '#374151',
  fontSize: '15px',
  margin: '0 0 10px 0',
  lineHeight: '1.5',
}

const checkmark = {
  color: '#059669',
  fontWeight: '700' as const,
  marginRight: '8px',
}

const notesBox = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '8px',
  padding: '16px',
}

const notesTitle = {
  color: '#991b1b',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0 0 8px 0',
}

const notesText = {
  color: '#7f1d1d',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '0',
}

const footer = {
  padding: '24px 32px',
  textAlign: 'center' as const,
  backgroundColor: '#f9fafb',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px 0',
}

const footerLuck = {
  color: '#374151',
  fontSize: '18px',
  margin: '0',
}
