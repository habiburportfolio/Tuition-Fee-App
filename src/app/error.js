"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Critical Application Error caught by App Error Boundary:", error);
  }, [error]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      padding: "24px",
      backgroundColor: "#f8f9fa",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <div style={{
        maxWidth: "650px",
        width: "100%",
        background: "#ffffff",
        borderRadius: "12px",
        padding: "32px 24px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        border: "1px solid #e2e8f0",
        textAlign: "center"
      }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          backgroundColor: "rgba(239, 68, 68, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
          color: "#ef4444"
        }}>
          <AlertTriangle size={30} />
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
          অ্যাপ্লিকেশন লোড হতে সমস্যা হয়েছে
        </h2>
        
        <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          একটি অপ্রত্যাশিত এরর ঘটেছে। নিচের এরর মেসেজটি দেখে সমাধান করা সম্ভব:
        </p>

        <div style={{
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "12px 16px",
          textAlign: "left",
          marginBottom: "16px",
          overflowX: "auto"
        }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#991b1b", marginBottom: "4px" }}>
            ত্রুটির বিবরণ (Error Message):
          </div>
          <code style={{ fontSize: "13px", color: "#b91c1c", wordBreak: "break-word", fontFamily: "monospace" }}>
            {error?.message || "Unknown error"}
          </code>
        </div>

        {error?.stack && (
          <details style={{ textAlign: "left", marginBottom: "20px" }}>
            <summary style={{ fontSize: "12px", color: "#64748b", cursor: "pointer", fontWeight: "600" }}>
              বিস্তারিত স্ট্যাক ট্রেস দেখুন (Stack Trace)
            </summary>
            <pre style={{
              marginTop: "8px",
              padding: "12px",
              background: "#0f172a",
              color: "#38bdf8",
              borderRadius: "6px",
              fontSize: "11px",
              overflowX: "auto",
              maxHeight: "180px",
              lineHeight: "1.5"
            }}>
              {error.stack}
            </pre>
          </details>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 20px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={16} /> পুনরায় চেষ্টা করুন
          </button>
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontWeight: "600",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            পৃষ্ঠা রিফ্রেশ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
