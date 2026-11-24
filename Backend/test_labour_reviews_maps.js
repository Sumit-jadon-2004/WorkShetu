const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const Review = require("./models/Review.js");
const Labour = require("./models/Labour.js");
const Booking = require("./models/BookingMachine.js");
const labourReviewRoutes = require("./routes/labourReviewsMaps.js");
const { isLoggedIn } = require("./middleware/auth.js");
const { canManageReview, canReviewProfile, hasValidCoordinatePair, ownedReviewQuery, validateReviewInput } = labourReviewRoutes.reviewPolicy;

test("Labour Review: bookingId unique index is present", () => {
  assert.ok(Review.schema.indexes().some(([keys, options]) => keys.bookingId === 1 && options.unique === true));
});

test("Labour Review: rating and verified booking fields are enforced", () => {
  assert.equal(Review.schema.path("rating").isRequired, true);
  assert.equal(Review.schema.path("labour").options.index, true);
  assert.ok(Review.schema.indexes().some(([keys, options]) =>
    keys.bookingId === 1 && options.unique === true && options.sparse === true
  ));
});

test("Labour Location: public privacy fields exist", () => {
  assert.ok(Labour.schema.path("mapVisibilityConsent"));
  assert.ok(Labour.schema.path("publicLocation"));
  assert.ok(Labour.schema.path("latitude"));
  assert.ok(Labour.schema.path("longitude"));
});

test("Labour Review: visible-only moderation status is supported", () => {
  assert.deepEqual(Review.schema.path("status").enumValues, ["Visible", "Hidden", "Pending", "Rejected"]);
  assert.equal(Review.schema.path("verifiedBooking").defaultValue, false);
});

test("Labour Review: authenticated identity is required on create, edit, and delete routes", () => {
  for (const [method, path] of [
    ["post", "/:id/reviews"],
    ["put", "/:id/reviews/:reviewId"],
    ["delete", "/:id/reviews/:reviewId"]
  ]) {
    const route = labourReviewRoutes.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
    assert.ok(route, `${method.toUpperCase()} ${path} route exists`);
    assert.ok(route.route.stack.some((layer) => layer.handle === isLoggedIn), `${method.toUpperCase()} ${path} uses session authentication`);
  }
});

test("Labour Review: profile owner is forbidden from creating a review", () => {
  assert.equal(canReviewProfile({ owner: "farmer-a" }, "farmer-a"), false);
  assert.equal(canReviewProfile({ owner: "labour-b" }, "farmer-a"), true);
});

test("Labour Review: only original reviewer can edit or delete; legacy author ownership remains supported", () => {
  const review = { reviewerId: "farmer-a", author: "farmer-a" };
  assert.equal(canManageReview(review, "farmer-a"), true);
  assert.equal(canManageReview(review, "farmer-c"), false);
  assert.equal(canManageReview({ author: "farmer-a" }, "farmer-a"), true);
});

test("Labour Review: mutations are scoped to both Labour profile and review IDs", () => {
  assert.deepEqual(ownedReviewQuery("labour-b", "review-1", "farmer-a"), {
    _id: "review-1",
    labour: "labour-b",
    $or: [{ reviewerId: "farmer-a" }, { reviewerId: { $exists: false }, author: "farmer-a" }]
  });
});

test("Labour Review: rating and written feedback are validated", () => {
  assert.deepEqual(validateReviewInput({ rating: 5, comment: "Reliable and careful work." }), {
    rating: 5,
    comment: "Reliable and careful work."
  });
  assert.match(validateReviewInput({ rating: 0, comment: "Long enough review text" }).error, /Rating/);
  assert.match(validateReviewInput({ rating: 4, comment: "short" }).error, /at least 10/);
  assert.match(validateReviewInput({ rating: 4.5, comment: "Long enough review text" }).error, /Rating/);
});

test("Labour Location: missing or out-of-range coordinates are not mapped", () => {
  assert.equal(hasValidCoordinatePair(null, null), false);
  assert.equal(hasValidCoordinatePair("", ""), false);
  assert.equal(hasValidCoordinatePair(91, 80), false);
  assert.equal(hasValidCoordinatePair(28.6, 77.2), true);
});

