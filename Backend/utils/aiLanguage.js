const AI_LANGUAGES = ["en", "hi", "hinglish"];

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond only in English. Do not use Hindi or Hinglish. Keep machine names, brands, HP, prices, locations, IDs, and database values unchanged.",
  hi: "Respond only in Hindi using Devanagari script. Do not use Roman Hindi or Hinglish. Keep machine names, brands, HP, prices, locations, IDs, and database values unchanged.",
  hinglish: "Respond only in natural Hinglish using Roman script. Do not use Devanagari Hindi. Keep machine names, brands, HP, prices, locations, IDs, and database values unchanged."
};

const ROMAN_HINDI_MARKERS = /(?:^|[^a-z])(?:mujhe|mujh|chahiye|chahie|chahi|hai|hain|h|kya|ka|ki|ke|mera|meri|mere|aap|apko|tum|tera|tere|koi|aur|ni|nahi|nahin|nah|batao|bata|dikhao|dikhana|dikhaye|kaunsi|kaun|kitna|kitne|kitni|paas|aas|zameen|sasta|sasti|saste|mein|kahan|kab|karo|karein|milenge|milega|milegi|bigha|shukriya|tak|bhi|wala|wali)(?=$|[^a-z])/i;
const ROMAN_HINDI_RESPONSE_MARKERS = /\b(?:bilkul|aapke|aapki|aapko|liye|mila|mili|milne|dekhein|dekh|karein|karenge|karta|karte|karunga|abhi|zaroor|haan|nahi)\b/i;

function normalizeAiLanguage(value) {
  const language = String(value || "en").trim().toLowerCase().split("-")[0];
  return AI_LANGUAGES.includes(language) ? language : "en";
}

function detectAiLanguageStyle(message) {
  const text = String(message || "").trim();
  const shortMessage = text.toLowerCase().replace(/[!?.\s]+$/g, "");
  if (/^h+i+$/i.test(shortMessage)) return "hinglish";
  if (/^(?:namaste|namaskar)$/i.test(shortMessage)) return "hi";
  if (/[\u0900-\u097f]/u.test(text)) return "hi";
  const romanText = text.replace(/\bbigha\b/gi, " ");
  return ROMAN_HINDI_MARKERS.test(romanText) || ROMAN_HINDI_RESPONSE_MARKERS.test(romanText) ? "hinglish" : "en";
}

function responseMatchesAiLanguageStyle(response, expectedLanguage) {
  return Boolean(String(response || "").trim()) && detectAiLanguageStyle(response) === normalizeAiLanguage(expectedLanguage);
}

