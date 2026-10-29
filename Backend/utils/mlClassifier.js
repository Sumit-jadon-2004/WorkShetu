/**
 * WorkShetu Multilingual Agricultural Service Intent Classifier
 * 
 * Machine Learning Implementation:
 * - Multilingual Tokenization & Normalization (Devanagari, Roman Hinglish, English)
 * - TF-IDF Feature Extraction (unigrams + bigrams)
 * - Calibrated Vector Space Model with Cosine Similarity and Confidence Estimation
 * 
 * Target Intents:
 * - SEARCH_MACHINE
 * - SEARCH_LABOUR
 * - ASK_PRICE
 * - CHECK_AVAILABILITY
 * - HOW_TO_BOOK
 * - TRACK_BOOKING
 * - GENERAL_QUERY
 */

const TRAINING_CORPUS = [
  // SEARCH_MACHINE
  { text: "mujhe tractor chahiye", intent: "SEARCH_MACHINE" },
  { text: "I need a tractor for ploughing", intent: "SEARCH_MACHINE" },
  { text: "khet jotne ke liye tractor dikhao", intent: "SEARCH_MACHINE" },
  { text: "khet jodne ke liye rotavator aur tractor chahiye", intent: "SEARCH_MACHINE" },
  { text: "harvester machine available hai kya", intent: "SEARCH_MACHINE" },
  { text: "rotavator chahiye 10 bigha ke liye", intent: "SEARCH_MACHINE" },
  { text: "cultivator dikhao saste rate me", intent: "SEARCH_MACHINE" },
  { text: "cultivator machine available near me", intent: "SEARCH_MACHINE" },
  { text: "harrow machine search karo", intent: "SEARCH_MACHINE" },
  { text: "find a combine harvester near me", intent: "SEARCH_MACHINE" },
  { text: "John Deere tractor chahiye", intent: "SEARCH_MACHINE" },
  { text: "50 hp tractor for rent", intent: "SEARCH_MACHINE" },
  { text: "मुझे खेत जोतने के लिए ट्रैक्टर चाहिए", intent: "SEARCH_MACHINE" },
  { text: "मुझे गेहूं काटने के लिए कंबाइन हार्वेस्टर चाहिए", intent: "SEARCH_MACHINE" },
  { text: "कटाई के लिए हार्वेस्टर मशीन दिखाओ", intent: "SEARCH_MACHINE" },
  { text: "रोटावेटर किराए पर चाहिए", intent: "SEARCH_MACHINE" },
  { text: "कल्तीवेटर मशीन ढूंढो", intent: "SEARCH_MACHINE" },

  // SEARCH_LABOUR
  { text: "kheti ke liye mazdoor chahiye", intent: "SEARCH_LABOUR" },
  { text: "mujhe 5 workers chahiye kheti ke liye", intent: "SEARCH_LABOUR" },
  { text: "need agricultural labour for harvesting", intent: "SEARCH_LABOUR" },
  { text: "I need 5 workers for paddy harvesting tomorrow", intent: "SEARCH_LABOUR" },
  { text: "tractor driver chahiye kaam ke liye", intent: "SEARCH_LABOUR" },
  { text: "spray machine operator dhoondo", intent: "SEARCH_LABOUR" },
  { text: "weeding aur planting ke liye labour milegi", intent: "SEARCH_LABOUR" },
  { text: "khet me weeding aur fasal katai ke liye majdoor chahiye", intent: "SEARCH_LABOUR" },
  { text: "looking for skilled agricultural labour team for loading", intent: "SEARCH_LABOUR" },
  { text: "fruit picking ke liye workers hire karne hain", intent: "SEARCH_LABOUR" },
  { text: "irrigation assistance ke liye labour chahiye", intent: "SEARCH_LABOUR" },
  { text: "farm workers near Sonipat", intent: "SEARCH_LABOUR" },
  { text: "loading unloading ke liye mazdoor", intent: "SEARCH_LABOUR" },
  { text: "मुझे खेत में कटाई के लिए मजदूर चाहिए", intent: "SEARCH_LABOUR" },
  { text: "धान की रोपाई के लिए मजदूर चाहिए", intent: "SEARCH_LABOUR" },
  { text: "बुवाई और रोपाई के लिए लेबर चाहिए", intent: "SEARCH_LABOUR" },
  { text: "स्प्रे करने वाले मजदूर ढूंढो", intent: "SEARCH_LABOUR" },
  { text: "ट्रैक्टर ड्राइवर और हेल्पर की जरूरत है", intent: "SEARCH_LABOUR" },

  // ASK_PRICE
  { text: "tractor ka kiraya kitna hai", intent: "ASK_PRICE" },
  { text: "what is the wage rate of labour", intent: "ASK_PRICE" },
  { text: "per bigha kitna kharcha aayega", intent: "ASK_PRICE" },
  { text: "labour per day rate batao", intent: "ASK_PRICE" },
  { text: "harvester ka price per acre kya hai", intent: "ASK_PRICE" },
  { text: "calculate cost for 5 bigha wheat harvesting", intent: "ASK_PRICE" },
  { text: "rotavator rate per hour", intent: "ASK_PRICE" },
  { text: "daily wage for farm workers", intent: "ASK_PRICE" },
  { text: "What is the rate per acre for tractor rotavator", intent: "ASK_PRICE" },
  { text: "मजदूरों का प्रतिदिन का किराया और दिहाड़ी कितनी है", intent: "ASK_PRICE" },
  { text: "ek din ka kitna charge lagega labour ka", intent: "ASK_PRICE" },
  { text: "ट्रैक्टर का किराया कितना है", intent: "ASK_PRICE" },
  { text: "मजदूर की दिहाड़ी कितनी है", intent: "ASK_PRICE" },
  { text: "प्रति बीघा कितना खर्च आएगा", intent: "ASK_PRICE" },
  { text: "रेट लिस्ट दिखाओ", intent: "ASK_PRICE" },

  // CHECK_AVAILABILITY
  { text: "kya tractor kal available hai", intent: "CHECK_AVAILABILITY" },
  { text: "is this worker available tomorrow", intent: "CHECK_AVAILABILITY" },
  { text: "Is the cultivator available next Monday", intent: "CHECK_AVAILABILITY" },
  { text: "aaj labour mil sakti hai kya", intent: "CHECK_AVAILABILITY" },
  { text: "check availability for 15 october", intent: "CHECK_AVAILABILITY" },
  { text: "free hai kya worker abhi", intent: "CHECK_AVAILABILITY" },
  { text: "kya ye machine booked hai ya free", intent: "CHECK_AVAILABILITY" },
  { text: "क्या यह मशीन कल उपलब्ध है", intent: "CHECK_AVAILABILITY" },
  { text: "क्या कल के लिए मजदूर उपलब्ध हैं", intent: "CHECK_AVAILABILITY" },
  { text: "मजदूर खाली है या बुक हो चुका है", intent: "CHECK_AVAILABILITY" },

  // HOW_TO_BOOK
  { text: "machine kaise book karein", intent: "HOW_TO_BOOK" },
  { text: "how to book labour service", intent: "HOW_TO_BOOK" },
  { text: "How do I book a labour for harvesting", intent: "HOW_TO_BOOK" },
  { text: "booking process kya hai WorkShetu par", intent: "HOW_TO_BOOK" },
  { text: "worker ko book karne ke steps batao", intent: "HOW_TO_BOOK" },
  { text: "how can I hire tractor online", intent: "HOW_TO_BOOK" },
  { text: "बुकिंग कैसे करें", intent: "HOW_TO_BOOK" },
  { text: "मजदूर बुक करने का क्या तरीका है", intent: "HOW_TO_BOOK" },

  // TRACK_BOOKING
  { text: "meri booking ka status kya hai", intent: "TRACK_BOOKING" },
  { text: "track my booking request", intent: "TRACK_BOOKING" },
  { text: "Where can I track my existing booking status", intent: "TRACK_BOOKING" },
  { text: "order status check karo", intent: "TRACK_BOOKING" },
  { text: "kya driver ne meri request accept ki", intent: "TRACK_BOOKING" },
  { text: "labour booking status kya chal raha hai", intent: "TRACK_BOOKING" },
  { text: "my recent bookings and orders", intent: "TRACK_BOOKING" },
  { text: "मेरी बुकिंग का स्टेटस क्या है", intent: "TRACK_BOOKING" },
  { text: "क्या आर्डर कन्फर्म हुआ", intent: "TRACK_BOOKING" },

  // GENERAL_QUERY
  { text: "namaste", intent: "GENERAL_QUERY" },
  { text: "hello", intent: "GENERAL_QUERY" },
  { text: "WorkShetu kya hai", intent: "GENERAL_QUERY" },
  { text: "what is WorkShetu platform", intent: "GENERAL_QUERY" },
  { text: "who are you", intent: "GENERAL_QUERY" },
  { text: "aap kaun ho", intent: "GENERAL_QUERY" },
  { text: "thank you so much", intent: "GENERAL_QUERY" },
  { text: "dhanyawad", intent: "GENERAL_QUERY" },
  { text: "नमस्ते", intent: "GENERAL_QUERY" },
  { text: "वर्कसेतु क्या है", intent: "GENERAL_QUERY" },
  { text: "आप कौन हैं", intent: "GENERAL_QUERY" }
];