test("Labour Review: unauthenticated users receive 401 from the shared auth gate", () => {
  let statusCode;
  let responseBody;
  let nextCalled = false;
  const req = { isAuthenticated: () => false };
  const res = {
    status(code) { statusCode = code; return this; },
    json(body) { responseBody = body; return this; }
  };
  isLoggedIn(req, res, () => { nextCalled = true; });
  assert.equal(statusCode, 401);
  assert.equal(responseBody.success, false);
  assert.equal(nextCalled, false);
});

test("Labour Review API: create, reject self-review, edit and delete only by the original reviewer", async () => {
  const ids = {
    labour: new mongoose.Types.ObjectId().toString(),
    otherLabour: new mongoose.Types.ObjectId().toString(),
    farmerA: new mongoose.Types.ObjectId().toString(),
    farmerC: new mongoose.Types.ObjectId().toString(),
    owner: new mongoose.Types.ObjectId().toString(),
    bookingA: new mongoose.Types.ObjectId().toString(),
    bookingA2: new mongoose.Types.ObjectId().toString(),
    bookingC: new mongoose.Types.ObjectId().toString()
  };
  const original = {
    labourFindById: Labour.findById,
    labourFindByIdAndUpdate: Labour.findByIdAndUpdate,
    bookingFindOne: Booking.findOne,
    reviewExists: Review.exists,
    reviewCreate: Review.create,
    reviewFindOne: Review.findOne,
    reviewDeleteOne: Review.deleteOne,
    reviewAggregate: Review.aggregate
  };
  const labour = { _id: ids.labour, owner: ids.owner };
  const reviews = [];
  const bookings = [
    { _id: ids.bookingA, customer: ids.farmerA, itemId: ids.labour, requestType: "Labour", status: "Completed" },
    { _id: ids.bookingA2, customer: ids.farmerA, itemId: ids.labour, requestType: "Labour", status: "Completed" },
    { _id: ids.bookingC, customer: ids.farmerC, itemId: ids.labour, requestType: "Labour", status: "Completed" }
  ];
  let reviewSequence = 0;

  Labour.findById = (id) => ({ select: () => ({ lean: async () => String(id) === ids.otherLabour ? { _id: ids.otherLabour, owner: ids.owner } : labour }) });
  Labour.findByIdAndUpdate = async () => {};
  Booking.findOne = (query) => ({
    lean: async () => bookings.find((booking) =>
      String(booking._id) === String(query._id) &&
      String(booking.customer) === String(query.customer) &&
      String(booking.itemId) === String(query.itemId) &&
      booking.requestType === query.requestType && booking.status === query.status
    ) || null
  });
  Review.exists = async (query) => {
    if (query.bookingId) return reviews.some((review) => String(review.bookingId) === String(query.bookingId));
    return false;
  };
  Review.create = async (fields) => {
    const review = {
      ...fields,
      _id: new mongoose.Types.ObjectId().toString(),
      async save() {}
    };
    reviews.push(review);
    reviewSequence += 1;
    return review;
  };
  Review.findOne = (query) => {
    let matched = null;
    if (query._id) {
      matched = reviews.find((review) =>
        String(review._id) === String(query._id) && String(review.labour) === String(query.labour)
      ) || null;
    } else if (query.labour && query.$or) {
      const u1 = String(query.$or[0].reviewerId);
      const u2 = String(query.$or[1]?.author);
      matched = reviews.find((review) =>
        String(review.labour) === String(query.labour) &&
        (String(review.reviewerId) === u1 || String(review.author) === u2)
      ) || null;
    }
    return {
      ...matched,
      lean: async () => matched,
      then: (resolve) => resolve(matched)
    };
  };
  Review.deleteOne = async (query) => {
    const index = reviews.findIndex((review) => String(review._id) === String(query._id) &&
      String(review.labour) === String(query.labour) &&
      (String(review.reviewerId) === String(query.$or[0].reviewerId) || String(review.author) === String(query.$or[1].author)));
    if (index < 0) return { deletedCount: 0 };
    reviews.splice(index, 1);
    return { deletedCount: 1 };
  };
  Review.aggregate = async () => reviews.length
    ? [{ average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length, count: reviews.length }]
    : [];

  const call = async (method, routePath, params, user, body = {}) => {
    const layer = labourReviewRoutes.stack.find((entry) => entry.route?.path === routePath && entry.route.methods[method]);
    assert.ok(layer, `${method.toUpperCase()} ${routePath} route exists`);
    const handler = layer.route.stack[layer.route.stack.length - 1].handle;
    const result = { statusCode: 200, body: null };
    const req = { params, user: { _id: user, fullName: `user-${user}` }, body };
    const res = {
      status(code) { result.statusCode = code; return this; },
      json(json) { result.body = json; return this; }
    };
    await handler(req, res);
    return result;
  };

  try {
    const created = await call("post", "/:id/reviews", { id: ids.labour }, ids.farmerA, {
      bookingId: ids.bookingA,
      rating: 5,
      comment: "Reliable and careful work."
    });
    assert.equal(created.statusCode, 201, "Farmer A can review Labour B after completed work");
    const reviewId = created.body.review._id;
    assert.equal(reviews[0].reviewerId, ids.farmerA, "review owner comes from session identity");

    const selfReview = await call("post", "/:id/reviews", { id: ids.labour }, ids.owner, {
      bookingId: ids.bookingA,
      rating: 5,
      comment: "I am reviewing my own profile."
    });
    assert.equal(selfReview.statusCode, 403, "Labour owner cannot review their profile");

    const secondVerifiedReview = await call("post", "/:id/reviews", { id: ids.labour }, ids.farmerA, {
      bookingId: ids.bookingA2,
      rating: 4,
      comment: "Another completed job review."
    });
    assert.equal(secondVerifiedReview.statusCode, 201, "separate completed bookings support separate verified reviews");
    const duplicate = await call("post", "/:id/reviews", { id: ids.labour }, ids.farmerA, {
      bookingId: ids.bookingA,
      rating: 4,
      comment: "Duplicate for the same completed booking."
    });
    assert.equal(duplicate.statusCode, 409, "duplicate review for the same booking is rejected");

    const foreignEdit = await call("put", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.farmerC, {
      rating: 1,
      comment: "Attempt to edit someone else's review."
    });
    assert.equal(foreignEdit.statusCode, 403, "another customer cannot edit the review");

    const ownEdit = await call("put", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.farmerA, {
      rating: 4,
      comment: "Updated after another careful review."
    });
    assert.equal(ownEdit.statusCode, 200, "reviewer can edit their own review");
    assert.equal(reviews[0].rating, 4);
    assert.equal(reviews[0].reviewerId, ids.farmerA, "editing preserves review ownership");

    const crossProfileEdit = await call("put", "/:id/reviews/:reviewId", { id: ids.otherLabour, reviewId }, ids.farmerA, {
      rating: 3,
      comment: "Wrong profile scope test."
    });
    assert.equal(crossProfileEdit.statusCode, 404, "review cannot be edited through a different profile ID");

    const directReview = await call("post", "/:id/reviews", { id: ids.labour }, ids.farmerC, {
      rating: 5,
      comment: "Direct feedback from satisfied client."
    });
    assert.equal(directReview.statusCode, 201, "Eligible customer can review without booking ID");
    assert.equal(reviews[2].verifiedBooking, false, "Direct review without booking is unverified");

    const duplicateDirectReview = await call("post", "/:id/reviews", { id: ids.labour }, ids.farmerC, {
      rating: 4,
      comment: "Trying to submit a second unverified review."
    });
    assert.equal(duplicateDirectReview.statusCode, 409, "Duplicate review by same user without booking is rejected");

    const ownerEditAttempt = await call("put", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.owner, {
      rating: 5,
      comment: "Owner attempting to alter customer review."
    });
    assert.equal(ownerEditAttempt.statusCode, 403, "Profile owner cannot edit customer reviews");

    const ownerDeleteAttempt = await call("delete", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.owner);
    assert.equal(ownerDeleteAttempt.statusCode, 403, "Profile owner cannot delete customer reviews");

    const foreignDelete = await call("delete", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.farmerC);
    assert.equal(foreignDelete.statusCode, 403, "another customer cannot delete the review");
    assert.equal(reviews.length, 3);

    const ownDelete = await call("delete", "/:id/reviews/:reviewId", { id: ids.labour, reviewId }, ids.farmerA);
    assert.equal(ownDelete.statusCode, 200, "reviewer can delete their own review");
    assert.equal(reviews.length, 2);
    assert.equal(reviewSequence, 3);
  } finally {
    Labour.findById = original.labourFindById;
    Labour.findByIdAndUpdate = original.labourFindByIdAndUpdate;
    Booking.findOne = original.bookingFindOne;
    Review.exists = original.reviewExists;
    Review.create = original.reviewCreate;
    Review.findOne = original.reviewFindOne;
    Review.deleteOne = original.reviewDeleteOne;
    Review.aggregate = original.reviewAggregate;
  }
});

