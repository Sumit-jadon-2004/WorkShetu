# WorkShetu Project Context

Audit date: 2026-11-24 (Asia/Calcutta)

This document records the repository state observed during the handover audit. “Tested” means an automated check was actually run during this audit; “implemented” means code is present, not that production behavior was independently confirmed.

## Current state

- **Implemented:** Existing MERN marketplace with machine listings/bookings, individual Labour listings/work requests, Driver applications, admin tools, offers, credits, chat, maps, and role-aware AI assistant code.
- **Tested:** Frontend production build succeeded. Four database-independent backend test files passed (28 tests total).
- **Partially verified:** Source review covered routing, auth gates, major schemas, marketplace endpoints, AI dispatch, and review/map code. No live browser or authenticated API session was exercised.
- **Unverified:** Current live database contents, production configuration, real AI provider response, payment provider behavior, and end-to-end marketplace flows.
- The repository has extensive pre-existing local modifications. Preserve them; this audit did not intentionally alter application behavior.

## Architecture

### Frontend

- React 19 + Vite 8, JavaScript/JSX, React Router, Context API, Tailwind CSS 4 and custom CSS.
- Entry: `Frontend/src/main.jsx`; routes/layout: `Frontend/src/App.jsx`.
- Auth and theme contexts: `Frontend/src/context/AuthContext.jsx`, `ThemeContext.jsx`; route gate: `Frontend/src/components/ProtectedRoute.jsx`.
- Pages grouped under `Frontend/src/Pages/{Public,Farmer,Driver,Labour,Owner,Auth,Admin,Common,UI}`.
- Language resources: English, Hindi (`hn`), and Hinglish JSON files in `Frontend/src/i18n/locales`; AI language helpers also exist under `src/utils`.
- Leaflet/react-leaflet support is installed and a Labour map page exists.

### Backend

- Node.js CommonJS + Express 5, Mongoose 9, MongoDB, Passport Local and express-session with connect-mongo.
- Main app and machine API: `Backend/App.js`. Routers under `Backend/routes`; auth middleware under `Backend/middleware`; schemas under `Backend/models`; AI, pricing, booking, and language helpers under `Backend/utils`.
- Cloudinary upload setup: `Backend/Cloudinary.js` and `Backend/middleware/upload.js`.
- `App.js` mounts auth, Driver, admin, offers, chat, AI, credits, Labour, and group-booking routers. Machine endpoints are defined directly in `App.js`.

## Database models

- `Owner.js` (Mongo model `User`): Passport phone identity, account role/status, Driver application and profile fields, coordinates, credits.
- `ListingMachin.js` (model `Machine`): owner, category, vehicle/specification, price/unit, image, location and coordinates, availability.
- `BookingMachine.js` (model `Booking`): polymorphic Machine/Labour/Transport booking data, customer/owner, pricing, status, expiry and completion fields. Machine-specific fields are conditional.
- `GroupBooking.js`: group and member booking states, listing, owner, request type and geography.
- `Labour.js`: individual Labour provider listing/profile, profession, skills/experience, charges, service area, availability/status, map consent.
- `Review.js`: Machine/Labour/Transport review fields, moderation/visibility, verified-booking flag, unique sparse booking index.
- Other schemas: `Tranport.js` (spelling as in source), `ChatMessage.js`, `Complaint.js`, `Offer.js`, `CreditPack.js`, and `PlatformSettings.js`.
- Relations use Mongoose ObjectIds and refs; booking `itemId` is polymorphic via `requestType`.

## Frontend routes

Current route declarations in `App.jsx` include `/`, `/machine`, `/assistant`, `/bookings`, `/bookings/rejected`, `/chat`, `/machines/:id`, `/machine/:id`, `/Labour`, `/labour`, `/labour/assistant`, `/work-with-workshetu`, Labour profiles/application/dashboard/listings (some capitalization aliases), `/login`, `/register`, Driver application/dashboard/listing routes, `/Drivers`, `/403`, nested `/admin/*`, and `*` not-found. See `App.jsx` for route-level role gates and aliases.

## Authentication and authorization

- Session-based Passport authentication; local strategy uses phone as username. Session store is MongoDB.
- `/api/auth` includes register, login, logout, current user, and profile endpoints.
- `isLoggedIn`, `roleRequired`, `isDriver`, `isLabour`, and `isAdmin` gates live in `Backend/middleware/auth.js`. Driver authorization checks approval; Labour authorization checks role/profile existence; admin has dedicated checks. Always verify on backend, not from frontend role state.
- `/api/health` reports database connected/disconnected state.
- Session/CORS configuration uses `SESSION_SECRET`, `CLIENT_URL`, `NODE_ENV`, `PORT`, and `MONGO_URL`.

