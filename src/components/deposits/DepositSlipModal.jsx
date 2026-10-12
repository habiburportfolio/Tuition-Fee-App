"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { X, Printer, Landmark, Building, Calendar, Hash, Check, CreditCard, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { numberToBanglaWords, toBanglaNumber } from "@/utils/numberToBanglaWords";

export default function DepositSlipModal({ deposit, onClose, onUpdated }) {
  const { user } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("deposit-print-mode");
    return () => {
      document.body.classList.remove("deposit-print-mode");
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editChannel, setEditChannel] = useState(deposit.deposit_channel || "Bank");
  const [editBank, setEditBank] = useState(deposit.bank_name || "");
  const [editSlipNo, setEditSlipNo] = useState(deposit.slip_number || "");
  const [editDate, setEditDate] = useState(
    deposit.deposited_at
      ? new Date(deposit.deposited_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0]
  );
  const [currentDeposit, setCurrentDeposit] = useState(deposit);

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

  // Fetch linked payments to calculate exact fee breakdowns (খাতভিত্তিক হিসাব)
  useEffect(() => {
    const fetchLinkedPayments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("id, amount_paid, payment_method, receipt_no, paid_at, students(full_name, roll_no)")
          .eq("deposit_id", deposit.id)
          .eq("is_voided", false);

        if (!error && data) {
          setPayments(data);
        }
      } catch (err) {
        console.error("Error fetching linked payments:", err);
      } finally {
        setLoading(false);
      }
    };

    if (deposit?.id) {
      fetchLinkedPayments();
    }
  }, [deposit?.id]);

  // Aggregate fee breakdown (কোন কোন খাতে কত টাকা এবং মোট ডিসকাউন্ট)
  const feeBreakdown = (() => {
    const summary = {};
    let totalGrossFromBreakdown = 0;
    let totalDiscountFromPayments = 0;

    payments.forEach(p => {
      let parsed = false;
      if (p.payment_method) {
        try {
          const meta = JSON.parse(p.payment_method);
          if (meta && Array.isArray(meta.items) && meta.items.length > 0) {
            parsed = true;
            meta.items.forEach(item => {
              let name = item.name || "সাধারণ ফি";
              if (name === "পূর্বের বকেয়া আদায়") {
                name = "মাসিক বেতন ও পূর্বের বকেয়া ফি";
              }
              const amt = Number(item.amount) || 0;
              summary[name] = (summary[name] || 0) + amt;
              totalGrossFromBreakdown += amt;
            });
            // If fine was collected
            if (meta.fine && Number(meta.fine) > 0) {
              summary["বিলম্ব ফি / জরিমানা"] = (summary["বিলম্ব ফি / জরিমানা"] || 0) + Number(meta.fine);
              totalGrossFromBreakdown += Number(meta.fine);
            }
            // If discount was given
            if (meta.discount && Number(meta.discount) > 0) {
              totalDiscountFromPayments += Number(meta.discount);
            }
          }
        } catch {
          // Plain text
        }
      }

      if (!parsed) {
        // Fallback for payments without structured items
        const defaultKhat = "মাসিক বেতন ও বকেয়া কালেকশন";
        const amt = Number(p.amount_paid) || 0;
        summary[defaultKhat] = (summary[defaultKhat] || 0) + amt;
        totalGrossFromBreakdown += amt;
      }
    });

    const items = Object.entries(summary).map(([name, amount]) => ({ name, amount }));

    // If no payments found yet, or manual total
    if (items.length === 0) {
      items.push({
        name: "সাধারণ শিক্ষার্থী ফি ও বকেয়া আদায়",
        amount: Number(currentDeposit.total_amount)
      });
      totalGrossFromBreakdown = Number(currentDeposit.total_amount);
    }

    const netAmount = Number(currentDeposit.total_amount) || 0;
    // Calculate total discount: from payments metadata, or difference between gross and net amount
    const discount = totalDiscountFromPayments > 0
      ? totalDiscountFromPayments
      : Math.max(0, totalGrossFromBreakdown - netAmount);

    return {
      items,
      grossTotal: totalGrossFromBreakdown,
      discount,
      netTotal: netAmount
    };
  })();

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const updatePayload = {
        deposit_channel: editChannel,
        bank_name: editChannel === "Bank" ? editBank : null,
        slip_number: editSlipNo || null,
        deposited_at: new Date(editDate).toISOString()
      };

      const { error } = await supabase
        .from("deposits")
        .update(updatePayload)
        .eq("id", currentDeposit.id);

      if (error) throw error;

      toast.success("✅ জমার বিবরণ সফলভাবে আপডেট করা হয়েছে!");
      const updated = { ...currentDeposit, ...updatePayload };
      setCurrentDeposit(updated);
      setIsEditing(false);
      if (onUpdated) onUpdated(updated);
    } catch (err) {
      toast.error(`❌ আপডেট এরর: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const formattedDateBengali = (() => {
    try {
      const d = new Date(currentDeposit.deposited_at);
      return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return currentDeposit.deposited_at;
    }
  })();

  const amountInWords = numberToBanglaWords(currentDeposit.total_amount);

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="deposit-modal-portal">
      <div
        className="deposit-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <style>{`
          .deposit-modal-portal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 1000;
          }
          .deposit-modal-overlay {
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.65);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
          }
          .deposit-modal-container {
            width: 100%;
            max-width: 760px;
            padding: 0;
            max-height: 92vh;
            overflow-y: auto;
            background: var(--card-bg);
            border-radius: var(--radius-lg);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }

          @media print {
            @page {
              size: A4 portrait;
              margin: 10mm 15mm;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: 100% !important;
              overflow: hidden !important;
            }

            body.deposit-print-mode > *:not(.deposit-modal-portal) {
              display: none !important;
            }

            .deposit-modal-portal,
            .deposit-modal-overlay,
            .deposit-modal-container {
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

            .no-print-element {
              display: none !important;
            }

            #deposit-print-area {
              display: block !important;
              position: static !important;
              width: 100% !important;
              max-width: 155mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }

            #deposit-print-area * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        <div className="card-glass deposit-modal-container">
        {/* Header Modal Bar */}
        <div
          className="no-print-element"
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
            <Landmark size={20} />
            <h3 style={{ margin: 0, fontSize: "17px" }}>বিদ্যালয়ে জমা রিপোর্ট / ভাউচার স্লিপ</h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", display: "flex", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Printable Voucher Area */}
        <div
          id="deposit-print-area"
          style={{
            padding: "24px 28px",
            backgroundColor: "var(--card-bg)",
            color: "var(--text-primary)"
          }}
        >
          {/* School Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid var(--border-color)",
              paddingBottom: "12px",
              marginBottom: "16px"
            }}
          >
            {teacherProfile?.logo_url && (
              <img
                src={teacherProfile.logo_url}
                alt="School Logo"
                style={{ width: "46px", height: "46px", objectFit: "contain", marginBottom: "4px" }}
              />
            )}
            <h2 style={{ margin: "0 0 4px 0", color: "var(--brand-primary)", fontSize: "20px", fontWeight: "800" }}>
              {teacherProfile?.school_name || "বিদ্যালয়ের নাম"}
            </h2>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
              {teacherProfile?.eiin_number && <span>EIIN: {teacherProfile.eiin_number}</span>}
              {teacherProfile?.phone_number && <span>মোবাইল: {teacherProfile.phone_number}</span>}
            </div>

            <div
              style={{
                display: "inline-block",
                marginTop: "10px",
                padding: "4px 14px",
                background: "rgba(39, 174, 96, 0.12)",
                border: "1px solid var(--brand-success)",
                color: "var(--brand-success)",
                borderRadius: "var(--radius-full)",
                fontWeight: "700",
                fontSize: "13px"
              }}
            >
              কালেকশন জমা ভাউচার স্লিপ (অফিস কপি)
            </div>
          </div>

          {/* Deposit Info Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              background: "var(--bg-color)",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              fontSize: "13px",
              marginBottom: "16px"
            }}
          >
            <div>
              <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>জমার তারিখ:</div>
              <div style={{ fontWeight: "700" }}>{formattedDateBengali}</div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>জমা মাধ্যম:</div>
              <div style={{ fontWeight: "700", color: "var(--brand-primary)" }}>
                {currentDeposit.deposit_channel === "Bank"
                  ? `ব্যাংক (${currentDeposit.bank_name || "নাম অপ্রাপ্ত"})`
                  : currentDeposit.deposit_channel === "bKash/Nagad"
                  ? "মোবাইল ব্যাংকিং (বিকাশ/নগদ)"
                  : "প্রধান শিক্ষক / ক্যাশ জমা"}
              </div>
            </div>

            {currentDeposit.slip_number && (
              <div>
                <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>স্লিপ/ভাউচার নং:</div>
                <div style={{ fontWeight: "700" }}>{currentDeposit.slip_number}</div>
              </div>
            )}

            <div style={{ textAlign: currentDeposit.slip_number ? "right" : "left" }}>
              <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>সংযুক্ত মোট রসিদ সংখ্যা:</div>
              <div style={{ fontWeight: "700" }}>{payments.length} টি কালেকশন রসিদ</div>
            </div>
          </div>

          {/* Breakdown Section: kon kon khate koto joma kora hoyeche */}
          <div style={{ marginBottom: "18px" }}>
            <h4
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--brand-primary)",
                margin: "0 0 8px 0",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <CreditCard size={16} /> ফি এর খাতভিত্তিক জমার বিবরণ:
            </h4>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                border: "1px solid var(--border-color)"
              }}
            >
              <thead>
                <tr style={{ background: "rgba(0, 112, 243, 0.08)", borderBottom: "1.5px solid var(--border-color)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", width: "40px" }}>নং</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>ফি এর খাতসমূহ</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>জমার পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {feeBreakdown.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "8px 10px", color: "var(--text-secondary)" }}>{toBanglaNumber(idx + 1)}.</td>
                    <td style={{ padding: "8px 10px", fontWeight: "600" }}>{item.name}</td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "700" }}>
                      {item.amount} ৳
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {feeBreakdown.discount > 0 && (
                  <>
                    <tr style={{ borderTop: "1.5px solid var(--border-color)", background: "rgba(0,0,0,0.02)" }}>
                      <td colSpan="2" style={{ padding: "8px 10px", textAlign: "right", fontWeight: "700", color: "var(--text-secondary)", fontSize: "13px" }}>
                        মোট ফি ও জরিমানা:
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}>
                        {feeBreakdown.grossTotal} ৳
                      </td>
                    </tr>
                    <tr style={{ background: "rgba(235, 87, 87, 0.06)", color: "var(--brand-danger)" }}>
                      <td colSpan="2" style={{ padding: "8px 10px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}>
                        মওকুফ / ডিসকাউন্ট (-):
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: "700", fontSize: "13px" }}>
                        - {feeBreakdown.discount} ৳
                      </td>
                    </tr>
                  </>
                )}
                <tr style={{ background: "rgba(39, 174, 96, 0.08)", borderTop: feeBreakdown.discount > 0 ? "1.5px solid var(--border-color)" : "2px solid var(--border-color)" }}>
                  <td colSpan="2" style={{ padding: "10px", textAlign: "right", fontWeight: "800", fontSize: "14px" }}>
                    সর্বমোট জমার পরিমাণ:
                  </td>
                  <td
                    style={{
                      padding: "10px",
                      textAlign: "right",
                      fontWeight: "800",
                      fontSize: "16px",
                      color: "var(--brand-success)"
                    }}
                  >
                    {feeBreakdown.netTotal} ৳
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* In words */}
            <div
              style={{
                marginTop: "8px",
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--bg-color)",
                border: "1px dashed var(--border-color)",
                fontSize: "12px",
                color: "var(--text-secondary)"
              }}
            >
              কথায়: <b style={{ color: "var(--text-primary)" }}>{amountInWords}</b>
            </div>
          </div>

          {/* Linked student receipts summary list */}
          {payments.length > 0 && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "4px" }}>
                অন্তর্ভুক্ত স্টুডেন্ট রসিদসমূহ ({payments.length} টি):
              </div>
              <div
                style={{
                  maxHeight: "140px",
                  overflowY: "auto",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11.5px"
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-color)", borderBottom: "1px solid var(--border-color)" }}>
                      <th style={{ padding: "5px 8px", textAlign: "left" }}>রসিদ নং</th>
                      <th style={{ padding: "5px 8px", textAlign: "left" }}>শিক্ষার্থী</th>
                      <th style={{ padding: "5px 8px", textAlign: "left" }}>রোল</th>
                      <th style={{ padding: "5px 8px", textAlign: "right" }}>টাকা</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: "1px dashed var(--border-color)" }}>
                        <td style={{ padding: "4px 8px", fontWeight: "600" }}>{p.receipt_no}</td>
                        <td style={{ padding: "4px 8px" }}>{p.students?.full_name}</td>
                        <td style={{ padding: "4px 8px" }}>{p.students?.roll_no}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "700", color: "var(--brand-success)" }}>
                          {p.amount_paid} ৳
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Signatures */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "35px",
              paddingTop: "20px",
              borderTop: "1px dashed var(--border-color)"
            }}
          >
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              {teacherProfile?.signature_url ? (
                <img
                  src={teacherProfile.signature_url}
                  crossOrigin="anonymous"
                  alt="Teacher Signature"
                  style={{ height: "30px", objectFit: "contain", marginBottom: "2px" }}
                />
              ) : (
                <div style={{ height: "30px" }}></div>
              )}
              <div style={{ borderTop: "1px solid var(--text-secondary)", width: "130px", paddingTop: "4px", fontSize: "12px" }}>
                জমা প্রদানকারী (শিক্ষক)
              </div>
            </div>

            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ height: "30px" }}></div>
              <div style={{ borderTop: "1px solid var(--text-secondary)", width: "140px", paddingTop: "4px", fontSize: "12px" }}>
                গ্রহীতা / ব্যাংক কর্তৃপক্ষ
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form Section (When user clicks Edit) */}
        {isEditing && (
          <div
            className="no-print-element"
            style={{
              padding: "16px 20px",
              background: "var(--bg-color)",
              borderTop: "1px solid var(--border-color)"
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", color: "var(--brand-primary)", fontSize: "14px" }}>
              ✏️ জমা রেকর্ডের তথ্য এডিট করুন:
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "600" }}>জমা মাধ্যম</label>
                <select
                  value={editChannel}
                  onChange={(e) => setEditChannel(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "13px" }}
                >
                  <option value="Bank">ব্যাংক (Bank)</option>
                  <option value="bKash/Nagad">বিকাশ/নগদ (Mobile Banking)</option>
                  <option value="Headmaster">প্রধান শিক্ষক (Cash)</option>
                </select>
              </div>

              {editChannel === "Bank" && (
                <div>
                  <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "600" }}>ব্যাংকের নাম</label>
                  <input
                    type="text"
                    value={editBank}
                    onChange={(e) => setEditBank(e.target.value)}
                    placeholder="Sonali Bank, Janata Bank..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "13px" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "600" }}>স্লিপ/ভাউচার নং</label>
                <input
                  type="text"
                  value={editSlipNo}
                  onChange={(e) => setEditSlipNo(e.target.value)}
                  placeholder="স্লিপ নং"
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px", fontWeight: "600" }}>জমার তারিখ</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: "4px", border: "1px solid var(--border-color)", fontSize: "13px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn"
                style={{ padding: "6px 14px", fontSize: "12px" }}
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="btn btn-primary"
                style={{ padding: "6px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Check size={14} /> {saving ? "সেভ হচ্ছে..." : "পরিবর্তন সংরক্ষণ করুন"}
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Footer (Print / Edit / Close) */}
        <div
          className="no-print-element"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn"
                style={{
                  background: "none",
                  border: "1px solid var(--brand-warning)",
                  color: "var(--brand-warning)",
                  padding: "7px 14px",
                  fontSize: "13px"
                }}
              >
                তথ্য এডিট করুন
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handlePrint}
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 18px", fontSize: "13px" }}
            >
              <Printer size={16} /> স্লিপ প্রিন্ট করুন
            </button>
            <button
              onClick={onClose}
              className="btn"
              style={{ padding: "8px 16px", fontSize: "13px" }}
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
