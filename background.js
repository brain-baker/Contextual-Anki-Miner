/* ============================================================
   background.js — CAD v4.6
   Added: Pixabay image search + image store to Anki
   ============================================================ */

var THEMES = {
  stone:   { label:"Stone",   pageBg:"#1a1a1a", cardBg:"#252525", border:"#383838", fg:"#e8e4e0", fgDim:"#9a9590", fgMuted:"#6a6560", accent:"#c9a87c" },
  minimal: { label:"Minimal", pageBg:"#f0f0f0", cardBg:"#ffffff", border:"#dcdcdc", fg:"#1a1a1a", fgDim:"#555555", fgMuted:"#999999", accent:"#333333" },
  nord:    { label:"Nord",    pageBg:"#2e3440", cardBg:"#3b4252", border:"#434c5e", fg:"#eceff4", fgDim:"#8a95aa", fgMuted:"#5d6880", accent:"#88c0d0" },
  rose:    { label:"Rose",    pageBg:"#1a1118", cardBg:"#261a22", border:"#3d2b35", fg:"#f0e6ec", fgDim:"#a0808f", fgMuted:"#6a4a5a", accent:"#e879a8" },
  forest:  { label:"Forest",  pageBg:"#111a14", cardBg:"#1a2a1e", border:"#2a3d2e", fg:"#d4e8d9", fgDim:"#78a882", fgMuted:"#4a6a52", accent:"#6dca9a" }
};

async function resolveTheme(id) {
  if (THEMES[id]) return THEMES[id];
  var s = await chrome.storage.local.get(["customThemes"]);
  var list = s.customThemes || [];
  for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
  return THEMES.stone;
}