## API inventory (route families)

Mounted routes are prefixed as shown; refer to each router for request bodies and full contracts.

- `/api/machine`: public listing/detail/reviews; authenticated Driver `/mine`, create/update/delete and booking-related operations in `App.js`.
- `/api/auth`: registration, login/logout, session identity, profile.
- `/api/driver`: Driver application and Driver-owned operations in `routes/Driver.js`.
- `/api/labour` and legacy `/api/Labour`: public categories/search/profile; application; provider listings/profile/dashboard/requests; Labour bookings/cancel. The same router is mounted for case aliases.
- `/api/labour`: rating/reviews, eligibility, map and location endpoints from `labourReviewsMaps.js` (mounted before the Labour router).
- `/api/group-bookings` and `/api/bookings`: group/single machine booking requests, farmer/owner lists, accept/reject/cancel/complete, OTP, alternatives.
- `/api/ai`: `/assistant` and `/labour`; role-aware tool-backed assistant.
- `/api/chat`: booking-scoped messages.
- `/api/offers`: active offers, validation, categories.
- `/api/credits`: packages, balance, initiate, verify payment.
- `/api/admin/*`: dashboard, users, Driver applications, Labour, listings, bookings, reviews, complaints, analytics, settings, offers.

## Marketplace workflows

### Machine marketplace — implemented in source; not end-to-end tested in this audit

Public machine listing/detail and owner-scoped listing APIs exist. Machine booking models and group booking router support separate single/group flows and status actions. `PlatformSettings` defaults include 5 km nearby machine radius, minimum land area 5 Bigha, group radius 2 km and group discount 10%; implementation also reads related helpers/configuration. These are existing configured values, not recommendations to change. Machine detail logic gates Driver phone visibility until an accepted/completed booking (with owner/admin exceptions). Driver eligibility helper and availability/expiry rules should be preserved.

### Labour marketplace — implemented in source; current modifications need review against history

Public category/search/profile endpoints, provider application, profile/listing CRUD, dashboard and request actions are present. Registration checks duplicate ownership and returns conflict; code contains multipart image upload. Labour requests are represented by the shared booking schema with `requestType: Labour`, but their endpoints and lifecycle are separate from machine workflows. Listing statuses include Approved/Pending/Rejected; availability includes Available/Booked/Hidden. Marketplace filters include profession, location, experience, pricing, availability, and nearby coordinates.

### Driver — implemented in source; not end-to-end tested in this audit

Driver applications are user profile fields/statuses (`None`, `Pending`, `Approved`, `Rejected`, `Suspected`). Driver router and admin approval/suspension routes exist. Approved Drivers manage machine listings, receive booking requests and may view earnings/completion workflows. Booking/credit rules must be traced before any changes.

### Farmer — implemented in source; not end-to-end tested in this audit

Farmer-facing machine and Labour browsing, bookings, group booking, chat, offers, credits, and AI pages exist. Farmer-owned booking endpoints and account workflows are protected by backend session/ownership checks.

## Reviews and maps

- Labour review/map router is present in the current working tree (untracked at audit start) and mounted at `/api/labour`.
- Reviews require a completed Labour booking owned by the authenticated customer, disallow duplicate reviews for the same booking, and now allow the original reviewer to edit or delete their own review. Separate completed bookings can have separate verified reviews. Public aggregates/lists include only visible, non-hidden reviews; moderation routes exist.
- The Labour map now appears on the individual profile/details page, not the marketplace page. Map display requires `mapVisibilityConsent` and valid stored coordinates; returned coordinates are rounded to two decimal places. Public Labour detail strips exact latitude/longitude in `routes/labour.js`. Missing coordinates show a location-unavailable state without a marker.
- Review mutation endpoints are `PUT /api/labour/:id/reviews/:reviewId` and `DELETE /api/labour/:id/reviews/:reviewId`; they require session auth and scope lookups to both the Labour profile and review. Backend verifies the reviewer identity from the session and rejects self-reviews.
- Source presence and test file do not by themselves establish production privacy or browser behavior; verify both before extending.

## AI architecture

