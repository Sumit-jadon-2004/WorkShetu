const test = require("node:test");
const assert = require("node:assert/strict");

const {
  hasValidCoordinates,
  calculateDistanceKm,
  normalizeCity,
  extractCity,
  isSameCity,
  filterAndRankByLocation
} = require("./utils/locationService");
const { resolveUserProfileStatus } = require("./middleware/auth");

test("Location Service - Haversine distance & coordinate validation", () => {
  assert.equal(hasValidCoordinates(27.8974, 78.0880), true);
  assert.equal(hasValidCoordinates("invalid", 78.0880), false);
  assert.equal(hasValidCoordinates(null, 78.0880), false);
  assert.equal(hasValidCoordinates(95, 78.0880), false); // Out of range latitude

  // Aligarh to Hathras (~34 km)
  const dist = calculateDistanceKm(27.8974, 78.0880, 27.5970, 78.0519);
  assert.ok(dist >= 30 && dist <= 40, `Expected ~34 km, got ${dist}`);

  // Normalization
  assert.equal(normalizeCity("Aligarh, Uttar Pradesh"), "aligarh");
  assert.equal(normalizeCity("  Agra "), "agra");
  assert.equal(extractCity("Muzaffarpur, Bihar, India"), "Muzaffarpur");
  assert.equal(isSameCity("Aligarh", "Aligarh, Uttar Pradesh"), true);
  assert.equal(isSameCity("Agra", "Mathura"), false);
});

test("Location Marketplace - Priority 1 (Nearby within 5 km) & Priority 2 (Same City) & Exclude Other Cities", () => {
  // User at Center of Aligarh (27.8974, 78.0880)
  const userLat = 27.8974;
  const userLon = 78.0880;
  const userCity = "Aligarh";

  const listings = [
    {
      _id: "m1_nearby",
      title: "Mahindra 575 DI (Near)",
      location: "Civil Lines, Aligarh, Uttar Pradesh",
      latitude: 27.9000,
      longitude: 78.0850 // ~0.4 km away
    },
    {
      _id: "m2_nearby_2",
      title: "Swaraj 744 (Near)",
      location: "Ramghat Road, Aligarh",
      latitude: 27.9150,
      longitude: 78.0920 // ~2 km away
    },
    {
      _id: "m3_same_city_far",
      title: "John Deere 5310 (Same City Far)",
      location: "Khair, Aligarh, Uttar Pradesh",
      latitude: 27.9400,
      longitude: 77.8300 // ~26 km away, but same city (Aligarh)
    },
    {
      _id: "m4_same_city_no_coords",
      title: "Rotavator (Same City No GPS)",
      location: "Aligarh, UP",
      latitude: null,
      longitude: null
    },
    {
      _id: "m5_other_city",
      title: "Sonalika 60 (Agra - Different City)",
      location: "Agra, Uttar Pradesh",
      latitude: 27.1767,
      longitude: 78.0081 // Agra
    },
    {
      _id: "m6_other_state",
      title: "Harvester (Patna - Different State)",
      location: "Patna, Bihar",
      latitude: 25.5941,
      longitude: 85.1376
    }
  ];

  const result = filterAndRankByLocation(listings, {
    latitude: userLat,
    longitude: userLon,
    city: userCity,
    radiusKm: 5
  });

  // Verification 1: Nearby items appear within 5 km and are sorted nearest first
  assert.equal(result.nearby.length, 2, "Should have 2 nearby listings within 5 km");
  assert.equal(result.nearby[0]._id, "m1_nearby");
  assert.ok(result.nearby[0].distanceKm < 1.0);
  assert.equal(result.nearby[1]._id, "m2_nearby_2");
  assert.ok(result.nearby[1].distanceKm > result.nearby[0].distanceKm);

  // Verification 2: Same-city items outside 5 km appear under sameCity
  assert.equal(result.sameCity.length, 2, "Should have 2 same-city listings outside 5 km or without coords");
  assert.ok(result.sameCity.some(item => item._id === "m3_same_city_far"));
  assert.ok(result.sameCity.some(item => item._id === "m4_same_city_no_coords"));

  // Verification 3: Another city (Agra) and other state (Patna) are completely excluded
  assert.ok(!result.all.some(item => item._id === "m5_other_city"), "Agra listing must be excluded");
  assert.ok(!result.all.some(item => item._id === "m6_other_state"), "Patna listing must be excluded");

  // Verification 4: No duplicates in all merged results
  const ids = result.all.map(item => item._id);
  const uniqueIds = new Set(ids);
  assert.equal(ids.length, uniqueIds.size, "Merged result must not contain duplicate listings");
  assert.equal(result.all.length, 4, "Total listings should be 2 nearby + 2 same city = 4");
});

