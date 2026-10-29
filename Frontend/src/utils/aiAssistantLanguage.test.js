import test from "node:test";
import assert from "node:assert/strict";
import { detectAiLanguageStyle } from "./aiAssistantLanguage.js";

test("short greetings and every follow-up message use its own language style", () => {
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
