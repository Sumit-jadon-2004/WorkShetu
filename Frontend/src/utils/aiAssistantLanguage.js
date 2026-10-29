const messages = {
  en: { networkError: "I couldn't reach the assistant. Please try again." },
  hi: { networkError: "सहायक से संपर्क नहीं हो पाया। कृपया दोबारा कोशिश करें।" },
  hinglish: { networkError: "Assistant se connect nahi ho paya. Please dobara try karein." },
};

export function normalizeAiLanguage(value) {
  const language = String(value || "en").trim().toLowerCase().split("-")[0];
  return ["en", "hi", "hinglish"].includes(language) ? language : "en";
}

const romanHindiMarkers = /(?:^|[^a-z])(?:mujhe|mujh|chahiye|chahie|chahi|hai|hain|h|kya|ka|ki|ke|mera|meri|mere|aap|apko|tum|tera|tere|koi|aur|ni|nahi|nahin|nah|batao|bata|dikhao|dikhana|dikhaye|kaunsi|kaun|kitna|kitne|kitni|paas|aas|zameen|sasta|sasti|saste|mein|kahan|kab|karo|karein|milenge|milega|milegi|bigha|shukriya|tak|bhi|wala|wali)(?=$|[^a-z])/i;
const romanHindiResponseMarkers = /\b(?:bilkul|aapke|aapki|aapko|liye|mila|mili|milne|dekhein|dekh|karein|karenge|karta|karte|karunga|abhi|zaroor|haan|nahi)\b/i;

export function detectAiLanguageStyle(message) {
  const text = String(message || "").trim();
  const shortMessage = text.toLowerCase().replace(/[!?.\s]+$/g, "");
  if (/^h+i+$/i.test(shortMessage)) return "hinglish";
  if (/^(?:namaste|namaskar)$/i.test(shortMessage)) return "hi";
  if (/[\u0900-\u097f]/u.test(text)) return "hi";
  const romanText = text.replace(/\bbigha\b/gi, " ");
  return romanHindiMarkers.test(romanText) || romanHindiResponseMarkers.test(romanText) ? "hinglish" : "en";
}

export function aiAssistantMessage(key, language) {
  return messages[normalizeAiLanguage(language)][key] || messages.en[key];
}
