"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { X, Send, Printer, Calendar, Edit2, Check } from "lucide-react";
import { numberToBanglaWords, toBanglaNumber } from "@/utils/numberToBanglaWords";
import toast from "react-hot-toast";

export default function ReceiptModal({ receiptData, onClose }) {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState(null);

  // Extract initial date
  const initialDateStr = receiptData?.payment?.paid_at
    ? new Date(receiptData.payment.paid_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const [receiptDate, setReceiptDate] = useState(initialDateStr);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("teachers")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => setTeacherProfile(data));
    }
  }, [user]);

  if (!receiptData) return null;

  const { student, payment, selectedFeesDetails: propFeesDetails, totalPayable, discount, fine, classInfo } = receiptData;

  // Resolve fee details (handles both direct payment and re-print from DB)
  let resolvedFees = propFeesDetails;
  let resolvedFine = fine || 0;
  let resolvedDiscount = discount || 0;

  if (!resolvedFees && payment?.payment_method) {
    try {
      const meta = JSON.parse(payment.payment_method);
      if (meta && meta.items) {
        resolvedFees = meta.items;
        if (meta.fine !== undefined) resolvedFine = meta.fine;
        if (meta.discount !== undefined) resolvedDiscount = meta.discount;
      }
    } catch {
      // payment_method was plain string
    }
  }

  // Base fee subtotal (without fine)
  const feeSubtotal = resolvedFees && resolvedFees.length > 0
    ? resolvedFees.reduce((sum, f) => sum + Number(f.amount || 0), 0)
    : (student?.opening_due ? Number(student.opening_due) : Number(payment.amount_paid));

  const calculatedTotalPayable = totalPayable || (feeSubtotal + Number(resolvedFine || 0));

  const handleUpdateDate = async () => {
    if (!receiptDate) return;
    setIsEditingDate(false);

    if (payment?.id) {
      setSavingDate(true);
      try {
        const { error } = await supabase
          .from("payments")
          .update({ paid_at: new Date(receiptDate).toISOString() })
          .eq("id", payment.id);

        if (error) throw error;
        toast.success("✅ রসিদের তারিখ সফলভাবে আপডেট করা হয়েছে!");
      } catch (err) {
        toast.error(`❌ তারিখ সেভ এরর: ${err.message}`);
      } finally {
        setSavingDate(false);
      }
    }
  };

  const formattedDateBengali = (() => {
    try {
      const d = new Date(receiptDate);
      return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return receiptDate;
    }
  })();

  const amountInWords = numberToBanglaWords(payment.amount_paid);

  const generateWhatsAppMessage = () => {
    let feeBreakdownText = "";
    if (resolvedFees && resolvedFees.length > 0) {
      feeBreakdownText = resolvedFees.map((f) => `${f.name}: ${f.amount} ৳`).join("\n");
    } else {
      feeBreakdownText = "ফি আদায়";
    }

    let text =
      `*স্কুল ফি জমার রসিদ*\n\n` +
      `তারিখ: ${formattedDateBengali}\n` +
      `নাম: ${student.full_name}\n` +
      `রোল: ${student.roll_no}\n` +
      (classInfo ? `শ্রেণি: ${classInfo.class_name}${classInfo.group_name ? ` (${classInfo.group_name})` : ""}\n` : "") +
      `রসিদ নং: ${payment.receipt_no}\n` +
      `----------------------\n` +
      `*ফি এর খাতসমূহ:*\n${feeBreakdownText}\n` +
      `----------------------\n`;

    if (resolvedFine > 0) {
      text += `জরিমানা: ${resolvedFine} ৳\n`;
    }

    text += `সর্বমোট পাওনা: ${calculatedTotalPayable} ৳\n`;

    if (resolvedDiscount > 0) {
      text += `ডিসকাউন্ট: ${resolvedDiscount} ৳\n`;
    }

    text +=
      `পরিশোধিত: ${payment.amount_paid} ৳\n` +
      `কথায়: ${amountInWords}\n` +
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

    let formattedPhone = phone;
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+88" + formattedPhone;
    }

    const waLink = `https://wa.me/${formattedPhone.replace(/\D/g, "")}?text=${generateWhatsAppMessage()}`;
    window.open(waLink, "_blank");
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
        zIndex: 1000,
        padding: "20px"
      }}
    >
      <div className="card-glass" style={{ width: "100%", maxWidth: "440px", padding: "0", maxHeight: "90vh", overflowY: "auto" }}>
        
        {/* Modal Header */}
        <div
          style={{
            background: "var(--brand-primary)",
            color: "white",
            padding: "14px 18px",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px" }}>পেমেন্ট রসিদ (Payment Receipt)</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "18px" }} id="printable-receipt">
          
          {/* School Header (Requirement 4) */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid var(--border-color)",
              paddingBottom: "12px",
              marginBottom: "14px"
            }}
          >
            {teacherProfile?.logo_url && (
              <img
                src={teacherProfile.logo_url}
                alt="School Logo"
                style={{ width: "50px", height: "50px", objectFit: "contain", marginBottom: "4px" }}
              />
            )}
            <h3 style={{ margin: "0 0 4px 0", color: "var(--brand-primary)", fontSize: "19px", fontWeight: "800" }}>
              {teacherProfile?.school_name || "বিদ্যালয়ের নাম"}
            </h3>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "2px" }}>
              {teacherProfile?.eiin_number && <span>EIIN: {teacherProfile.eiin_number}</span>}
              {teacherProfile?.school_email && <span>ইমেইল: {teacherProfile.school_email}</span>}
              <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "2px", flexWrap: "wrap" }}>
                {teacherProfile?.phone_number && <span>ক্লাস টিচার: {teacherProfile.phone_number}</span>}
                {teacherProfile?.head_teacher_phone && <span>প্রধান শিক্ষক: {teacherProfile.head_teacher_phone}</span>}
              </div>
            </div>
          </div>

          {/* Receipt Number & Auto Date with Change Option (Requirement 2) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              fontSize: "12px",
              borderBottom: "1px dashed var(--border-color)",
              paddingBottom: "8px"
            }}
          >
            <div>
              <span style={{ color: "var(--text-secondary)" }}>রসিদ নং:</span>{" "}
              <b>{payment.receipt_no}</b>
            </div>

            {/* Auto Date with change option */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Calendar size={13} style={{ color: "var(--brand-primary)" }} />
              {isEditingDate ? (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    style={{
                      fontSize: "12px",
                      padding: "2px 4px",
                      borderRadius: "4px",
                      border: "1px solid var(--brand-primary)",
                      backgroundColor: "var(--card-bg)",
                      color: "var(--text-primary)"
                    }}
                  />
                  <button
                    onClick={handleUpdateDate}
                    className="btn btn-primary"
                    style={{ padding: "3px 6px", fontSize: "11px" }}
                    title="সংরক্ষণ করুন"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span>{formattedDateBengali}</span>
                  <button
                    onClick={() => setIsEditingDate(true)}
                    className="no-print"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--brand-primary)",
                      padding: "2px"
                    }}
                    title="তারিখ পরিবর্তন করুন"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Amount Paid Highlight */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <h2 style={{ color: "var(--brand-success)", fontSize: "28px", margin: "2px 0", fontWeight: "800" }}>
              {payment.amount_paid} ৳
            </h2>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-secondary)" }}>
              পেমেন্ট সফল হয়েছে
            </div>
          </div>

          {/* Student Info Box */}
          <div
            style={{
              background: "var(--bg-color)",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "12px",
              fontSize: "13px"
            }}
          >
            <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
              <strong>নাম:</strong> <span>{student.full_name}</span>
            </p>
            <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
              <strong>রোল:</strong> <span>{student.roll_no}</span>
            </p>
            {classInfo && (
              <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
                <strong>শ্রেণি ও বিভাগ:</strong>
                <span>
                  {classInfo.class_name} {classInfo.group_name ? `(${classInfo.group_name})` : ""}{" "}
                  {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ""}
                </span>
              </p>
            )}

            {student.waiver_status && student.waiver_status !== "None" && (
              <p style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", color: "var(--brand-primary)" }}>
                <strong>বৃত্তি/ছাড় সুবিধা:</strong>
                <span style={{ fontWeight: "700" }}>
                  {student.waiver_status === "Full Free"
                    ? "বিনা-বেতন (১০০% ফ্রি)"
                    : student.waiver_status === "Half Free"
                    ? "অর্ধ-বেতন (৫০% ছাড়)"
                    : student.waiver_status.includes("উপবৃত্তি") || student.waiver_status.includes("বৃত্তি")
                    ? "উপবৃত্তি/বৃত্তিপ্রাপ্ত (বেতন ফ্রি)"
                    : student.waiver_status}
                </span>
              </p>
            )}

            {/* Fee Breakdown (Requirement 3: Always list all fee khat) */}
            <div
              style={{
                borderTop: "1px dashed var(--border-color)",
                borderBottom: "1px dashed var(--border-color)",
                padding: "8px 0",
                margin: "8px 0"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px", color: "var(--brand-primary)" }}>
                ফি এর খাতসমূহ:
              </div>
              {resolvedFees && resolvedFees.length > 0 ? (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {resolvedFees.map((f, i) => (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span>• {f.name}</span>
                      <span>{f.amount} ৳</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                  পূর্বের বকেয়া আদায় / ফি আদায়
                </div>
              )}
            </div>

            {/* Subtotal if fine exists */}
            {resolvedFine > 0 && (
              <p style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                <span>মূল ফি / প্রারম্ভিক পাওনা:</span> <span>{feeSubtotal} ৳</span>
              </p>
            )}

            {/* Requirement 6: জরিমানা MUST be ABOVE সর্বমোট পাওনা */}
            {resolvedFine > 0 && (
              <p style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", color: "var(--brand-danger)", fontWeight: "600" }}>
                <strong>জরিমানা (+):</strong> <span>{resolvedFine} ৳</span>
              </p>
            )}

            {/* Requirement 6: সর্বমোট পাওনা is below জরিমানা */}
            <p style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", fontWeight: "700" }}>
              <strong>সর্বমোট পাওনা:</strong> <span>{calculatedTotalPayable} ৳</span>
            </p>

            {resolvedDiscount > 0 && (
              <p style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", color: "var(--brand-warning)" }}>
                <strong>ডিসকাউন্ট (-):</strong> <span>{resolvedDiscount} ৳</span>
              </p>
            )}

            {/* Paid Amount */}
            <p
              style={{
                marginBottom: "4px",
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--brand-primary)",
                paddingTop: "6px",
                marginTop: "4px",
                color: "var(--brand-success)",
                fontWeight: "800",
                fontSize: "14px"
              }}
            >
              <span>পরিশোধিত টাকা:</span> <span>{payment.amount_paid} ৳</span>
            </p>

            {/* Requirement 7: Total Amount in Bengali Words (কথায়) */}
            <div
              style={{
                background: "rgba(39, 174, 96, 0.08)",
                border: "1px solid rgba(39, 174, 96, 0.25)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                margin: "6px 0",
                fontSize: "12px",
                color: "var(--brand-success)",
                fontWeight: "700"
              }}
            >
              কথায়: {amountInWords}
            </div>

            {/* Remaining Due */}
            <p
              style={{
                marginBottom: "0",
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px dashed var(--border-color)",
                paddingTop: "6px",
                marginTop: "4px"
              }}
            >
              <strong>অবশিষ্ট বকেয়া:</strong>
              <span
                style={{
                  color: payment.due_remaining > 0 ? "var(--brand-danger)" : "var(--brand-success)",
                  fontWeight: "bold"
                }}
              >
                {payment.due_remaining} ৳
              </span>
            </p>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "28px",
              marginBottom: "16px",
              padding: "0 10px"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  borderTop: "1px solid var(--text-secondary)",
                  width: "100px",
                  paddingTop: "4px",
                  fontSize: "12px",
                  color: "var(--text-secondary)"
                }}
              >
                প্রদানকারী
              </div>
            </div>
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {teacherProfile?.signature_url ? (
                <img
                  src={teacherProfile.signature_url}
                  alt="Signature"
                  style={{ height: "30px", objectFit: "contain", marginBottom: "2px" }}
                />
              ) : (
                <div style={{ height: "30px" }}></div>
              )}
              <div
                style={{
                  borderTop: "1px solid var(--text-secondary)",
                  width: "100px",
                  paddingTop: "4px",
                  fontSize: "12px",
                  color: "var(--text-secondary)"
                }}
              >
                গ্রহণকারী
              </div>
            </div>
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <button
                onClick={openWhatsApp}
                className="btn"
                style={{
                  background: "#25D366",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px"
                }}
              >
                <Send size={16} /> WhatsApp
              </button>

              <a
                href={`sms:${student.parent_phone || ""}?body=${generateWhatsAppMessage()}`}
                className="btn"
                style={{
                  background: "#34B7F1",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  textDecoration: "none"
                }}
              >
                <Send size={16} /> SMS
              </a>
            </div>

            <a
              href={`mailto:?subject=${encodeURIComponent("স্কুল ফি জমার রসিদ")}&body=${generateWhatsAppMessage()}`}
              className="btn"
              style={{
                background: "#EA4335",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "10px",
                textDecoration: "none"
              }}
            >
              <Send size={16} /> Email-এ পাঠান
            </a>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.print()}
                className="btn"
                style={{
                  flex: 1,
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-primary)"
                }}
              >
                <Printer size={16} /> প্রিন্ট
              </button>

              <button
                onClick={onClose}
                className="btn btn-primary"
                style={{
                  flex: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "12px"
                }}
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
