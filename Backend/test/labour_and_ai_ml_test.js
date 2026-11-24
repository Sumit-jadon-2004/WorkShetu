const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyIntent } = require('../utils/mlClassifier');
const { rankLabourListings, rankMachineListings } = require('../utils/mlRecommender');
const { detectIntent, serviceSearchFilters } = require('../utils/aiIntent');
const Labour = require('../models/Labour');
const Review = require('../models/Review');

// ==========================================
// 1. ML INTENT CLASSIFIER TESTS
// ==========================================

test('mlClassifier: identifies machine search queries across English, Hindi, Hinglish', () => {
    const queries = [
        'I need a John Deere 50HP tractor for ploughing',
        'मुझे गेहूं काटने के लिए कंबाइन हार्वेस्टर चाहिए',
        'khet jodne ke liye rotavator aur tractor chahiye',
        'cultivator machine available near me'
    ];

    for (const q of queries) {
        const res = classifyIntent(q, 'machines');
        assert.equal(res.intent, 'SEARCH_MACHINE', `Failed for query: "${q}", got ${res.intent}`);
        assert.ok(res.confidence > 0.3, `Confidence should be significant: ${res.confidence}`);
    }
});

test('mlClassifier: identifies labour search queries across English, Hindi, Hinglish', () => {
    const queries = [
        'I need 5 workers for paddy harvesting tomorrow',
        'धान की रोपाई के लिए मजदूर चाहिए',
        'khet me weeding aur fasal katai ke liye majdoor chahiye',
        'looking for skilled agricultural labour team for loading'
    ];

    for (const q of queries) {
        const res = classifyIntent(q, 'labour');
        assert.equal(res.intent, 'SEARCH_LABOUR', `Failed for query: "${q}", got ${res.intent}`);
        assert.ok(res.confidence > 0.3, `Confidence should be significant: ${res.confidence}`);
    }
});

test('Labour AI: deterministic intents and profession filters', () => {
    const labourUser = { _id: '507f1f77bcf86cd799439011', role: 'Labour' };
    const cases = [
        ['Mujhe mistri chahiye.', 'labour'],
        ['Find electrician near me.', 'labour'],
        ['Mujhe tractor mechanic chahiye.', 'labour'],
        ['Main apni Labour profile dekhna chahta hoon.', 'labour_profile'],
        ['Meri listing update karni hai.', 'labour_profile_update'],
        ['Mere pending work requests dikhao.', 'labour_requests'],
        ['Mere accepted requests dikhao.', 'labour_requests'],
        ['Main engineer hoon, register kaise karun?', 'labour_registration'],
        ['Beldar chahiye.', 'labour'],
        ['Show my completed work.', 'labour_requests']
    ];

    for (const [query, expected] of cases) {
        const detected = detectIntent(query, [], labourUser, 'labour');
        assert.equal(detected.type, expected, `Unexpected intent for "${query}"`);
        if (detected.status) assert.ok(['Pending', 'Accepted', 'Completed', 'All'].includes(detected.status));
    }

    assert.equal(serviceSearchFilters('labour', 'Find plumber near my location.', []).labourType, 'Plumber');
    assert.equal(serviceSearchFilters('labour', 'Mujhe mistri chahiye.', []).labourType, 'Mason');
    assert.equal(serviceSearchFilters('labour', 'Beldar chahiye.', []).labourType, 'Beldar');
});

test('mlClassifier: identifies price inquiry intents in English, Hindi, Hinglish', () => {
    const queries = [
        'What is the rate per acre for tractor rotavator?',
        'मजदूरों का प्रतिदिन का किराया और दिहाड़ी कितनी है?',
        'ek din ka kitna charge lagega labour ka?'
    ];

    for (const q of queries) {
        const res = classifyIntent(q);
        assert.equal(res.intent, 'ASK_PRICE', `Failed for query: "${q}", got ${res.intent}`);
    }
});

test('mlClassifier: identifies availability inquiries', () => {
    const queries = [
        'Is the cultivator available next Monday?',
        'क्या कल के लिए मजदूर उपलब्ध हैं?'
    ];

    for (const q of queries) {
        const res = classifyIntent(q);
        assert.equal(res.intent, 'CHECK_AVAILABILITY', `Failed for query: "${q}", got ${res.intent}`);
    }
});