const MESSAGES = {
  en: {
    empty: "Tell me what you need help with.",
    missingKey: "The WorkShetu assistant is not configured yet. Please try again later.",
    clarifyLocation: "I don't have saved coordinates for your account. Tell me a city or location and I'll search there.",
    clarifyMachine: "Which machine listing should I check? Share its WorkShetu card or machine link first.",
    clarifyDate: "What date should I check for that machine?",
    databaseUnavailable: "WorkShetu listings are not connected right now. Please try again shortly.",
    rateLimit: "You've sent several assistant requests. Please wait a minute and try again.",
    authRequired: "Please log in as a farmer to use the WorkShetu assistant.",
    accountDisabled: "Your account is disabled. Please contact WorkShetu support.",
    forbidden: "The WorkShetu assistant is available to farmer accounts.",
    greeting: "Hello! I can help you find tractors and agricultural machines on WorkShetu.",
    found: (count) => `I found ${count} matching WorkShetu listing${count === 1 ? "" : "s"}. See the details below.`,
    noResults: "No available listing matched those criteria. Try expanding the budget or location.",
    listingNotFound: "I couldn't find that listing in this conversation. Open one of its WorkShetu cards first.",
    requestFailed: "Sorry, there was a problem fetching the data. Please try again.",
    networkError: "I couldn't reach the assistant. Please try again."
  },
  hi: {
    empty: "नमस्ते किसान भाई! 🙏 कृपया बताएँ कि आपको किस मशीन, मज़दूर या सर्विस की आवश्यकता है?",
    missingKey: "WorkShetu सहायक अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर प्रयास करें।",
    clarifyLocation: "आपके खाते में लोकेशन सेव नहीं है। कृपया अपने गाँव या शहर का नाम बताएँ ताकि नज़दीकी मशीनें खोजी जा सकें।",
    clarifyMachine: "किसान भाई, किस मशीन की जानकारी चाहिए? उसका कार्ड या लिंक बताएँ।",
    clarifyDate: "उस मशीन की उपलब्धता किस तारीख (तारीख या दिन) के लिए जाँचूँ?",
    databaseUnavailable: "अभी नेटवर्क के कारण मशीनों की जानकारी नहीं मिल पा रही है। कृपया थोड़ी देर बाद देखें।",
    rateLimit: "आपने काफ़ी सवाल पूछे हैं। कृपया 1 मिनट रुककर फिर पूछें।",
    authRequired: "WorkShetu सहायक का उपयोग करने के लिए कृपया अपने किसान खाते से लॉग इन करें।",
    accountDisabled: "आपका खाता बंद है। कृपया WorkShetu सहायता टीम से संपर्क करें।",
    forbidden: "WorkShetu सहायक सेवा किसान भाइयों के लिए है।",
    greeting: "नमस्ते किसान भाई! 🙏 मैं WorkShetu सहायक हूँ। ट्रैक्टर, हार्वेस्टर, कल्टीवेटर, लेबर या बुकिंग में कैसे मदद करूँ?",
    found: (count) => `किसान भाई, आपकी ज़रूरत के अनुसार ${count} मशीन/सर्विस लिस्टिंग मिली हैं। पूरी जानकारी नीचे देखें:`,
    noResults: "अभी इन शर्तों पर कोई मशीन उपलब्ध नहीं मिली। आप अपने बजट या दूरी (किलोमीटर) का दायरा थोड़ा बढ़ाकर देख सकते हैं।",
    listingNotFound: "यह लिस्टिंग नहीं मिली। कृपया पहले उस मशीन का कार्ड खोलें।",
    requestFailed: "माफ़ कीजिए किसान भाई, अभी जानकारी लोड नहीं हो पाई। कृपया दोबारा कोशिश करें।",
    networkError: "सहायक से संपर्क नहीं हो पाया। कृपया दोबारा प्रयास करें।"
  },
  hinglish: {
    empty: "Namaste Kisan Bhai! 🙏 Batayein, aapko kis machine, labour ya transport service ki zaroorat hai?",
    missingKey: "WorkShetu sahayak abhi available nahi hai. Thodi der baad dobara try karein.",
    clarifyLocation: "Aapke account mein gaon/shehar saved nahi hai. Kripya apna gaon ya shehar batayein taaki aas-paas ki machines dhoondh sakein.",
    clarifyMachine: "Kisan bhai, kaunsi machine ki details chahiye? Uska card ya link bhejein.",
    clarifyDate: "Machine ki availability kis date ke liye check karni hai?",
    databaseUnavailable: "Abhi network issue ki wajah se listings load nahi ho pa rahi hain. Kripya thodi der baad dekhein.",
    rateLimit: "Aapne kaafi requests bhej di hain. Kripya 1 minute baad dobara poochhein.",
    authRequired: "WorkShetu sahayak use karne ke liye kripya apne farmer account se login karein.",
    accountDisabled: "Aapka account disabled hai. WorkShetu support se contact karein.",
    forbidden: "WorkShetu sahayak sirf farmer accounts ke liye available hai.",
    greeting: "Namaste Kisan Bhai! 🙏 Main WorkShetu Sahayak hoon. Tractor, harvester, cultivator, labour ya booking mein kaise madad karoon?",
    found: (count) => `Kisan bhai, aapki request ke according ${count} machine/service listing${count === 1 ? "" : "s"} mili hain. Details neeche dekhein:`,
    noResults: "Abhi is criteria ke according koi machine available nahi mili. Budget ya doori (KM) badha kar try karein.",
    listingNotFound: "Yeh listing nahi mili. Kripya pehle uska card open karein.",
    requestFailed: "Sorry Kisan bhai, abhi data fetch karne mein dikkat aayi. Kripya dobara try karein.",
    networkError: "Sahayak se connect nahi ho paya. Kripya dobara try karein."
  }
};

