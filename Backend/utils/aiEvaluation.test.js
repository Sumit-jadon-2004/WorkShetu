const test = require("node:test");
const assert = require("node:assert/strict");
const dataset = require("../data/aiEvaluationDataset.js");
const { detectIntent, sanitizeHistory, searchFilters, serviceSearchFilters } = require("./aiIntent.js");
const { AI_LANGUAGES, aiMessage, detectAiLanguageStyle, responseMatchesAiLanguageStyle } = require("./aiLanguage.js");
const { buildAssistantSystemPrompt } = require("./aiPrompt.js");

const farmerWithSavedCoordinates = { latitude: 27.8974, longitude: 78.078 };

test("evaluation dataset has 100 structured natural farmer queries without marketplace fixtures", () => {
  assert.ok(dataset.length >= 100, `Expected at least 100 examples, got ${dataset.length}`);
  for (const example of dataset) {
    for (const key of ["input", "expected_intent", "expected_language", "expected_tool", "expected_parameters", "expected_behavior"]) {
      assert.ok(Object.hasOwn(example, key), `Missing ${key} for ${example.input}`);
    }
    assert.equal(typeof example.input, "string");
    assert.ok(AI_LANGUAGES.includes(example.expected_language));
    assert.ok(example.context.every((entry) => entry.role === "user" && typeof entry.content === "string"), "Context should contain only farmer messages, not invented listing cards or IDs.");
  }
});

test("language and tool-intent expectations pass for all evaluation queries", () => {
  for (const example of dataset) {
    const history = sanitizeHistory(example.context);
    assert.equal(detectAiLanguageStyle(example.input), example.expected_language, `Language: ${example.input}`);
    const farmer = example.expected_intent === "clarification" ? null : farmerWithSavedCoordinates;
    const intent = detectIntent(example.input, history, farmer);
    if (example.expected_tool === "searchMachines") assert.equal(intent.type, "search", `Tool intent: ${example.input}`);
    else if (example.expected_tool === "getNearbyMachines") assert.equal(intent.type, "nearby", `Tool intent: ${example.input}`);
    else if (example.expected_tool === "searchLabour") assert.equal(intent.type, "labour", `Tool intent: ${example.input}`);
    else if (example.expected_tool === "searchTransport") assert.equal(intent.type, "transport", `Tool intent: ${example.input}`);
    else if (example.expected_intent === "clarification") assert.equal(intent.type, "clarify", `Clarification: ${example.input}`);
    else assert.equal(intent.type, "general", `No-tool intent: ${example.input}`);

    const parsed = ["searchLabour", "searchTransport"].includes(example.expected_tool)
      ? serviceSearchFilters(example.expected_tool === "searchLabour" ? "labour" : "transport", example.input, history)
      : searchFilters(example.input, history);
    for (const [key, value] of Object.entries(example.expected_parameters)) {
      assert.deepEqual(parsed[key], value, `Parameter ${key}: ${example.input}`);
    }
  }
});

test("localized no-result and failure messages keep their requested writing style", () => {
  const expectedScripts = { en: /[A-Za-z]/, hi: /[\u0900-\u097f]/, hinglish: /[A-Za-z]/ };
  for (const language of AI_LANGUAGES) {
    for (const key of ["noResults", "requestFailed", "networkError", "clarifyLocation", "clarifyMachine", "clarifyDate"]) {
      const response = aiMessage(key, language);
      assert.match(response, expectedScripts[language], `${key} / ${language}`);
      assert.equal(responseMatchesAiLanguageStyle(response, language), true, `${key} style / ${language}`);
    }
  }
});

test("professional system prompt covers scope, safe data use, context, and current language", () => {
  const prompt = buildAssistantSystemPrompt({ language: "hi", intent: "search", currentDate: "2026-10-03" });
  assert.match(prompt, /WorkShetu AI/);
  assert.match(prompt, /current message/i);
  assert.match(prompt, /read-only WorkShetu tools/);
  assert.match(prompt, /Never create or infer listing facts/);
  assert.match(prompt, /read-only tools can search WorkShetu Machine, Labour, and Transport listings/);
  assert.match(prompt, /Land area is a search signal/);
  assert.match(prompt, /2026-10-03/);
});