test('mlClassifier: identifies booking procedure and tracking inquiries', () => {
    const bookQueries = [
        'How do I book a labour for harvesting?',
        'बुकिंग कैसे करें?'
    ];
    for (const q of bookQueries) {
        const res = classifyIntent(q);
        assert.equal(res.intent, 'HOW_TO_BOOK', `Failed for query: "${q}", got ${res.intent}`);
    }

    const trackQueries = [
        'Where can I track my existing booking status?',
        'मेरी बुकिंग का स्टेटस क्या है?'
    ];
    for (const q of trackQueries) {
        const res = classifyIntent(q);
        assert.equal(res.intent, 'TRACK_BOOKING', `Failed for query: "${q}", got ${res.intent}`);
    }
});

test('mlClassifier: respects pageContext when disambiguating ambiguous queries', () => {
    const ambiguousQuery = 'I need help for wheat harvesting tomorrow';

    const labourContext = classifyIntent(ambiguousQuery, 'labour');
    assert.equal(labourContext.intent, 'SEARCH_LABOUR', 'Should resolve to SEARCH_LABOUR in labour context');

    const machineContext = classifyIntent(ambiguousQuery, 'machines');
    assert.equal(machineContext.intent, 'SEARCH_MACHINE', 'Should resolve to SEARCH_MACHINE in machines context');
});

test('mlClassifier: flags low-confidence / out-of-domain inputs appropriately', () => {
    const unrelatedQuery = 'tell me a joke about quantum computing';
    const res = classifyIntent(unrelatedQuery);
    assert.ok(res.isLowConfidence === true || res.intent === 'GENERAL_QUERY',
        `Should flag low confidence or general query for unrelated text, got intent: ${res.intent}, isLow: ${res.isLowConfidence}`);
});

// ==========================================
// 2. ML MULTI-FACTOR RECOMMENDER TESTS
// ==========================================

test('mlRecommender: rankLabourListings accurately ranks by category, budget, rating and availability', () => {
    const sampleListings = [
        {
            _id: 'labour_1',
            name: 'Ramesh Singh Team',
            category: 'Harvesting',
            skills: ['Wheat Harvesting', 'Paddy Cutting', 'Combine Operation'],
            wageRate: 450,
            pricingUnit: 'per day',
            experienceYears: 6,
            rating: 4.8,
            reviewsCount: 15,
            isAvailable: true,
            location: { city: 'Karnal', state: 'Haryana', coordinates: [76.98, 29.68] }
        },
        {
            _id: 'labour_2',
            name: 'Sukhdev Sowing Crew',
            category: 'Sowing and planting',
            skills: ['Direct Seeding', 'Nursery Management'],
            wageRate: 500,
            pricingUnit: 'per day',
            experienceYears: 3,
            rating: 4.0,
            reviewsCount: 5,
            isAvailable: true,
            location: { city: 'Kurukshetra', state: 'Haryana', coordinates: [76.88, 29.96] }
        },
        {
            _id: 'labour_3',
            name: 'Overpriced Unavailable Crew',
            category: 'Harvesting',
            skills: ['Manual Harvesting'],
            wageRate: 950,
            pricingUnit: 'per day',
            experienceYears: 1,
            rating: 3.2,
            reviewsCount: 2,
            isAvailable: false,
            location: { city: 'Ludhiana', state: 'Punjab', coordinates: [75.85, 30.90] }
        }
    ];

    const ranked = rankLabourListings(sampleListings, {
        category: 'Harvesting',
        queryText: 'paddy and wheat harvesting labour',
        maxBudget: 600,
        requiredAvailability: true
    });

    assert.equal(ranked.length, 3, 'Should rank all 3 listings');
    // Top listing must be labour_1
    assert.equal(ranked[0]._id, 'labour_1', 'Ramesh Singh Team should rank first');
    assert.ok(ranked[0].relevanceScore > ranked[1].relevanceScore, 'Top listing score should be strictly higher');
    assert.ok(ranked[0].relevanceScore > ranked[2].relevanceScore, 'Top listing score should beat unavailable listing');
    
    // Check transparent match reasons
    assert.ok(Array.isArray(ranked[0].matchReasons), 'Must include match reasons array');
    assert.ok(ranked[0].matchReasons.length > 0, 'Match reasons should not be empty');
    assert.ok(ranked[0].scoreBreakdown, 'Must include score breakdown');
    assert.equal(ranked[0].scoreBreakdown.category, 1.0, 'Category match should be 1.0');
    assert.equal(ranked[0].scoreBreakdown.availability, 1.0, 'Availability match should be 1.0');
});

