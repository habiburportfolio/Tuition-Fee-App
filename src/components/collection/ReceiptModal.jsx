"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { X, Send, Printer } from "lucide-react";

export default function ReceiptModal({ receiptData, onClose }) {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState(null);

  useEffect(() => {
    if (user) {
      supabase.from("teachers").select("*").eq("id", user.id).single()
        .then(({ data }) => setTeacherProfile(data));
    }
  }, [user]);

  if (!receiptData) return null;

  const { student, payment, selectedFeesDetails, totalPayable, discount, fine } = receiptData;

  const generateWhatsAppMessage = () => {
    let feeBreakdownText = "";
    if (selectedFeesDetails && selectedFeesDetails.length > 0) {
      feeBreakdownText = selectedFeesDetails.map(f => `${f.name}: ${f.amount} ৳`).join("\n");
    } else {
      feeBreakdownText = "পূর্বের বকেয়া আদায়";
    }

    let text = `*স্কুল ফি জমার রসিদ*\n\n` +
      `নাম: ${student.full_name}\n` +
      `রোল: ${student.roll_no}\n` +
      `রসিদ নং: ${payment.receipt_no}\n` +
      `----------------------\n` +
      `*ফি এর খাতসমূহ:*\n${feeBreakdownText}\n` +
      `----------------------\n` +
      `সর্বমোট পাওনা: ${totalPayable} ৳\n`;
      
    if (fine > 0) {
      text += `জরিমানা: ${fine} ৳\n`;
    }

    if (discount > 0) {
      text += `ডিসকাউন্ট: ${discount} ৳\n`;
    }

    text += `পরিশোধিত: ${payment.amount_paid} ৳\n` +
      `অবশিষ্ট বকেয়া: ${payment.due_remaining} ৳\n\n` +
      `ধন্যবাদ।`;

    return encodeURIComponent(text);
  };

  const openWhatsApp = () => {
    const phone = student.parent_phone;
    if (!phone) {
      alert("এই স্টুডেন্টের কোনো মোবাইল নম্বর সেভ করা নেই!");
      return;
    }
    
    // Format phone number to start with country code if not present
    let formattedPhone = phone;
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+88" + formattedPhone;
    }

    const waLink = `https://wa.me/${formattedPhone.replace(/\D/g, '')}?text=${generateWhatsAppMessage()}`;
    window.open(waLink, "_blank");
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px"
    }}>
      <div className="card-glass" style={{ width: "100%", maxWidth: "420px", padding: "0", maxHeight: "90vh", overflowY: "auto" }}>
        
        <div style={{ background: "var(--brand-primary)", color: "white", padding: "15px", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>পেমেন্ট রসিদ</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X /></button>
        </div>

        <div style={{ padding: "15px" }} id="printable-receipt">
          {/* School Header */}
          {teacherProfile && (
            <div style={{ textAlign: "center", borderBottom: "2px solid var(--border-color)", paddingBottom: "10px", marginBottom: "15px" }}>
              {teacherProfile.logo_url && (
                <img src={teacherProfile.logo_url} alt="School Logo" style={{ width: "50px", height: "50px", objectFit: "contain", marginBottom: "5px" }} />
              )}
              <h3 style={{ margin: "0 0 5px 0", color: "var(--brand-primary)", fontSize: "18px" }}>{teacherProfile.school_name}</h3>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
                {teacherProfile.eiin_number && <span>EIIN: {teacherProfile.eiin_number}</span>}
                {teacherProfile.school_email && <span>ইমেইল: {teacherProfile.school_email}</span>}
                <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "4px" }}>
                  <span>ক্লাস টিচার: {teacherProfile.phone_number || '-'}</span>
                  {teacherProfile.head_teacher_phone && <span>প্রধান শিক্ষক: {teacherProfile.head_teacher_phone}</span>}
                </div>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "bold" }}>রসিদ নং: {payment.receipt_no}</div>
            <h2 style={{ color: "var(--brand-success)", fontSize: "28px", margin: "5px 0", fontWeight: "800" }}>{payment.amount_paid} ৳</h2>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "var(--text-secondary)" }}>পেমেন্ট সফল হয়েছে!</div>
          </div>

          <div style={{ background: "var(--bg-color)", padding: "10px", borderRadius: "var(--radius-sm)", marginBottom: "15px", fontSize: "13px" }}>
            <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}><strong>নাম:</strong> <span>{student.full_name}</span></p>
            <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}><strong>রোল:</strong> <span>{student.roll_no}</span></p>
            
            {/* Fee Breakdown */}
            <div style={{ borderTop: "1px dashed var(--border-color)", borderBottom: "1px dashed var(--border-color)", padding: "8px 0", margin: "8px 0" }}>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>ফি এর খাতসমূহ:</div>
              {selectedFeesDetails && selectedFeesDetails.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {selectedFeesDetails.map((f, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <span>{f.name}</span>
                      <span>{f.amount} ৳</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: "var(--text-secondary)" }}>পূর্বের বকেয়া আদায়</div>
              )}
            </div>

            <p style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between" }}>
              <strong>মোট পাওনা:</strong> <span>{totalPayable} ৳</span>
            </p>

            {fine > 0 && (
              <p style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between", color: "var(--brand-danger)" }}>
                <strong>জরিমানা (+):</strong> <span>{fine} ৳</span>
              </p>
            )}
            
            {discount > 0 && (
              <p style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between", color: "var(--brand-warning)" }}>
                <strong>ডিসকাউন্ট (-):</strong> <span>{discount} ৳</span>
              </p>
            )}

            {(fine > 0 || discount > 0) && (
              <p style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #ddd", paddingTop: "4px", marginTop: "2px" }}>
                <strong>নিট পাওনা:</strong> <span>{Number(totalPayable) + Number(fine || 0) - Number(discount || 0)} ৳</span>
              </p>
            )}

            <p style={{ marginBottom: "2px", display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--brand-primary)", paddingTop: "4px", marginTop: "4px", color: "var(--brand-success)" }}>
              <strong>পরিশোধিত:</strong> <strong>{payment.amount_paid} ৳</strong>
            </p>

            <p style={{ marginBottom: "0", display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-color)", paddingTop: "4px", marginTop: "4px" }}>
              <strong>অবশিষ্ট বকেয়া:</strong> <span style={{ color: payment.due_remaining > 0 ? "var(--brand-danger)" : "var(--brand-success)", fontWeight: "bold" }}>{payment.due_remaining} ৳</span>
            </p>
          </div>

          {/* Signature Section */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "30px", marginBottom: "20px", padding: "0 10px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderTop: "1px solid var(--text-secondary)", width: "100px", paddingTop: "5px", fontSize: "12px", color: "var(--text-secondary)" }}>প্রদানকারী</div>
            </div>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {teacherProfile?.signature_url ? (
                <img src={teacherProfile.signature_url} alt="Signature" style={{ height: "30px", objectFit: "contain", marginBottom: "2px" }} />
              ) : (
                <div style={{ height: "30px" }}></div>
              )}
              <div style={{ borderTop: "1px solid var(--text-secondary)", width: "100px", paddingTop: "5px", fontSize: "12px", color: "var(--text-secondary)" }}>গ্রহণকারী</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button 
                onClick={openWhatsApp}
                className="btn" 
                style={{ background: "#25D366", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px" }}
              >
                <Send size={16} /> WhatsApp
              </button>
              
              <a 
                href={`sms:${student.parent_phone || ""}?body=${generateWhatsAppMessage()}`}
                className="btn" 
                style={{ background: "#34B7F1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", textDecoration: "none" }}
              >
                <Send size={16} /> SMS
              </a>
            </div>

            <a 
              href={`mailto:?subject=${encodeURIComponent("স্কুল ফি জমার রসিদ")}&body=${generateWhatsAppMessage()}`}
              className="btn" 
              style={{ background: "#EA4335", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", textDecoration: "none" }}
            >
              <Send size={16} /> Email-এ পাঠান
            </a>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => {
                  window.print();
                }}
                className="btn" 
                style={{ flex: 1, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)" }}
              >
                <Printer size={16} /> প্রিন্ট
              </button>
              <button 
                onClick={onClose}
                className="btn btn-primary" 
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }}
              >
                 পরবর্তী পেমেন্ট নিন
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
