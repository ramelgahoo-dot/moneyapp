# App Store Go-Live Today Plan

## Completed by Agent

- Fixed mobile top-right menu tap reliability in native webview contexts.
- Synced Capacitor iOS project and resolved stale iOS build directory issue.
- Added in-app legal/compliance pages and links:
  - `/account-deletion`
  - `/terms`
  - Linked from Settings and Support pages.
- Updated Privacy Policy to reference account deletion requests.
- Verified production Next.js build succeeds.

## You Do Next (Required Human Steps)

### 1) Launch and verify iPad in Simulator

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select an iPad simulator (iPad 10.9 and iPad Pro 12.9 recommended).
3. Press Run.
4. Verify these routes render and are usable:
   - `/dashboard`
   - `/cars`
   - `/banking`
   - `/reports`
   - `/settings`
   - `/account-deletion`

### 2) Capture App Store screenshots

Use these required families:
- iPhone 6.7"
- iPad 10.2/10.9 class

Store files in `docs/screenshots/` with this pattern:
- `iPhone67-1-Dashboard.png`
- `iPad-1-Dashboard-Landscape.png`

### 3) Archive iOS build in Xcode

1. In Xcode, set destination to `Any iOS Device (arm64)`.
2. Product -> Archive.
3. In Organizer, choose latest archive.
4. Distribute App -> App Store Connect -> Upload.

### 4) Complete App Store Connect metadata

In App Store Connect, ensure these are present:
- Privacy Policy URL: `https://moneyapp-snowy.vercel.app/privacy-policy`
- Support URL: `https://moneyapp-snowy.vercel.app/support`
- Terms URL: `https://moneyapp-snowy.vercel.app/terms`
- Account deletion URL: `https://moneyapp-snowy.vercel.app/account-deletion`

Upload iPhone + iPad screenshots.

### 5) Submit for review

1. Select the uploaded build.
2. Complete compliance questionnaires.
3. Submit for Review.

## Fast Triage If Blocked

- Signing error in Xcode: set Team under Signing & Capabilities.
- Missing screenshot size: re-capture at exact required device resolution.
- Build not appearing in App Store Connect: wait 10-30 minutes, then refresh.
