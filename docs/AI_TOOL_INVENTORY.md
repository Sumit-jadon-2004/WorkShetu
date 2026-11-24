# WorkShetu AI Tool Inventory

Comprehensive documentation of all autonomous tools available within `Backend/utils/aiToolRegistry.js`. Every tool is role-authorized, parameterized, and connected to live MongoDB models.

---

## 1. Farmer Tools

### `searchMachines`
- **Description**: Searches agricultural machinery based on user criteria, equipment category, budget, location, and power.
- **Allowed Roles**: `Farmer`, `Admin`
- **Input Parameters**:
  - `category` (string, optional): `"Tractor"`, `"Cultivator"`, `"Rotavator"`, `"Harrow"`, `"Harvester"`
  - `location` (string, optional): Target village or city
  - `radiusKm` (number, optional): Distance radius (default 50 km)
  - `maxPrice` (number, optional): Maximum rental price
  - `availableOn` (string, optional): Target ISO date string (YYYY-MM-DD)
  - `preferLowPrice` (boolean, optional): Sort cheapest first
- **Output**: Array of active, verified machine listing objects with calculated distance and rating.

### `getNearbyMachines`
- **Description**: Fast-path geolocation search returning machinery closest to farmer's current coordinates.
- **Allowed Roles**: `Farmer`, `Admin`
- **Input Parameters**:
  - `radiusKm` (number, optional): Radius in kilometers (default 25 km)
  - `category` (string, optional): Machinery category
- **Output**: Array of nearby listings sorted nearest-first.

### `checkAvailability`
- **Description**: Checks whether a specific machine is free or already booked on a specified calendar date.
- **Allowed Roles**: `Farmer`, `Admin`
- **Input Parameters**:
  - `machineId` (string, required): 24-character hexadecimal MongoDB ObjectId
  - `date` (string, required): Calendar date (YYYY-MM-DD)
- **Output**: `{ available: boolean, date: string, machine: object, conflictReason?: string }`

### `searchLabour`
- **Description**: Discovers farm workers, technicians, machine operators, and skilled tradesmen.
- **Allowed Roles**: `Farmer`, `Labour`, `Driver`, `Admin`
- **Input Parameters**:
  - `labourType` (string, optional): Trade category (e.g. `"Mason"`, `"Farm Worker"`, `"Tractor Driver"`, `"Electrician"`, `"Mechanical"`, `"Plumber"`)
  - `location` (string, optional): City or village
  - `maxPrice` (number, optional): Max daily wage rate
- **Output**: Array of active, verified Labour listings with approximate service location and experience.

### `getMyBookings`
- **Description**: Retrieves the authenticated farmer's single and group bookings.
- **Allowed Roles**: `Farmer`, `Admin`
- **Input Parameters**:
  - `status` (string, optional): `"Active"`, `"Completed"`, `"Rejected"`, `"All"` (default `"Active"`)
- **Output**: `{ singleBookings: Array, groupBookings: Array, totalCount: number }`

### `calculateBookingPrice`
- **Description**: Calculates exact booking price estimates including small-plot mobilizations and group discounts.
- **Allowed Roles**: `Farmer`, `Admin`
- **Input Parameters**:
  - `landArea` (number, required): Plot size in Bigha
  - `category` (string, required): Machine category
  - `bookingType` (string, optional): `"Single"` | `"Group"` (default `"Single"`)
- **Output**: `{ baseAmount, extraCharge, discountPercent, discountAmount, finalPrice, ruleNotes }`

---

## 2. Driver / Equipment Owner Tools

### `getDriverRequests`
- **Description**: Fetches incoming farmer booking requests for the driver's machinery.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**:
  - `status` (string, optional): `"Pending"`, `"Accepted"`, `"Completed"`, `"All"` (default `"Pending"`)
- **Output**: `{ singleBookings: Array, groupBookings: Array, pendingCount: number }`