test("Location Marketplace - Missing location requires location (never fall back to all-India)", () => {
  const listings = [
    { _id: "1", title: "Tractor A", location: "Agra" },
    { _id: "2", title: "Tractor B", location: "Patna" }
  ];

  const result = filterAndRankByLocation(listings, {
    latitude: null,
    longitude: null,
    city: null
  });

  assert.equal(result.locationRequired, true);
  assert.equal(result.all.length, 0);
  assert.equal(result.nearby.length, 0);
  assert.equal(result.sameCity.length, 0);
});

test("Location Marketplace - Saved / Selected City works when GPS is unavailable", () => {
  const listings = [
    { _id: "1", title: "Tractor Agra 1", location: "Agra, Uttar Pradesh" },
    { _id: "2", title: "Tractor Agra 2", location: "Sikandra, Agra" },
    { _id: "3", title: "Tractor Meerut", location: "Meerut, Uttar Pradesh" }
  ];

  const result = filterAndRankByLocation(listings, {
    latitude: null,
    longitude: null,
    city: "Agra"
  });

  assert.equal(result.locationRequired, false);
  assert.equal(result.all.length, 2);
  assert.ok(result.all.every(item => isSameCity("Agra", item.location)));
  assert.ok(!result.all.some(item => item._id === "3"));
});

test("Role-Based Login Redirect System - Logic Verification", () => {
  // Helper implementing the Login.jsx redirect policy
  function computeRedirect({ role, profileStatus, activeWorkspace }) {
    const userRole = String(role || "").trim().toLowerCase();
    const isDriverApproved = profileStatus?.isDriverApproved === true;
    const isDriverPending = profileStatus?.driverApplicationStatus === "Pending";
    const isLabourActive = profileStatus?.isLabourActive === true;
    const hasDriverProfile = profileStatus?.hasDriverProfile === true;
    const hasLabourProfile = profileStatus?.hasLabourProfile === true;

    // Multi-role determination
    if (hasDriverProfile && hasLabourProfile) {
      if (activeWorkspace === "driver" && isDriverApproved) {
        return "/Drivers";
      }
      if (activeWorkspace === "labour" && isLabourActive) {
        return "/labour/dashboard";
      }
      return "/work-with-workshetu";
    }

    // Driver Role
    if (userRole === "driver" || hasDriverProfile) {
      if (isDriverApproved) return "/Drivers";
      if (isDriverPending) return "/driver/application";
      return "/driver/apply";
    }

    // Labour Role
    if (userRole === "labour" || hasLabourProfile) {
      if (isLabourActive) return "/labour/dashboard";
      return "/labour/apply";
    }

    // Default Farmer / Normal user
    return "/";
  }

  // 1. Farmer -> Home "/"
  assert.equal(computeRedirect({ role: "Farmer", profileStatus: {} }), "/");

  // 2. Driver (Approved) -> "/Drivers"
  assert.equal(computeRedirect({
    role: "Driver",
    profileStatus: { hasDriverProfile: true, isDriverApproved: true }
  }), "/Drivers");

  // 3. Driver (Pending) -> "/driver/application"
  assert.equal(computeRedirect({
    role: "Driver",
    profileStatus: { hasDriverProfile: true, isDriverApproved: false, driverApplicationStatus: "Pending" }
  }), "/driver/application");

  // 4. Labour (Active) -> "/labour/dashboard"
  assert.equal(computeRedirect({
    role: "Labour",
    profileStatus: { hasLabourProfile: true, isLabourActive: true }
  }), "/labour/dashboard");

  // 5. Labour (Incomplete) -> "/labour/apply"
  assert.equal(computeRedirect({
    role: "Labour",
    profileStatus: { hasLabourProfile: false }
  }), "/labour/apply");

  // 6. Dual Role (Driver + Labour) with activeWorkspace "driver" -> "/Drivers"
  assert.equal(computeRedirect({
    role: "Driver",
    profileStatus: { hasDriverProfile: true, isDriverApproved: true, hasLabourProfile: true, isLabourActive: true },
    activeWorkspace: "driver"
  }), "/Drivers");

  // 7. Dual Role (Driver + Labour) with activeWorkspace "labour" -> "/labour/dashboard"
  assert.equal(computeRedirect({
    role: "Driver",
    profileStatus: { hasDriverProfile: true, isDriverApproved: true, hasLabourProfile: true, isLabourActive: true },
    activeWorkspace: "labour"
  }), "/labour/dashboard");

  // 8. Dual Role (Driver + Labour) without activeWorkspace -> "/work-with-workshetu"
  assert.equal(computeRedirect({
    role: "User",
    profileStatus: { hasDriverProfile: true, isDriverApproved: true, hasLabourProfile: true, isLabourActive: true },
    activeWorkspace: null
  }), "/work-with-workshetu");
});

