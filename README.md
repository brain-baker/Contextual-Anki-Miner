# Contextual Anki Dictionary (Browser Extension)

**Full disclosure:** Help of Claude-Opus-4.6-Thinking was used while making this. Also, it is not available on the official Chrome Web Store or Edge Add-ons store because I can't afford the developer registration fees right now :D 

Because of this, it is hosted here for free, and you just have to install it manually (it takes 10 seconds, see below).

---

A highly customizable Chrome/Edge extension that allows you to instantly look up any word in its original sentence context using AI (Groq, Gemini, or OpenRouter). It generates context-aware definitions, native translations, IPA pronunciation, and usage examples, and pushes beautifully styled cards directly to Anki via AnkiConnect.

## Features
- **Context-Aware Definitions:** Understands the word based on the exact sentence you were reading.
- **Lightning Fast:** Uses Groq (Llama 3 70B) for sub-second responses.
- **Language Translation:** Translates words from your target language into your native language.
- **Yomitan-style Trigger:** Simply hold `Shift` (or any custom keybind) while hovering over a word to trigger. No clicking required.
- **Beautiful UI & Themes:** Choose from 5 themes (Stone, Minimal, Nord, Rose, Forest) or create your own.
- **Offline Audio:** Automatically downloads native TTS pronunciation directly into your Anki media folder.
- **Custom Note Types:** Use the beautifully styled built-in cards, or map the AI data directly to your own personal Anki note types.

## Installation
Since this isn't on the web store, you will need to install it in "Developer Mode".
1. Download this repository as a `.zip` file (Click the green `Code` button > `Download ZIP`) and extract the folder to somewhere safe on your computer.
2. Open your browser and go to your extensions page (`chrome://extensions` or `edge://extensions`).
3. Turn on **Developer mode** (usually a toggle switch in the top right corner).
4. Click the **Load unpacked** button and select the extracted folder.

## Setup
1. **AnkiConnect:** Ensure you have the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in your Anki desktop app.
2. **CORS:** In Anki, go to Tools > Add-ons > AnkiConnect > Config, and ensure `"webCorsOriginList": ["*"]` is set so the extension is allowed to talk to Anki.
3. **API Key:** Click the extension icon in your browser to open Settings. Get a free API key from [Groq](https://console.groq.com/keys) (highly recommended for speed), Google AI Studio, or OpenRouter, and paste it in.
4. Select your Anki Deck, configure your languages, and hit **Save**.

## Usage
Make sure the Anki app is open in the background. Simply hover over a word on any webpage and press `Shift` (or your chosen keybind). Review the generated content, click the audio button to hear it, and click **Add to Anki** to instantly create a card.
