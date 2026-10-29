// Deterministic query cases for offline AI behavior evaluation. No listing data is included.
const suites = [
  {
    intent: "general_question", tool: null, behavior: "Reply conversationally without searching or claiming database facts.",
    cases: [
      ["hi", "hinglish"], ["hello", "en"], ["hey there", "en"], ["namaste", "hi"], ["namaskar", "hi"],
      ["नमस्ते", "hi"], ["नमस्कार", "hi"], ["आप कौन हो?", "hi"], ["What is WorkShetu?", "en"], ["shukriya", "hinglish"]
    ]
  },
  {
    intent: "search_machine", tool: "searchMachines", behavior: "Search real machine listings; never make up results.",
    cases: [
      ["mujhe tractor chahiye", "hinglish", { category: "Tractor" }], ["मुझे ट्रैक्टर चाहिए", "hi", { category: "Tractor"}],
      ["I need a tractor", "en", { category: "Tractor"}], ["cultivator dikhao", "hinglish", { category: "Cultivator"}],
      ["रोटावेटर चाहिए", "hi", { category: "Rotavator"}], ["Show me a harrow", "en", { category: "Harrow"}],
      ["harvester milega?", "hinglish", { category: "Harvester"}], ["मेरे लिए ट्रैक्टर खोजो", "hi", { category: "Tractor"}],
      ["find agricultural equipment", "en", {}], ["tractar dikhana", "hinglish", { category: "Tractor"}]
    ]
  },
  {
    intent: "search_machine", tool: "searchMachines", behavior: "Apply the farmer's stated maximum budget in INR.",
    cases: [
      ["5000 ke andar tractor", "hinglish", { category: "Tractor", maxPrice: 5000 }],
      ["₹5000 budget ka tractor", "hinglish", { category: "Tractor", maxPrice: 5000 }],
      ["5 hazar tak tractor", "hinglish", { category: "Tractor", maxPrice: 5000 }],
      ["tractor under 5000", "en", { category: "Tractor", maxPrice: 5000 }],
      ["tractor under 5k", "en", { category: "Tractor", maxPrice: 5000 }],
      ["5 lakh ke andar tractor", "hinglish", { category: "Tractor", maxPrice: 500000 }],
      ["maximum 2 lakh for a tractor", "en", { category: "Tractor", maxPrice: 200000 }],
      ["tractor chahiye budget 4 lakh", "hinglish", { category: "Tractor", maxPrice: 400000 }],
      ["5 लाख के अंदर ट्रैक्टर", "hi", { category: "Tractor", maxPrice: 500000 }],
      ["5000 रुपये तक ट्रैक्टर", "hi", { category: "Tractor", maxPrice: 5000 }],
      ["tractor 5 lakh ka budget", "hinglish", { category: "Tractor", maxPrice: 500000 }]
    ]
  },
  {
    intent: "search_machine", tool: "searchMachines", behavior: "Carry land area as context without claiming guaranteed suitability.",
    cases: [
      ["8 bigha ke liye tractor", "hinglish", { category: "Tractor", landArea: 8, areaUnit: "Bigha" }],
      ["मुझे 8 बीघा के लिए ट्रैक्टर चाहिए", "hi", { category: "Tractor", landArea: 8, areaUnit: "Bigha"}],
      ["I need a tractor for 8 bigha", "en", { category: "Tractor", landArea: 8, areaUnit: "Bigha"}],
      ["mere paas 10 bigha hai tractor suggest karo", "hinglish", { category: "Tractor", landArea: 10, areaUnit: "Bigha"}],
      ["मेरे पास 5 बीघा है, कौन सी मशीन ठीक रहेगी?", "hi", { landArea: 5, areaUnit: "Bigha"}],
      ["Find a cultivator for 2 acres", "en", { category: "Cultivator", landArea: 2, areaUnit: "Acre"}],
      ["3 hectare ke liye harvester", "hinglish", { category: "Harvester", landArea: 3, areaUnit: "Hectare"}],
      ["4 acre zameen ke liye rotavator chahiye", "hinglish", { category: "Rotavator", landArea: 4, areaUnit: "Acre"}],
      ["6 बीघा खेत के लिए कल्टीवेटर", "hi", { category: "Cultivator", landArea: 6, areaUnit: "Bigha"}],
      ["Suggest a tractor for 12 hectares", "en", { category: "Tractor", landArea: 12, areaUnit: "Hectare"}]
    ]
  },
  {
    intent: "search_machine", tool: "searchMachines", behavior: "Use only actual supported category, location, brand/title, and power fields.",
    cases: [
      ["Aligarh me tractor dikhao", "hinglish", { category: "Tractor", location: "Aligarh"}],
      ["अलीगढ़ के पास ट्रैक्टर चाहिए", "hi", { category: "Tractor", location: "अलीगढ़"}],
      ["Find a tractor in Agra", "en", { category: "Tractor", location: "Agra"}],
      ["Greater Noida ke paas harvester", "hinglish", { category: "Harvester", location: "Greater Noida"}],
      ["John Deere tractor dikhao", "hinglish", { category: "Tractor", searchText: "John Deere"}],
      ["Mahindra tractor under 4 lakh", "en", { category: "Tractor", searchText: "Mahindra", maxPrice: 400000}],
      ["40 HP tractor chahiye", "hinglish", { category: "Tractor", power: 40}],
      ["45 horsepower tractor", "en", { category: "Tractor", power: 45}],
      ["Sonalika tractor 50 HP", "en", { category: "Tractor", searchText: "Sonalika", power: 50}],
      ["sasta cultivator Agra mein", "hinglish", { category: "Cultivator", location: "Agra", preferLowPrice: true}]
    ]
  },
  {
    intent: "nearby_machine", tool: "getNearbyMachines", behavior: "Search near saved coordinates only; otherwise ask the user for a city.",
    cases: [
      ["tractor near me", "en", { category: "Tractor"}], ["nearby tractor", "en", { category: "Tractor"}],
      ["mere aas paas tractor hai?", "hinglish", { category: "Tractor"}], ["मेरे आसपास ट्रैक्टर दिखाओ", "hi", { category: "Tractor"}],
      ["show machines around me", "en", {}], ["mere nearby harvester", "hinglish", { category: "Harvester"}],
      ["10 km ke andar tractor", "hinglish", { category: "Tractor", radiusKm: 10}],
      ["tractor within 15 km", "en", { category: "Tractor", radiusKm: 15}],
      ["aas paas rotavator chahiye", "hinglish", { category: "Rotavator"}],
      ["मेरे पास कल्टीवेटर है क्या", "hi", { category: "Cultivator"}]
    ]
  },
  {
    intent: "follow_up", tool: "searchMachines", behavior: "Combine the new filter with relevant prior machine-search context.",
    context: [{ role: "user", content: "5 lakh ke andar tractor chahiye" }],
    cases: [
      ["koi or hai?", "hinglish", { category: "Tractor", maxPrice: 500000}],
      ["koi aur tractor hai?", "hinglish", { category: "Tractor", maxPrice: 500000}],
      ["क्या कोई दूसरा ट्रैक्टर है?", "hi", { category: "Tractor", maxPrice: 500000}],
      ["Are there any other tractors?", "en", { category: "Tractor", maxPrice: 500000}],
      ["sasta wala dikhao", "hinglish", { category: "Tractor", maxPrice: 500000, preferLowPrice: true}],
      ["show cheaper options", "en", { category: "Tractor", maxPrice: 500000, preferLowPrice: true}],
      ["nearby bhi", "hinglish", { category: "Tractor", maxPrice: 500000 }, { expected_tool: "getNearbyMachines" }],
      ["Aligarh ke paas", "hinglish", { category: "Tractor", location: "Aligarh", maxPrice: 500000}],
      ["5 lakh tak", "hinglish", { category: "Tractor", maxPrice: 500000}],
      ["John Deere wala bhi", "hinglish", { category: "Tractor", searchText: "John Deere", maxPrice: 500000}]
    ]
  },
  {
    intent: "clarification", tool: null, behavior: "Ask for the missing city, date, or listing context without pretending to know it.",
    cases: [
      ["mere nearby tractor dikhao", "hinglish"], ["मेरे पास ट्रैक्टर दिखाओ", "hi"],
      ["is this tractor available tomorrow?", "en"], ["ye tractor kal available hai?", "hinglish"],
      ["what is the HP of this machine?", "en"], ["इस मशीन की HP कितनी है?", "hi"],
      ["available on 15 October?", "en"], ["mujhe details batao", "hinglish"],
      ["check availability", "en"], ["किस तारीख को उपलब्ध है?", "hi"]
    ]
  },
  {
    intent: "search_labour", tool: "searchLabour", behavior: "Search only actual available Labour records; never infer contacts or listing details.",
    cases: [
      ["mujhe farm labour chahiye", "hinglish", { labourType: "Farm Worker" }], ["\u0915\u093f\u0938\u093e\u0928 \u092e\u091c\u0926\u0942\u0930 \u091a\u093e\u0939\u093f\u090f", "hi", { labourType: "Farm Worker" }],
      ["Find a farm worker", "en", { labourType: "Farm Worker" }], ["tractor driver chahiye", "hinglish", { labourType: "Tractor Driver" }],
      ["harvester operator near me", "en", { labourType: "Harvester Operator" }], ["\u0916\u0947\u0924 \u0915\u0947 \u0932\u093f\u090f \u092e\u091c\u0926\u0942\u0930 \u0916\u094b\u091c\u094b", "hi", { labourType: "Farm Worker" }],
      ["show labour in Aligarh", "en", { location: "Aligarh" }], ["4 lakh budget mein farm worker", "hinglish", { maxPrice: 400000, labourType: "Farm Worker" }]
    ]
  },
  {
    intent: "search_transport", tool: "searchTransport", behavior: "Search only actual available Transport records; never infer contacts or listing details.",
    cases: [
      ["I need a truck to take crops to mandi", "en", { vehicleType: "Truck" }], ["\u092b\u0938\u0932 \u092e\u0902\u0921\u0940 \u0932\u0947 \u091c\u093e\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u091f\u094d\u0930\u0915 \u091a\u093e\u0939\u093f\u090f", "hi", { vehicleType: "Truck" }],
      ["pickup transport chahiye", "hinglish", { vehicleType: "Pickup" }], ["loader dikhao", "hinglish", { vehicleType: "Loader" }],
      ["find a mini truck in Agra", "en", { vehicleType: "Mini Truck", location: "Agra" }], ["tempo chahiye", "hinglish", { vehicleType: "Tempo" }],
      ["truck near me", "en", { vehicleType: "Truck" }], ["Aligarh mein pickup transport", "hinglish", { vehicleType: "Pickup", location: "Aligarh" }]
    ]
  },
  {
    intent: "general_question", tool: null, behavior: "Never expose private booking data or perform booking, payment, or cancellation writes.",
    cases: [
      ["How do I book a machine?", "en"], ["booking ka status kaise dekhu?", "hinglish"],
      ["मेरी बुकिंग रद्द कैसे करूँ?", "hi"], ["cancel my tractor booking", "en"],
      ["tractor booking ka payment kaise hoga?", "hinglish"], ["Do you store my phone number?", "en"],
      ["मुझे मशीन की कीमत बताओ", "hi", {}, { expected_intent: "search_machine", expected_tool: "searchMachines"}], ["What does HP mean?", "en"],
      ["5 lakh budget mein kaunsi machine milegi?", "hinglish", { maxPrice: 500000 }, { expected_intent: "search_machine", expected_tool: "searchMachines"}], ["please try again", "en"]
    ]
  }
];

const expectedToolForIntent = {
  general_question: null,
  search_machine: "searchMachines",
  nearby_machine: "getNearbyMachines",
  follow_up: "searchMachines",
  clarification: null,
  search_labour: "searchLabour",
  search_transport: "searchTransport"
};

module.exports = suites.flatMap((suite) => suite.cases.map(([input, expected_language, expected_parameters = {}, overrides = {}]) => ({
  input,
  expected_intent: overrides.expected_intent || suite.intent,
  expected_language,
  expected_tool: overrides.expected_tool !== undefined ? overrides.expected_tool : suite.tool ?? expectedToolForIntent[suite.intent] ?? null,
  expected_parameters,
  expected_behavior: suite.behavior,
  context: overrides.context || suite.context || []
})));