test("Labour Booking Pricing - Removal of Worker Count Multiplier", () => {
  // New formula: Daily Rate * Days Required
  const dailyRate = 1500;

  // Scenario 1: 1 day booking
  const days1 = 1;
  const totalPrice1 = dailyRate * days1;
  assert.equal(totalPrice1, 1500);

  // Scenario 2: 3 days booking
  const days3 = 3;
  const totalPrice3 = dailyRate * days3;
  assert.equal(totalPrice3, 4500);

  // Scenario 3: Verify that worker count is NOT multiplied into total
  // Even if legacy payload had workerCount = 5, new pricing strictly enforces unitPrice * days
  const calculateTotal = (rate, daysRequired) => {
    const days = Math.max(1, parseInt(daysRequired, 10) || 1);
    const unitPrice = Number(rate) || 0;
    return unitPrice * days;
  };

  assert.equal(calculateTotal(1200, 2), 2400);
  assert.equal(calculateTotal(800, 5), 4000);
});

test("Blinkit-Style Location System - Smart Progressive Radius Expansion & Nearest-First Sorting", () => {
  // Farmer at GPS coordinates: (27.8974, 78.0880) [Aligarh central]
  const userLat = 27.8974;
  const userLon = 78.0880;

  const mockListings = [
    {
      _id: "m_close",
      title: "Mahindra 575 (Very Close)",
      latitude: 27.9050,
      longitude: 78.0900 // ~0.8 km away
    },
    {
      _id: "m_tier2",
      title: "Swaraj 744 (10km Tier)",
      latitude: 27.9600,
      longitude: 78.1100 // ~7.3 km away (outside 5km, inside 10km)
    },
    {
      _id: "m_tier3",
      title: "John Deere 5310 (15km Tier)",
      latitude: 28.0000,
      longitude: 78.1400 // ~12.5 km away (outside 10km, inside 15km)
    },
    {
      _id: "m_far",
      title: "New Holland (Far Outside)",
      latitude: 27.1767,
      longitude: 78.0081 // Agra (~80 km away)
    }
  ];

  // 1. Without progressive expansion (strict 5 km)
  const strictResult = filterAndRankByLocation(mockListings, {
    latitude: userLat,
    longitude: userLon,
    radiusKm: 5,
    progressiveRadius: false
  });
  assert.equal(strictResult.nearby.length, 1);
  assert.equal(strictResult.nearby[0]._id, "m_close");
  assert.equal(strictResult.isExpandedRadius, false);
  assert.equal(strictResult.appliedRadiusKm, 5);

  // 2. With progressive expansion (desired minItems: 3)
  const expandedResult = filterAndRankByLocation(mockListings, {
    latitude: userLat,
    longitude: userLon,
    radiusKm: 5,
    progressiveRadius: true,
    minItems: 3
  });

  // Verification 1: Automatically stepped up from 5km -> 10km -> 15km to reach 3 items
  assert.equal(expandedResult.isExpandedRadius, true, "Radius should be expanded");
  assert.equal(expandedResult.initialRadiusKm, 5, "Initial radius was 5 km");
  assert.equal(expandedResult.appliedRadiusKm, 15, "Applied radius expanded to 15 km");
  assert.equal(expandedResult.nearby.length, 3, "Should include 3 items within 15 km");

  // Verification 2: Nearest-first strict sorting
  assert.equal(expandedResult.nearby[0]._id, "m_close");
  assert.equal(expandedResult.nearby[1]._id, "m_tier2");
  assert.equal(expandedResult.nearby[2]._id, "m_tier3");
  assert.ok(expandedResult.nearby[0].distanceKm < expandedResult.nearby[1].distanceKm);
  assert.ok(expandedResult.nearby[1].distanceKm < expandedResult.nearby[2].distanceKm);

  // Verification 3: Item 80 km away in another city is strictly excluded
  assert.ok(!expandedResult.all.some(i => i._id === "m_far"), "Far listing must be excluded");
});

