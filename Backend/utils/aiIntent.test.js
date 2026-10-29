const test = require("node:test");
const assert = require("node:assert/strict");
const { detectIntent, knownMachineIds, sanitizeHistory, searchFilters, serviceSearchFilters } = require("./aiIntent.js");

const userWithLocation = { latitude: 27.8974, longitude: 78.0880 };
const listingId = "64c000000000000000000001";
const listingHistory = sanitizeHistory([
  { role: "user", content: "Mujhe tractor chahiye" },
  { role: "assistant", content: "A WorkShetu listing was returned.", recommendations: [{ machineId: listingId }] }
]);

test("greetings and assistant identity are general conversation, not machine search", () => {
  assert.equal(detectIntent("app kon ho", [], userWithLocation).type, "general");
  assert.equal(detectIntent("hello", [], userWithLocation).type, "general");
  assert.equal(detectIntent("tum kya kar sakte ho", [], userWithLocation).type, "general");
  assert.equal(detectIntent("WorkShetu kya hai", [], userWithLocation).type, "general");
  assert.equal(detectIntent("thank you", [], userWithLocation).type, "general");
});

test("a tractor request selects machine search", () => {
  assert.equal(detectIntent("mujhe tractor chahiye", [], userWithLocation).type, "search");
  assert.equal(detectIntent("mujhe farm worker chahiye", [], userWithLocation).type, "labour");
});

test("budget forms extract an INR maximum", () => {
  assert.equal(searchFilters("5000 ke andar tractor dikhao", []).maxPrice, 5000);
  assert.equal(searchFilters("5 hazar tak tractor", []).maxPrice, 5000);
  assert.equal(searchFilters("maximum 5000", []).maxPrice, 5000);
  assert.equal(searchFilters("I need a tractor under ₹5000", []).maxPrice, 5000);
  assert.equal(searchFilters("5 lakh ke andar tractor", []).maxPrice, 500000);
  assert.equal(searchFilters("tractor with 40 HP", []).power, 40);
});

test("location text is retained as a city filter", () => {
  assert.equal(searchFilters("Aligarh me tractor dikhao", []).location, "Aligarh");
  assert.equal(searchFilters("Aligarh ke paas tractor", []).location, "Aligarh");
  assert.equal(searchFilters("John Deere tractor dikhao", []).searchText, "John Deere");
  assert.equal(searchFilters("John Deere dikhao", []).category, undefined);
});

test("nearby searches require saved coordinates and land ownership is not mistaken for nearby", () => {
  assert.equal(detectIntent("mere nearby tractor dikhao", [], userWithLocation).type, "nearby");
  assert.equal(detectIntent("10 km ke andar tractor dikhao", [], userWithLocation).type, "nearby");
  assert.equal(detectIntent("mere paas tractor dikhao", [], null).type, "clarify");
  assert.equal(detectIntent("Mere paas 10 bigha zameen hai, kaunsi machine suitable rahegi?", [], userWithLocation).type, "search");
});

test("details require a machine ID from the user or chat cards", () => {
  assert.equal(detectIntent("ye tractor kitne HP ka hai?", listingHistory, userWithLocation).type, "details");
  assert.equal(detectIntent("tell me about this tractor", listingHistory, userWithLocation).type, "details");
  assert.equal(detectIntent("ye tractor kitne HP ka hai?", [], userWithLocation).type, "clarify");
});

test("availability checks require a known listing and preserve date context", () => {
  assert.equal(detectIntent("ye tractor kal available hai?", listingHistory, userWithLocation).type, "availability");
  assert.equal(detectIntent("tractor kal available hai?", [], userWithLocation).type, "search");
  assert.match(searchFilters("10 October ko available hai?", listingHistory).availableOn, /^\d{4}-10-10$/);
});

test("follow-up budget and city messages retain prior machine category", () => {
  const previousSearch = sanitizeHistory([{ role: "user", content: "tractor chahiye" }]);
  assert.equal(detectIntent("5000 tak", previousSearch, userWithLocation).type, "search");
  const combined = sanitizeHistory([...previousSearch, { role: "assistant", content: "What location?" }, { role: "user", content: "5000 tak" }]);
  assert.equal(searchFilters("Aligarh ke paas", combined).category, "Tractor");
  assert.equal(searchFilters("Aligarh ke paas", combined).maxPrice, 5000);
});

