# Plan - Enterprise Tracking: Maps & Notifications

Implement a visual route map when orders are in the final delivery stage and add a notification enrollment feature in the public tracking interface.

## User Review Required

> [!IMPORTANT]
> The map will be a high-fidelity simulation showing a route to the customer's address to enhance the "Enterprise" experience (Mercado Livre style).

## Proposed Changes

### Storefront (Public)

#### [PublicTrackingSearch.tsx](src/pages/store/PublicTrackingSearch.tsx)
- Add "Enable Notifications" button with a success dialog simulation.
- Implement a `TrackingMap` component (simulated) that appears when progress is >= 90% (Entrega/Entregue).
- The map will show a "Vehicle in Route" animation with the customer's package and other 2-3 generic packages nearby.

### Administrative (Admin)

#### [OrderTrackingDialog.tsx](src/modules/admin/components/OrderTrackingDialog.tsx)
- Ensure the "Entrega" (Delivery) status correctly triggers the map visibility on the public side.

## Technical Details
- Map implementation using Lucide icons and CSS animations for a "live" feel without needing a heavy Maps API for every tiny request.
- Notification state stored in local state with a `toast` confirmation.
