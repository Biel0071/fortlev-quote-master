# Plan - Enterprise Tracking, Maps & Notifications

Implement a visual route map for delivery tracking and a unified notification & cookie management system for the store.

## User Review Required

> [!IMPORTANT]
> The map will be a high-fidelity simulation showing a live route to the customer's address. The notification system will integrate with cookie consent to allow opting in for both delivery updates and store-specific alerts.

## Proposed Changes

### Storefront (Public)

#### [PublicTrackingSearch.tsx](src/pages/store/PublicTrackingSearch.tsx)
- Implement a `TrackingMap` component that appears when tracking progress is >= 90% (Entrega/Entregue).
- The map will show a "Vehicle in Route" animation with the customer's package and other simulated orders in the vicinity.
- Add an "Enable Notifications" button specifically for order updates.

#### [AppHeader.tsx](src/components/store/AppHeader.tsx) or a new Global Component
- Implement a `CookieNotificationBanner` that appears for new users.
- This banner will allow users to "Accept All" or "Customize" (Cookies + System Notifications).
- Include an option to subscribe to "Store Specific Notifications" (alerts for this specific store).

### Administrative (Admin)

#### [OrderTrackingDialog.tsx](src/modules/admin/components/OrderTrackingDialog.tsx)
- Ensure the status transitions correctly trigger the "In Route" map on the public side.

### Infrastructure
- Add a local storage based "Consent Manager" to persist notification and cookie preferences.

## Technical Details
- Map: Pure CSS/SVG animation for high performance and "Enterprise" feel.
- Notifications: Simulated service worker registration UI (or simple Browser Notification API prompt) with a fallback to persistent UI alerts.
- Persistence: `localStorage` keys for `store_notification_consent` and `cookie_consent`.