test("short follow-ups reuse machine search context and keep nearby coordinates gated", () => {
  const previousSearch = sanitizeHistory([
    { role: "user", content: "5 lakh ke andar tractor chahiye" },
    { role: "assistant", content: "I found listings." }
  ]);
  assert.equal(detectIntent("koi or hai?", previousSearch, userWithLocation).type, "search");
  assert.equal(searchFilters("koi or hai?", previousSearch).maxPrice, 500000);
  assert.equal(detectIntent("nearby bhi", previousSearch, userWithLocation).type, "nearby");
  assert.equal(detectIntent("nearby bhi", previousSearch, null).type, "clarify");
  assert.equal(detectIntent("Are there any other tractors?", [], userWithLocation).type, "search");
  assert.equal(detectIntent("क्या कोई दूसरा ट्रैक्टर है?", [], userWithLocation).type, "search");
});

test("land-area and budget extraction do not assert machine suitability", () => {
  const args = searchFilters("Mere paas 10 bigha zameen hai aur 5000 budget hai tractor chahiye", []);
  assert.equal(args.landArea, 10);
  assert.equal(args.areaUnit, "Bigha");
  assert.equal(args.maxPrice, 5000);
  assert.equal(args.category, "Tractor");
  assert.equal(searchFilters("2 acres of land, find a cultivator", []).areaUnit, "Acre");
  assert.equal(searchFilters("3 hectare farm, find a harvester", []).areaUnit, "Hectare");
});

test("native Hindi requests detect intent and extract Devanagari filters", () => {
  const hindiTractor = "\u092e\u0941\u091d\u0947 \u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930 \u091a\u093e\u0939\u093f\u090f";
  const hindiHello = "\u0928\u092e\u0938\u094d\u0924\u0947";
  assert.equal(detectIntent(hindiHello, [], userWithLocation).type, "general");
  assert.equal(detectIntent(hindiTractor, [], userWithLocation).type, "search");
  const filters = searchFilters("\u092e\u0947\u0930\u0947 \u092a\u093e\u0938 10 \u092c\u0940\u0918\u093e \u091c\u092e\u0940\u0928 \u0939\u0948, 5000 \u0915\u0947 \u0905\u0902\u0926\u0930 \u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930 \u091a\u093e\u0939\u093f\u090f", []);
  assert.equal(filters.landArea, 10);
  assert.equal(filters.areaUnit, "Bigha");
  assert.equal(filters.maxPrice, 5000);
  assert.equal(filters.category, "Tractor");
  assert.equal(searchFilters("\u0906\u0917\u0930\u093e \u092e\u0947\u0902 \u091f\u094d\u0930\u0948\u0915\u094d\u091f\u0930 \u0926\u093f\u0916\u093e\u0913", []).location, "\u0906\u0917\u0930\u093e");
});

test("labour and transport searches use schema types and service follow-up context without machine IDs", () => {
  assert.equal(detectIntent("tractor driver chahiye", [], userWithLocation).type, "labour");
  assert.equal(detectIntent("pickup transport chahiye", [], userWithLocation).type, "transport");
  assert.equal(detectIntent("farm worker nearby", [], null).type, "clarify");
  const serviceId = "64c000000000000000000002";
  const serviceHistory = sanitizeHistory([
    { role: "user", content: "tractor driver in Aligarh" },
    { role: "assistant", content: "One actual WorkShetu result.", recommendations: [{ type: "labour", serviceId, service: { _id: serviceId, serviceType: "Labour", title: "Listing", category: "Tractor Driver" } }] }
  ]);
  assert.deepEqual(knownMachineIds("", serviceHistory), []);
  assert.equal(detectIntent("koi aur hai?", serviceHistory, userWithLocation).type, "labour");
  assert.equal(serviceSearchFilters("labour", "4 lakh tak", serviceHistory).maxPrice, 400000);
});