// Multilingual synonym map for agricultural terms
const SYNONYMS = {
  // Machines
  "traktr": "tractor",
  "traktar": "tractor",
  "ट्रैक्टर": "tractor",
  "harwestr": "harvester",
  "हार्वेस्टर": "harvester",
  "रोटावेटर": "rotavator",
  "rotavetor": "rotavator",
  "कल्तीवेटर": "cultivator",
  "kulche": "cultivator",
  "मशीन": "machine",
  "khet": "farm",
  "kheti": "agriculture",

  // Labour
  "mazdoor": "labour",
  "majdoor": "labour",
  "leber": "labour",
  "मजदूर": "labour",
  "लेबर": "labour",
  "worker": "labour",
  "workers": "labour",
  "dihadi": "wage",
  "driver": "driver",
  "ड्राइवर": "driver",
  "helper": "helper",
  "कटाई": "harvesting",
  "बुवाई": "sowing",
  "रोपाई": "planting",
  "spraying": "spray",
  "दवा": "spray",

  // Commercial / Booking
  "kiraya": "price",
  "bhaada": "price",
  "kharcha": "price",
  "rate": "price",
  "rates": "price",
  "daam": "price",
  "charge": "price",
  "cost": "price",
  "किराया": "price",
  "दिहाड़ी": "price",
  "लागत": "price",
  "status": "status",
  "स्थिति": "status",
  "track": "track",
  "ट्रैक": "track",
  "available": "available",
  "उपलब्ध": "available",
  "mil": "available",
  "wheat": "wheat",
  "गेहूं": "wheat",
  "paddy": "paddy",
  "धान": "paddy",
  "loading": "loading",
  "weeding": "weeding",
  "harvesting": "harvesting",
  "katai": "harvesting"
};