function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function stripMd(t) { var c = t.trim(); if (c.startsWith("```")) c = c.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?\s*```$/, ""); return c.trim(); }
function ttsUrl(w, iso) { return iso === "en" ? "https://dict.youdao.com/dictvoice?audio=" + encodeURIComponent(w) + "&type=2" : "https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&dt=t&q=" + encodeURIComponent(w) + "&tl=" + encodeURIComponent(iso); }

async function anki(action, params) {
  var body = { action: action, version: 6 };
  if (params !== undefined) body.params = params;
  try {
    var r = await fetch("http://localhost:8765", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    var j = await r.json();
    if (j.error) return { error: j.error };
    return { ok: true, data: j.result };
  } catch (e) { return { error: "Cannot reach AnkiConnect. Is Anki open?" }; }
}

async function storeAudio(url, word) {
  try {
    var resp = await fetch(url);
    if (!resp.ok) return { error: "Audio HTTP " + resp.status };
    var buf = await resp.arrayBuffer();
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = btoa(bin);
    var fn = "cad_" + word.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) + "_" + Date.now() + ".mp3";
    var r = await anki("storeMediaFile", { filename: fn, data: b64 });
    if (r.error) return { error: r.error };
    return { ok: true, filename: fn };
  } catch (e) { return { error: e.message }; }
}

/* ---------- PIXABAY IMAGE SEARCH ---------- */

async function searchImages(word) {
  var s = await chrome.storage.local.get(["pixabayApiKey"]);
  var key = (s.pixabayApiKey || "").trim();
  if (!key) return { ok: true, images: [] };
  try {
    var url = "https://pixabay.com/api/?key=" + encodeURIComponent(key) +
              "&q=" + encodeURIComponent(word) +
              "&image_type=photo&per_page=5&safesearch=true";
    var r = await fetch(url);
    if (!r.ok) return { ok: true, images: [] };
    var d = await r.json();
    var imgs = [];
    if (d.hits && d.hits.length) {
      for (var i = 0; i < Math.min(d.hits.length, 5); i++) {
        imgs.push({
          id: d.hits[i].id,
          thumb: d.hits[i].previewURL,
          web: d.hits[i].webformatURL
        });
      }
    }
    return { ok: true, images: imgs };
  } catch (e) { return { ok: true, images: [] }; }
}

async function storeImage(imageUrl, word) {
  try {
    var resp = await fetch(imageUrl);
    if (!resp.ok) return { error: "Image HTTP " + resp.status };
    var ct = resp.headers.get("content-type") || "image/jpeg";
    var ext = "jpg";
    if (ct.indexOf("png") !== -1) ext = "png";
    else if (ct.indexOf("webp") !== -1) ext = "webp";
    var buf = await resp.arrayBuffer();
    var bytes = new Uint8Array(buf);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    var b64 = btoa(bin);
    var fn = "cad_img_" + word.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30) + "_" + Date.now() + "." + ext;
    var r = await anki("storeMediaFile", { filename: fn, data: b64 });
    if (r.error) return { error: r.error };
    return { ok: true, filename: fn };
  } catch (e) { return { error: e.message }; }
}

/* ---------- CSS / TEMPLATES ---------- */

function buildCSS(t) {
  return "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');\n" +
    ".card{font-family:'Inter','Segoe UI',system-ui,sans-serif;background:" + t.pageBg + ";color:" + t.fg + ";padding:24px;text-align:center;}\n" +
    ".b{max-width:440px;margin:0 auto;background:" + t.cardBg + ";border:1px solid " + t.border + ";border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.18);padding:28px;text-align:left;}\n" +
    ".wr{display:flex;align-items:center;gap:8px;margin-bottom:4px;}.w{font-size:28px;font-weight:700;color:" + t.accent + ";}\n" +
    ".ai{display:inline-flex;}.lm{font-size:13px;color:" + t.fgMuted + ";font-style:italic;margin-bottom:2px;}\n" +
    ".ip{font-size:14px;color:" + t.fgDim + ";margin-bottom:6px;}\n" +
    ".ps{display:inline-block;font-size:10px;font-weight:700;color:" + t.accent + ";background:" + t.pageBg + ";border:1px solid " + t.border + ";padding:3px 10px;border-radius:6px;text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px;}\n" +
    ".dv{border:none;border-top:1px solid " + t.border + ";margin:16px 0;}\n" +
    ".df{font-size:17px;color:" + t.fg + ";line-height:1.6;margin-bottom:16px;}\n" +
    ".sl{font-size:10px;font-weight:700;color:" + t.fgMuted + ";text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px;margin-top:14px;}\n" +
    ".ex ul{margin:0;padding-left:18px;}.ex li{font-size:14px;color:" + t.fgDim + ";line-height:1.6;margin-bottom:6px;}\n" +
    ".ex-tr{font-size:0.9em;color:" + t.fgMuted + ";display:block;margin-top:2px;}\n" +
    ".cx{background:" + t.pageBg + ";border:1px solid " + t.border + ";border-radius:10px;padding:12px 14px;margin-top:8px;font-size:14px;color:" + t.fgDim + ";line-height:1.55;}\n" +
    ".hl{color:" + t.accent + ";font-weight:600;}\n" +
    ".mg{margin-top:10px;padding-top:10px;border-top:1px dashed " + t.border + ";}\n" +
    ".mg-label{font-size:10px;font-weight:700;color:" + t.fgMuted + ";text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}\n" +
    ".mg-def{font-size:15px;color:" + t.fgDim + ";line-height:1.5;margin-bottom:4px;}\n" +
    ".cad-img{border-radius:10px;max-width:100%;margin-top:12px;}";
}

var F_REC = '<div class="b"><div class="wr"><span class="w">{{Word}}</span>{{#Audio}}<span class="ai">{{Audio}}</span>{{/Audio}}</div>{{#OriginalForm}}<div class="lm">{{OriginalForm}}</div>{{/OriginalForm}}{{#Pronunciation}}<div class="ip">{{Pronunciation}}</div>{{/Pronunciation}}{{#PartOfSpeech}}<div class="ps">{{PartOfSpeech}}</div>{{/PartOfSpeech}}{{#Image}}<div>{{Image}}</div>{{/Image}}</div>';
var B_FULL = '<div class="b"><div class="wr"><span class="w">{{Word}}</span>{{#Audio}}<span class="ai">{{Audio}}</span>{{/Audio}}</div>{{#OriginalForm}}<div class="lm">{{OriginalForm}}</div>{{/OriginalForm}}{{#Pronunciation}}<div class="ip">{{Pronunciation}}</div>{{/Pronunciation}}{{#PartOfSpeech}}<div class="ps">{{PartOfSpeech}}</div>{{/PartOfSpeech}}<hr class="dv"><div class="df">{{Definition}}</div>{{#OtherMeanings}}<div class="mg"><div class="mg-label">Other meanings</div>{{OtherMeanings}}</div>{{/OtherMeanings}}{{#Examples}}<div class="sl">Examples</div><div class="ex">{{Examples}}</div>{{/Examples}}{{#Sentence}}<div class="sl">Context</div><div class="cx">{{Sentence}}</div>{{/Sentence}}{{#Image}}<div>{{Image}}</div>{{/Image}}</div>';
var F_RECALL = '{{#EnableRecall}}<div class="b">{{#PartOfSpeech}}<div class="ps">{{PartOfSpeech}}</div>{{/PartOfSpeech}}<div class="df">{{Definition}}</div></div>{{/EnableRecall}}';

async function ensureExtModel(themeId) {
  var t = await resolveTheme(themeId);
  var name = "CAD " + t.label;
  var existing = await anki("modelNames");
  if (existing.error) return existing;

  var FIELDS = ["Word", "OriginalForm", "Pronunciation", "PartOfSpeech", "Definition", "OtherMeanings", "Examples", "Sentence", "Audio", "Image", "EnableRecall"];

  if ((existing.data || []).indexOf(name) !== -1) {
    await anki("updateModelStyling", { model: { name: name, css: buildCSS(t) } });
    var existingFields = await anki("modelFieldNames", { modelName: name });
    if (existingFields.ok && existingFields.data) {
      if (existingFields.data.indexOf("OtherMeanings") === -1) await anki("modelFieldAdd", { modelName: name, fieldName: "OtherMeanings", index: 5 });
      if (existingFields.data.indexOf("Image") === -1) await anki("modelFieldAdd", { modelName: name, fieldName: "Image", index: 9 });
    }
    await anki("updateModelTemplates", { model: { name: name, templates: { "Recognition": { Front: F_REC, Back: B_FULL }, "Recall": { Front: F_RECALL, Back: B_FULL } } } });
    return { ok: true, name: name };
  }

  var r = await anki("createModel", {
    modelName: name, inOrderFields: FIELDS, css: buildCSS(t), isCloze: false,
    cardTemplates: [{ Name: "Recognition", Front: F_REC, Back: B_FULL }, { Name: "Recall", Front: F_RECALL, Back: B_FULL }]
  });
  if (r.error) return { error: r.error };
  return { ok: true, name: name };
}

function buildPrompt(word, sentence, numEx, srcLang, natLang, defLen, transEx) {
  var src = (!srcLang || srcLang === "auto") ? "Auto-detect the language of the word" : "The word is in " + srcLang;
  var nat = natLang || "English";
  var len = defLen === "detailed" ? "3-4 thorough sentences with nuances and usage notes" : "one short, concise sentence";

  var exFmt = transEx 
    ? '  "examples": [{"text": "example in ORIGINAL language", "translation": "translation in ' + nat + '"}]'
    : '  "examples": [{"text": "example in ORIGINAL language"}]';

  return src + ".\n" +
    "Analyze the word '" + word + "' as used in this sentence: '" + sentence + "'.\n" +
    "Write EVERYTHING (definitions/explanations) in " + nat + ".\n\n" +
    "CRITICAL RULES:\n" +
    "1. DEFINITION: " + len + ". NEVER use the target word itself (or any form of it) inside the definition. Must be understandable WITHOUT knowing the word.\n" +
    "2. EXAMPLES: Provide " + numEx + " example sentences. You **MUST** use the exact target word ('" + word + "') inside EVERY example sentence! Do not replace it with synonyms. These sentences MUST be written in the ORIGINAL language of the word, completely independent from the original context above, using everyday topics.\n" +
    "3. OTHER MEANINGS: If the word has other common meanings DIFFERENT from how it's used in the given sentence, list up to 3 other meanings as short one-line definitions in " + nat + " (also never using the target word itself). If the word only has one common meaning, return an empty array.\n" +
    "4. Return ONLY valid JSON with no markdown formatting.\n\n" +
    "Structure:\n" +
    "{\n" +
    '  "definition": "context-specific meaning in ' + nat + ' (NEVER containing the word itself)",\n' +
    '  "partOfSpeech": "noun/verb/adjective/etc",\n' +
    '  "originalForm": "lemma/dictionary form",\n' +
    '  "pronunciation": "IPA notation",\n' +
    '  "sourceIsoCode": "2-letter ISO code",\n' +
    exFmt + ',\n' +
    '  "otherMeanings": ["other meaning 1", "other meaning 2"]\n' +
    "}";
}

async function callAI(prompt) {
  var s = await chrome.storage.local.get(["aiProvider", "geminiApiKey", "geminiModel", "groqApiKey", "groqModel", "openrouterApiKey", "openrouterModel"]);
  var p = s.aiProvider || "groq";

  if (p === "gemini") {
    var k = (s.geminiApiKey || "").trim(); if (!k) return { error: "No Gemini key." };
    try {
      var r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + (s.geminiModel || "gemini-2.0-flash") + ":generateContent?key=" + k, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }) });
      if (!r.ok) { var e = ""; try { e = (await r.json()).error.message; } catch (_) {} return { error: "Gemini " + r.status + ": " + e }; }
      var d = await r.json(); return { ok: true, text: d.candidates[0].content.parts[0].text };
    } catch (e) { return { error: "Gemini network error" }; }
  }
  if (p === "openrouter") {
    var k = (s.openrouterApiKey || "").trim(); if (!k) return { error: "No OpenRouter key." };
    try {
      var r = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + k, "HTTP-Referer": "https://github.com/cad" }, body: JSON.stringify({ model: s.openrouterModel || "meta-llama/llama-4-maverick:free", messages: [{ role: "system", content: "You are a precise dictionary. Respond ONLY in valid JSON." }, { role: "user", content: prompt }], temperature: 0.3 }) });
      if (!r.ok) { var e = ""; try { e = (await r.json()).error.message; } catch (_) {} return { error: "OpenRouter " + r.status + ": " + e }; }
      var d = await r.json(); return { ok: true, text: d.choices[0].message.content };
    } catch (e) { return { error: "OpenRouter network error" }; }
  }
  
  var k = (s.groqApiKey || "").trim(); if (!k) return { error: "No Groq key." };
  try {
    var r = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + k }, body: JSON.stringify({ model: s.groqModel || "llama-3.3-70b-versatile", messages: [{ role: "system", content: "You are a precise dictionary. Respond ONLY in valid JSON." }, { role: "user", content: prompt }], temperature: 0.3 }) });
    if (!r.ok) { var e = ""; try { e = (await r.json()).error.message; } catch (_) {} return { error: "Groq " + r.status + ": " + e }; }
    var d = await r.json(); return { ok: true, text: d.choices[0].message.content };
  } catch (e) { return { error: "Groq network error" }; }
}

async function lookup(word, sentence) {
  var s = await chrome.storage.local.get(["numExamples", "sourceLang", "nativeLang", "defLength", "translateExamples"]);
  var transEx = s.translateExamples !== false;
  var prompt = buildPrompt(word, sentence, s.numExamples || 2, s.sourceLang, s.nativeLang, s.defLength || "brief", transEx);

  // Run AI lookup and image search in parallel
  var aiPromise = callAI(prompt);
  var imgPromise = searchImages(word);

  var res = await aiPromise;
  var imgRes = await imgPromise;

  if (res.error) return { error: res.error };
  try {
    var parsed = JSON.parse(stripMd(res.text));
    parsed.ttsUrl = ttsUrl(parsed.originalForm || word, (parsed.sourceIsoCode || "en").toLowerCase());
    parsed.images = (imgRes.ok && imgRes.images) ? imgRes.images : [];
    return { ok: true, data: parsed };
  } catch (e) { return { error: "AI returned invalid JSON." }; }
}

async function addToAnki(payload) {
  var s = await chrome.storage.local.get([
    "ankiDeckName", "ankiTags", "theme", "cardTheme", "noteTypeMode", "customNoteType", "fieldMapping",
    "includeReverse", "fieldPronunciation", "fieldPartOfSpeech", "fieldExamples", "fieldContext", "fieldAudio"
  ]);

  var word = payload.word || "";
  var sentence = payload.sentence || "";
  var showPron = s.fieldPronunciation !== false;
  var showPos = s.fieldPartOfSpeech !== false;
  var showEx = s.fieldExamples !== false;
  var showCtx = s.fieldContext !== false;
  var showAud = s.fieldAudio !== false;

  var exHtml = "";
  if (showEx && payload.examples && payload.examples.length) {
    exHtml = "<ul>";
    for (var i = 0; i < payload.examples.length; i++) {
      var ex = payload.examples[i];
      if (typeof ex === 'string') {
        exHtml += "<li>" + esc(ex) + "</li>";
      } else {
        exHtml += "<li>" + esc(ex.text);
        if (ex.translation) exHtml += '<span class="ex-tr">' + esc(ex.translation) + '</span>';
        exHtml += "</li>";
      }
    }
    exHtml += "</ul>";
  }

  var otherHtml = "";
  if (payload.otherMeanings && payload.otherMeanings.length) {
    for (var i = 0; i < payload.otherMeanings.length; i++) {
      otherHtml += '<div class="mg-def">' + (i + 1) + ". " + esc(payload.otherMeanings[i]) + "</div>";
    }
  }

  var sentHtml = "";
  if (showCtx && sentence) {
    var rx = new RegExp("(" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
    sentHtml = esc(sentence).replace(rx, '<span class="hl">$1</span>');
  }

  var audioField = "";
  if (showAud && payload.ttsUrl) {
    var ar = await storeAudio(payload.ttsUrl, word);
    if (ar.ok) audioField = "[sound:" + ar.filename + "]";
  }

  // Handle selected image
  var imageField = "";
  if (payload.selectedImageUrl) {
    var ir = await storeImage(payload.selectedImageUrl, word);
    if (ir.ok) imageField = '<img src="' + ir.filename + '" class="cad-img">';
  }

  var dataItems = {
    word: word,
    originalForm: (payload.originalForm && payload.originalForm.toLowerCase() !== word.toLowerCase()) ? payload.originalForm : "",
    pronunciation: showPron ? (payload.pronunciation || "") : "",
    partOfSpeech: showPos ? (payload.partOfSpeech || "") : "",
    definition: payload.definition || "",
    otherMeanings: otherHtml,
    examples: showEx ? exHtml : "",
    sentence: showCtx ? sentHtml : "",
    audio: showAud ? audioField : "",
    image: imageField
  };

  var deck = (s.ankiDeckName || "Default").trim();
  var tags = (s.ankiTags || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);

  if (s.noteTypeMode === "custom" && s.customNoteType) {
    var mapping = s.fieldMapping || {};
    var fields = {};
    for (var fieldName in mapping) {
      var items = mapping[fieldName];
      if (!items || !items.length) continue;
      var parts = [];
      for (var i = 0; i < items.length; i++) {
        var val = dataItems[items[i]];
        if (val && val.toString().trim() !== "") parts.push(val);
      }
      fields[fieldName] = parts.length > 0 ? parts.join("<br><br>") : "";
    }
    var r = await anki("addNote", { note: { deckName: deck, modelName: s.customNoteType, fields: fields, options: { allowDuplicate: false }, tags: tags } });
    if (r.error) return { error: r.error };
    return { ok: true, noteId: r.data };
  } else {
    var cardThemeId = s.cardTheme || s.theme || "stone";
    var modelResult = await ensureExtModel(cardThemeId);
    if (modelResult.error) return { error: modelResult.error };

    var fields = {
      Word: dataItems.word, OriginalForm: dataItems.originalForm, Pronunciation: dataItems.pronunciation,
      PartOfSpeech: dataItems.partOfSpeech, Definition: dataItems.definition, OtherMeanings: dataItems.otherMeanings,
      Examples: dataItems.examples, Sentence: dataItems.sentence, Audio: dataItems.audio, Image: dataItems.image,
      EnableRecall: (s.includeReverse !== false) ? "1" : ""
    };
    var r = await anki("addNote", { note: { deckName: deck, modelName: modelResult.name, fields: fields, options: { allowDuplicate: false }, tags: tags } });
    if (r.error) return { error: r.error };
    return { ok: true, noteId: r.data };
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  if (msg.action === "lookup") { lookup(msg.word, msg.sentence).then(reply).catch(function (e) { reply({ error: "Lookup crashed: " + e.message }); }); return true; }
  if (msg.action === "addToAnki") { addToAnki(msg.payload).then(reply).catch(function (e) { reply({ error: "Add crashed: " + e.message }); }); return true; }
  if (msg.action === "fetchDecks") { anki("deckNames").then(reply).catch(function (e) { reply({ error: e.message }); }); return true; }
  if (msg.action === "fetchModels") { anki("modelNames").then(reply).catch(function (e) { reply({ error: e.message }); }); return true; }
  if (msg.action === "fetchFields") { anki("modelFieldNames", { modelName: msg.modelName }).then(reply).catch(function (e) { reply({ error: e.message }); }); return true; }
  if (msg.action === "browseCard") { anki("guiBrowse", { query: "nid:" + msg.noteId }).then(reply).catch(function (e) { reply({ error: e.message }); }); return true; }
  return false;
});