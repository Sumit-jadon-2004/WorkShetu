const test = require("node:test");
const assert = require("node:assert/strict");
const { detectIntent } = require("./aiIntent.js");
const { AI_LANGUAGES, aiGeneralFallback, aiLanguageInstruction, aiMessage, aiResponseCopy, detectAiLanguageStyle, normalizeAiLanguage, responseMatchesAiLanguageStyle } = require("./aiLanguage.js");

test("UI language values and regional variants normalize to supported AI languages", () => {
  assert.deepEqual(AI_LANGUAGES, ["en", "hi", "hinglish"]);
  assert.equal(normalizeAiLanguage("en-US"), "en");
  assert.equal(normalizeAiLanguage("hi-IN"), "hi");
  assert.equal(normalizeAiLanguage("hinglish"), "hinglish");
  assert.equal(normalizeAiLanguage("unknown"), "en");
  assert.equal(normalizeAiLanguage(), "en");
});

test("Groq instruction makes current-message style authoritative over UI and history", () => {
  const instruction = aiLanguageInstruction("hinglish");
  assert.match(instruction, /same language and writing style as the user's current message/);
  assert.match(instruction, /If the user writes in English, respond in English/);
  assert.match(instruction, /Hindi in Devanagari, respond in Hindi Devanagari/);
  assert.match(instruction, /Hindi using Roman characters, respond in natural Roman Hinglish/);
  assert.match(instruction, /do not use UI language settings or conversation history/);
  assert.match(instruction, /Tool\/database results must not change the response language/);
});

test("short greetings and machine requests independently select current-message style", () => {
  const cases = [
    ["hi", "hinglish"],
    ["hello", "en"],
    ["namaste", "hi"],
    ["नमस्ते", "hi"],
    ["mujhe tractor chahiye", "hinglish"],
    ["मुझे ट्रैक्टर चाहिए", "hi"],
    ["I need a tractor", "en"],
    ["मुझे 8 बिघा के लिए ट्रैक्टर चाहिए", "hi"],
    ["mujhe 8 bigha ke liye tractor chahiye", "hinglish"],
    ["I need a tractor for 8 bigha", "en"],
    ["koi or tractor ni h", "hinglish"],
    ["क्या कोई और ट्रैक्टर है?", "hi"],
    ["Are there any other tractors?", "en"],
    ["thanks", "en"],
    ["thank you", "en"],
    ["धन्यवाद", "hi"]
  ];
  for (const [message, expected] of cases) assert.equal(detectAiLanguageStyle(message), expected, message);
});

test("short greeting fallback uses the requested conversational style", () => {
  assert.match(aiGeneralFallback("hi", "hinglish"), /^Hi! 🙏 Main/);
  assert.match(aiGeneralFallback("hello", "en"), /^Hello! 🙏 How/);
  assert.match(aiGeneralFallback("namaste", "hi"), /^नमस्ते! 🙏 मैं/);
  assert.match(aiGeneralFallback("नमस्ते", "hi"), /^नमस्ते! 🙏 मैं/);
  for (const greeting of ["hi", "hello", "namaste", "नमस्ते", "thanks", "thank you", "धन्यवाद"]) {
    assert.equal(detectIntent(greeting, [], null).type, "general", greeting);
  }
});

test("generated response style is checked against each current message", () => {
  assert.equal(responseMatchesAiLanguageStyle("बिल्कुल, मैं आपके लिए ट्रैक्टर खोजता हूँ।", "hi"), true);
  assert.equal(responseMatchesAiLanguageStyle("Bilkul, main aapke liye tractor search karta hoon.", "hinglish"), true);
  assert.equal(responseMatchesAiLanguageStyle("I’ll search the available tractors for you.", "en"), true);
  assert.equal(responseMatchesAiLanguageStyle("I found two tractors for you.", "hinglish"), false);
  assert.equal(responseMatchesAiLanguageStyle("Aapke liye tractor mil gaya.", "en"), false);
  assert.equal(responseMatchesAiLanguageStyle("Bilkul, मैं ट्रैक्टर खोजता हूँ।", "hinglish"), false);
});

test("centralized fallback responses exist in all supported languages", () => {
  for (const language of AI_LANGUAGES) {
    for (const key of ["empty", "missingKey", "clarifyLocation", "clarifyMachine", "databaseUnavailable", "rateLimit", "authRequired", "accountDisabled", "forbidden", "greeting", "noResults", "requestFailed", "networkError"]) {
      assert.ok(aiMessage(key, language), `${key} missing for ${language}`);
    }
    assert.ok(aiMessage("found", language, 2));
  }
  assert.match(aiMessage("noResults", "hi"), /[\u0900-\u097f]/);
  assert.doesNotMatch(aiMessage("noResults", "hinglish"), /[\u0900-\u097f]/);
  assert.doesNotMatch(aiMessage("noResults", "en"), /[\u0900-\u097f]/);
  assert.match(aiResponseCopy("generalFallback", "hi"), /[\u0900-\u097f]/);
  assert.doesNotMatch(aiResponseCopy("generalFallback", "hinglish"), /[\u0900-\u097f]/);
});
