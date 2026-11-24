# WorkShetu Universal AI Agent Architecture

## 1. System Overview

The WorkShetu Universal AI Agent is a role-aware, multi-lingual, autonomous conversational system designed to empower Indian agricultural stakeholders:
1. **Farmers**: Discover machinery, calculate accurate prices, find farm workers (Labour), track bookings, and obtain support.
2. **Drivers / Equipment Owners**: View incoming booking requests, inspect registered machinery listings, verify completion OTPs, and track earnings.
3. **Labour Providers (Workers)**: Manage worker profile listings, review incoming work requests, verify customer completion OTPs, and track wages.
4. **Platform Administrators**: Supervise platform metrics, verify/approve/suspend driver accounts, monitor platform bookings, and manage platform-funded promotional offers.

The architecture connects user queries through statistical and heuristic intent classification, passes role-filtered context and allowable tools to high-throughput LLM endpoints (Groq API using `openai/gpt-oss-120b`), executes verified database operations on MongoDB Atlas, and renders tailored visual cards on the React frontend.

---

## 2. End-to-End Architectural Flow

```
                                  +--------------------------------------+
                                  |     React Frontend (AIAssistant)     |
                                  |  - Role-specific suggestion chips    |
                                  |  - Visual recommendation cards       |
                                  |  - Two-step confirmation dialogs     |
                                  +------------------+-------------------+
                                                     |
                                           HTTP POST /api/assistant
                                           (JSON Payload + Session)
                                                     |
                                                     v
                                  +--------------------------------------+
                                  |       Express Backend Gateway        |
                                  |  - Rate Limiter (20 req / min)       |
                                  |  - Authentication Check (isLoggedIn) |
                                  |  - Language Detection (Hindi/Hinglish)|
                                  +------------------+-------------------+
                                                     |
                         +---------------------------+---------------------------+
                         |                                                       |
                         v                                                       v
         +-------------------------------+                       +-------------------------------+
         |     Action Confirmation?      |                       |    Intent & Context Engine    |
         |  - actionId lookup            |                       |  - detectIntent()             |
         |  - Two-step verify/discard    |                       |  - ML Classifier              |
         +---------------+---------------+                       |  - serviceSearchFilters()     |
                         |                                       +---------------+---------------+
                         |                                                       |
                         v                                                       v
         +-------------------------------+                       +-------------------------------+
         |     Database State Change     |                       |    System Prompt Synthesis    |
         |  (e.g., driver status/cancel) |                       |  - Role persona & invariants  |
         +-------------------------------+                       |  - projectKnowledge.js layer  |
                                                                 |  - Strict pricing invariants  |
                                                                 +---------------+---------------+
                                                                                 |
                                                                                 v
                                                                 +-------------------------------+
                                                                 |     Groq AI Tool Calling      |
                                                                 |  - Allowed role tools only    |
                                                                 |  - Model tool choice loop     |
                                                                 +---------------+---------------+
                                                                                 |
                                                                 +---------------+---------------+
                                                                 |   Verified Tool Execution     |
                                                                 |  - MongoDB Live Retrieval     |
                                                                 |  - Real calculations & filter |
                                                                 +---------------+---------------+
                                                                                 |
                                                                                 v
                                                                 +-------------------------------+
                                                                 |   Visual Recommendations Card |
                                                                 |  - Machines / Labour Cards    |
                                                                 |  - Booking & Offer Cards      |
                                                                 |  - Localized natural reply    |
                                                                 +-------------------------------+
```

---

## 3. Core Architectural Components

