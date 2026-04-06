import { useState } from 'react';
import ChatModal from './ChatModal';
import '../assets/css/FloatingButton.css';

export default function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="floating-btn"
        style={{ bottom: 88 }}
        aria-label="Support Chat"
        title="Support Chat"
        onClick={() => setOpen(true)}
      >
        💬
      </button>
      <ChatModal mode="user" open={open} onClose={() => setOpen(false)} />
    </>
  );
}
