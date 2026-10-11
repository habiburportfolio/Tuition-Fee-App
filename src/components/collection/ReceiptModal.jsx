"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { X, Send, Printer, Calendar, Edit2, Check } from "lucide-react";
import { numberToBanglaWords } from "@/utils/numberToBanglaWords";
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

  // Refine fee items: if items are empty or contain only generic "পূর্বের বকেয়া আদায়", format nicely with class info
  if (!resolvedFees || resolvedFees.length === 0) {
    resolvedFees = [
      {
        name: "মাসিক বেতন / টিউশন ফি বকেয়া",
        amount: Number(payment.amount_paid)
      }
    ];
  } else {
    // If fee item is literally "পূর্বের বকেয়া আদায়", make it clearer and more professional
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

  // Reusable single receipt slip component (used for both Student Copy & School Copy)
  const renderReceiptSlip = (copyType) => (
    <div className="receipt-slip-inner" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 14px", boxSizing: "border-box" }}>
      {/* Copy Type Tag */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: "11px",
            fontWeight: "700",
            padding: "2px 8px",
            borderRadius: "4px",
            background: copyType === "ছাত্র/ছাত্রীর কপি" ? "rgba(0, 112, 243, 0.12)" : "rgba(39, 174, 96, 0.12)",
            color: copyType === "ছাত্র/ছাত্রীর কপি" ? "#0070f3" : "#27ae60",
            border: `1px solid ${copyType === "ছাত্র/ছাত্রীর কপি" ? "#0070f3" : "#27ae60"}`
          }}
        >
          {copyType}
        </span>
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          রসিদ নং: <b>{payment.receipt_no}</b>
        </span>
      </div>

      {/* School Header */}
      <div
        style={{
          textAlign: "center",
          borderBottom: "1.5px solid var(--border-color)",
          paddingBottom: "8px",
          marginBottom: "8px"
        }}
      >
        {teacherProfile?.logo_url && (
          <img
            src={teacherProfile.logo_url}
            alt="School Logo"
            style={{ width: "38px", height: "38px", objectFit: "contain", marginBottom: "2px" }}
          />
        )}
        <h3 style={{ margin: "0 0 2px 0", color: "var(--brand-primary)", fontSize: "16px", fontWeight: "800", lineHeight: "1.2" }}>
          {teacherProfile?.school_name || "বিদ্যালয়ের নাম"}
        </h3>
        <div style={{ fontSize: "10.5px", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "1px" }}>
          {teacherProfile?.eiin_number && <span>EIIN: {teacherProfile.eiin_number}</span>}
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            {teacherProfile?.phone_number && <span>মোবাইল: {teacherProfile.phone_number}</span>}
          </div>
        </div>
      </div>

      {/* Date & Student Info */}
      <div style={{ fontSize: "12px", marginBottom: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", paddingBottom: "4px", borderBottom: "1px dashed var(--border-color)" }}>
          <span>তারিখ: <b>{formattedDateBengali}</b></span>
          {isEditingDate && copyType === "ছাত্র/ছাত্রীর কপি" && (
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", marginBottom: "3px" }}>
          <div>নাম: <b>{student.full_name}</b></div>
          <div style={{ textAlign: "right" }}>রোল: <b>{student.roll_no}</b></div>
        </div>

        {classInfo && (
          <div style={{ marginBottom: "3px" }}>
            শ্রেণি: <b>{classInfo.class_name}</b> {classInfo.group_name ? `(${classInfo.group_name})` : ""}{" "}
            {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ""}
          </div>
        )}

        {student.waiver_status && student.waiver_status !== "None" && (
          <div style={{ color: "var(--brand-primary)", fontSize: "11px", fontWeight: "600" }}>
            ছাড়: {student.waiver_status === "Full Free" ? "বিনা-বেতন (১০০% ফ্রি)" : student.waiver_status === "Half Free" ? "অর্ধ-বেতন (৫০% ছাড়)" : student.waiver_status}
          </div>
        )}
      </div>

      {/* Fee Breakdown (সব খাতসমূহ) */}
      <div
        style={{
          borderTop: "1px dashed var(--border-color)",
          borderBottom: "1px dashed var(--border-color)",
          padding: "6px 0",
          margin: "4px 0",
          fontSize: "11.5px"
        }}
      >
        <div style={{ fontWeight: "700", marginBottom: "3px", color: "var(--brand-primary)" }}>
          ফি এর খাতসমূহ:
        </div>
        {resolvedFees && resolvedFees.length > 0 ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {resolvedFees.map((f, i) => (
              <li key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
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
      <div style={{ fontSize: "11.5px", marginTop: "2px" }}>
        {resolvedFine > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-danger)", marginBottom: "2px" }}>
            <span>জরিমানা (+):</span> <span><b>{resolvedFine} ৳</b></span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", marginBottom: "2px" }}>
          <span>সর্বমোট পাওনা:</span> <span>{calculatedTotalPayable} ৳</span>
        </div>

        {resolvedDiscount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--brand-warning)", marginBottom: "2px" }}>
            <span>ডিসকাউন্ট (-):</span> <span><b>{resolvedDiscount} ৳</b></span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--brand-primary)",
            paddingTop: "3px",
            marginTop: "3px",
            color: "var(--brand-success)",
            fontWeight: "800",
            fontSize: "13px"
          }}
        >
          <span>পরিশোধিত টাকা:</span> <span>{payment.amount_paid} ৳</span>
        </div>

        <div
          style={{
            background: "rgba(39, 174, 96, 0.08)",
            border: "1px solid rgba(39, 174, 96, 0.25)",
            borderRadius: "3px",
            padding: "3px 6px",
            margin: "4px 0",
            fontSize: "10.5px",
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
            paddingTop: "3px",
            marginTop: "2px"
          }}
        >
          <span>অবশিষ্ট বকেয়া:</span>
          <span style={{ color: payment.due_remaining > 0 ? "var(--brand-danger)" : "var(--brand-success)", fontWeight: "bold" }}>
            {payment.due_remaining} ৳
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginTop: "auto",
          paddingTop: "20px",
          paddingLeft: "4px",
          paddingRight: "4px"
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ borderTop: "1px solid var(--text-secondary)", width: "80px", paddingTop: "2px", fontSize: "11px", color: "var(--text-secondary)" }}>
            প্রদানকারী
          </div>
        </div>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {teacherProfile?.signature_url ? (
            <img
              src={teacherProfile.signature_url}
              alt="Signature"
              style={{ height: "24px", objectFit: "contain", marginBottom: "1px" }}
            />
          ) : (
            <div style={{ height: "24px" }}></div>
          )}
          <div style={{ borderTop: "1px solid var(--text-secondary)", width: "80px", paddingTop: "2px", fontSize: "11px", color: "var(--text-secondary)" }}>
            গ্রহণকারী
          </div>
        </div>
      </div>
    </div>
  );

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
        padding: "16px"
      }}
    >
      <div className="card-glass" style={{ width: "100%", maxWidth: "860px", padding: "0", maxHeight: "95vh", overflowY: "auto" }}>
        
        {/* Modal Header */}
        <div
          style={{
            background: "var(--brand-primary)",
            color: "white",
            padding: "12px 18px",
            borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "17px" }}>পেমেন্ট রসিদ (ছাত্র/ছাত্রী ও স্কুল কপি)</h3>
            <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: "12px" }}>
              A4 পেজের অর্ধেক হাইটে পাশাপাশি প্রিন্ট
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Date Edit bar in Modal Preview */}
        <div className="no-print" style={{ padding: "8px 18px", background: "rgba(0, 112, 243, 0.05)", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} style={{ color: "var(--brand-primary)" }} />
            <span>তারিখ: <b>{formattedDateBengali}</b></span>
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
          <div style={{ color: "var(--text-secondary)", fontSize: "11px" }}>
            * কলাম ডিভাইডার সহ বামে ছাত্র কপি ও ডানে স্কুল কপি প্রিন্ট হবে
          </div>
        </div>

        {/* Printable Area: Two Columns (Student Copy | School Copy) with Divider */}
        <div id="printable-receipt" className="printable-receipt-wrapper">
          {/* Column 1: Student Copy */}
          <div className="receipt-col student-copy">
            {renderReceiptSlip("ছাত্র/ছাত্রীর কপি")}
          </div>

          {/* Column Divider */}
          <div className="receipt-divider">
            <div className="divider-line"></div>
            <span className="scissor-icon">✂</span>
          </div>

          {/* Column 2: School Copy */}
          <div className="receipt-col school-copy">
            {renderReceiptSlip("বিদ্যালয়/অফিস কপি")}
          </div>
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="no-print" style={{ padding: "14px 18px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "10px" }}>
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
                padding: "10px"
              }}
            >
              <Printer size={18} /> রসিদ প্রিন্ট করুন (Print Receipt)
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

      <style jsx>{`
        .printable-receipt-wrapper {
          display: flex;
          flex-direction: row;
          width: 100%;
          padding: 12px;
          gap: 0;
          box-sizing: border-box;
          background: var(--bg-color);
        }
        .receipt-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--card-bg);
          border-radius: var(--radius-sm);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .receipt-divider {
          width: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          position: relative;
        }
        .divider-line {
          width: 1px;
          height: 100%;
          border-left: 2px dashed #999;
          position: absolute;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
        }
        .scissor-icon {
          position: relative;
          z-index: 2;
          background: var(--card-bg);
          padding: 2px 0;
          font-size: 13px;
          color: #666;
        }

        @media (max-width: 768px) {
          .printable-receipt-wrapper {
            flex-direction: column;
            gap: 16px;
          }
          .receipt-divider {
            width: 100%;
            height: 24px;
          }
          .divider-line {
            width: 100%;
            height: 1px;
            border-left: none;
            border-top: 2px dashed #999;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
          }
        }

        @media print {
          .printable-receipt-wrapper {
            display: flex !important;
            flex-direction: row !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 138mm !important; /* Half of A4 page height (297mm / 2 = ~148mm minus margins) */
            max-height: 140mm !important;
            padding: 4mm 6mm !important;
            gap: 0 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .receipt-col {
            flex: 1 !important;
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
          }
          .receipt-divider {
            width: 8mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justifyContent: center !important;
            position: relative !important;
          }
          .divider-line {
            border-left: 1.5px dashed #444 !important;
            display: block !important;
          }
          .scissor-icon {
            display: block !important;
            background: #fff !important;
            color: #000 !important;
          }
        }
      `}</style>
    </div>
  );
}