### `getMyListings`
- **Description**: Retrieves all machinery and equipment listings owned by the authenticated driver.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**: None
- **Output**:
  - `driverStatus`: Application approval status
  - `isPubliclyVisible`: True if driver is approved and active
  - `machines`: Array of registered machines (`machineId`, `title`, `category`, `price`, `availability`, `location`)
  - `labours`: Array of associated worker listings

### `getMyEarnings`
- **Description**: Calculates total completed jobs, gross volume, and verified payouts.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**: None
- **Output**: `{ totalJobs: number, totalEarnings: string, pendingPayouts: string }`

### `getDriverProfileStatus`
- **Description**: Returns driver verification, vehicle registration, and active account standing.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**: None
- **Output**: `{ status: "Approved" | "Pending" | "Suspected" | "Suspended", vehicleNumber, isVerified: boolean }`

### `respondToBookingRequest`
- **Description**: Accepts or rejects an incoming farmer booking request. High-impact action requiring two-step confirmation.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**:
  - `bookingId` (string, required): Booking ObjectId
  - `action` (string, required): `"Accept"` | `"Reject"`
  - `reason` (string, optional): Rejection reason
- **Confirmation**: Requires two-step confirmation (`requiresConfirmation: true`).

### `verifyBookingCompletion`
- **Description**: Validates farmer-provided 6-digit completion OTP to finalize machine work.
- **Allowed Roles**: `Driver`, `Admin`
- **Input Parameters**:
  - `bookingId` (string, required): Booking ObjectId
  - `otp` (string, required): 6-digit OTP code
- **Output**: `{ success: boolean, message: string, booking: object }`

---

## 3. Labour Provider Tools

### `getLabourProfile`
- **Description**: Retrieves worker profiles, skills, daily wage rate, and availability belonging to the logged-in worker.
- **Allowed Roles**: `Labour`, `Admin`
- **Input Parameters**: None
- **Output**: `{ profiles: Array, activeCount: number }`

### `getLabourRequests`
- **Description**: Lists incoming labour hire requests with status filtering.
- **Allowed Roles**: `Labour`, `Admin`
- **Input Parameters**:
  - `status` (string, optional): `"Pending"`, `"Accepted"`, `"Completed"`, `"All"` (default `"All"`)
- **Output**: `{ requests: Array, count: number }`

---

## 4. Admin Tools

### `getAdminDashboardStats`
- **Description**: Platform summary metrics: users, active drivers, machine inventory, bookings, and revenue volume.
- **Allowed Roles**: `Admin`
- **Input Parameters**: None
- **Output**: Aggregated platform counts and metrics.

### `getDriverApplications`
- **Description**: Queries pending driver verification applications.
- **Allowed Roles**: `Admin`
- **Input Parameters**:
  - `status` (string, optional): `"Pending"`, `"Approved"`, `"Suspected"`, `"Suspended"`
- **Output**: Array of driver applications with license, experience, and vehicle details.

### `manageDriverStatus`
- **Description**: Approves, suspends, or flags a driver account. Requires two-step confirmation.
- **Allowed Roles**: `Admin`
- **Input Parameters**:
  - `userId` (string, required): Target user ObjectId
  - `action` (string, required): `"Approve"`, `"Reject"`, `"Suspend"`, `"Reactivate"`
  - `reason` (string, required): Explanation for audit log
- **Confirmation**: Requires two-step confirmation (`requiresConfirmation: true`).

### `getPlatformBookings`
- **Description**: Platform-wide booking oversight across Single and Group reservations.
- **Allowed Roles**: `Admin`
- **Input Parameters**:
  - `status` (string, optional): Filter by booking status
- **Output**: List of platform bookings with customer and provider identities.

### `getOfferAnalytics`
- **Description**: Platform promotional campaigns, budget limits, spent amounts, and redemptions.
- **Allowed Roles**: `Admin`
- **Input Parameters**: None
- **Output**: Budget utilization analytics across active platform offers.