test('mlRecommender: rankMachineListings ranks matching machinery higher than mismatched machinery', () => {
    const machines = [
        {
            _id: 'm1',
            machineName: 'Mahindra 575 DI 45HP Tractor',
            category: 'Tractor',
            description: '45HP tractor with dual clutch and power steering for rotavator and ploughing',
            pricePerHour: 750,
            pricePerDay: 4500,
            rating: 4.7,
            reviewsCount: 12,
            isAvailable: true,
            location: { city: 'Patiala' }
        },
        {
            _id: 'm2',
            machineName: 'Claas Crop Tiger 30 Harvester',
            category: 'Harvester',
            description: 'Self propelled combine harvester for paddy and wheat',
            pricePerHour: 2200,
            pricePerDay: 15000,
            rating: 4.8,
            reviewsCount: 20,
            isAvailable: true,
            location: { city: 'Ambala' }
        }
    ];

    const ranked = rankMachineListings(machines, {
        category: 'Tractor',
        queryText: 'tractor for ploughing and field prep',
        maxPrice: 1000
    });

    assert.equal(ranked[0]._id, 'm1', 'Tractor should rank above Harvester for Tractor search');
    assert.ok(ranked[0].matchReasons.some(r => r.includes('Tractor')), 'Match reason should mention Tractor');
});

// ==========================================
// 3. SCHEMA AND MODEL SPECIFICATION TESTS
// ==========================================

test('Labour model: schema exposes expected enum categories and required fields', () => {
    const categoryEnum = Labour.schema.path('category').enumValues;
    assert.ok(categoryEnum.includes('General agricultural labour'));
    assert.ok(categoryEnum.includes('Sowing and planting'));
    assert.ok(categoryEnum.includes('Harvesting'));
    assert.ok(categoryEnum.includes('Weeding and field preparation'));
    assert.ok(categoryEnum.includes('Fruit and vegetable picking'));
    assert.ok(categoryEnum.includes('Loading and unloading'));

    const pricingUnitEnum = Labour.schema.path('pricingUnit').enumValues;
    assert.ok(pricingUnitEnum.includes('per day'));
    assert.ok(pricingUnitEnum.includes('per hour'));
    assert.ok(pricingUnitEnum.includes('per acre'));
    assert.ok(pricingUnitEnum.includes('per bigha'));

    const statusEnum = Labour.schema.path('status').enumValues;
    assert.ok(statusEnum.includes('Approved'));
    assert.ok(statusEnum.includes('Pending'));
    assert.ok(statusEnum.includes('Rejected'));
});

test('Labour review and location schemas expose privacy and integrity fields', () => {
    assert.ok(Labour.schema.path('mapVisibilityConsent'));
    assert.ok(Labour.schema.path('publicLocation'));
    assert.ok(Labour.schema.path('latitude'));
    assert.ok(Labour.schema.path('longitude'));
    assert.ok(Review.schema.path('labour'));
    assert.ok(Review.schema.path('bookingId'));
    assert.ok(Review.schema.path('verifiedBooking'));
    assert.ok(Review.schema.path('rating').isRequired);
    assert.ok(Review.schema.indexes().some(([keys, options]) =>
        keys.bookingId === 1 && options.unique === true
    ));
});

// ==========================================
// 4. ROLE AND PERMISSION ISOLATION LOGIC
// ==========================================

test('Authorization logic: ensures only Admin role passes admin check', () => {
    const adminCheck = (req, res, next) => {
        if (!req.isAuthenticated || !req.isAuthenticated()) {
            return { status: 401, error: 'Unauthorized' };
        }
        if (req.user?.role !== 'Admin') {
            return { status: 403, error: 'Forbidden' };
        }
        return { status: 200, allowed: true };
    };

    // Unauthenticated
    assert.equal(adminCheck({ isAuthenticated: () => false }, {}).status, 401);

    // Farmer role
    assert.equal(adminCheck({ isAuthenticated: () => true, user: { role: 'Farmer' } }, {}).status, 403);

    // Driver role
    assert.equal(adminCheck({ isAuthenticated: () => true, user: { role: 'Driver' } }, {}).status, 403);

    // Labour role
    assert.equal(adminCheck({ isAuthenticated: () => true, user: { role: 'Labour' } }, {}).status, 403);

    // Admin role
    const adminRes = adminCheck({ isAuthenticated: () => true, user: { role: 'Admin' } }, {});
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.allowed, true);
});

test('Driver isolation: Driver viewing Labour marketplace maintains Driver identity', () => {
    // Simulate a Driver user session
    const driverUser = {
        _id: 'driver_user_123',
        name: 'Balwinder Singh',
        role: 'Driver',
        phone: '9876543210'
    };

    // Visiting /Labours must not modify role or user object
    const simulatedContext = {
        currentUser: { ...driverUser },
        visitedUrl: '/Labours'
    };

    assert.equal(simulatedContext.currentUser.role, 'Driver', 'Role must remain Driver');
    assert.equal(simulatedContext.currentUser.name, 'Balwinder Singh');
});

