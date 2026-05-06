# App Store Connect Screenshot Requirements

This document specifies the exact screenshot sizes and device types required for App Store submission.

## Apple Requirements Overview

- **Format**: PNG or JPEG
- **Color Profile**: sRGB
- **Text**: No promotional text overlay (only app UI)
- **Screenshots per device**: Minimum 2, Maximum 10
- **Minimum dimensions**: Must match device specs below (will be rejected if smaller)

---

## iOS Device Screenshot Specs

### iPhone (6.7" Display) — Required
- **Dimensions**: 1284 × 2778 px
- **Format**: PNG or JPEG
- **DPI**: 72
- **Safe Area**: Avoid notch area at top
- **Count**: 2–10 screenshots
- **Recommended Screens**:
  1. Dashboard (overview of finances)
  2. Cars (main feature)
  3. Add Car (create workflow)
  4. Reports (analytics)

### iPhone (5.5" Display) — Optional (Legacy)
- **Dimensions**: 1080 × 1920 px
- **Format**: PNG or JPEG
- **DPI**: 72
- **Safe Area**: Standard safe area at top/bottom
- **Count**: Same as 6.7" (usually copy/adapt)
- **Note**: Apple may not require if 6.7" provided; check latest guidelines

### iPad (7th Generation, 10.2") — Required
- **Dimensions**: 2048 × 2732 px (portrait) or 2732 × 2048 px (landscape)
- **Format**: PNG or JPEG
- **DPI**: 72
- **Safe Area**: Avoid home indicator area
- **Count**: 2–10 screenshots (can be portrait OR landscape, not both counted separately)
- **Recommended Orientation**: Landscape (shows iPad advantage)
- **Recommended Screens**:
  1. Dashboard landscape (full-width charts)
  2. Cars landscape (table spanning full width)
  3. Banking landscape (transaction list)
  4. Reports landscape (multi-column layout)

### iPad Pro (12.9") — Optional (Recommended for showcase)
- **Dimensions**: 2048 × 2732 px (portrait) or 2732 × 2048 px (landscape)
- **Format**: PNG or JPEG
- **DPI**: 72
- **Safe Area**: Avoid home indicator area
- **Note**: Same resolution as iPad 7th gen; recommend landscape to show full UI potential
- **Use Case**: Highlight large-screen optimization if available

---

## Screenshots Capture Checklist

### Setup
- [ ] Clean app state (logged in, with test data visible)
- [ ] Set system time to 9:41 AM (Apple screenshot convention)
- [ ] Disable notifications badge
- [ ] Max screen brightness
- [ ] Use Simulator → Device → Shake Gesture → disable to avoid accidental triggers
- [ ] Connect to local dev server (CAPACITOR_SERVER_URL) or use Vercel preview

### iPhone 6.7" (1284 × 2778)
**Screenshot 1: Dashboard Overview**
- [ ] Show net worth cards at top
- [ ] Include asset breakdown below
- [ ] Visible at least 2-3 major sections
- [ ] No scrolling indicators visible
- Filename: `iPhone67-1-Dashboard.png`

**Screenshot 2: Cars List**
- [ ] Show 3+ cars in table/list
- [ ] Visible purchase price and status
- [ ] Add Car button visible at bottom
- Filename: `iPhone67-2-Cars.png`

**Screenshot 3: Add Car Modal** (Optional)
- [ ] Show form with all inputs
- [ ] Demonstrates data entry workflow
- Filename: `iPhone67-3-AddCar.png`

**Screenshot 4: Reports**
- [ ] Show profit trends or category breakdown
- [ ] Charts visible and readable
- Filename: `iPhone67-4-Reports.png`

### iPad (2048 × 2732, Landscape 2732 × 2048)
**Screenshot 1: Dashboard Landscape**
- [ ] Sidebar visible on left
- [ ] Main content spans right side
- [ ] Multiple charts visible side-by-side
- [ ] Shows iPad's horizontal space advantage
- Filename: `iPad-1-Dashboard-Landscape.png`

