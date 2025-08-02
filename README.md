# AI Voice Assistant

A real-time voice-based AI assistant built with Django and WebRTC technology.

## Features

- 🎤 Real-time voice conversation with AI
- 🔄 WebRTC-based communication
- 🎯 Speech-to-text and text-to-speech
- 💬 Live conversation display
- 🚀 Low-latency audio streaming

## Requirements

- **Python**: 3.10 or higher
- **OpenAI API Key**: Required for AI voice processing

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-voice-base
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Set up environment variables**
   Create a `.env` file in the project root:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

6. **Run migrations**
   ```bash
   python manage.py migrate
   ```

7. **Start the development server**
   ```bash
   python manage.py runserver
   ```

8. **Access the application**
   Open your browser and go to `http://127.0.0.1:8000`

## Usage

1. Click the "Start" button to begin
2. Allow microphone access when prompted
3. Speak naturally with the AI assistant
4. Click "Stop" to end the conversation

## Technology Stack

- **Backend**: Django 5.2.4
- **Frontend**: HTML, CSS, JavaScript
- **Real-time Communication**: WebRTC
- **AI Service**: OpenAI Realtime API
- **Audio Processing**: Whisper-1 for transcription

## Project Structure

```
ai-voice-base/
├── ai_voice/                 # Django project
│   ├── ai_voice/            # Project settings
│   ├── voice_assistant/     # Main app
│   ├── static/              # Static files (CSS, JS)
│   └── templates/           # HTML templates
├── requirements.txt          # Python dependencies
├── .env                     # Environment variables (create this)
└── README.md               # This file
```

## How It Works

1. **WebRTC Connection**: Establishes peer-to-peer connection with OpenAI's servers
2. **Audio Streaming**: Real-time audio streaming between user and AI
3. **Speech Recognition**: Whisper-1 transcribes user speech to text
4. **AI Processing**: GPT-4 processes the conversation
5. **Text-to-Speech**: AI responses are converted back to speech
6. **UI Updates**: Conversation is displayed in real-time

## Troubleshooting

- **Microphone not working**: Check browser permissions
- **Connection issues**: Verify OpenAI API key is correct
- **Audio quality**: Ensure good internet connection

## License

This project is for educational purposes. 