test("Labour Map UI: map is rendered from profile view only, not marketplace", () => {
  const projectRoot = path.resolve(__dirname, "..");
  const marketplace = fs.readFileSync(path.join(projectRoot, "Frontend/src/Pages/Labour/Labours.jsx"), "utf8");
  const profile = fs.readFileSync(path.join(projectRoot, "Frontend/src/Pages/Labour/LabourProfile.jsx"), "utf8");
  assert.doesNotMatch(marketplace, /LabourMap|WorkerLocationMap|\/api\/labour\/map/);
  assert.match(profile, /<WorkerLocationMap/);
});

test("Labour Location: missing or private location returns clean unavailable state without breaking", async () => {
  const layer = labourReviewRoutes.stack.find((entry) => entry.route?.path === "/:id/location" && entry.route.methods.get);
  assert.ok(layer, "GET /:id/location route exists");
  const handler = layer.route.stack[layer.route.stack.length - 1].handle;

  const originalFindById = Labour.findById;
  try {
    // Worker without coordinates or consent
    Labour.findById = () => ({ lean: async () => ({ _id: "worker-1", mapVisibilityConsent: false, latitude: null, longitude: null }) });
    let result = null;
    const req = { params: { id: new mongoose.Types.ObjectId().toString() } };
    const res = { json: (data) => { result = data; } };
    await handler(req, res);
    assert.equal(result.success, true);
    assert.equal(result.locationVisible, false);
    assert.equal(result.coordinates, null);

    // Worker with valid coordinates and consent
    Labour.findById = () => ({ lean: async () => ({
      _id: "worker-2",
      mapVisibilityConsent: true,
      latitude: 28.613939,
      longitude: 77.209021,
      publicLocation: "New Delhi Central",
      serviceRadiusKm: 25
    }) });
    await handler(req, res);
    assert.equal(result.success, true);
    assert.equal(result.locationVisible, true);
    assert.equal(result.coordinates.latitude, 28.61);
    assert.equal(result.coordinates.longitude, 77.21);
    assert.equal(result.publicLocation, "New Delhi Central");
    assert.equal(result.serviceRadiusKm, 25);
  } finally {
    Labour.findById = originalFindById;
  }
});