### 3.1 Knowledge & Prompt Layer (`projectKnowledge.js` & `aiPrompt.js`)
- **Shared Domain Knowledge**: Contains immutable rules regarding land-area pricing (Bigha/Acre/Hour), non-discountable small-plot surcharges under 5 Bigha, Group Booking 10% pooling discounts within 2 KM, and 100% platform-funded promotional offers.
- **Labour Knowledge Chunk**: Details 17+ worker skills, Daily Wage × Days Required pricing, strict contact phone number masking until booking acceptance, and 6-digit cryptographically secure OTP work completion.
- **Role Identity Enforcement**: Automatically tunes tone, greeting (e.g. *नमस्ते किसान भाई* for farmers, *नमस्ते सारथी भाई* for drivers), and permissible operational boundaries.

### 3.2 Dynamic Intent Detection (`aiIntent.js`)
- **Deterministic Heuristic Rules**: Fast-paths high-priority user intentions:
  - Driver listings: Matches expressions such as `"meri registered machines dikhao"`, `"meri listings"`, `"registered equipment"`.
  - Universal Labour search: Matches queries like `"mujhe mistri chahiye"`, `"kheti ke liye mazdoor"`, `"plumber chahiye"`, routing to `type: "labour"` with normalized skill category filters.
  - Farmer bookings & pricing: Matches `"mera booking status"` and land-area rate inquiries.
- **Bayesian ML Classifier (`mlClassifier.js`)**: Resolves ambiguity in natural-language phrasing across diverse dialects and transliterations.

### 3.3 Allowlisted Role-Isolated Tool Registry (`aiToolRegistry.js`)
- **Role Authorization Gate**: Tools are strictly partitioned:
  - `Farmer`: `searchMachines`, `getNearbyMachines`, `checkAvailability`, `searchLabour`, `searchTransport`, `getMyBookings`, `getNearbyGroupBookings`, `getEligibleOffers`, `calculateBookingPrice`, `requestCancelBooking`.
  - `Driver`: `getDriverRequests`, `getMyListings`, `getMyEarnings`, `getDriverProfileStatus`, `respondToBookingRequest`, `verifyBookingCompletion`.
  - `Labour`: `getLabourProfile`, `getLabourRequests`, `searchLabour`.
  - `Admin`: `getAdminDashboardStats`, `getDriverApplications`, `manageDriverStatus`, `getPlatformBookings`, `getOfferAnalytics`, `getPlatformComplaints`, `getPlatformListings`.
- **Zero Mock Policy**: Every tool queries live MongoDB collections (`ListingMachin`, `Labour`, `BookingMachine`, `User`, `Offer`) and applies real distance computations.

### 3.4 Response Card Synthesis (`responseRecommendations`)
- Tool outputs are automatically transformed into visual interactive cards:
  - `machine`: Equipment specs, HP, daily rate, location distance, availability status badge.
  - `labour`: Worker trade, daily wage rate, experience, verified rating, service location.
  - `driver_request`: Incoming farmer booking request with land area and requested date.
  - `booking`: Active booking status, driver/worker name, and status badges.
  - `offer`: Platform promotion code, discount percentage, minimum booking amount, and validity.
  - `action_confirmation`: Two-step confirmation UI for high-impact actions.

---

## 4. Security & Privacy Guarantees

1. **Phone Number Masking**:
   - Customer and worker phone numbers are never exposed in any public listing or pending booking API response.
   - Only upon reaching `Accepted` or `Completed` status are phone contact details populated for mutual coordination.
2. **Work Completion Cryptographic OTP**:
   - 6-digit OTPs are generated using `crypto.randomInt(100000, 1000000)`.
   - Only the SHA-256 hash is saved in MongoDB for verification (`completionOtp`).
   - Plaintext OTP is encrypted using AES-256-CBC (`completionOtpCipher`) and accessible exclusively by the authenticated customer.
   - Strict 10-minute validity and 60-second regenerate cooldown.
   - Max 5 failed attempts lockout threshold to prevent brute-force attacks.
3. **Prompt Injection Defense**:
   - System prompts enforce data isolation: Tool responses are treated strictly as data, never as executable instructions.
   - Any instruction inside database records attempting to override system behavior or elevate role privileges is automatically ignored.
