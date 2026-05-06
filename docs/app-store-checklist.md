# App Store Checklist

## 1. Native Shell Setup

- Install Android Studio.
- Install Xcode (macOS).
- Install CocoaPods: `brew install cocoapods`.
- Ensure platforms exist:
	- `npm run cap:add:android`
	- `npm run cap:add:ios`

## 2. Build Sync Workflow

- Update mobile shell config if needed: `capacitor.config.ts`.
- Sync web assets and config: `npm run cap:sync`.
- If iOS sync fails because `ios/App/build` cannot be deleted, run `npm run cap:clean:ios-build` then sync again.
- Open native projects:
	- Android: `npm run cap:open:android`
	- iOS: `npm run cap:open:ios`

## 3. Auth and Redirect Validation

- Login works inside native webview.
- Logout only affects local device session.
- Deep links/redirect flows return correctly to app screens.

## 4. Billing Strategy

- Web checkout can remain Stripe for browser users.
- For in-app purchases, verify Apple/Google policy requirements.
- Decide whether to add App Store / Play Billing in-app purchase path.

## 5. Required Policies and Metadata

- Privacy Policy URL.
- Terms of Service URL.
- Support contact email.
- Account deletion instructions in-app.
- Data collection disclosures for store questionnaires.

## 6. QA Before Submission

- Startup on cold launch.
- Network-offline behavior.
- Error banners for failed API calls.
- Tablet/phone layout sanity check.
- iPad portrait + landscape verification for Dashboard, Cars, Banking, Reports.
- iPad split-view (50/50 and 1/3) sanity check for navigation and table scroll.
- Crash-free smoke test on at least one physical iOS and Android device.

## 7. Submission Artifacts

- App icon set and splash assets.
- Screenshots for required device classes.
- Short/long descriptions.
- Test account credentials for reviewer if needed.
