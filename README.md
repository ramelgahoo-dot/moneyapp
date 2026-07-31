# MoneyApp

Car flipping and finance tracker built with Next.js + Supabase.

## Local Setup

0. Use the repo Node version (recommended):

```bash
nvm use
```

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with these values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_PRO=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Template: `.env.example`

3. Run SQL migrations in Supabase SQL Editor:

- `multi_tenant_migration.sql`
- `billing_migration.sql`

If the original Supabase project was deleted, follow `docs/supabase-restore.md` first.

4. Start dev server:

```bash
npm run dev
```

If setup is failing, run the preflight check directly:

```bash
npm run doctor
```

5. Open:

`http://localhost:3000`

## Mobile Testing

### Option A: Same Wi-Fi LAN

If phone and laptop are on the same network:

`http://<your-mac-lan-ip>:3000/login`

Example:

`http://192.168.1.81:3000/login`

### Option B: Tunnel (recommended when LAN fails)

1. Keep dev server running.
2. Start tunnel:

```bash
npm run tunnel
```

3. Open the generated URL in phone Safari, for example:

`https://some-name.loca.lt/login`

4. If localtunnel asks for a password/API gate page:
- This is expected.
- Enter your current public IP as the tunnel password.

## Login Troubleshooting (Mobile)

If tapping Sign in seems to blink/no-op:

1. Make sure dev server is running.
2. Prefer tunnel URL over LAN URL.
3. Disable VPN/Private Relay temporarily.
4. Hard refresh page and try again.

## Build Check

Run production build check before deploy:

```bash
npm run build
```

## Deploy to Vercel

1. Deploy:

```bash
npx vercel
```

2. Set the same env vars in Vercel Project Settings for Preview + Production:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`
- `NEXT_PUBLIC_APP_URL`

3. Redeploy after env changes.

## App Store Packaging (Capacitor)

This repo is now set up with Capacitor for native app shells.

### What is already configured

- Capacitor config: `capacitor.config.ts`
- Android native project: `android/`
- NPM scripts for sync/open:
	- `npm run mobile:android`
	- `npm run mobile:ios`

### Prerequisites

- Android: Android Studio installed
- iOS: Xcode + CocoaPods installed (`brew install cocoapods`)

### One-time setup

1. Install dependencies:

```bash
npm install
```

2. (iOS only) Add iOS platform after installing CocoaPods:

```bash
npm run cap:add:ios
```

### Running native projects

The mobile shell points to your hosted app URL by default.

Important: if your latest changes are only local, the phone app will not show them until you deploy (or point `CAPACITOR_SERVER_URL` to a reachable dev URL).

```bash
npm run mobile:android
```

```bash
npm run mobile:ios
```

If iOS sync fails with "Could not delete ios/App/build", clear the stale build folder and sync again:

```bash
npm run cap:clean:ios-build && npm run cap:sync
```

### Optional: point shell to another environment

```bash
CAPACITOR_SERVER_URL=https://your-preview-url.vercel.app npm run cap:sync
```

Then open the platform project again.

### Force phone to pull latest deployed UI

If the phone still shows old screens after deploy, sync with cache-busting:

```bash
npm run mobile:android:fresh
```

```bash
npm run mobile:ios:fresh
```

This appends a one-time `?v=<timestamp>` to the Capacitor server URL during sync, which forces a fresh WebView load.

If iOS tooling is not installed yet, Android refresh still works independently with:

```bash
npm run cap:sync:android:fresh
```

### iPad availability status

The iOS project is configured to ship on both iPhone and iPad:

- Device family includes iPhone + iPad in `ios/App/App/Info.plist`
- iPad orientation set includes portrait and landscape in `ios/App/App/Info.plist`
- Xcode target device family is `1,2` in `ios/App/App.xcodeproj/project.pbxproj`

Before submission, run a quick iPad pass in Xcode Simulator (or physical iPad):

1. Launch Dashboard, Cars, Banking, Reports in portrait and landscape.
2. Verify sidebar and tables are readable in 50/50 split view.
3. Capture required iPad screenshots in App Store Connect sizes.
