import { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../api/socket';
import api from '../api/axios';
import '../assets/css/Chat.css';

// Props: mode: 'user' | 'admin', open: bool, onClose: fn
export default function ChatModal({ mode = 'user', open, onClose, initialRid = '' }) {
  const [restaurantNames, setRestaurantNames] = useState({});
  // Load all restaurant names for admin inbox mapping
  useEffect(() => {
    if (mode !== 'admin' || !open) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('restaurants');
        if (mounted && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach(r => { map[r._id] = r.name || r._id; });
          setRestaurantNames(map);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, [mode, open]);
  const [restaurant, setRestaurant] = useState(null);
  const [currentRid, setCurrentRid] = useState(''); // admin selects target restaurantId
  // admin inbox: { [restaurantId]: { restaurantId, sender, text, ts, unread } }
  const [sessions, setSessions] = useState({});
  const [messages, setMessages] = useState([]);
  const [messagesMap, setMessagesMap] = useState({}); // per-thread messages in admin mode
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const greetedRef = useRef(new Set());

  // Auto-scroll when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Load restaurant identity in user mode
  useEffect(() => {
    if (mode !== 'user') return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get('restaurants/me');
        if (mounted) setRestaurant(res.data);
      } catch {
        // not logged in: create a temp id so chat still works (ephemeral)
        if (mounted) setRestaurant({ _id: 'guest-' + Math.random().toString(36).slice(2), name: 'Guest' });
      }
    })();
    return () => { mounted = false; };
  }, [mode]);

  // Connect socket and join
  useEffect(() => {
    if (!open) return;
    const socket = getSocket();
    let rid;
    if (mode === 'user') {
      rid = restaurant?._id;
      if (!rid) return;
      socket.emit('support:join', { restaurantId: rid, role: 'restaurant' });
    } else {
      // admin
      socket.emit('support:join', { restaurantId: 'admin', role: 'admin' });
    }

    const onMsg = (payload) => {
      if (mode === 'user') {
        setMessages(prev => [...prev, payload]);
      } else {
        // Admin: this event is only received for rooms admin joined (currentRid)
        if (payload.restaurantId === currentRid) {
          setMessages(prev => [...prev, payload]);
          // persist in per-thread map for admin
          setMessagesMap(prev => ({
            ...prev,
            [currentRid]: [...(prev[currentRid] || []), payload],
          }));
          // Update last message text and clear unread for this thread
          setSessions(prev => ({
            ...prev,
            [payload.restaurantId]: {
              restaurantId: payload.restaurantId,
              sender: payload.sender,
              text: payload.text,
              ts: payload.ts,
              unread: 0,
            },
          }));
        }
      }
    };
    const onIncoming = (payload) => {
      // Admin inbox notification and unread tracking (only for admin mode)
      if (mode === 'admin') {
        const ridX = payload.restaurantId;
        if (!ridX) return;
        setSessions(prev => {
          const prevEntry = prev[ridX] || { unread: 0 };
          const incUnread = payload.sender === 'restaurant' && ridX !== currentRid;
          return {
            ...prev,
            [ridX]: {
              restaurantId: ridX,
              sender: payload.sender,
              text: payload.text,
              ts: payload.ts,
              unread: incUnread ? (prevEntry.unread || 0) + 1 : (ridX === currentRid ? 0 : (prevEntry.unread || 0)),
            },
          };
        });
        // If no active conversation yet, auto-select this sender
        if (!currentRid && ridX) {
          setCurrentRid(ridX);
        }
        // Auto-greet once per restaurant per session
        if (ridX && !greetedRef.current.has(ridX)) {
          greetedRef.current.add(ridX);
          const auto = {
            restaurantId: ridX,
            sender: 'admin',
            text: 'Hello! Thanks for reaching out. We will be with you shortly.',
            ts: Date.now(),
          };
          const s = getSocket();
          s.emit('support:message', auto);
        }
      }
    };
    socket.on('support:message', onMsg);
    socket.on('support:incoming', onIncoming);
    return () => {
      socket.off('support:message', onMsg);
      socket.off('support:incoming', onIncoming);
    };
  }, [open, mode, restaurant?._id, currentRid]);

  // When opening in admin mode with an initial thread, select it
  useEffect(() => {
    if (open && mode === 'admin' && initialRid && !currentRid) {
      setCurrentRid(initialRid);
    }
  }, [open, mode, initialRid, currentRid]);

  const rid = useMemo(() => (mode === 'user' ? restaurant?._id : currentRid), [mode, restaurant, currentRid]);

  // In admin mode, join the selected restaurant room to receive live messages
  useEffect(() => {
    if (!open || mode !== 'admin' || !currentRid) return;
    const socket = getSocket();
    socket.emit('support:join', { restaurantId: currentRid, role: 'admin' });
  }, [open, mode, currentRid]);

  const send = () => {
    const t = text.trim();
    if (!t || !rid) return;
    const socket = getSocket();
    const payload = { restaurantId: rid, sender: mode === 'user' ? 'restaurant' : 'admin', text: t, ts: Date.now() };
    socket.emit('support:message', payload);
    // Avoid duplicates: in user mode we rely on the echoed message from server; in admin mode push locally
    if (mode === 'admin') {
      setMessages(prev => [...prev, payload]);
      setMessagesMap(prev => ({
        ...prev,
        [currentRid]: [...(prev[currentRid] || []), payload],
      }));
    }
    setText('');
  };

  // Admin quick replies
  const quickReplies = [
    'Hello! How can I help you today?',
    'Please share your issue details and steps to reproduce.',
    'We are checking this and will update you shortly.',
    'For billing/plan questions, please confirm your restaurant name and email.',
  ];

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="chat-title">
      <div className="modal chat-modal">
        <div className="chat-header">
          <h3 id="chat-title">Support Chat {mode === 'user' ? '' : '(Admin)'}</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>

        {mode === 'admin' && (
          <div className="chat-admin-tools">
            <div className="inbox">
              <strong>Inbox</strong>
              <div className="inbox-list">
                {Object.values(sessions).length === 0 && <div className="muted">No messages yet</div>}
                {Object.values(sessions)
                  .sort((a,b)=> (b.ts||0)-(a.ts||0))
                  .map((s) => (
                    <button key={s.restaurantId} className={`inbox-item ${currentRid===s.restaurantId?'active':''}`} onClick={() => {
                      setCurrentRid(s.restaurantId);
                      // Load any previous messages for this thread
                      setMessages(messagesMap[s.restaurantId] || []);
                      // Clear unread for this thread
                      setSessions(prev => ({
                        ...prev,
                        [s.restaurantId]: { ...prev[s.restaurantId], unread: 0 }
                      }));
                    }}>
                      <div className="line1">{restaurantNames[s.restaurantId] || s.restaurantId} {s.unread>0 && <span className="badge" style={{marginLeft:6}}>{s.unread}</span>}</div>
                      <div className="line2">{s.sender === 'restaurant' ? 'Customer' : 'You'}: {s.text?.slice(0, 40)}</div>
                    </button>
                  ))}
              </div>
            </div>
            <div className="quick-replies">
              <strong>Quick replies</strong>
              <div className="chips">
                {quickReplies.map((q, i) => (
                  <button key={i} className="chip" onClick={() => setText(q)}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'user' && (
          <div className="muted tiny" style={{marginBottom: 6}}>
            You are chatting as: {restaurant?.name || 'Guest'} ({restaurant?._id})
          </div>
        )}

        <div ref={listRef} className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${((mode==='admin' && m.sender==='admin') || (mode==='user' && m.sender==='restaurant')) ? 'from-admin' : 'from-user'}`}>
              <div className="bubble">
                <div className="text">{m.text}</div>
                <div className="meta tiny">{new Date(m.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="chat-input">
          <input
            className="input flex1"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==='Enter') send(); }}
          />
          <button className="btn btn-primary" onClick={send} disabled={!rid || !text.trim()}>Send</button>
        </div>
      </div>
    </div>
  );
}