**Screenshot 2: Cars Table Landscape**
- [ ] Table columns: Make, Model, Year, Purchase Price, Status
- [ ] Show 4+ cars to demonstrate scroll capability
- [ ] Full-width table usage
- Filename: `iPad-2-Cars-Landscape.png`

**Screenshot 3: Banking Landscape**
- [ ] Transaction list spanning full width
- [ ] Account summary visible
- [ ] Connect Bank button or transaction history shown
- Filename: `iPad-3-Banking-Landscape.png`

**Screenshot 4: Reports Landscape** (Optional)
- [ ] Multiple charts/tiles side-by-side
- [ ] Demonstrates data-rich layout on large screen
- Filename: `iPad-4-Reports-Landscape.png`

---

## Technical Capture Instructions

### Using Xcode Simulator

1. **Launch Simulator**
   ```bash
   open -a Simulator
   ```

2. **Select Device**
   - Device > iPhone 15 Pro (for 6.7" test)
   - Device > iPad (10th generation) (for iPad test)

3. **Prepare App**
   ```bash
   npm run mobile:ios
   # Opens app in Xcode, build and run on Simulator
   ```

4. **Capture Screenshot**
   - Simulator > Screenshot (or Cmd+S)
   - Save to `docs/screenshots/`

5. **Resize if Needed** (Mac command-line)
   ```bash
   # Verify dimensions match spec (do NOT resize; re-capture if wrong)
   identify docs/screenshots/filename.png
   ```

### Using Physical Device (Preferred for Final QA)

1. **Connect iPad via USB**
2. **Open Xcode** → Devices and Simulators
3. **Select iPad** → Photos or Files app
4. **Take screenshot** (Power + Volume Up buttons)
5. **AirDrop to Mac** or sync via Finder
6. **Export to `docs/screenshots/`**

---

## Screenshot Requirements Checklist

### Pre-Submission
- [ ] All required device sizes captured
- [ ] Images are PNG or JPEG (not HEIC)
- [ ] Images are exactly the specified dimensions
- [ ] Images show actual app UI (no mock-ups)
- [ ] Text is legible (minimum 11pt recommended)
- [ ] No QR codes or promo text overlays
- [ ] No references to TestFlight or reviews
- [ ] Consistent color scheme across all screenshots

### File Naming Convention
```
{Device}-{ScreenNumber}-{ScreenName}-{Orientation}.png
```

Examples:
- `iPhone67-1-Dashboard.png`
- `iPad-2-Cars-Landscape.png`
- `iPad-3-Banking-Landscape.png`

### In App Store Connect
1. Go to **App Store Connect** → Your App → **Screenshots**
2. For each device family:
   - Select **Device Family** (iPhone 6.7" or iPad)
   - Click **+ Add Screenshot**
   - Upload images in order (screenshot 1, then 2, etc.)
3. Save and proceed to **Review**

---

## Responsive Design Considerations

### iPhone Layout (6.7")
- **Portrait**: Full width with left/right padding (p-4 = 16pt)
- **Sidebar**: Collapsed to hamburger menu
- **Tables**: Horizontal scroll if needed
- **Safe Area**: Top notch + bottom home indicator

### iPad Layout (10.2" / 10.9")
- **Portrait**: Sidebar fixed or collapsible on left
- **Landscape**: Sidebar visible, main content on right (recommended for screenshot)
- **Tables**: Full width, columnar layout
- **Safe Area**: Home indicator at bottom

---

## Final Approval Checklist

Before uploading to App Store Connect:

- [ ] All 4 iPhone screenshots ready (1284 × 2778 px)
- [ ] All 4 iPad screenshots ready (2732 × 2048 px landscape)
- [ ] Images named consistently per convention
- [ ] No watermarks or extraneous text
- [ ] Screenshots showcase core features (Dashboard, Cars, Banking, Reports)
- [ ] iPad landscape screenshots demonstrate full-width advantage
- [ ] All images compressed (typically < 2 MB each)
- [ ] Reviewed by team member for quality
- [ ] Uploaded to App Store Connect and previewed
- [ ] App description, keywords, and ratings match screenshots
