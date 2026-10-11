"use client";

import { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";

const LockContext = createContext();

export function LockProvider({ children }) {
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("1234");
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    // Read persisted lock status and pin
    const savedLocked = localStorage.getItem("system_data_locked");
    const savedPin = localStorage.getItem("system_lock_pin");

    if (savedLocked !== null) {
      setIsLocked(savedLocked === "true");
    } else {
      // Default locked for safety
      setIsLocked(true);
      localStorage.setItem("system_data_locked", "true");
    }

    if (savedPin) {
      setPin(savedPin);
    } else {
      localStorage.setItem("system_lock_pin", "1234");
    }
  }, []);

  const lock = () => {
    setIsLocked(true);
    localStorage.setItem("system_data_locked", "true");
    toast.success("🔒 সিস্টেম লক করা হয়েছে। এখন কোনো ডাটা পরিবর্তন বা মোছা যাবে না।");
  };

  const unlock = (enteredPin) => {
    if (enteredPin === pin) {
      setIsLocked(false);
      localStorage.setItem("system_data_locked", "false");
      toast.success("🔓 সিস্টেম আনলক করা হয়েছে। এখন এডিট ও ডিলিট করা যাবে।");
      setShowUnlockModal(false);
      if (pendingAction) {
        pendingAction();
        setPendingAction(null);
      }
      return true;
    } else {
      toast.error("❌ ভুল পিন কোড! পুনরায় চেষ্টা করুন।");
      return false;
    }
  };

  const updatePin = (oldPin, newPin) => {
    if (oldPin !== pin) {
      toast.error("❌ বর্তমান পিন ভুল হয়েছে!");
      return false;
    }
    if (!newPin || newPin.length < 4) {
      toast.error("❌ নতুন পিন অন্তত ৪ ডিজিটের হতে হবে!");
      return false;
    }
    setPin(newPin);
    localStorage.setItem("system_lock_pin", newPin);
    toast.success("✅ সিকিউরিটি পিন সফলভাবে পরিবর্তন করা হয়েছে!");
    return true;
  };

  /**
   * Guards any destructive or edit action.
   * If unlocked, executes callback immediately.
   * If locked, blocks and offers unlock prompt.
   */
  const guardAction = (actionDesc, callback) => {
    if (!isLocked) {
      if (callback) callback();
      return true;
    }

    toast.error(`🔒 লক করা আছে! "${actionDesc}" করতে আগে সেটিংস থেকে বা পিন দিয়ে আনলক করুন।`, {
      duration: 4000,
      icon: "🔒"
    });
    setPendingAction(() => callback);
    setShowUnlockModal(true);
    return false;
  };

  return (
    <LockContext.Provider
      value={{
        isLocked,
        pin,
        lock,
        unlock,
        updatePin,
        guardAction,
        openUnlockModal: (callback) => {
          if (callback) setPendingAction(() => callback);
          setShowUnlockModal(true);
        }
      }}
    >
      {children}
      {showUnlockModal && (
        <UnlockModal
          onClose={() => {
            setShowUnlockModal(false);
            setPendingAction(null);
          }}
          onUnlock={unlock}
        />
      )}
    </LockContext.Provider>
  );
}

function UnlockModal({ onClose, onUnlock }) {
  const [inputPin, setInputPin] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onUnlock(inputPin);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px"
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "360px", textAlign: "center" }}>
        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔒</div>
        <h3 style={{ margin: "0 0 10px 0", color: "var(--brand-primary)" }}>ডাটা আনলক ভেরিফিকেশন</h3>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px" }}>
          অননুমোদিত এডিট বা ডিলিট রোধ করতে সিকিউরিটি পিন দিন। (ডিফল্ট পিন: <b>1234</b>)
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            maxLength={8}
            placeholder="৪ ডিজিটের পিন দিন..."
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "20px",
              textAlign: "center",
              letterSpacing: "6px",
              borderRadius: "var(--radius-sm)",
              border: "2px solid var(--brand-primary)",
              marginBottom: "20px",
              backgroundColor: "var(--card-bg)",
              color: "var(--text-primary)"
            }}
          />

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn"
              style={{ flex: 1, border: "1px solid var(--border-color)", background: "transparent" }}
            >
              বাতিল
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              আনলক করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function useLock() {
  const context = useContext(LockContext);
  if (!context) {
    throw new Error("useLock must be used within a LockProvider");
  }
  return context;
}
