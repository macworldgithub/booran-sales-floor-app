# Booran Sales Floor Mobile App

React Native / Expo mobile application for the Booran Motors Sales Floor OS, replicating the existing sales floor web platform's UI, design system, executive CRM, live inventory, showroom appointments, and group management.

---

## Features & UI Replication

1. **Brand Design & Visual Identity**
   - Official Booran Motors red (`#e60012`), executive graphite (`#171b22`), and canvas light (`#f4f5f7`) color system.
   - Dynamic mobile safe areas, clean card elevations, and custom badge typography.
   - Lucide mobile iconography and official Booran Motors high-resolution artwork.

2. **Floor Operations**
   - **Today Command Center**: Real-time synchronization metrics across `flwup_crm` and `booran_inventory_tracker`, KPI cards, urgent follow-up leads, and high-priority holding cost vehicles.
   - **Leads Centre (CRM)**: Server-paginated prospects list, search, status filters (New Lead, Following Up, Sold, Lost), customer contact SLA times, direct Call/Email actions, and test drive booking.
   - **Live Inventory**: Stock units with photos, advertised price, vehicle cost, potential gross, daily holding cost rate, accumulated holding cost, days in stock badges (with 90+ days warnings), and soft hold indicators.
   - **Showroom Floor (Calendar)**: Day-by-day appointment timeline (Test Drives, Showroom Visits, Delivery Handovers, Callbacks) with quick booking modal.

3. **Group Management & Telemetry**
   - **Capital Radar**: Action item tracking for price adjustments, wholesale conversions, and inter-dealership transfers with resolution workflows.
   - **Locations & Dealerships**: Authorized dealership directory (BYD, Chery, Hyundai, Kia, Holden) with GM, DP, and holding cost rates.
   - **Staff & Allocation**: Consultant conversion rates, assigned volume, and live workload capacity meters.
   - **DMS & Feed Sync**: Global Pentana feed logs, reconciliation metrics, and on-demand sync triggers (Super Admin only).

4. **Interactive Modals & Customer360**
   - **Customer360 Profile**: Lead timeline, stage management, inline mobile number editor, diary notes history with staff signatures, and two-way SMS messaging with delivery status badges.
   - **Vehicle Detail Modal**: Comprehensive specs, financial breakdown, frontline readiness, website listing toggle, and 48h soft hold placement & release.
   - **Book Appointment / Test Drive**: Custom scheduler with consultant and vehicle selection.
   - **Add Prospect Modal**: Fast floor walk-in intake with trade-in appraisal capture.
   - **Notification Center**: System alerts, unread leads, and aging stock warnings.
   - **Unified Live Search**: Global debounced search spanning Leads, Stock Vehicles, and Capital Radar.

---

## Local Development & Running

Ensure Node.js 20+ or 22+ is installed.

```bash
cd booran-sales-floor-app
npm install
```

### Running on Mobile

```bash
# Start the Expo development server
npm start

# Run on iOS Simulator (macOS with Xcode)
npm run ios

# Run on Android Emulator or connected physical device
npm run android

# Run in Web browser preview
npm run web
```

### Backend API Configuration

The mobile app includes a built-in **API Settings** modal accessible from the sign-in screen or the mobile drawer:
- **iOS Simulator**: `http://localhost:5001/api`
- **Android Emulator**: `http://10.0.2.2:5001/api`
- **Production Vercel**: `https://booran-sales-floor-backend.vercel.app/api`

### Validation & Quality

```bash
# Verify TypeScript types
npm run typecheck

# Run test suite
npm test
```

---

## Accounts for Testing

- **Super Admin**: `devs@omnisuiteai.com` (All locations, DMS feed sync access)
- **Dealership Manager**: `southmorang@booran.com` (South Morang group dealerships: BYD, Chery, Hyundai, Kia)

