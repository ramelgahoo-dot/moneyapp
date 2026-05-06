# iPad Test Matrix & Validation

## Test Environment
- **Build Date**: May 5, 2026
- **Next.js Build**: ✓ Compiled successfully
- **Capacitor Sync**: ✓ Successful (iOS pod install complete)
- **Target**: iPad (all sizes) + iPhone (for comparison)

## Device Coverage

### iPad Models to Test (in Xcode Simulator)
| Device | Screen Size | Resolution | Orientation | Status |
|--------|-------------|-----------|-----------|--------|
| iPad (10.9") | 2360×1640 | Regular size class | Portrait & Landscape | Run tests |
| iPad Pro 12.9" | 2732×2048 | Large size class | Portrait & Landscape | Run tests |
| iPad mini (8.3") | 2048×1536 | Compact size class | Portrait & Landscape | Run tests |
| iPad Air (10.9") | 2360×1640 | Regular size class | Portrait & Landscape | Run tests |

### iPhone Models (for validation)
| Device | Screen Size | Resolution | Notes |
|--------|-------------|-----------|-------|
| iPhone 15 Pro | 6.1" | 2556×1179 | Standard phone |
| iPhone 15 Pro Max | 6.7" | 2796×1290 | Larger phone |

## Manual Test Cases

### 1. **Cold Launch**
- [ ] App starts without crash on iPad portrait
- [ ] App starts without crash on iPad landscape
- [ ] Login screen renders correctly (no overflow, buttons tappable)
- [ ] Install banner appears on first load (if applicable)

### 2. **Navigation & Layout**
- [ ] Sidebar visible and functional in portrait on iPad
- [ ] Sidebar collapses/hamburger menu works in portrait on smaller iPad
- [ ] Sidebar visible by default in landscape on iPad
- [ ] Mobile nav top bar respects safe-area insets on iPad with notch
- [ ] All navigation links functional across 3+ main screens

### 3. **Core Screens (Dashboard, Cars, Banking, Reports)**

#### Portrait Mode
- [ ] Dashboard: Cards stack vertically, all metrics visible
- [ ] Dashboard: Charts responsive, not cut off at edges
- [ ] Cars: Table headers align, no horizontal scroll required
- [ ] Banking: Transaction list readable, buttons accessible
- [ ] Reports: Grid layouts adapt, not cramped
- [ ] Reports: Charts scale to iPad width gracefully

#### Landscape Mode
- [ ] Dashboard: Sidebar remains visible, content adjusts
- [ ] Dashboard: Charts side-by-side without overflow
- [ ] Cars: Table uses full width efficiently
- [ ] Banking: Transaction list spans full landscape width
- [ ] Reports: Multi-column grids render correctly
- [ ] All content readable without pinch-zoom

### 4. **Modals & Overlays**
- [ ] Add Car modal centers and sizes correctly on iPad
- [ ] Edit Car modal doesn't extend beyond safe area
- [ ] Add Expense modal is usable (not too wide, not too narrow)
- [ ] Onboarding dialog is readable and buttons are tappable
- [ ] All modals close properly without animation glitches

### 5. **Input & Touch**
- [ ] Form inputs are tappable (minimum 44pt hit target)
- [ ] Keyboard appears/disappears without layout shift on iPad
- [ ] Date pickers work smoothly on touch
- [ ] Search inputs functional on all screens
- [ ] Dropdown menus don't clip outside screen bounds

### 6. **Split View (iPad Only)**
- [ ] App functions in 50/50 split view (width ~360-480pt per side)
- [ ] Navigation still works in narrow split
- [ ] Tables don't become unreadable in narrow split
- [ ] Modals adjust to available width in split view

### 7. **Performance & Stability**
- [ ] No console errors on cold launch
- [ ] No layout thrashing or janky transitions
- [ ] Scroll performance smooth on long lists (30+ items)
- [ ] No memory leaks on repeated navigation (use DevTools)
- [ ] App remains stable after 5+ minute idle period

### 8. **Network Offline Behavior**
- [ ] Error messages display correctly (not cut off) on iPad
- [ ] Retry buttons are tappable in offline state
- [ ] Loading spinners center properly on iPad

### 9. **Browser vs. Native Parity**
- [ ] Safari browser version renders identically to native shell
- [ ] Native shell routing and redirection work as browser does
- [ ] Install banner behavior matches between contexts

## Pass/Fail Criteria

### Must Pass (Blocking)
- [ ] No crashes on any test device in any orientation
- [ ] No layout overflow or unreadable text on iPad
- [ ] Sidebar and navigation fully functional across all screens
- [ ] All core screens (Dashboard, Cars, Banking, Reports) usable
- [ ] Form inputs and buttons have sufficient hit targets

### Should Pass (Recommended)
- [ ] Split view works at 50/50 ratio on regular iPad
- [ ] All modals properly sized and positioned
- [ ] Landscape mode fully optimized (not just functional)

### Nice to Have
- [ ] Landscape charts optimized with side-by-side layout
- [ ] Perfect visual alignment on all size classes

## Test Execution Checklist

1. **Pre-Test Setup**
   - [ ] Xcode installed and updated
   - [ ] Simulator cache cleared (`xcrun simctl erase all`)
   - [ ] Latest app build deployed to Vercel or running locally
   - [ ] Test account credentials ready

2. **Run Tests**
   - [ ] Record results in columns above
   - [ ] Capture screenshots for failing cases
   - [ ] Note any performance issues

3. **Post-Test**
   - [ ] Compile results into Pass/Fail summary
   - [ ] File bugs for any failures
   - [ ] Prepare screenshots for App Store Connect

---

## Test Results Summary

| Category | Status | Notes |
|----------|--------|-------|
| Cold Launch | PENDING | Requires Xcode simulator |
| Navigation | PENDING | Requires Xcode simulator |
| Dashboard | PENDING | Requires Xcode simulator |
| Cars | PENDING | Requires Xcode simulator |
| Banking | PENDING | Requires Xcode simulator |
| Reports | PENDING | Requires Xcode simulator |
| Modals | PENDING | Requires Xcode simulator |
| Input & Touch | PENDING | Requires Xcode simulator |
| Split View | PENDING | Requires Xcode simulator |
| Performance | PENDING | Requires Xcode simulator |
| Offline | PENDING | Requires Xcode simulator |
| Browser Parity | PENDING | Requires Xcode simulator |

**Overall Status**: ⏳ Awaiting manual Xcode simulator testing