test("Labour Map Privacy: exact worker coordinates are never leaked in public API", () => {
  const { getApproximateServiceCoordinates } = require("./utils/locationService");

  // 1. Exact GPS coordinates are rounded to 2 decimal places to hide exact home/doorstep
  const workerWithGps = {
    _id: "w-1",
    latitude: 27.897451,
    longitude: 78.088019,
    location: "Civil Lines, Aligarh"
  };
  const approx = getApproximateServiceCoordinates(workerWithGps);
  assert.ok(approx);
  assert.equal(approx.latitude, 27.90);
  assert.equal(approx.longitude, 78.09);
  assert.notEqual(approx.latitude, workerWithGps.latitude);
  assert.notEqual(approx.longitude, workerWithGps.longitude);
  assert.equal(approx.isApproximate, true);

  // 2. Worker with no GPS coordinates uses verified city centroid
  const workerWithCityOnly = {
    _id: "w-2",
    latitude: null,
    longitude: null,
    location: "Aligarh, Uttar Pradesh"
  };
  const cityCoords = getApproximateServiceCoordinates(workerWithCityOnly);
  assert.ok(cityCoords);
  assert.equal(cityCoords.isCityCenter, true);
  assert.equal(cityCoords.latitude, 27.8974);
  assert.equal(cityCoords.longitude, 78.0880);

  // 3. Worker with missing location data returns null without crashing or faking
  const workerUnknown = {
    _id: "w-3",
    latitude: null,
    longitude: null,
    location: "Unknown Jungle Area"
  };
  assert.equal(getApproximateServiceCoordinates(workerUnknown), null);
});