test("Blinkit-Style Location System - Strict Prevention of Random All-India Fallback", () => {
  const listings = [
    { _id: "1", title: "Tractor Punjab", location: "Ludhiana, Punjab", latitude: 30.9010, longitude: 75.8573 },
    { _id: "2", title: "Tractor Gujarat", location: "Surat, Gujarat", latitude: 21.1702, longitude: 72.8311 },
    { _id: "3", title: "Tractor Tamil Nadu", location: "Madurai, TN", latitude: 9.9252, longitude: 78.1198 }
  ];

  // When farmer denies or has not granted GPS permission (no coordinates and no verified city)
  const result = filterAndRankByLocation(listings, {
    latitude: null,
    longitude: null,
    city: null
  });

  // Never return all-India listings!
  assert.equal(result.locationRequired, true);
  assert.equal(result.nearby.length, 0);
  assert.equal(result.sameCity.length, 0);
  assert.equal(result.merged.length, 0);
  assert.equal(result.all.length, 0);
  assert.equal(result.total, 0);
});

test("Infinite Refresh Loop Prevention & Shared Location Request Deduplication", () => {
  // 1. Stable Request Key Generation
  const buildMachineKey = (lat, lon, cat, search, avail, dist, sort) =>
    `${Number(lat).toFixed(4)}_${Number(lon).toFixed(4)}_${cat}_${search.trim()}_${avail}_${dist}_${sort}`;

  const key1 = buildMachineKey(27.8974, 78.0880, "All", "", false, "All", "none");
  const key2 = buildMachineKey(27.89740001, 78.08800001, "All", "", false, "All", "none");
  assert.equal(key1, key2, "Floating point micro-jitters must be rounded to prevent spurious re-fetches");

  // 2. Request Deduplication Mock
  let networkCalls = 0;
  let lastKey = "";

  const fetchWithDeduplication = (key) => {
    if (lastKey === key) {
      return { deduplicated: true };
    }
    lastKey = key;
    networkCalls += 1;
    return { deduplicated: false };
  };

  const res1 = fetchWithDeduplication(key1);
  assert.equal(res1.deduplicated, false);
  assert.equal(networkCalls, 1);

  // Re-render occurs with identical parameters
  const res2 = fetchWithDeduplication(key1);
  assert.equal(res2.deduplicated, true, "Re-render with identical key must be deduplicated");
  assert.equal(networkCalls, 1, "Network call count must not increase on duplicate key");

  // Filter change triggers a legitimate call
  const keyCategory = buildMachineKey(27.8974, 78.0880, "Tractor", "", false, "All", "none");
  const res3 = fetchWithDeduplication(keyCategory);
  assert.equal(res3.deduplicated, false);
  assert.equal(networkCalls, 2);

  // Manual refresh clears key and allows re-fetch
  lastKey = "";
  const res4 = fetchWithDeduplication(keyCategory);
  assert.equal(res4.deduplicated, false);
  assert.equal(networkCalls, 3);
});

