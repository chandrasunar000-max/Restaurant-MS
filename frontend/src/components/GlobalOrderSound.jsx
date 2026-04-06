import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { getSocket, joinRestaurant } from "../api/socket";
import notificationSound from "../assets/sounds/confirmation_tune.wav";

// Lightweight component that subscribes to restaurant socket room
// and plays a loud notification when a new pending order arrives.
export default function GlobalOrderSound() {
  const [restaurantId, setRestaurantId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const lastRef = useRef(0);
  const audioRef = useRef(null);

  // Initialize audio on mount
  useEffect(() => {
    audioRef.current = new Audio(notificationSound);
    audioRef.current.volume = 1.0; // Maximum volume
    audioRef.current.preload = "auto";

    // Attempt to unlock audio on first user interaction to satisfy browser autoplay policies.
    const unlock = () => {
      try {
        if (!audioRef.current) audioRef.current = new Audio(notificationSound);
        // Try to play muted then pause to unlock audio playback for subsequent programmatic plays
        audioRef.current.muted = true;
        const p = audioRef.current.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.muted = false;
          }).catch(() => {
            audioRef.current.muted = false;
          });
        }
      } catch (e) {
        // ignore; we'll fallback to catching play() errors later
      } finally {
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
      }
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
  }, []);

  // Play loud notification sound multiple times for attention
  const playNotification = () => {
    if (!enabled || !audioRef.current) return;
    const now = Date.now();
    if (now - lastRef.current < 2000) return; // throttle to prevent spam
    lastRef.current = now;
    
    try {
      // Play the sound 3 times with slight delay
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0; // Ensure max volume
      audioRef.current.play().catch((err) => {
        // If play is blocked by autoplay policy, don't permanently disable sound; allow user to enable via gesture
        console.warn('Audio play blocked:', err);
      });
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 800);
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 1600);
    } catch (_) {
      setEnabled(false);
    }
  };

  // Fetch restaurant and subscribe
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const me = await api.get("/restaurants/me");
        const rid = me.data?._id || "";
        if (!mounted) return;
        setRestaurantId(rid);
      } catch (_) {
        // not logged in or request failed
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    joinRestaurant(restaurantId);
    const s = getSocket();
    const onNew = (order) => {
      // Notify for brand-new pending orders - plays even when page is in background
      if (order && order.status === "pending") {
        playNotification();
      }
    };
    s.on("order:new", onNew);
    return () => {
      s.off("order:new", onNew);
    };
  }, [restaurantId]);

  return null;
}