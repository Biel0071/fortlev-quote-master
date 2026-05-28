text
1. Diagnose and fix the "white screen / frozen" issue:
   - Identify an infinite loop in `AppHeader.tsx` where a `ResizeObserver` updates a CSS variable that causes a layout shift, triggering the observer again.
   - Fix the loop by using a more stable height detection or adding a threshold.
   - Refactor `main.tsx` to be extremely resilient, with a robust `ErrorBoundary` and clear initialization path.
   - Clean up `App.tsx` to ensure all providers are correctly nested and stable.

2. Optimize data loading performance:
   - Refactor `useStoreProducts.ts` to be more robust, avoiding potential infinite loops in pagination and ensuring it handles network errors gracefully without freezing the UI.
   - Ensure `useVisitorTracker.ts` doesn't cause redundant re-renders or navigation loops.

3. Enhance UI Feedback:
   - Ensure skeleton loaders are correctly visible and don't flicker.
   - Fix any potential white-on-white text issues in the empty cart state.

4. Stability Improvements:
   - Remove manual service worker unregistration logic from the top level of `main.tsx` and move it to a safer place if needed, or rely on standard browser behavior.
   - Standardize the error boundaries to provide a "Clear Cache & Reload" button that actually works.

Technical Details:
- Replace `ResizeObserver` in `AppHeader.tsx` with a more controlled version or a simple `onResize` listener with a debounce.
- Add `window.onerror` and `window.onunhandledrejection` handlers to `main.tsx` for ultimate debugging.
- Simplify `StoreProvider` logic to avoid multiple state updates during initialization.
