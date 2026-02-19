/* ============================================================
   options.js — CAD v4.2
   Fixed: card theme independent, field-first mapping,
   disabled fields hidden from mapping, multi-select with ordering
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  function el(id) { return document.getElementById(id); }

  var PREDEF = {
    stone:   { label: "Stone",   pageBg: "#1a1a1a", cardBg: "#252525", border: "#383838", fg: "#e8e4e0", fgDim: "#9a9590", fgMuted: "#6a6560", accent: "#c9a87c" },
    minimal: { label: "Minimal", pageBg: "#f0f0f0", cardBg: "#ffffff", border: "#dcdcdc", fg: "#1a1a1a", fgDim: "#555555", fgMuted: "#999999", accent: "#333333" },
    nord:    { label: "Nord",    pageBg: "#2e3440", cardBg: "#3b4252", border: "#434c5e", fg: "#eceff4", fgDim: "#8a95aa", fgMuted: "#5d6880", accent: "#88c0d0" },
    rose:    { label: "Rose",    pageBg: "#1a1118", cardBg: "#261a22", border: "#3d2b35", fg: "#f0e6ec", fgDim: "#a0808f", fgMuted: "#6a4a5a", accent: "#e879a8" },
    forest:  { label: "Forest",  pageBg: "#111a14", cardBg: "#1a2a1e", border: "#2a3d2e", fg: "#d4e8d9", fgDim: "#78a882", fgMuted: "#4a6a52", accent: "#6dca9a" }
  };
  var customThemes = [];
  var curTheme = "stone";
  var curCardTheme = "stone";
  var curProv = "groq";
  var savedDeck = "";
  var isRec = false;
  var curKb = { ctrl: false, shift: true, alt: false, meta: false, key: "" };
  var curNTMode = "extension";
  var curFieldMapping = {}; // { "FieldName": ["word","audio"], ... }
  var savedCustomNT = "";
  var loadedFields = []; // fields of the currently selected custom note type

  // All possible data items
  var ALL_DATA_ITEMS = [
    { key: "word",         label: "Word",            toggle: null },
    { key: "originalForm", label: "Lemma",            toggle: null },
    { key: "pronunciation",label: "Pronunciation",    toggle: "fieldPronunciation" },
    { key: "partOfSpeech", label: "Part of Speech",    toggle: "fieldPartOfSpeech" },
    { key: "definition",   label: "Definition",       toggle: null },
    { key: "otherMeanings",label: "Other Meanings",    toggle: null },
    { key: "examples",     label: "Examples",         toggle: "fieldExamples" },
    { key: "sentence",     label: "Context",          toggle: "fieldContext" },
    { key: "audio",        label: "Audio",            toggle: "fieldAudio" }
  ];
  function getEnabledDataItems() {
    var items = [];
    for (var i = 0; i < ALL_DATA_ITEMS.length; i++) {
      var item = ALL_DATA_ITEMS[i];
      if (item.toggle === null) {
        items.push(item);
      } else {
        var checkbox = el(item.toggle);
        if (checkbox && checkbox.checked) {
          items.push(item);
        }
      }
    }
    return items;
  }

  // ==================== APPLY THEME TO PAGE ====================

  function applyPage(id) {
    var t = PREDEF[id];
    if (!t) {
      for (var i = 0; i < customThemes.length; i++) {
        if (customThemes[i].id === id) { t = customThemes[i]; break; }
      }
    }
    if (!t) t = PREDEF.stone;
    var r = document.documentElement;
    r.style.setProperty("--bg", t.pageBg); r.style.setProperty("--card", t.cardBg);
    r.style.setProperty("--border", t.border); r.style.setProperty("--fg", t.fg);
    r.style.setProperty("--fg2", t.fgDim); r.style.setProperty("--fg3", t.fgMuted);
    r.style.setProperty("--accent", t.accent); r.style.setProperty("--inp", t.pageBg);
  }

  // ==================== RENDER PILLS ====================

  function renderPills(containerId, selectedId, onSelect, allowDelete) {
    var cont = el(containerId); cont.innerHTML = "";
    Object.keys(PREDEF).forEach(function (id) {
      var t = PREDEF[id];
      var p = document.createElement("div"); p.className = "pill" + (selectedId === id ? " sel" : "");
      p.style.background = t.cardBg; p.style.color = t.accent;
      if (selectedId === id) p.style.borderColor = t.accent;
      else if (id === "minimal") p.style.border = "2px solid #ddd";
      p.textContent = t.label;
      p.addEventListener("click", function () { onSelect(id); });
      cont.appendChild(p);
    });
    customThemes.forEach(function (ct) {
      var p = document.createElement("div"); p.className = "pill" + (selectedId === ct.id ? " sel" : "");
      p.style.background = ct.cardBg; p.style.color = ct.accent;
      if (selectedId === ct.id) p.style.borderColor = ct.accent;
      p.textContent = ct.label;
      p.addEventListener("click", function () { onSelect(ct.id); });
      if (allowDelete) {
        var del = document.createElement("button"); del.className = "del"; del.textContent = "x";
        del.addEventListener("click", function (e) {
          e.stopPropagation();
          customThemes = customThemes.filter(function (x) { return x.id !== ct.id; });
          chrome.storage.local.set({ customThemes: customThemes });
          if (selectedId === ct.id) onSelect("stone");
          else renderPills(containerId, selectedId, onSelect, allowDelete);
        });
        p.appendChild(del);
      }
      cont.appendChild(p);
    });
  }

  function selectBubbleTheme(id) {
    curTheme = id; applyPage(id);
    renderPills("pills", id, selectBubbleTheme, true);
  }
  function selectCardTheme(id) {
    curCardTheme = id;
    renderPills("cardPills", id, selectCardTheme, false);
  }

  renderPills("pills", "stone", selectBubbleTheme, true);
  renderPills("cardPills", "stone", selectCardTheme, false);

  // ==================== CUSTOM THEME CREATOR ====================

  el("showCreator").addEventListener("click", function () { el("customCreator").style.display = "block"; this.style.display = "none"; });
  el("ctCancel").addEventListener("click", function () { el("customCreator").style.display = "none"; el("showCreator").style.display = ""; el("ctError").textContent = ""; });
  el("ctSave").addEventListener("click", function () {
    var name = el("ctName").value.trim();
    if (!name) { el("ctError").textContent = "Name required."; return; }
    var predefNames = Object.keys(PREDEF).map(function (k) { return PREDEF[k].label.toLowerCase(); });
    if (predefNames.indexOf(name.toLowerCase()) !== -1) { el("ctError").textContent = "Conflicts with built-in theme."; return; }
    for (var i = 0; i < customThemes.length; i++) {
      if (customThemes[i].label.toLowerCase() === name.toLowerCase()) { el("ctError").textContent = "Name already used."; return; }
    }
    var nt = {
      id: "custom_" + Date.now(), label: name,
      pageBg: el("ctPageBg").value, cardBg: el("ctCardBg").value, border: el("ctBorder").value,
      fg: el("ctFg").value, fgDim: el("ctFgDim").value, fgMuted: el("ctFgDim").value, accent: el("ctAccent").value
    };
    customThemes.push(nt);
    chrome.storage.local.set({ customThemes: customThemes });
    renderPills("pills", curTheme, selectBubbleTheme, true);
    renderPills("cardPills", curCardTheme, selectCardTheme, false);
    el("customCreator").style.display = "none"; el("showCreator").style.display = "";
    el("ctError").textContent = ""; el("ctName").value = "";
    showSt("Theme '" + name + "' created.", "success");
  });

  // ==================== PROVIDER TABS ====================

  function setProv(p) {
    curProv = p;
    document.querySelectorAll(".ptab").forEach(function (t) { t.classList.toggle("act", t.getAttribute("data-p") === p); });
    document.querySelectorAll(".psec").forEach(function (s) { s.classList.toggle("act", s.id === "s-" + p); });
  }
  document.querySelectorAll(".ptab").forEach(function (t) { t.addEventListener("click", function () { setProv(this.getAttribute("data-p")); }); });
  document.querySelectorAll(".tpb").forEach(function (b) {
    b.addEventListener("click", function () {
      var inp = el(this.getAttribute("data-t"));
      if (inp.type === "password") { inp.type = "text"; this.textContent = "hide"; }
      else { inp.type = "password"; this.textContent = "show"; }
    });
  });

  // ==================== KEYBIND ====================

  function renderKb(kb) {
    var ps = [];
    if (kb.ctrl) ps.push("Ctrl"); if (kb.shift) ps.push("Shift");
    if (kb.alt) ps.push("Alt"); if (kb.meta) ps.push("Meta");
    if (kb.key) ps.push(kb.key.length === 1 ? kb.key.toUpperCase() : kb.key);
    if (!ps.length) ps.push("(none)");
    var h = "";
    for (var i = 0; i < ps.length; i++) {
      if (i) h += '<span class="p">+</span>';
      h += '<span class="k">' + ps[i] + '</span>';
    }
    el("kbD").innerHTML = h;
  }
  el("kbD").addEventListener("click", function () { isRec = true; this.classList.add("rec"); this.innerHTML = '<span style="color:var(--fg3);font-size:11px;">Press keys...</span>'; });
  el("kbD").addEventListener("keydown", function (e) {
    if (!isRec) return; e.preventDefault(); e.stopPropagation();
    var mods = ["Shift", "Control", "Alt", "Meta"];
    curKb = { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey, key: mods.indexOf(e.key) === -1 ? e.key : "" };
    isRec = false; this.classList.remove("rec"); renderKb(curKb);
  });
  document.addEventListener("click", function (e) { if (isRec && !el("kbD").contains(e.target)) { isRec = false; el("kbD").classList.remove("rec"); renderKb(curKb); } });
  el("kbR").addEventListener("click", function () { curKb = { ctrl: false, shift: true, alt: false, meta: false, key: "" }; renderKb(curKb); });

  // ==================== ANKI CONNECTION ====================

  function setAS(ok, msg) { el("ankiSt").className = "ast " + (ok ? "ok" : "er"); el("ankiStT").textContent = msg; }
  function popDecks(decks, sel) {
    var s = el("ankiDeck"); s.innerHTML = "";
    if (!decks || !decks.length) { s.innerHTML = '<option value="">Open Anki & click Refresh</option>'; return; }
    decks.sort(function (a, b) { return a === "Default" ? -1 : b === "Default" ? 1 : a.localeCompare(b); });
    decks.forEach(function (d) { var o = document.createElement("option"); o.value = d; o.textContent = d; s.appendChild(o); });
    if (sel && decks.indexOf(sel) !== -1) s.value = sel;
  }
  el("refDk").addEventListener("click", function () {
    var btn = this; btn.textContent = "..."; btn.disabled = true; setAS(false, "Connecting...");
    chrome.runtime.sendMessage({ action: "fetchDecks" }, function (r) {
      btn.textContent = "Refresh"; btn.disabled = false;
      if (chrome.runtime.lastError) { setAS(false, "Extension error."); popDecks([]); return; }
      if (!r || r.error) { setAS(false, r ? r.error : "No response"); popDecks([]); return; }
      if (r.ok && r.data) { setAS(true, "Connected — " + r.data.length + " decks"); popDecks(r.data, savedDeck); }
      else { setAS(false, "Unexpected response"); popDecks([]); }
    });
  });

  // ==================== NOTE TYPE MODE ====================

  var ntRadios = document.querySelectorAll('input[name="ntMode"]');
  ntRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      curNTMode = this.value;
      el("extSection").style.display = curNTMode === "extension" ? "block" : "none";
      el("customSection").style.display = curNTMode === "custom" ? "block" : "none";
    });
  });

  // Fetch note types
  el("refNT").addEventListener("click", function () {
    var btn = this; btn.textContent = "..."; btn.disabled = true;
    chrome.runtime.sendMessage({ action: "fetchModels" }, function (r) {
      btn.textContent = "Refresh"; btn.disabled = false;
      var s = el("customNT"); s.innerHTML = "";
      if (!r || r.error || !r.ok) { s.innerHTML = '<option value="">Failed to load</option>'; return; }
      var models = (r.data || []).slice().sort();
      models.forEach(function (m) { var o = document.createElement("option"); o.value = m; o.textContent = m; s.appendChild(o); });
      if (savedCustomNT && models.indexOf(savedCustomNT) !== -1) s.value = savedCustomNT;
      if (s.value) loadFields(s.value);
    });
  });

  el("customNT").addEventListener("change", function () { if (this.value) loadFields(this.value); });

  // ==================== FIELD-FIRST MAPPING ====================
  // loadedFields = ["Front", "Back", "Extra"]
  // For each field, show a multi-select area where user picks data items
  // and can reorder them. Items separated by line breaks in final output.

  function loadFields(modelName) {
    chrome.runtime.sendMessage({ action: "fetchFields", modelName: modelName }, function (r) {
      var area = el("fieldMapArea");
      var cont = el("fieldMap");
      if (!r || r.error || !r.ok) { area.style.display = "none"; return; }
      loadedFields = r.data || [];
      if (!loadedFields.length) { area.style.display = "none"; return; }
      area.style.display = "block";
      renderFieldMapping();
    });
  }

  function renderFieldMapping() {
    var cont = el("fieldMap");
    cont.innerHTML = "";
    var enabledItems = getEnabledDataItems();

    loadedFields.forEach(function (fieldName) {
      var assigned = curFieldMapping[fieldName] || [];

      var row = document.createElement("div");
      row.style.cssText = "margin-bottom:14px;padding:10px;background:var(--inp);border:1px solid var(--border);border-radius:8px;";

      // Field name header
      var header = document.createElement("div");
      header.style.cssText = "font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px;";
      header.textContent = fieldName;
      row.appendChild(header);

      // Selected items (sortable list)
      var listDiv = document.createElement("div");
      listDiv.style.cssText = "min-height:28px;margin-bottom:8px;";
      listDiv.setAttribute("data-field", fieldName);

      function rebuildList() {
        listDiv.innerHTML = "";
        var current = curFieldMapping[fieldName] || [];
        if (current.length === 0) {
          var empty = document.createElement("div");
          empty.style.cssText = "font-size:11px;color:var(--fg3);font-style:italic;padding:4px 0;";
          empty.textContent = "(empty — nothing will be put in this field)";
          listDiv.appendChild(empty);
          return;
        }
        current.forEach(function (itemKey, idx) {
          var chip = document.createElement("div");
          chip.style.cssText = "display:inline-flex;align-items:center;gap:4px;padding:4px 8px;margin:2px 4px 2px 0;background:var(--card);border:1px solid var(--border);border-radius:5px;font-size:11px;color:var(--fg);";

          // Find label
          var label = itemKey;
          for (var i = 0; i < ALL_DATA_ITEMS.length; i++) { if (ALL_DATA_ITEMS[i].key === itemKey) { label = ALL_DATA_ITEMS[i].label; break; } }
          var txt = document.createElement("span");
          txt.textContent = label;
          chip.appendChild(txt);

          // Move up
          if (idx > 0) {
            var up = document.createElement("button");
            up.textContent = "\u2191";
            up.style.cssText = "background:none;border:none;color:var(--fg3);cursor:pointer;font-size:11px;padding:0 2px;";
            up.addEventListener("click", function () {
              var arr = curFieldMapping[fieldName].slice();
              var tmp = arr[idx]; arr[idx] = arr[idx - 1]; arr[idx - 1] = tmp;
              curFieldMapping[fieldName] = arr; rebuildList();
            });
            chip.appendChild(up);
          }
          // Move down
          if (idx < current.length - 1) {
            var dn = document.createElement("button");
            dn.textContent = "\u2193";
            dn.style.cssText = "background:none;border:none;color:var(--fg3);cursor:pointer;font-size:11px;padding:0 2px;";
            dn.addEventListener("click", function () {
              var arr = curFieldMapping[fieldName].slice();
              var tmp = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = tmp;
              curFieldMapping[fieldName] = arr; rebuildList();
            });
            chip.appendChild(dn);
          }
          // Remove
          var rm = document.createElement("button");
          rm.textContent = "\u00d7";
          rm.style.cssText = "background:none;border:none;color:var(--err);cursor:pointer;font-size:13px;padding:0 2px;font-weight:700;";
          rm.addEventListener("click", function () {
            curFieldMapping[fieldName] = curFieldMapping[fieldName].filter(function (x) { return x !== itemKey; });
            rebuildList();
          });
          chip.appendChild(rm);

          // Line break indicator
          if (idx < current.length - 1) {
            var br = document.createElement("span");
            br.style.cssText = "font-size:9px;color:var(--fg3);margin-left:2px;";
            br.textContent = "↵";
            chip.appendChild(br);
          }

          listDiv.appendChild(chip);
        });
      }
      rebuildList();
      row.appendChild(listDiv);

      // Add dropdown
      var addRow = document.createElement("div");
      addRow.style.cssText = "display:flex;gap:6px;align-items:center;";
      var sel = document.createElement("select");
      sel.style.cssText = "flex:1;";
      var defOpt = document.createElement("option");
      defOpt.value = ""; defOpt.textContent = "Add content...";
      sel.appendChild(defOpt);
      enabledItems.forEach(function (item) {
        var o = document.createElement("option");
        o.value = item.key; o.textContent = item.label;
        sel.appendChild(o);
      });
      var addBtn = document.createElement("button");
      addBtn.className = "sb";
      addBtn.textContent = "Add";
      addBtn.addEventListener("click", function () {
        if (!sel.value) return;
        if (!curFieldMapping[fieldName]) curFieldMapping[fieldName] = [];
        curFieldMapping[fieldName].push(sel.value);
        sel.value = "";
        rebuildList();
      });
      addRow.appendChild(sel);
      addRow.appendChild(addBtn);
      row.appendChild(addRow);

      var hint = document.createElement("div");
      hint.style.cssText = "font-size:10px;color:var(--fg3);margin-top:4px;";
      hint.textContent = "Items are joined with line breaks in order shown above.";
      row.appendChild(hint);

      cont.appendChild(row);
    });
  }

  // When card field toggles change, re-render the mapping
  ["fieldPronunciation", "fieldPartOfSpeech", "fieldExamples", "fieldContext", "fieldAudio"].forEach(function (id) {
    el(id).addEventListener("change", function () {
      // Remove disabled items from any existing mappings
      var enabled = getEnabledDataItems().map(function (x) { return x.key; });
      for (var field in curFieldMapping) {
        curFieldMapping[field] = curFieldMapping[field].filter(function (key) {
          return enabled.indexOf(key) !== -1;
        });
      }
      if (curNTMode === "custom" && loadedFields.length > 0) {
        renderFieldMapping();
      }
    });
  });

  // ==================== LOAD SETTINGS ====================

  chrome.storage.local.get(null, function (s) {
    if (s.customThemes) customThemes = s.customThemes;
    if (s.theme) { curTheme = s.theme; applyPage(curTheme); }
    renderPills("pills", curTheme, selectBubbleTheme, true);
    if (s.cardTheme) curCardTheme = s.cardTheme;
    renderPills("cardPills", curCardTheme, selectCardTheme, false);
    if (s.aiProvider) setProv(s.aiProvider);
    if (s.geminiApiKey) el("geminiApiKey").value = s.geminiApiKey;
    if (s.geminiModel) el("geminiModel").value = s.geminiModel;
    if (s.groqApiKey) el("groqApiKey").value = s.groqApiKey;
    if (s.groqModel) el("groqModel").value = s.groqModel;
    if (s.openrouterApiKey) el("openrouterApiKey").value = s.openrouterApiKey;
    if (s.openrouterModel) el("openrouterModel").value = s.openrouterModel;
    if (s.ankiDeckName) savedDeck = s.ankiDeckName;
    if (s.ankiTags) el("ankiTags").value = s.ankiTags;
    if (s.numExamples !== undefined) el("numExamples").value = s.numExamples;
    if (s.sourceLang) el("sourceLang").value = s.sourceLang;
    if (s.nativeLang) el("nativeLang").value = s.nativeLang;
    if (s.defLength) el("defLength").value = s.defLength;
    if (s.keybind) { try { curKb = typeof s.keybind === "string" ? JSON.parse(s.keybind) : s.keybind; } catch (_) {} }
    renderKb(curKb);
    if (s.noteTypeMode) {
      curNTMode = s.noteTypeMode;
      var radio = document.querySelector('input[name="ntMode"][value="' + curNTMode + '"]');
      if (radio) radio.checked = true;
      el("extSection").style.display = curNTMode === "extension" ? "block" : "none";
      el("customSection").style.display = curNTMode === "custom" ? "block" : "none";
    }
    if (s.customNoteType) savedCustomNT = s.customNoteType;
    if (s.fieldMapping) curFieldMapping = s.fieldMapping;
    if(s.fieldPronunciation===false)el("fieldPronunciation").checked=false;
  if(s.fieldPartOfSpeech===false)el("fieldPartOfSpeech").checked=false;
  if(s.fieldExamples===false)el("fieldExamples").checked=false;
  if(s.fieldContext===false)el("fieldContext").checked=false;
  if(s.fieldAudio===false)el("fieldAudio").checked=false;
  if(s.includeReverse===false)el("includeReverse").checked=false;
  if(s.translateExamples===false)el("translateExamples").checked=false;
  });

  // ==================== SAVE ====================

  el("saveBtn").addEventListener("click", function () {
    var key = "";
    if (curProv === "gemini") key = el("geminiApiKey").value.trim();
    else if (curProv === "groq") key = el("groqApiKey").value.trim();
    else key = el("openrouterApiKey").value.trim();
    if (!key) { showSt("Enter API key for " + curProv + ".", "error"); return; }
    var deck = el("ankiDeck").value;
    if (!deck) { showSt("Select a deck. Click Refresh.", "error"); return; }
    var n = parseInt(el("numExamples").value, 10);
    if (isNaN(n) || n < 1) n = 1; if (n > 5) n = 5;

        chrome.storage.local.set({
      theme:curTheme, cardTheme:curCardTheme, customThemes:customThemes,
      aiProvider:curProv,
      geminiApiKey:el("geminiApiKey").value.trim(), geminiModel:el("geminiModel").value,
      groqApiKey:el("groqApiKey").value.trim(), groqModel:el("groqModel").value,
      openrouterApiKey:el("openrouterApiKey").value.trim(), openrouterModel:el("openrouterModel").value,
      ankiDeckName:deck, ankiTags:el("ankiTags").value.trim(), numExamples:n,
      sourceLang:el("sourceLang").value, nativeLang:el("nativeLang").value, defLength:el("defLength").value,
      translateExamples:el("translateExamples").checked,
      keybind:curKb,
      noteTypeMode:curNTMode, customNoteType:el("customNT").value, fieldMapping:curFieldMapping,
      fieldPronunciation:el("fieldPronunciation").checked,
      fieldPartOfSpeech:el("fieldPartOfSpeech").checked,
      fieldExamples:el("fieldExamples").checked,
      fieldContext:el("fieldContext").checked,
      fieldAudio:el("fieldAudio").checked,
      includeReverse:el("includeReverse").checked
    },function(){savedDeck=deck;showSt("Settings saved.","success");});
  });

  function showSt(m, t) {
    el("status").textContent = m; el("status").className = "status " + t;
    setTimeout(function () { el("status").textContent = ""; el("status").className = "status"; }, 3000);
  }
});