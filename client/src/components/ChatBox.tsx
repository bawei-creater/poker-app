import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from 'shared';

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}

export function ChatBox({ messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput('');
  };

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-message">
            <span className="chat-name">{msg.playerName}: </span>
            <span className="chat-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="输入消息..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send" onClick={handleSend}>发送</button>
      </div>
    </div>
  );
}
