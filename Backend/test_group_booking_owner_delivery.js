const assert = require("node:assert/strict");
const http = require("node:http");
const mongoose = require("mongoose");
const express = require("express");

const User = require("./models/Owner.js");
const Machine = require("./models/ListingMachin.js");
const GroupBooking = require("./models/GroupBooking.js");
const Booking = require("./models/BookingMachine.js");
const groupBookingsRouter = require("./routes/groupBookings.js");

function createApp() {
  const app = express();
  app.use(express.json());

  // Test session mock middleware
  app.use((req, res, next) => {
    if (req.headers["x-test-user-id"]) {
      req.user = {
        _id: new mongoose.Types.ObjectId(req.headers["x-test-user-id"]),
        role: req.headers["x-test-user-role"] || "Driver",
        driverApplicationStatus: req.headers["x-test-driver-status"] || "Approved",
        isActive: req.headers["x-test-active"] !== "false",
        isAdmin: req.headers["x-test-is-admin"] === "true",
      };
      req.isAuthenticated = () => true;
    }
    next();
  });

  app.use("/api/group-bookings", groupBookingsRouter);
  return app;
}

async function runTest() {
  console.log("================================================================================");
  console.log("   GROUP BOOKING OWNER REQUEST DELIVERY TEST");
  console.log("================================================================================");

  const ownerId = new mongoose.Types.ObjectId();
  const farmerId = new mongoose.Types.ObjectId();
  const machineId = new mongoose.Types.ObjectId();

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const origFind = GroupBooking.find;
  let capturedQuery = null;

  GroupBooking.find = function (query) {
    capturedQuery = query;
    return {
      sort: () => ({
        populate: () => ({
          populate: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              owner: ownerId,
              status: "Forming",
              totalLandArea: 2,
              members: [{ user: { _id: farmerId, fullName: "Ramesh Farmer" }, landArea: 2, originalPrice: 2000, finalPrice: 1800 }],
              listing: { _id: machineId, title: "Mahindra 575 DI", price: 1000, unit: "Bigha" },
              toObject() { return { ...this }; }
            }
          ]
        })
      })
    };
  };

  const origBookingFind = Booking.find;
  Booking.find = function (query) {
    if (query && query.responseDeadline) {
      return Promise.resolve([]);
    }
    const chain = {
      sort: () => chain,
      populate: () => chain,
      then: (resolve) => resolve([])
    };
    return chain;
  };

  const origMachineExists = Machine.exists;

  try {
    console.log("--- TEST 1: Forming & RequestSent groups query filter in groupBookings.js ---");
    const response1 = await fetch(`${baseUrl}/api/group-bookings/owner/requests`, {
      headers: {
        "x-test-user-id": ownerId.toHexString(),
        "x-test-user-role": "Driver",
        "x-test-driver-status": "Approved",
        "x-test-active": "true"
      }
    });

    if (response1.status !== 200) {
      const errText = await response1.text();
      console.error("Endpoint returned status:", response1.status, errText);
    }
    assert.equal(response1.status, 200);
    const data1 = await response1.json();
    assert.ok(capturedQuery, "GroupBooking.find was called");
    assert.deepEqual(
      capturedQuery.status,
      { $nin: ["Rejected", "Cancelled", "Completed", "Expired"] },
      "Status query must NOT exclude Forming so owner receives group requests while pooling"
    );
    assert.equal(data1.groups.length, 1, "Owner received the forming group request");
    assert.equal(data1.groups[0].status, "Forming");
    console.log("  [PASS] Owner receives GroupBooking with status 'Forming' (Request successfully delivered to owner)");

    console.log("--- TEST 2: requireOwner middleware for machine owner without Driver role ---");
    Machine.exists = async () => true;

    const response2 = await fetch(`${baseUrl}/api/group-bookings/owner/requests`, {
      headers: {
        "x-test-user-id": ownerId.toHexString(),
        "x-test-user-role": "Farmer",
        "x-test-driver-status": "None",
        "x-test-active": "true"
      }
    });

    assert.equal(response2.status, 200, "Machine owner with role 'Farmer' can also access owner/requests");
    console.log("  [PASS] Machine owner with active machine listing successfully accesses /owner/requests");
  } finally {
    server.close();
    GroupBooking.find = origFind;
    Booking.find = origBookingFind;
    Machine.exists = origMachineExists;
  }

  console.log("================================================================================");
  console.log("   GROUP BOOKING OWNER DELIVERY TEST PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
