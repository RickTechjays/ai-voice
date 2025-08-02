// WebRTC Voice Assistant
class VoiceAssistant {
    constructor() {
        this.pc = null;
        this.dc = null;
        this.stream = null;
        this.isConnected = false;
        this.isRecording = false;
        this.systemPrompt = "";
        
        // DOM elements
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.conversationArea = document.getElementById('conversationArea');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.statusMessage = document.getElementById('statusMessage');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.startBtn.addEventListener('click', () => this.startConversation());
        this.stopBtn.addEventListener('click', () => this.stopConversation());
        
        // Page unload cleanup
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('pagehide', () => this.cleanup());
    }

    async startConversation() {
        try {
            this.showLoading(true);
            this.updateStatus('Connecting...', 'info');
            
            // Get user media
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: false 
            });
            
            // Setup WebRTC
            await this.setupWebRTC();
            
            this.isConnected = true;
            this.isRecording = true;
            this.updateUI();
            this.updateStatus('Connected successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to start conversation:', error);
            this.updateStatus('Failed to connect: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async setupWebRTC() {
        // Create peer connection
        this.pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        // Add audio track
        const audioTrack = this.stream.getAudioTracks()[0];
        this.pc.addTrack(audioTrack, this.stream);

        // Handle incoming audio
        this.pc.ontrack = (event) => {
            const audio = document.createElement('audio');
            audio.autoplay = true;
            audio.srcObject = new MediaStream([event.track]);
            document.body.appendChild(audio);
        };

        // ICE connection state changes
        this.pc.oniceconnectionstatechange = () => {
            console.log('ICE connection state:', this.pc.iceConnectionState);
            if (this.pc.iceConnectionState === 'failed' || 
                this.pc.iceConnectionState === 'disconnected') {
                this.updateStatus('Connection lost', 'error');
                this.stopConversation();
            }
        };

        // Create data channel
        this.dc = this.pc.createDataChannel('conversation', { 
            ordered: true 
        });
        this.setupDataChannel();

        // Create and send offer
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);

        // Send to signaling server
        const response = await fetch('/webrtc-signal/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': this.getCSRFToken()
            },
            body: JSON.stringify({
                sdp: this.pc.localDescription.sdp,
                session_params: {
                    model: 'gpt-4o-realtime-preview-2024-12-17',
                    speed: 1.0
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to establish connection');
        }

        const data = await response.json();
        await this.pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: data.sdp
        }));
    }

    configureSession() {
        const sessionUpdate = {
            type: 'session.update',
            instructions: this.systemPrompt,
            session: {
                voice: 'alloy',
                speed: 1.0,
                turn_detection: {
                    type: "semantic_vad",
                    eagerness: "low",
                    create_response: true,
                    interrupt_response: false
                },
                input_audio_transcription: {
                    model: "whisper-1",
                    language: "en"
                }
            }
        };
        
        console.log('Sending session configuration:', sessionUpdate);
        this.sendData(sessionUpdate);
    }

    sendData(data) {
        if (this.dc && this.dc.readyState === 'open') {
            this.dc.send(JSON.stringify(data));
        }
    }

    setupDataChannel() {
        this.dc.onopen = () => {
            console.log('Data channel opened');
            this.addMessage('system', 'Connected to AI assistant');
            
            // Configure session with proper transcription settings
            this.configureSession();
            
            
        };

        this.dc.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('Received message:', message.type, message);
                this.handleAIResponse(message);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        this.dc.onclose = () => {
            console.log('Data channel closed');
            this.addMessage('system', 'Disconnected from AI assistant');
        };
    }

        handleAIResponse(message) {
        // User speech transcription
        if (message.type === 'conversation.item.input_audio_transcription.completed') {
            if (message.transcript && message.transcript.trim()) {
                this.addMessage('user', message.transcript);
            }
            return;
        }
        
        if (message.type === 'audio_transcription.done') {
            if (message.transcript && message.transcript.trim()) {
                this.addMessage('user', message.transcript);
            }
            return;
        }
        
        // AI response
        if (message.type === 'response.audio_transcript.done') {
            if (message.transcript && message.transcript.trim()) {
                this.addMessage('assistant', message.transcript);
            }
            return;
        }
        
        // Error handling
        if (message.type === 'error') {
            console.error('WebRTC error:', message.error);
            this.updateStatus('Error: ' + message.error.message, 'error');
            return;
        }
    }

    addMessage(role, content) {
        // Don't add empty messages
        if (!content || !content.trim()) return;
        
        // Clear the initial placeholder message if it exists
        if (this.conversationArea.children.length === 1 && 
            this.conversationArea.children[0].classList.contains('text-gray-500')) {
            this.conversationArea.innerHTML = '';
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `mb-3 p-3 rounded-lg ${
            role === 'user' ? 'bg-blue-100 ml-8' :
            role === 'assistant' ? 'bg-green-100 mr-8' :
            'bg-gray-100 text-gray-600 text-sm'
        }`;
        
        const roleLabel = role === 'user' ? 'You' : 
                        role === 'assistant' ? 'AI' : 'System';
        
        messageDiv.innerHTML = `
            <div class="font-medium text-xs text-gray-500 mb-1">${roleLabel}</div>
            <div>${this.escapeHtml(content)}</div>
        `;
        
        this.conversationArea.appendChild(messageDiv);
        this.conversationArea.scrollTop = this.conversationArea.scrollHeight;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    stopConversation() {
        this.isConnected = false;
        this.isRecording = false;
        

        
        // Cleanup WebRTC
        if (this.dc) {
            this.dc.close();
            this.dc = null;
        }
        
        if (this.pc) {
            this.pc.close();
            this.pc = null;
        }
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.updateUI();
        this.updateStatus('Disconnected', 'info');
        this.addMessage('system', 'Conversation ended');
    }

    cleanup() {
        if (this.isRecording) {
            this.stopConversation();
        }
    }

    updateUI() {
        this.startBtn.disabled = this.isConnected;
        this.stopBtn.disabled = !this.isConnected;
        
        this.connectionStatus.textContent = this.isConnected ? 'Connected' : 'Disconnected';
        this.connectionStatus.className = `px-3 py-1 rounded-full text-sm font-medium ${
            this.isConnected ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
        }`;
    }

    updateStatus(message, type = 'info') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `mt-4 p-4 rounded-lg ${
            type === 'success' ? 'bg-green-100 text-green-800' :
            type === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
        }`;
        this.statusMessage.classList.remove('hidden');
        
        setTimeout(() => {
            this.statusMessage.classList.add('hidden');
        }, 5000);
    }

    showLoading(show) {
        this.loadingSpinner.classList.toggle('hidden', !show);
    }

    getCSRFToken() {
        const name = 'csrftoken';
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistant();
});