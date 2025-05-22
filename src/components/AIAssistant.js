import { useState, useRef, useEffect } from 'react';
import { getAIResponse } from '../lib/ui';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      text: "Hi! I'm your magical DeFi assistant! 🧚‍♀️ I can help you optimize your liquidity pools, suggest rebalancing strategies, and answer questions about your yields. What would you like to know?"
    }
  ]);
  const [input, setInput] = useState('');
  const chatBodyRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleAI = () => {
    setIsOpen(!isOpen);
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Get AI response
    setTimeout(() => {
      const aiResponse = {
        type: 'ai',
        text: getAIResponse(userMessage.text)
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="ai-assistant">
      <div className="ai-avatar" onClick={toggleAI}>
        <i className="fas fa-robot"></i>
      </div>
      <div className={`ai-chat ${isOpen ? 'open' : ''}`} id="aiChat">
        <div className="ai-chat-header">
          <i className="fas fa-robot" style={{ color: '#4a90e2' }}></i>
          <span style={{ color: '#4a90e2', fontWeight: 'bold' }}>Fairy AI Assistant</span>
        </div>
        <div className="ai-chat-body" id="aiChatBody" ref={chatBodyRef}>
          {messages.map((message, index) => (
            <div key={index} className={message.type === 'ai' ? 'ai-message' : 'user-message'}>
              {message.text}
            </div>
          ))}
        </div>
        <div className="ai-chat-input">
          <input 
            type="text" 
            placeholder="Ask me anything..." 
            id="aiInput" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button onClick={sendMessage}>
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
} 