const RESPONSE_COPY = {
  en: {
    generalFallback: "I can help you find tractors and agricultural machines listed on WorkShetu. What do you need?",
    availableOn: (date) => `Available on ${date}.`, unavailableOn: (date) => `Not available on ${date}.`,
    distance: (distance) => `${distance} km away`, rating: (average, count) => `${average}/5 from ${count} reviews`,
    match: "Matches your WorkShetu search.", cardAvailable: (date) => `Available ${date}`, cardUnavailable: (date) => `Unavailable ${date}`
  },
  hi: {
    generalFallback: "मैं WorkShetu पर उपलब्ध ट्रैक्टर और कृषि मशीनें खोजने में मदद कर सकता हूँ। आपको क्या चाहिए?",
    availableOn: (date) => `${date} को उपलब्ध है।`, unavailableOn: (date) => `${date} को उपलब्ध नहीं है।`,
    distance: (distance) => `${distance} km दूर`, rating: (average, count) => `${average}/5, ${count} समीक्षाएँ`,
    match: "यह WorkShetu की खोज से मेल खाती है।", cardAvailable: (date) => `${date} को उपलब्ध`, cardUnavailable: (date) => `${date} को उपलब्ध नहीं`
  },
  hinglish: {
    generalFallback: "Main WorkShetu par listed tractor aur agricultural machines dhoondhne mein help kar sakta hoon. Aapko kya chahiye?",
    availableOn: (date) => `Date ${date} ko available hai.`, unavailableOn: (date) => `Date ${date} ko available nahi hai.`,
    distance: (distance) => `${distance} km door`, rating: (average, count) => `${average}/5, ${count} reviews`,
    match: "Yeh WorkShetu search se match karti hai.", cardAvailable: (date) => `${date} ko available`, cardUnavailable: (date) => `${date} ko available nahi`
  }
};

function aiMessage(key, language, ...args) {
  const localized = MESSAGES[normalizeAiLanguage(language)][key];
  return typeof localized === "function" ? localized(...args) : localized || MESSAGES.en[key] || "";
}

function aiResponseCopy(key, language, ...args) {
  const localized = RESPONSE_COPY[normalizeAiLanguage(language)][key];
  return typeof localized === "function" ? localized(...args) : localized || RESPONSE_COPY.en[key] || "";
}

function aiGeneralFallback(message, language) {
  const text = String(message || "").trim().toLowerCase().replace(/[!?.\s]+$/g, "");
  const style = normalizeAiLanguage(language) || detectAiLanguageStyle(message);
  if (/^h+i+$/i.test(text)) return "Hi! 🙏 Main WorkShetu par tractor aur agricultural machines dhoondhne mein help kar sakta hoon. Aapko kya chahiye?";
  if (/^hello$/i.test(text)) return "Hello! 🙏 How can I help you find a tractor or agricultural machine on WorkShetu?";
  if (/^(?:namaste|namaskar)$/i.test(text) || /^(?:\u0928\u092e\u0938\u094d\u0924\u0947|\u0928\u092e\u0938\u094d\u0915\u093e\u0930)[!?.\s]*$/u.test(String(message || "").trim())) {
    return style === "hinglish"
      ? "Namaste! 🙏 Main WorkShetu par tractor aur agricultural machines dhoondhne mein help kar sakta hoon. Aapko kya chahiye?"
      : "नमस्ते! 🙏 मैं WorkShetu पर ट्रैक्टर और कृषि मशीनें खोजने में आपकी मदद कर सकता हूँ। आपको क्या चाहिए?";
  }
  if (/^(?:thanks?|thank\s+you|धन्यवाद)$/i.test(text)) {
    if (style === "hi") return "आपका स्वागत है! ट्रैक्टर या कृषि मशीन खोजने में मदद चाहिए तो बताइए।";
    if (style === "hinglish") return "Welcome! Tractor ya agricultural machine dhoondhne mein help chahiye ho to batayein.";
    return "You're welcome! Let me know if you need help finding a tractor or agricultural machine.";
  }
  return aiResponseCopy("generalFallback", style);
}

function aiLanguageInstruction(language) {
  const style = normalizeAiLanguage(language);
  return `WorkShetu AI is an intelligent agricultural marketplace assistant. The assistant must respond in the same language and writing style as the user's current message. If the user writes in English, respond in English. If the user writes Hindi in Devanagari, respond in Hindi Devanagari. If the user writes Hindi using Roman characters, respond in natural Roman Hinglish. If the user changes language in a later message, change the response language accordingly. Reevaluate every current user message independently; do not use UI language settings or conversation history to choose response language. Tool/database results must not change the response language. ${LANGUAGE_INSTRUCTIONS[style]}`;
}

module.exports = { AI_LANGUAGES, LANGUAGE_INSTRUCTIONS, aiGeneralFallback, aiLanguageInstruction, aiMessage, aiResponseCopy, detectAiLanguageStyle, normalizeAiLanguage, responseMatchesAiLanguageStyle };