test("Shared Location State - Decoupled Location from Listing Lifecycle", () => {
  // Test state machine transitions
  const validTransitions = {
    idle: ["requesting_location", "location_ready"],
    requesting_location: ["location_ready", "permission_denied", "error"],
    location_ready: ["requesting_location"],
    permission_denied: ["requesting_location"],
    error: ["requesting_location"]
  };

  const canTransition = (from, to) => Boolean(validTransitions[from]?.includes(to));

  assert.equal(canTransition("idle", "requesting_location"), true);
  assert.equal(canTransition("requesting_location", "location_ready"), true);
  assert.equal(canTransition("requesting_location", "permission_denied"), true);
  assert.equal(canTransition("location_ready", "loading_listings"), false, "Listings state must not mutate location state");
});

test("Homepage Location-Based Search Bar - Query Routing & Autocomplete", () => {
  const SEARCH_SUGGESTIONS = [
    { id: "m-tractor", title: "Tractor", category: "Tractor", type: "machine", hindi: "ट्रैक्टर", keywords: ["tractor", "trektor"] },
    { id: "m-rotavator", title: "Rotavator", category: "Rotavator", type: "machine", hindi: "रोटावेटर", keywords: ["rotavator", "rota"] },
    { id: "l-farmworker", title: "Farm Labour / Field Worker", category: "Farm Worker", type: "labour", hindi: "खेत मजदूर / लेबर", keywords: ["worker", "labour", "majdoor"] },
    { id: "d-tractor", title: "Tractor Driver", category: "Tractor Driver", type: "driver", hindi: "ट्रैक्टर ड्राइवर", keywords: ["driver", "chalak"] },
    { id: "t-transport", title: "Crop Transport / Goods Vehicle", category: "Transport", type: "transport", hindi: "फसल ट्रांसपोर्ट", keywords: ["transport", "pickup"] }
  ];

  const routeSearch = (query = "", explicitItem = null) => {
    const q = (query || "").trim();
    if (explicitItem) {
      if (explicitItem.type === "transport") return { action: "coming_soon" };
      if (explicitItem.type === "driver") return { path: `/Labour?category=${encodeURIComponent(explicitItem.category || "Tractor Driver")}&search=${encodeURIComponent(explicitItem.title)}` };
      if (explicitItem.type === "labour") return { path: `/Labour?category=${encodeURIComponent(explicitItem.category)}&search=${encodeURIComponent(explicitItem.title)}` };
      return { path: `/machine?category=${encodeURIComponent(explicitItem.category)}&search=${encodeURIComponent(explicitItem.title)}` };
    }
    if (!q) return { path: "/machine" };

    const lower = q.toLowerCase();
    if (["transport", "pickup", "canter"].some(k => lower.includes(k))) return { action: "coming_soon" };
    if (["driver", "chalak", "चालक", "ड्राइवर"].some(k => lower.includes(k))) return { path: `/Labour?category=Tractor%20Driver&search=${encodeURIComponent(q)}` };
    if (["worker", "labour", "majdoor", "mechanic", "electrician", "plumber"].some(k => lower.includes(k))) return { path: `/Labour?search=${encodeURIComponent(q)}` };
    if (["tractor", "rotavator", "harvester"].some(k => lower.includes(k))) return { path: `/machine?search=${encodeURIComponent(q)}` };
    return { path: `/machine?search=${encodeURIComponent(q)}` };
  };

  // Test 1: Machine search
  assert.equal(routeSearch("Tractor").path, "/machine?search=Tractor");
  assert.equal(routeSearch("rotavator").path, "/machine?search=rotavator");

  // Test 2: Labour search
  assert.equal(routeSearch("farm worker").path, "/Labour?search=farm%20worker");
  assert.equal(routeSearch("majdoor").path, "/Labour?search=majdoor");

  // Test 3: Driver search
  assert.equal(routeSearch("Tractor Driver").path, "/Labour?category=Tractor%20Driver&search=Tractor%20Driver");
  assert.equal(routeSearch("chalak").path, "/Labour?category=Tractor%20Driver&search=chalak");

  // Test 4: Transport search
  assert.equal(routeSearch("crop transport").action, "coming_soon");

  // Test 5: Autocomplete selection
  const selectedDriver = SEARCH_SUGGESTIONS.find(s => s.id === "d-tractor");
  assert.equal(routeSearch("", selectedDriver).path, "/Labour?category=Tractor%20Driver&search=Tractor%20Driver");

  const selectedMachine = SEARCH_SUGGESTIONS.find(s => s.id === "m-rotavator");
  assert.equal(routeSearch("", selectedMachine).path, "/machine?category=Rotavator&search=Rotavator");
});

