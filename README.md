# Yet Another AI Slop (but useful)

Uses AI Models to quickly extract meaning of any word when trigger key is pressed, with generated examples.

---

### 🚀 Why this exists?
Traditional dictionaries give you 10 meanings for one word. This extension uses AI (Gemini/Groq/OpenRouter) to analyze the **exact sentence** you are reading and provides the one meaning that actually fits. 

**Note:** This extension was built with the help of AI (LLMs).

---

### ✨ Features
- **Context-Aware:** AI analyzes your sentence for the perfect definition.
- **Multi-Provider:** Support for **Groq** (Fastest), **Gemini**, and **OpenRouter**.
- **One-Click Anki:** Push cards instantly to Anki via AnkiConnect.
- **Offline Audio:** Automatically downloads high-quality TTS audio and stores it in your Anki media folder.
- **Deeply Customizable:** 
  - Create custom UI themes.
  - Choose between "Extension Styled Cards" or map data to your own existing Note Types.
  - Translation gloss and example translations (for language learners).
- **Privacy Focused:** No analytics. Your API keys are stored locally in your browser.

---

### 🛠️ Installation

1. **Download** this repository as a ZIP file and extract it to a folder.
2. Open **Edge** (or Chrome) and go to `edge://extensions` (or `chrome://extensions`).
3. Enable **Developer Mode** (usually a toggle in the corner).
4. Click **Load Unpacked** and select the folder you extracted.
5. Pin the extension to your toolbar.

---

### ⚙️ Setup

#### 1. Anki Requirements
- You must have **Anki Desktop** open.
- Install the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on.
- **CORS:** In Anki, go to Tools > Add-ons > AnkiConnect > Config, and ensure `"webCorsOriginList": ["*"]` is set so the extension is allowed to talk to Anki.

#### 2. AI API Key
- I recommend getting a **Groq API Key** (it's free and incredibly fast).
- Go to the extension **Options**, select your provider, and paste your key.

#### 3. Dictionary Options
- Select your target language and definition detail level.
- Click **Refresh** to pull your Anki Decks and Note Types.

---

### 🔒 Privacy
- No data is sent to me.
- Requests go directly from your browser to the AI API of your choice.
- Anki communication stays on your local machine (`localhost:8765`).

---

### ⚠️ Known Issues
- If you hit a `429 Error`, you have exceeded your AI provider's free tier quota.
- Ensure Anki is running before trying to add cards.