/**
 * Tokenize text into normalized tokens and bigrams
 */
function tokenize(text) {
  if (!text || typeof text !== "string") return [];

  // Lowercase & normalize punctuation
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 0);
  const normalized = words.map((w) => SYNONYMS[w] || w);

  // Generate bigrams for better contextual intent discrimination
  const tokens = [...normalized];
  for (let i = 0; i < normalized.length - 1; i++) {
    tokens.push(`${normalized[i]}_${normalized[i + 1]}`);
  }

  return tokens;
}

class AgriculturalIntentClassifier {
  constructor() {
    this.classes = [
      "SEARCH_MACHINE",
      "SEARCH_LABOUR",
      "ASK_PRICE",
      "CHECK_AVAILABILITY",
      "HOW_TO_BOOK",
      "TRACK_BOOKING",
      "GENERAL_QUERY"
    ];
    this.vocabulary = new Map();
    this.idf = new Map();
    this.classVectors = new Map();
    this.trained = false;
    this.train();
  }

  train() {
    const docTokens = [];
    const classDocs = new Map();
    this.classes.forEach((c) => classDocs.set(c, []));

    // Tokenize all training examples
    TRAINING_CORPUS.forEach((sample) => {
      const tokens = tokenize(sample.text);
      docTokens.push(tokens);
      classDocs.get(sample.intent).push(tokens);

      tokens.forEach((t) => {
        if (!this.vocabulary.has(t)) {
          this.vocabulary.set(t, this.vocabulary.size);
        }
      });
    });

    const N = TRAINING_CORPUS.length;

    // Compute IDF
    this.vocabulary.forEach((_, term) => {
      const docsWithTerm = docTokens.filter((tokens) => tokens.includes(term)).length;
      const idfValue = Math.log((N + 1) / (docsWithTerm + 1)) + 1.0;
      this.idf.set(term, idfValue);
    });

    // Compute centroid vector for each class
    this.classes.forEach((c) => {
      const docs = classDocs.get(c);
      const vector = new Float32Array(this.vocabulary.size);

      docs.forEach((tokens) => {
        const tf = new Map();
        tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));

        tf.forEach((count, t) => {
          const idx = this.vocabulary.get(t);
          if (idx !== undefined) {
            const tfidf = count * (this.idf.get(t) || 1.0);
            vector[idx] += tfidf;
          }
        });
      });

      // L2 Normalize class centroid vector
      let norm = 0;
      for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (let i = 0; i < vector.length; i++) vector[i] /= norm;
      }

