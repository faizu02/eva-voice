# 🚀 EVA - AI Voice Assistant

EVA is an intelligent voice assistant designed to provide seamless conversational experiences. Whether you're typing messages or speaking aloud, EVA is equipped to understand and respond with clarity and precision.

## 🌟 Features
- 🗨️ **Intuitive Chat UI:** Engage in smooth text-based conversations with automatic scrolling and dynamic message display.
- 🎙️ **Voice Interaction:** EVA listens to your voice commands and responds with a clear, bold male voice for improved clarity.
- 🌐 **Gradio API Integration:** Powered by `Faizal2805/expo`, ensuring accurate and coherent responses.
- 🔄 **Reconnect Logic:** Intelligent retry mechanism to ensure a stable connection with the Gradio service.
- 🎨 **Sleek UI Design:** Blue gradient theme with an animated globe effect when voice recognition is active.

## 🛠️ Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/your-repo/eva-voice-assistant.git
   cd eva-voice-assistant
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## ⚙️ Usage
1. Click the **Mic** button to start voice recognition.
2. Speak your query — EVA will process it and respond audibly in a clear male voice.
3. Alternatively, click the **Keyboard** button to enter text-based queries.

## 📋 API Details
EVA connects to the Gradio API with the following parameters:
- `message`: User's query
- `system_message`: Contextual system message (default: `"Hello!!"`)
- `max_tokens`: Maximum tokens for response (default: `100`)
- `temperature`: Controls randomness (default: `0.6`)
- `top_p`: Controls response sampling (default: `0.9`)

## 🔧 Key Code Snippet
```javascript
const sendMessageToGradio = async (message: string): Promise<string> => {
    if (!gradioClient) await initializeClient();
    if (!gradioClient) return "Service Unavailable";

    try {
        const result = await gradioClient.predict("/chat", {
            message,
            system_message: "Hello!!",
            max_tokens: 100,
            temperature: 0.6,
            top_p: 0.9,
        });
        return Array.isArray(result) ? result[0] : result.toString();
    } catch (error) {
        console.error("❌ Error:", error);
        return "Sorry, there was an error processing your request.";
    }
};
```

## 🤖 Technologies Used
- **React** for UI development
- **Gradio API** for intelligent conversational AI
- **JavaScript/TypeScript** for improved code structure and functionality
- **Tailwind CSS** for modern and responsive design

## 📚 Future Improvements
✅ Enhanced error handling for API requests.  
✅ Improved voice recognition with language support.  
✅ Enhanced UI animations for smoother transitions.  

## 💬 Feedback & Contributions
We welcome contributions! Feel free to submit issues, feature requests, or pull requests to improve EVA.

## 📄 License
This project is licensed under the MIT License.

---

💡 *Empowering conversations with intelligent responses — Experience EVA today!*