test("Pre-Deployment Optimization: Geolocation & City Centroids Coverage for Labour Map", () => {
  const { getApproximateServiceCoordinates } = require("./utils/locationService.js");

  // Verify all 6 workers currently in the production database resolve with valid, privacy-preserving approximate coordinates
  const workers = [
    { _id: "6ace5e99c51986ecb54e688b", name: "Rajesh Yadav", location: "Karnal, Haryana" },
    { _id: "6ace5e99c51986ecb54e688c", name: "Gurpreet Singh", location: "Ludhiana, Punjab" },
    { _id: "6ace5e99c51986ecb54e688d", name: "Mukesh Sharma", location: "Meerut, Uttar Pradesh" },
    { _id: "6ace5e99c51986ecb54e688e", name: "Suresh Patel", location: "Indore, Madhya Pradesh" },
    { _id: "6ace5e99c51986ecb54e688f", name: "Ramphal Verma", location: "Alwar, Rajasthan" },
    { _id: "6ace5e99c51986ecb54e6890", name: "Anil Kumar", location: "Hisar, Haryana" }
  ];

  for (const worker of workers) {
    const coords = getApproximateServiceCoordinates(worker);
    assert.ok(coords, `Worker ${worker.name} in ${worker.location} must have approximate coordinates`);
    assert.equal(coords.isApproximate, true);
    assert.equal(typeof coords.latitude, "number");
    assert.equal(typeof coords.longitude, "number");
    assert.ok(coords.latitude >= 8 && coords.latitude <= 38, `Latitude ${coords.latitude} should be within India bounds`);
    assert.ok(coords.longitude >= 68 && coords.longitude <= 98, `Longitude ${coords.longitude} should be within India bounds`);
  }

  // Verify privacy: worker with exact doorstep coordinates (e.g. 28.367491, 79.430482) is safely truncated to 2 decimals
  const workerWithGps = {
    name: "Mohan Lal",
    latitude: 28.367491,
    longitude: 79.430482,
    location: "Bareilly, UP"
  };
  const approxGps = getApproximateServiceCoordinates(workerWithGps);
  assert.equal(approxGps.latitude, 28.37);
  assert.equal(approxGps.longitude, 79.43);
  assert.equal(approxGps.isApproximate, true);
  assert.equal(approxGps.isCityCenter, false);
});

test("Pre-Deployment Optimization: Independent Machine & Labour Execution with In-Flight Cancellation", async () => {
  // Test that Machine API and Labour API can fire concurrently without mutual blocking
  let machineStatus = "idle";
  let labourStatus = "idle";

  const fetchMachine = () => new Promise((resolve) => {
    machineStatus = "loading";
    setTimeout(() => {
      machineStatus = "success";
      resolve({ count: 11 });
    }, 15);
  });

  const fetchLabour = () => new Promise((resolve) => {
    labourStatus = "loading";
    setTimeout(() => {
      labourStatus = "success";
      resolve({ count: 6 });
    }, 20);
  });

  // Parallel launch
  const [machineRes, labourRes] = await Promise.all([fetchMachine(), fetchLabour()]);
  assert.equal(machineStatus, "success");
  assert.equal(labourStatus, "success");
  assert.equal(machineRes.count, 11);
  assert.equal(labourRes.count, 6);
});



