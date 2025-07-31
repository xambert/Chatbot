const WebSocket = require('ws');

class LLMWebSocketService {
  constructor(config) {
    this.config = config;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    this.callbacks = new Map();
    this.messageId = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔌 Connecting to LLM WebSocket: ${this.config.url}`);
        
        // Connect to internal LLM server (no authentication needed)
        this.ws = new WebSocket(this.config.url, {
          headers: {
            'User-Agent': 'Chatbot-Client/1.0'
          }
        });

        this.ws.on('open', () => {
          console.log('✅ LLM WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnected = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        // Heartbeat to keep connection alive
        this.startHeartbeat();

      } catch (error) {
        reject(error);
      }
    });
  }

  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.config.heartbeatInterval || 30000);
  }

  scheduleReconnect() {
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('❌ Reconnect failed:', error);
        });
      }, this.config.reconnectDelay || 5000);
    } else {
      console.error('❌ Max reconnect attempts reached. Using fallback responses.');
    }
  }

  sendMessage(message, options = {}) {
    return new Promise((resolve, reject) => {
      const messageId = ++this.messageId;
      const payload = {
        id: messageId,
        message: message,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        ...options
      };

      // Store callback for response
      this.callbacks.set(messageId, { resolve, reject, timestamp: Date.now() });

      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify(payload));
        } catch (error) {
          this.callbacks.delete(messageId);
          reject(error);
        }
      } else {
        // Queue message for when connection is restored
        this.messageQueue.push({ payload, resolve, reject });
        console.log('📝 Message queued - WebSocket not connected');
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.callbacks.has(messageId)) {
          this.callbacks.delete(messageId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  handleMessage(message) {
    if (message.id && this.callbacks.has(message.id)) {
      const callback = this.callbacks.get(message.id);
      this.callbacks.delete(message.id);

      if (message.error) {
        callback.reject(new Error(message.error));
      } else {
        callback.resolve(message.response || message.content);
      }
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const { payload, resolve, reject } = this.messageQueue.shift();
      try {
        this.ws.send(JSON.stringify(payload));
        this.callbacks.set(payload.id, { resolve, reject, timestamp: Date.now() });
      } catch (error) {
        reject(error);
      }
    }
  }

  generateFallbackResponse(message) {
    // Fallback responses when WebSocket is not available
    const fallbackResponses = [
      "I'm currently experiencing connectivity issues with the AI service. This is a fallback response.",
      "The AI service is temporarily unavailable. Please try again in a moment.",
      "I'm having trouble connecting to the main AI service right now. Using local fallback mode."
    ];
    
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)] + 
           `\n\nYour message: "${message}"`;
  }

  async sendMessageWithFallback(message, options = {}) {
    try {
      if (this.isConnected) {
        return await this.sendMessage(message, options);
      } else {
        console.log('🔄 WebSocket not connected, using fallback');
        return this.generateFallbackResponse(message);
      }
    } catch (error) {
      console.error('❌ WebSocket message failed, using fallback:', error);
      return this.generateFallbackResponse(message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }
}

module.exports = LLMWebSocketService;