- Existing implementation is in `Backend/routes/aiAssistant.js`; it accepts `/assistant` and `/labour`, normalizes localized conversations, detects intents, dispatches existing server-side tools and calls a Groq-compatible chat-completions endpoint.
- Prompt builder: `Backend/utils/aiPrompt.js`; intent parsing/history/filtering: `Backend/utils/aiIntent.js`; tool implementations, schemas, role filtering and dispatch: `Backend/utils/aiToolRegistry.js`; shared website knowledge: `Backend/utils/projectKnowledge.js`.
- Frontend assistant UI is `Frontend/src/Pages/Farmer/AIAssistant.jsx` and is included globally in the app layout. It renders assistant messages/recommendations and sends auth/context/history.
- Tool contracts present: `searchMachines`, `getNearbyMachines`, `getMachineDetails`, `checkAvailability`, `searchLabour`, `getLabourRequests`, `getLabourProfile`, `searchTransport`, `getMyBookings`, `getNearbyGroupBookings`, `getEligibleOffers`, `calculateBookingPrice`, `requestCancelBooking`, `getDriverRequests`, `getMyListings`, `getMyEarnings`, `getDriverProfileStatus`, `respondToBookingRequest`, `verifyBookingCompletion`, `getAdminDashboardStats`, `getDriverApplications`, `manageDriverStatus`, `getPlatformBookings`, `getOfferAnalytics`, `getPlatformComplaints`, and `getPlatformListings`.
- The registry enforces role access and tool implementations scope private records to authenticated IDs. Re-check role allowlists in `aiToolRegistry.js` before adding tools. Universal site guidance should not broaden private record access.
- AI env names: `GROQ_API_KEY`, optional `GROQ_API_URL`, `GROQ_MODEL`. Do not put values in docs or logs.

## Tests and verification

- Frontend scripts: `npm run build`, `npm run lint`, `npm run dev`, `npm run preview` (in `Frontend`). Backend package has no test script; tests are individual `Backend/test*.js` files and `Backend/utils/*.test.js`.
- **Build tested:** `npm run build` in `Frontend` succeeded (Vite 8.1.5, 2,050 modules). Vite emitted a chunk-size warning for the ~1.37 MB JS bundle.
- **Unit and route-policy tests tested:** `node --test test_labour_reviews_maps.js utils/aiIntent.test.js utils/aiLanguage.test.js utils/aiEvaluation.test.js utils/groupBooking.test.js` in `Backend` passed 41/41 tests. Labour create/edit/delete routes were exercised with model stubs; this did not write to MongoDB.
- **Lint:** Workspace-wide and changed-page ESLint runs still report pre-existing issues across the app; targeted Labour files include impure `Date.now()` initializers and state updates in effects. No lint-clean result is claimed.
- Database-backed/integration tests were not run: they may connect to or mutate MongoDB and were not considered safe without confirming a test database. A checked-in `Backend/test-result.txt` is historical output reporting database disconnected; it is not current verification.

## Environment variable names

Names found in source/example: `MONGO_URL`, `SESSION_SECRET`, `CLIENT_URL`, `NODE_ENV`, `PORT`, `GROUP_MIN_LAND_AREA`, `CLOUD_NAME`, `API_KEY`, `API_SECRET`, `GROQ_API_KEY`, `GROQ_MODEL`, optional `GROQ_API_URL`. Values are intentionally omitted. `MONGO_URI` appears as a fallback in some test files. Do not inspect, publish, or copy secrets.

## Existing uncommitted changes

At audit start `git status --short --branch` showed branch `main`, with modified files: `Backend/App.js`, auth middleware, Labour and Review models, admin reviews, AI/Labour routes and AI utilities/tests; Frontend package files, app, AI assistant, Labour pages, HeroSection, Navbar, ProtectedRoute and CSS. Untracked files included Labour reviews/maps route and test, LabourMap page and RoleSelection page. `git diff --stat` reported 24 tracked files, 1,580 insertions and 479 deletions, plus those untracked files. These are pre-existing user changes; do not reset, checkout, overwrite or treat them as agent work.

## Known issues and pending verification

- Handover notes report historical Labour AI intent/card mismatches, Driver own-listings retrieval issues, and tractor search with land area. Current code has recent AI changes, but no authenticated/live provider tests were run to determine whether those reports are resolved.
- Labour review/map code is newly untracked in the starting worktree and should be reviewed as part of the current diff before further edits.
- Frontend build bundle exceeds Vite’s 500 kB warning threshold; build still succeeds.
- Verify homepage “Find Machines / Workers” navigation, role-resume flows, privacy gates, actual DB results, upload, booking acceptance/credits/expiry, and multilingual AI behavior in a configured test environment.
- No backend server or browser session was started as part of this audit.

## Safe next steps

1. Review the pre-existing Git diff before editing these same files.
2. Use a dedicated test MongoDB and credentials before running integration tests.
3. Trace the reported AI issues with role-authenticated requests and real test fixtures; preserve tool names and contracts.
4. Exercise Labour review/map consent and exact-location redaction tests in the test database/browser.
5. Keep booking, pricing, credit, offers, and expiry rules unchanged unless explicitly authorized.
