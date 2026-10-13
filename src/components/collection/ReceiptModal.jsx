"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { X, Send, Printer, Calendar, Edit2, Check, FileText } from "lucide-react";
import { numberToBanglaWords } from "@/utils/numberToBanglaWords";
import toast from "react-hot-toast";

export default function ReceiptModal({ receiptData, onClose }) {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Print layout options: "landscape2" (A4 Landscape, 2 copies) | "landscape1" (A4 Landscape, 1 copy - half blank) | "portrait1" (A4 Portrait, 1 copy)
  const [printLayout, setPrintLayout] = useState("landscape2");
  const [copy1Type, setCopy1Type] = useState("ছাত্র/ছাত্রীর কপি");
  const [copy2Type, setCopy2Type] = useState("বিদ্যালয়ের অফিস কপি");

  // Extract initial date
  const initialDateStr = receiptData?.payment?.paid_at
    ? new Date(receiptData.payment.paid_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  const [receiptDate, setReceiptDate] = useState(initialDateStr);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("receipt-print-mode");
    return () => {
      document.body.classList.remove("receipt-print-mode");
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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

  if (!receiptData || !mounted) return null;

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

  // Refine fee items: if items are empty or contain only generic "পূর্বের বকেয়া আদায়", format nicely with class info
  if (!resolvedFees || resolvedFees.length === 0) {
    resolvedFees = [
      {
        name: "মাসিক বেতন / টিউশন ফি বকেয়া",
        amount: Number(payment.amount_paid)
      }
    ];
  } else {
    resolvedFees = resolvedFees.map(item => {
      if (item.name === "পূর্বের বকেয়া আদায়") {
        return {
          ...item,
          name: "মাসিক বেতন ও পূর্বের বকেয়া ফি"
        };
      }
      return item;
    });
  }

  // Base fee subtotal (without fine)
  const feeSubtotal = resolvedFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
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

  // Reusable receipt slip component
  const renderReceiptSlip = (copyType = "ছাত্র/ছাত্রীর কপি") => {
    const isOfficeCopy = copyType.includes("অফিস") || copyType.includes("অ্যাকাউন্টস");
    const badgeColor = isOfficeCopy ? "#7c3aed" : "#0070f3";

    return (
      <div
        className="receipt-slip-inner"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "12px 16px",
          boxSizing: "border-box",
          minHeight: "100%",
          justifyContent: "space-between"
        }}
      >
        <div>
          {/* Copy Type Tag & Receipt No */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "4px",
                background: isOfficeCopy ? "rgba(124, 58, 237, 0.12)" : "rgba(0, 112, 243, 0.12)",
                color: badgeColor,
                border: `1px solid ${badgeColor}`
              }}
            >
              {copyType}
            </span>
            <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
              রসিদ নং: <b>{payment.receipt_no}</b>
            </span>
          </div>

          {/* School Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "1.5px solid var(--border-color)",
              paddingBottom: "6px",
              marginBottom: "6px"
            }}
          >
            {teacherProfile?.logo_url && (
              <img
                src={teacherProfile.logo_url}
                alt="School Logo"
                style={{ width: "36px", height: "36px", objectFit: "contain", marginBottom: "2px" }}
              />
            )}
            <h3 style={{ margin: "0 0 2px 0", color: "var(--brand-primary)", fontSize: "15px", fontWeight: "800", lineHeight: "1.2" }}>
              {teacherProfile?.school_name || "বিদ্যালয়ের নাম"}
            </h3>
            <div style={{ fontSize: "10px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "1px" }}>
              {teacherProfile?.eiin_number && <span>EIIN: {teacherProfile.eiin_number}</span>}
              <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
                {teacherProfile?.phone_number && <span>মোবাইল: {teacherProfile.phone_number}</span>}
              </div>
            </div>
          </div>

          {/* Date & Student Info */}
          <div style={{ fontSize: "11.5px", marginBottom: "5px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", paddingBottom: "3px", borderBottom: "1px dashed var(--border-color)" }}>
              <span>তারিখ: <b>{formattedDateBengali}</b></span>
              {isEditingDate && (
                <span className="no-print" style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    style={{ fontSize: "11px", padding: "1px 3px" }}
                  />
                  <button onClick={handleUpdateDate} className="btn btn-primary" style={{ padding: "2px 5px", fontSize: "10px" }}>
                    <Check size={11} />
                  </button>
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", marginBottom: "2px" }}>
              <div>নাম: <b>{student.full_name}</b></div>
              <div style={{ textAlign: "right" }}>রোল: <b>{student.roll_no}</b></div>
            </div>

            {classInfo && (
              <div style={{ marginBottom: "2px" }}>
                শ্রেণি: <b>{classInfo.class_name}</b> {classInfo.group_name ? `(${classInfo.group_name})` : ""}{" "}
                {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ""}
              </div>
            )}

            {student.waiver_status && student.waiver_status !== "None" && (
              <div style={{ color: "var(--brand-primary)", fontSize: "10.5px", fontWeight: "600" }}>
                ছাড়: {student.waiver_status === "Full Free" ? "বিনা-বেতন (১০০% ফ্রি)" : student.waiver_status === "Half Free" ? "অর্ধ-বেতন (৫০% ছাড়)" : student.waiver_status}
              </div>
            )}
          </div>

          {/* Fee Breakdown */}
          <div
            style={{
              borderTop: "1px dashed var(--border-color)",
              borderBottom: "1px dashed var(--border-color)",
              padding: "5px 0",
              margin: "4px 0",
              fontSize: "11px"
            }}
          >
            <div style={{ fontWeight: "700", marginBottom: "2px", color: "var(--brand-primary)" }}>
              ফি এর খাতসমূহ:
            </div>
            {resolvedFees && resolvedFees.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {resolvedFees.map((f, i) => (
                  <li key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5px" }}>
                    <span>• {f.name}</span>
                    <span><b>{f.amount} ৳</b></span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                পূর্বের বকেয়া আদায় / ফি আদায়
              </div>
            )}
          </div>

          {/* Calculations */}
          <div style={{ fontSize: "11px", marginTop: "2px" }}>
            {resolvedFine > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-danger)", marginBottom: "1.5px" }}>
                <span>জরিমানা (+):</span> <span><b>{resolvedFine} ৳</b></span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", marginBottom: "1.5px" }}>
              <span>সর্বমোট পাওনা:</span> <span>{calculatedTotalPayable} ৳</span>
            </div>

            {resolvedDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-warning)", marginBottom: "1.5px" }}>
                <span>ডিসকাউন্ট (-):</span> <span><b>{resolvedDiscount} ৳</b></span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--brand-primary)",
                paddingTop: "2px",
                marginTop: "2px",
                color: "var(--brand-success)",
                fontWeight: "800",
                fontSize: "12.5px"
              }}
            >
              <span>পরিশোধিত টাকা:</span> <span>{payment.amount_paid} ৳</span>
            </div>

            <div
              style={{
                background: "rgba(39, 174, 96, 0.08)",
                border: "1px solid rgba(39, 174, 96, 0.25)",
                borderRadius: "3px",
                padding: "2.5px 5px",
                margin: "3px 0",
                fontSize: "10px",
                color: "var(--brand-success)",
                fontWeight: "700"
              }}
            >
              কথায়: {amountInWords}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px dashed var(--border-color)",
                paddingTop: "2px",
                marginTop: "2px"
              }}
            >
              <span>অবশিষ্ট বকেয়া:</span>
              <span style={{ color: payment.due_remaining > 0 ? "var(--brand-danger)" : "var(--brand-success)", fontWeight: "bold" }}>
                {payment.due_remaining} ৳
              </span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            paddingTop: "16px",
            paddingLeft: "4px",
            paddingRight: "4px"
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ borderTop: "1px solid var(--text-secondary)", width: "75px", paddingTop: "2px", fontSize: "10.5px", color: "var(--text-secondary)" }}>
              প্রদানকারী
            </div>
          </div>

          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {teacherProfile?.signature_url ? (
              <img
                src={teacherProfile.signature_url}
                alt="Signature"
                style={{ height: "22px", objectFit: "contain", marginBottom: "1px" }}
              />
            ) : (
              <div style={{ height: "22px" }}></div>
            )}
            <div style={{ borderTop: "1px solid var(--text-secondary)", width: "75px", paddingTop: "2px", fontSize: "10.5px", color: "var(--text-secondary)" }}>
              গ্রহণকারী
            </div>
          </div>
        </div>
      </div>
    );
  };

  return createPortal(
    <div className="receipt-modal-portal">
      <div
        className="receipt-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className={`card-glass receipt-modal-container ${printLayout !== "portrait1" ? "modal-wide" : ""}`}>
          
          {/* Modal Header */}
          <div className="modal-header-bar no-print">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "17px" }}>ফি আদায়ের রসিদ</h3>
              <span style={{ fontSize: "11px", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "12px" }}>
                {printLayout === "landscape2"
                  ? "A4 ল্যান্ডস্কেপ (এক পেজে ২ কপি)"
                  : printLayout === "landscape1"
                  ? "A4 ল্যান্ডস্কেপ (১ কপি - অর্ধেক খালি)"
                  : "ফুল পেজ পোর্ট্রেট (১ কপি)"}
              </span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", alignItems: "center" }}>
              <X size={20} />
            </button>
          </div>

          {/* Layout & Print Cost Saver Control Bar */}
          <div className="layout-control-bar no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)" }}>প্রিন্ট সাইজ:</span>
                <div style={{ display: "inline-flex", background: "var(--bg-color)", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color)", flexWrap: "wrap", gap: "3px" }}>
                  <button
                    type="button"
                    onClick={() => setPrintLayout("landscape2")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: printLayout === "landscape2" ? "700" : "500",
                      background: printLayout === "landscape2" ? "var(--brand-primary)" : "transparent",
                      color: printLayout === "landscape2" ? "white" : "var(--text-secondary)",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>📄 A4 ল্যান্ডস্কেপ (২ কপি)</span>
                    <span style={{ fontSize: "10px", background: printLayout === "landscape2" ? "rgba(255,255,255,0.3)" : "#22c55e", color: "white", padding: "1px 6px", borderRadius: "10px", fontWeight: "bold" }}>
                      খরচ সাশ্রয়ী
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintLayout("landscape1")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: printLayout === "landscape1" ? "700" : "500",
                      background: printLayout === "landscape1" ? "var(--brand-primary)" : "transparent",
                      color: printLayout === "landscape1" ? "white" : "var(--text-secondary)",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>📑 A4 ল্যান্ডস্কেপ (১ কপি - অর্ধেক খালি)</span>
                    <span style={{ fontSize: "10px", background: printLayout === "landscape1" ? "rgba(255,255,255,0.3)" : "rgba(0,112,243,0.15)", color: printLayout === "landscape1" ? "white" : "var(--brand-primary)", padding: "1px 6px", borderRadius: "10px", fontWeight: "bold" }}>
                      কাগজ সাশ্রয়
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintLayout("portrait1")}
                    style={{
                      padding: "5px 12px",
                      fontSize: "12px",
                      fontWeight: printLayout === "portrait1" ? "700" : "500",
                      background: printLayout === "portrait1" ? "var(--brand-primary)" : "transparent",
                      color: printLayout === "portrait1" ? "white" : "var(--text-secondary)",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.2s"
                    }}
                  >
                    <span>📃 ফুল পেজ (পোর্ট্রেট)</span>
                  </button>
                </div>
              </div>

              {printLayout === "landscape2" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>২য় কপির শিরোনাম:</span>
                  <select
                    value={copy2Type}
                    onChange={(e) => setCopy2Type(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11.5px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-color)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    <option value="বিদ্যালয়ের অফিস কপি">বিদ্যালয়ের অফিস কপি</option>
                    <option value="ছাত্র/ছাত্রীর কপি (ডুপ্লিকেট)">ছাত্র/ছাত্রীর কপি (ডুপ্লিকেট)</option>
                    <option value="অ্যাকাউন্টস কপি">অ্যাকাউন্টস কপি</option>
                  </select>
                </div>
              )}

              {(printLayout === "landscape1" || printLayout === "portrait1") && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>কপির শিরোনাম:</span>
                  <select
                    value={copy1Type}
                    onChange={(e) => setCopy1Type(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11.5px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-color)",
                      backgroundColor: "var(--bg-color)",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    <option value="ছাত্র/ছাত্রীর কপি">ছাত্র/ছাত্রীর কপি</option>
                    <option value="বিদ্যালয়ের অফিস কপি">বিদ্যালয়ের অফিস কপি</option>
                    <option value="অ্যাকাউন্টস কপি">অ্যাকাউন্টস কপি</option>
                    <option value="ছাত্র/ছাত্রীর কপি (ডুপ্লিকেট)">ছাত্র/ছাত্রীর কপি (ডুপ্লিকেট)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Date Edit bar in Modal Preview */}
          <div className="date-edit-bar no-print">
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Calendar size={14} style={{ color: "var(--brand-primary)" }} />
              <span>রসিদের তারিখ: <b>{formattedDateBengali}</b></span>
              {!isEditingDate ? (
                <button
                  onClick={() => setIsEditingDate(true)}
                  style={{ background: "none", border: "none", color: "var(--brand-primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "2px" }}
                >
                  <Edit2 size={12} /> পরিবর্তন
                </button>
              ) : (
                <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    style={{ fontSize: "12px", padding: "2px 4px", borderRadius: "4px", border: "1px solid var(--brand-primary)" }}
                  />
                  <button onClick={handleUpdateDate} className="btn btn-primary" style={{ padding: "3px 6px", fontSize: "11px" }}>
                    <Check size={12} />
                  </button>
                </span>
              )}
            </div>

            {printLayout === "landscape2" && (
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                💡 এক পেজে ২টি রসিদ প্রিন্ট হবে, মাঝখান দিয়ে কেটে আলাদা করতে পারবেন
              </span>
            )}
            {printLayout === "landscape1" && (
              <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>
                💡 অর্ধেক পেজে ১টি রসিদ হবে, বাকি অর্ধেক খালি থাকবে (কাটার দাগ সহ)
              </span>
            )}
          </div>

          {/* Printable Area: Dual Layout, Single Landscape with blank half, or Single Portrait Layout */}
          <div id="printable-receipt" className={`printable-receipt-wrapper ${printLayout}`}>
            {printLayout === "landscape2" ? (
              <div className="receipt-dual-layout">
                {/* 1st Half: Student Copy */}
                <div className="receipt-col student-copy">
                  {renderReceiptSlip(copy1Type)}
                </div>

                {/* Middle Cutting Line */}
                <div className="cutting-divider" aria-hidden="true">
                  <div className="cutting-line-indicator">
                    <span className="cutting-scissor-icon">✂</span>
                    <span className="cutting-label-text">কেটে আলাদা করুন</span>
                  </div>
                </div>

                {/* 2nd Half: Office Copy or Duplicate */}
                <div className="receipt-col office-copy">
                  {renderReceiptSlip(copy2Type)}
                </div>
              </div>
            ) : printLayout === "landscape1" ? (
              <div className="receipt-dual-layout single-landscape-layout">
                {/* 1st Half: Single Receipt */}
                <div className="receipt-col student-copy">
                  {renderReceiptSlip(copy1Type)}
                </div>

                {/* Middle Cutting Line */}
                <div className="cutting-divider" aria-hidden="true">
                  <div className="cutting-line-indicator">
                    <span className="cutting-scissor-icon">✂</span>
                    <span className="cutting-label-text">কেটে আলাদা করুন</span>
                  </div>
                </div>

                {/* 2nd Half: Completely Blank for Print */}
                <div className="receipt-col receipt-col-blank">
                  <div className="blank-half-card no-print">
                    <div className="blank-half-icon">✂️</div>
                    <div className="blank-half-title">বাকি অর্ধেক অংশ খালি থাকবে</div>
                    <div className="blank-half-desc">
                      A4 ল্যান্ডস্কেপ পেজের ডান পাশের অর্ধেক অংশ সম্পূর্ণ ফাঁকা (Blank) প্রিন্ট হবে।
                    </div>
                    <div className="blank-half-tip">
                      💡 প্রিন্ট শেষে মাঝের কাটিং দাগ বরাবর কেটে নিন। বাকি অর্ধেক খালি কাগজ সংরক্ষণ করে অন্য রসিদে ব্যবহার করতে পারবেন!
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="receipt-single-layout">
                <div className="receipt-col single-copy">
                  {renderReceiptSlip(copy1Type)}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="action-buttons-bar no-print">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <button
                onClick={openWhatsApp}
                className="btn"
                style={{
                  background: "#25D366",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "9px"
                }}
              >
                <Send size={15} /> WhatsApp
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
                  gap: "6px",
                  padding: "9px",
                  textDecoration: "none"
                }}
              >
                <Send size={15} /> SMS
              </a>

              <a
                href={`mailto:?subject=${encodeURIComponent("স্কুল ফি জমার রসিদ")}&body=${generateWhatsAppMessage()}`}
                className="btn"
                style={{
                  background: "#EA4335",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "9px",
                  textDecoration: "none"
                }}
              >
                <Send size={15} /> Email
              </a>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => window.print()}
                className="btn"
                style={{
                  flex: 1,
                  border: "2px solid var(--brand-primary)",
                  background: "var(--brand-primary)",
                  color: "white",
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  padding: "10px",
                  fontSize: "14px"
                }}
              >
                <Printer size={18} />{" "}
                {printLayout === "landscape2"
                  ? "A4 ল্যান্ডস্কেপ রসিদ প্রিন্ট (২ কপি)"
                  : printLayout === "landscape1"
                  ? "A4 ল্যান্ডস্কেপ রসিদ প্রিন্ট (১ কপি - অর্ধেক খালি)"
                  : "ফুল পেজ রসিদ প্রিন্ট করুন"}
              </button>

              <button
                onClick={onClose}
                className="btn"
                style={{
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  padding: "10px 16px"
                }}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .receipt-modal-portal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
        }
        .receipt-modal-overlay {
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }
        .receipt-modal-container {
          width: 100%;
          max-width: 520px;
          padding: 0;
          max-height: 94vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          transition: max-width 0.25s ease;
        }
        .receipt-modal-container.modal-wide {
          max-width: 960px;
        }
        .modal-header-bar {
          background: var(--brand-primary);
          color: white;
          padding: 12px 18px;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .layout-control-bar {
          padding: 8px 18px;
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
        }
        .date-edit-bar {
          padding: 6px 18px;
          background: rgba(0, 112, 243, 0.04);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }
        .action-buttons-bar {
          padding: 14px 18px;
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: var(--card-bg);
        }
        .printable-receipt-wrapper {
          display: flex;
          flex-direction: column;
          width: 100%;
          padding: 14px;
          box-sizing: border-box;
          background: var(--bg-color);
        }
        .receipt-dual-layout {
          display: flex;
          flex-direction: row;
          align-items: stretch;
          justify-content: space-between;
          gap: 0;
          width: 100%;
        }
        .receipt-dual-layout .receipt-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .cutting-divider {
          width: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .cutting-divider::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          border-left: 1.5px dashed var(--border-color);
        }
        .cutting-line-indicator {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 6px 2px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .cutting-scissor-icon {
          font-size: 13px;
          color: var(--text-secondary);
          transform: rotate(90deg);
        }
        .cutting-label-text {
          font-size: 9px;
          writing-mode: vertical-rl;
          color: var(--text-secondary);
          letter-spacing: 1px;
        }
        .receipt-single-layout {
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }
        .receipt-single-layout .receipt-col {
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          overflow: hidden;
        }
        .receipt-dual-layout .receipt-col.receipt-col-blank {
          background: rgba(0, 0, 0, 0.01);
          border: 1.5px dashed var(--border-color);
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .blank-half-card {
          width: 100%;
          height: 100%;
          min-height: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          text-align: center;
          background: rgba(0, 112, 243, 0.02);
          border-radius: var(--radius-md);
          box-sizing: border-box;
        }
        .blank-half-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }
        .blank-half-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .blank-half-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 260px;
          margin-bottom: 14px;
        }
        .blank-half-tip {
          font-size: 11.5px;
          color: #16a34a;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
          padding: 8px 12px;
          border-radius: 6px;
          line-height: 1.4;
          font-weight: 600;
          max-width: 270px;
        }

        @media (max-width: 768px) {
          .receipt-dual-layout {
            flex-direction: column !important;
            gap: 14px !important;
          }
          .cutting-divider {
            width: 100% !important;
            height: 22px !important;
            flex-direction: row !important;
          }
          .cutting-divider::before {
            top: 50% !important;
            left: 0 !important;
            right: 0 !important;
            bottom: auto !important;
            border-left: none !important;
            border-top: 1.5px dashed var(--border-color) !important;
          }
          .cutting-line-indicator {
            flex-direction: row !important;
            padding: 2px 8px !important;
          }
          .cutting-scissor-icon {
            transform: none !important;
          }
          .cutting-label-text {
            writing-mode: horizontal-tb !important;
          }
        }

        @media print {
          @page {
            size: ${printLayout === "portrait1" ? "A4 portrait" : "A4 landscape"};
            margin: ${printLayout === "portrait1" ? "10mm 15mm" : "5mm 6mm"};
          }

          :global(html), :global(body) {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }

          :global(body.receipt-print-mode > *:not(.receipt-modal-portal)) {
            display: none !important;
          }

          :global(.receipt-modal-portal) {
            display: block !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          :global(.receipt-modal-overlay) {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }

          :global(.receipt-modal-container) {
            position: static !important;
            display: block !important;
            background: transparent !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
          }

          :global(.no-print) {
            display: none !important;
          }

          .printable-receipt-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          /* Dual Layout on Landscape Print (1 A4 sheet = 2 halves) */
          .receipt-dual-layout {
            display: flex !important;
            flex-direction: row !important;
            align-items: stretch !important;
            justify-content: space-between !important;
            width: 100% !important;
            max-width: 285mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .receipt-dual-layout .receipt-col {
            width: 137mm !important;
            max-width: 137mm !important;
            flex: 1 1 137mm !important;
            max-height: 198mm !important;
            border: 1.2px solid #000000 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Blank Half in 1-Copy Landscape Print */
          .receipt-dual-layout .receipt-col.receipt-col-blank {
            width: 137mm !important;
            max-width: 137mm !important;
            flex: 1 1 137mm !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            visibility: hidden !important;
            opacity: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .cutting-divider {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            width: 9mm !important;
            position: relative !important;
          }

          .cutting-divider::before {
            content: "" !important;
            position: absolute !important;
            top: 2mm !important;
            bottom: 2mm !important;
            left: 50% !important;
            border-left: 1px dashed #64748b !important;
          }

          .cutting-line-indicator {
            background: #ffffff !important;
            border: none !important;
            padding: 0 !important;
          }

          .cutting-scissor-icon {
            font-size: 13px !important;
            color: #475569 !important;
            transform: rotate(90deg) !important;
          }

          .cutting-label-text {
            display: none !important;
          }

          /* Single Layout on Portrait Print */
          .receipt-single-layout {
            display: block !important;
            width: 100% !important;
            max-width: 145mm !important;
            margin: 0 auto !important;
          }

          .receipt-single-layout .receipt-col {
            width: 100% !important;
            border: 1.5px solid #000000 !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          :global(.receipt-slip-inner) {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 10px 14px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