      this.classVectors.set(c, vector);
    });

    this.trained = true;
  }

  /**
   * Vectorize input query
   */
  vectorize(tokens) {
    const vector = new Float32Array(this.vocabulary.size);
    const tf = new Map();
    tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));

    tf.forEach((count, t) => {
      const idx = this.vocabulary.get(t);
      if (idx !== undefined) {
        const tfidf = count * (this.idf.get(t) || 1.0);
        vector[idx] = tfidf;
      }
    });

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) vector[i] /= norm;
    }

    return vector;
  }

  /**
   * Classify input query into an agricultural intent with confidence score
   */
  classify(text, options = {}) {
    const opts = typeof options === "string" ? { pageContext: options } : (options || {});
    if (!text || typeof text !== "string" || !text.trim()) {
      return {
        predictedIntent: "GENERAL_QUERY",
        intent: "GENERAL_QUERY",
        confidence: 0,
        probabilities: {},
        isLowConfidence: true,
        method: "ml_tfidf_centroid"
      };
    }

    const tokens = tokenize(text);
    if (tokens.length === 0) {
      return {
        predictedIntent: "GENERAL_QUERY",
        intent: "GENERAL_QUERY",
        confidence: 0,
        probabilities: {},
        isLowConfidence: true,
        method: "ml_tfidf_centroid"
      };
    }

    const queryVec = this.vectorize(tokens);
    const scores = {};

    this.classes.forEach((c) => {
      const classVec = this.classVectors.get(c);
      let dot = 0;
      for (let i = 0; i < queryVec.length; i++) {
        dot += queryVec[i] * classVec[i];
      }
      scores[c] = Math.max(0, dot);
    });

    // Contextual prior boost based on pageContext when relevant
    if (opts.pageContext === "labour" && scores["SEARCH_LABOUR"] !== undefined) {
      scores["SEARCH_LABOUR"] += 0.25;
    } else if (opts.pageContext === "machines" && scores["SEARCH_MACHINE"] !== undefined) {
      scores["SEARCH_MACHINE"] += 0.25;
    }

    let maxScore = -1;
    let bestClass = "GENERAL_QUERY";
    this.classes.forEach((c) => {
      if (scores[c] > maxScore) {
        maxScore = scores[c];
        bestClass = c;
      }
    });

    // Normalize scores to probabilities using Softmax temperature
    const temperature = 0.35;
    let expSum = 0;
    const exps = {};
    this.classes.forEach((c) => {
      const e = Math.exp(scores[c] / temperature);
      exps[c] = e;
      expSum += e;
    });

    const probabilities = {};
    this.classes.forEach((c) => {
      probabilities[c] = parseFloat((exps[c] / expSum).toFixed(4));
    });

    const confidence = probabilities[bestClass] || 0;
    const threshold = opts.threshold || 0.35;

    return {
      intent: bestClass,
      predictedIntent: bestClass,
      confidence,
      rawScore: parseFloat(maxScore.toFixed(4)),
      probabilities,
      isLowConfidence: maxScore < 0.10 || confidence < threshold,
      method: "ml_tfidf_centroid",
      tokens
    };
  }
}

const defaultClassifier = new AgriculturalIntentClassifier();

function classifyIntent(text, pageContext, options = {}) {
  const opts = typeof pageContext === "object" ? pageContext : { pageContext, ...options };
  return defaultClassifier.classify(text, opts);
}

module.exports = {
  AgriculturalIntentClassifier,
  defaultClassifier,
  classifyIntent,
  tokenize
};
