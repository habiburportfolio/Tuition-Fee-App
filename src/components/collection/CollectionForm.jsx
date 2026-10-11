"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import { Search, User, CreditCard, CheckCircle, Clock, XCircle, Printer, Award, Calendar } from "lucide-react";
import { numberToBanglaWords } from "@/utils/numberToBanglaWords";
import toast from "react-hot-toast";
import ReceiptModal from "./ReceiptModal";

const BANGLA_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

export default function CollectionForm({ classId, classInfo }) {
  const { user, userRole } = useAuth();
  const { guardAction } = useLock();
  
  const [rollNo, setRollNo] = useState("");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState(classInfo || null);
  
  // Date state
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  // Payment states
  const [fees, setFees] = useState([]);
  const [selectedFees, setSelectedFees] = useState([]);
  
  // Due months selection
  const [selectedDueMonths, setSelectedDueMonths] = useState([]);
  
  // Waiver / Scholarship toggle
  const [waiverFreeApplied, setWaiverFreeApplied] = useState(false);
  
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [fine, setFine] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Post-payment & History
  const [receiptData, setReceiptData] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  useEffect(() => {
    const fetchRecentPayments = async () => {
      if (!classId) return;
      const { data } = await supabase
        .from("payments")
        .select("*, students(full_name, roll_no, class_id, waiver_status, parent_phone)")
        .eq("is_voided", false)
        .is("deposit_id", null)
        .order("paid_at", { ascending: false })
        .limit(5);
      if (data) setRecentPayments(data);
    };

    if (classId) {
      supabase.from("fees_setup").select("*").eq("class_id", classId).eq("is_active", true)
        .then(({ data }) => setFees(data || []));
        
      fetchRecentPayments();
    }
  }, [classId]);

  const fetchRecentPaymentsForSubmit = async () => {
    if (!classId) return;
    const { data } = await supabase
      .from("payments")
      .select("*, students(full_name, roll_no, waiver_status, parent_phone)")
      .eq("is_voided", false)
      .is("deposit_id", null)
      .order("paid_at", { ascending: false })
      .limit(5);
    if (data) setRecentPayments(data);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!classId) {
      toast.error("আগে ক্লাস নির্বাচন করুন।");
      return;
    }
    if (!rollNo) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .eq("roll_no", rollNo)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          toast.error("এই রোলের কোনো স্টুডেন্ট পাওয়া যায়নি!");
          setStudent(null);
        } else throw error;
      } else {
        setStudent(data);
        setSelectedFees([]);
        setSelectedDueMonths([]);

        // Auto-check waiver eligibility
        const isScholarshipStudent = data.waiver_status && (
          data.waiver_status === "Full Free" ||
          data.waiver_status.includes("বৃত্তি") ||
          data.waiver_status.includes("উপবৃত্তি") ||
          data.waiver_status.includes("Free")
        );
        setWaiverFreeApplied(isScholarshipStudent);

        setAmountPaid(data.opening_due > 0 ? data.opening_due.toString() : "");
      }
    } catch (error) {
      toast.error(`❌ সার্চ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Find standard monthly fee if configured
  const standardMonthlyFee = fees.find(f => f.fee_type === "Monthly" || f.fee_type === "মাসিক বেতন");
  const monthlyRate = standardMonthlyFee ? Number(standardMonthlyFee.amount) : 0;

  // Calculate fees breakdown
  // 1. Regular non-monthly or separately selected fees
  const selectedOtherFees = selectedFees.map(id => fees.find(f => f.id === id)).filter(Boolean);
  
  const selectedOtherFeesTotal = selectedOtherFees.reduce((sum, f) => {
    const isTuitionFee = f.fee_type === "Monthly" || f.fee_type === "মাসিক বেতন" || f.fee_type.toLowerCase().includes("tuition");
    if (isTuitionFee && waiverFreeApplied) {
      return sum; // 100% free for scholarship / stipend
    }
    if (isTuitionFee && student?.waiver_status === "Half Free") {
      return sum + Number(f.amount) * 0.5;
    }
    return sum + Number(f.amount);
  }, 0);

  // 2. Due Months Total
  const dueMonthsTotal = selectedDueMonths.length * (waiverFreeApplied ? 0 : (student?.waiver_status === "Half Free" ? monthlyRate * 0.5 : monthlyRate));

  const totalFeesAmount = selectedOtherFeesTotal + dueMonthsTotal;
  const previousDue = student ? Number(student.opening_due || 0) : 0;
  
  // Total payable before fine
  const basePayable = previousDue + totalFeesAmount;
  
  const fineValue = parseFloat(fine) || 0;
  const discountValue = parseFloat(discount) || 0;
  
  // Total payable includes fine (as requested: জরিমানা is positioned above সর্বমোট পাওনা)
  const totalPayableWithFine = basePayable + fineValue;
  const netPayable = Math.max(totalPayableWithFine - discountValue, 0);

  // Auto-sync amountPaid with netPayable
  useEffect(() => {
    if (student) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmountPaid(netPayable.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalFeesAmount, student, discountValue, fineValue]);

  const toggleFee = (feeId) => {
    setSelectedFees(prev => 
      prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]
    );
  };

  const toggleDueMonth = (month) => {
    setSelectedDueMonths(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!user || !student) return;

    const paid = parseFloat(amountPaid) || 0;

    if (paid <= 0 && selectedFees.length === 0 && selectedDueMonths.length === 0 && discountValue <= 0) {
      toast.error("টাকার পরিমাণ অথবা ফি নির্বাচন করুন।");
      return;
    }

    const dueRemaining = totalPayableWithFine - paid - discountValue;
    if (dueRemaining < 0) {
      toast.error("পরিশোধিত টাকা ও ডিসকাউন্ট মোট পাওনার চেয়ে বেশি হতে পারবে না!");
      return;
    }

    setProcessing(true);
    try {
      const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
      
      // Build selected fees details list for receipt & permanent storage
      const feeDetails = [];

      // Add selected months
      selectedDueMonths.forEach(m => {
        const amt = waiverFreeApplied ? 0 : (student?.waiver_status === "Half Free" ? monthlyRate * 0.5 : monthlyRate);
        feeDetails.push({
          name: `মাসিক বেতন (${m})${waiverFreeApplied ? " [বৃত্তি মওকুফ]" : ""}`,
          amount: amt
        });
      });

      // Add other fees
      selectedOtherFees.forEach(f => {
        const isTuition = f.fee_type === "Monthly" || f.fee_type === "মাসিক বেতন";
        let amt = Number(f.amount);
        let note = "";
        if (isTuition && waiverFreeApplied) {
          amt = 0;
          note = " [বৃত্তি মওকুফ]";
        } else if (isTuition && student?.waiver_status === "Half Free") {
          amt = amt * 0.5;
          note = " [অর্ধ-বেতন]";
        }
        feeDetails.push({
          name: `${f.fee_type} ${f.month_name ? `(${f.month_name})` : ""}${note}`,
          amount: amt
        });
      });

      // If no new fees selected but paid previous due
      if (feeDetails.length === 0 && previousDue > 0) {
        feeDetails.push({
          name: "মাসিক বেতন ও বকেয়া ফি",
          amount: Math.min(paid, previousDue)
        });
      }

      // Metadata to store in payment_method
      const paymentMetadata = JSON.stringify({
        method: "Cash",
        items: feeDetails,
        fine: fineValue,
        discount: discountValue,
        months: selectedDueMonths,
        waiverFree: waiverFreeApplied
      });

      const paymentDataToSave = {
        teacher_id: user.id,
        student_id: student.id,
        amount_paid: paid,
        due_remaining: dueRemaining,
        receipt_no: receiptNo,
        payment_method: paymentMetadata,
        paid_at: new Date(paymentDate).toISOString()
      };

      if (!navigator.onLine) {
        const { saveOfflinePayment } = await import("@/lib/offlineSync");
        saveOfflinePayment(paymentDataToSave, student);
        toast.success(`অফলাইনে সেভ করা হয়েছে। ইন্টারনেট আসলে সিঙ্ক হবে। রসিদ: ${receiptNo}`);
      } else {
        // 1. Insert Payment Record
        const { error: paymentError } = await supabase
          .from("payments")
          .insert([paymentDataToSave]);

        if (paymentError) throw paymentError;

        // 2. Update Student Due
        const { error: studentError } = await supabase
          .from("students")
          .update({ opening_due: dueRemaining })
          .eq("id", student.id);

        if (studentError) throw studentError;

        toast.success(`✅ সফল! পেমেন্ট গ্রহণ সম্পন্ন হয়েছে। রসিদ: ${receiptNo}`);
      }
      
      // Refresh student state
      setStudent({ ...student, opening_due: dueRemaining });
      
      // Trigger receipt modal
      setReceiptData({
        student,
        classInfo: currentClass,
        payment: {
          amount_paid: paid,
          due_remaining: dueRemaining,
          receipt_no: receiptNo,
          paid_at: paymentDataToSave.paid_at,
          payment_method: paymentMetadata
        },
        selectedFeesDetails: feeDetails,
        totalPayable: totalPayableWithFine,
        discount: discountValue,
        fine: fineValue
      });

      setSelectedFees([]);
      setSelectedDueMonths([]);
      setAmountPaid("");
      setDiscount("");
      setFine("");
      fetchRecentPaymentsForSubmit();
      
    } catch (error) {
      toast.error(`❌ পেমেন্ট এরর: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleVoidPayment = (payment) => {
    // Protected by Settings Lock (Requirement 8)
    guardAction("পেমেন্ট বাতিল (Void)", async () => {
      const reason = window.prompt("ভুল এন্ট্রি বাতিলের কারণ লিখুন:");
      if (!reason) return;

      try {
        const { error: voidError } = await supabase
          .from("payments")
          .update({ is_voided: true, void_reason: reason })
          .eq("id", payment.id);

        if (voidError) throw voidError;

        const { data: currentStudent, error: fetchError } = await supabase
          .from("students")
          .select("opening_due")
          .eq("id", payment.student_id)
          .single();
          
        if (fetchError) throw fetchError;

        const revertedDue = Number(currentStudent.opening_due) + Number(payment.amount_paid);
        const { error: revertError } = await supabase
          .from("students")
          .update({ opening_due: revertedDue })
          .eq("id", payment.student_id);

        if (revertError) throw revertError;

        toast.success("✅ পেমেন্ট সফলভাবে বাতিল করা হয়েছে।");
        fetchRecentPaymentsForSubmit();
        
        if (student && student.id === payment.student_id) {
          setStudent({ ...student, opening_due: revertedDue });
        }
      } catch (error) {
        toast.error(`❌ বাতিল করতে সমস্যা: ${error.message}`);
      }
    });
  };

  const handlePrintRecentReceipt = (pay) => {
    let details = null;
    let payFine = 0;
    let payDiscount = 0;
    if (pay.payment_method) {
      try {
        const meta = JSON.parse(pay.payment_method);
        details = meta.items;
        payFine = meta.fine || 0;
        payDiscount = meta.discount || 0;
      } catch {
        // Plain string
      }
    }

    setReceiptData({
      student: pay.students,
      classInfo: currentClass,
      payment: {
        id: pay.id,
        amount_paid: pay.amount_paid,
        due_remaining: pay.due_remaining,
        receipt_no: pay.receipt_no,
        paid_at: pay.paid_at,
        payment_method: pay.payment_method
      },
      selectedFeesDetails: details,
      totalPayable: Number(pay.amount_paid) + Number(pay.due_remaining) + payFine,
      discount: payDiscount,
      fine: payFine
    });
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <h3 style={{ color: "var(--brand-primary)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <CreditCard /> ফি কালেকশন
        </h3>
        {currentClass && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--bg-color)", padding: "6px 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--border-color)", fontSize: "13px" }}>
            <span style={{ fontWeight: "700" }}>{currentClass.class_name}</span>
            {currentClass.group_name && (
              <span style={{
                padding: "2px 8px", borderRadius: "var(--radius-full)", fontWeight: "700", fontSize: "11px",
                backgroundColor: currentClass.group_name === "Science" ? "rgba(0, 112, 243, 0.15)" : currentClass.group_name === "Commerce" ? "rgba(39, 174, 96, 0.15)" : "rgba(142, 68, 173, 0.15)",
                color: currentClass.group_name === "Science" ? "#0070f3" : currentClass.group_name === "Commerce" ? "#27ae60" : "#8e44ad",
                border: "1px solid currentColor"
              }}>
                {currentClass.group_name === "Science" ? "Science (বিজ্ঞান)" : currentClass.group_name === "Commerce" ? "Commerce (ব্যবসায় শিক্ষা)" : currentClass.group_name === "Arts" ? "Arts (মানবিক)" : currentClass.group_name}
              </span>
            )}
            {currentClass.section_name && <span>(শাখা: {currentClass.section_name})</span>}
          </div>
        )}
      </div>

      {/* Roll Search Form */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
        <div style={{ flex: "1", position: "relative" }}>
          <Search style={{ position: "absolute", left: "12px", top: "14px", color: "var(--text-secondary)" }} size={20} />
          <input 
            type="number" 
            placeholder="রোল নম্বর লিখে এন্টার চাপুন..." 
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            style={{ 
              width: "100%", padding: "12px 12px 12px 42px", 
              fontSize: "17px", borderRadius: "var(--radius-md)", 
              border: "2px solid var(--brand-primary)",
              backgroundColor: "var(--card-bg)", color: "var(--text-primary)" 
            }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "খুঁজছে..." : "সার্চ"}
        </button>
      </form>

      {student && (
        <div style={{ padding: "20px", backgroundColor: "var(--bg-color)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
          
          {/* Student Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
            <div>
              <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", marginBottom: "4px" }}>
                <User size={22} color="var(--brand-primary)" /> {student.full_name}
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "2px" }}>
                রোল: <b>{student.roll_no}</b>
                {currentClass?.class_name && <> | শ্রেণি: <b>{currentClass.class_name}</b></>}
                {currentClass?.group_name && <> | বিভাগ: <b>{currentClass.group_name}</b></>}
                {" "}| স্ট্যাটাস:{" "}
                <strong style={{ color: student.status === "Active" ? "var(--brand-success)" : "var(--brand-danger)" }}>
                  {student.status}
                </strong>
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "2px" }}>পূর্বের বকেয়া</p>
              <h2 style={{ color: student.opening_due > 0 ? "var(--brand-danger)" : "var(--brand-success)", fontSize: "24px", margin: 0 }}>
                {student.opening_due} ৳
              </h2>
            </div>
          </div>

          {/* Stipend / Scholarship (উপবৃত্তি ও বৃত্তি) Option (Requirement 9) */}
          <div
            style={{
              marginTop: "15px",
              padding: "10px 14px",
              background: waiverFreeApplied ? "rgba(39, 174, 96, 0.1)" : "rgba(0, 112, 243, 0.05)",
              border: `1px solid ${waiverFreeApplied ? "var(--brand-success)" : "var(--border-color)"}`,
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Award size={20} color={waiverFreeApplied ? "var(--brand-success)" : "var(--brand-primary)"} />
              <div>
                <span style={{ fontWeight: "700", fontSize: "14px" }}>
                  উপবৃত্তি ও বৃত্তি সুবিধা (বেতন ফ্রি):
                </span>
                <span style={{ fontSize: "13px", marginLeft: "6px", color: "var(--text-secondary)" }}>
                  {student.waiver_status !== "None" ? `স্টুডেন্ট স্ট্যাটাস: ${student.waiver_status}` : "সাধারণ শিক্ষার্থী"}
                </span>
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontWeight: "700", fontSize: "14px", color: waiverFreeApplied ? "var(--brand-success)" : "inherit" }}>
              <input
                type="checkbox"
                checked={waiverFreeApplied}
                onChange={(e) => setWaiverFreeApplied(e.target.checked)}
                style={{ width: "17px", height: "17px", accentColor: "var(--brand-success)" }}
              />
              <span>উপবৃত্তি/বৃত্তি প্রযোজ্য (মাসিক বেতন ১০০% ফ্রি)</span>
            </label>
          </div>

          <div style={{ marginTop: "25px", borderTop: "2px dashed var(--border-color)", paddingTop: "18px" }}>
            
            {/* Payment Date & Due Months Selector (Requirement 2 & Requirement 5) */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
              <h4 style={{ margin: 0, fontSize: "16px" }}>ফি ও বকেয়া মাসসমূহ নির্বাচন করুন:</h4>
              
              {/* Payment Date Input */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                <Calendar size={16} color="var(--brand-primary)" />
                <span style={{ fontWeight: "600" }}>পেমেন্ট তারিখ:</span>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--card-bg)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>
            </div>

            {/* Requirement 5: Due Months Selector (বকেয়া মাসসমূহ) */}
            <div style={{ marginBottom: "20px", background: "var(--card-bg)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--brand-primary)" }}>
                  📅 বকেয়া মাসসমূহ (মাসিক বেতন {monthlyRate > 0 ? `${monthlyRate} ৳/মাস` : ""}):
                </span>
                {selectedDueMonths.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDueMonths([])}
                    style={{ background: "none", border: "none", color: "var(--brand-danger)", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
                  >
                    সব মাস আনচেক করুন
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
                {BANGLA_MONTHS.map(month => {
                  const isChecked = selectedDueMonths.includes(month);
                  return (
                    <label
                      key={month}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "7px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${isChecked ? "var(--brand-primary)" : "var(--border-color)"}`,
                        background: isChecked ? "rgba(0, 112, 243, 0.08)" : "var(--bg-color)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: isChecked ? "700" : "normal"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDueMonth(month)}
                        style={{ accentColor: "var(--brand-primary)" }}
                      />
                      <span>{month}</span>
                    </label>
                  );
                })}
              </div>

              {selectedDueMonths.length > 0 && (
                <div style={{ marginTop: "10px", fontSize: "13px", color: "var(--brand-primary)", fontWeight: "600" }}>
                  নির্বাচিত মাস: {selectedDueMonths.join(", ")} ({selectedDueMonths.length} টি মাস)
                  {waiverFreeApplied ? (
                    <span style={{ color: "var(--brand-success)", marginLeft: "8px" }}>→ বৃত্তিপ্রাপ্ত হওয়ায় ০ ৳</span>
                  ) : (
                    <span style={{ marginLeft: "8px" }}>→ মোট {dueMonthsTotal} ৳</span>
                  )}
                </div>
              )}
            </div>

            {/* Other Fees (Exam, Session, etc.) */}
            {fees.filter(f => f.fee_type !== "Monthly" && f.fee_type !== "মাসিক বেতন").length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontWeight: "700", fontSize: "14px", marginBottom: "8px" }}>অন্যান্য ফি এর খাতসমূহ:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {fees.filter(f => f.fee_type !== "Monthly" && f.fee_type !== "মাসিক বেতন").map(fee => (
                    <label key={fee.id} style={{ 
                      display: "flex", alignItems: "center", gap: "8px", 
                      padding: "8px 12px", background: "var(--card-bg)", 
                      border: `1px solid ${selectedFees.includes(fee.id) ? "var(--brand-primary)" : "var(--border-color)"}`,
                      borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-primary)"
                    }}>
                      <input 
                        type="checkbox" 
                        checked={selectedFees.includes(fee.id)}
                        onChange={() => toggleFee(fee.id)}
                        style={{ accentColor: "var(--brand-primary)" }}
                      />
                      <span style={{ fontSize: "14px" }}>
                        {fee.fee_type} - <b>{fee.amount} ৳</b>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Summary & Submission Form */}
            <form onSubmit={handlePaymentSubmit} style={{ background: "var(--card-bg)", padding: "18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "15px", alignItems: "flex-end" }}>
                
                {/* 1. Base Fee / Due */}
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold" }}>
                    ফি ও পূর্বের বকেয়া
                  </label>
                  <input
                    type="text"
                    value={`${basePayable} ৳`}
                    readOnly
                    style={{ width: "100%", padding: "10px", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontWeight: "bold" }}
                  />
                </div>

                {/* 2. Fine (জরিমানা) - Requirement 6: Clearly placed before/above Total Due */}
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold", color: "var(--brand-danger)" }}>
                    জরিমানা (Fine) (+)
                  </label>
                  <input 
                    type="number" 
                    value={fine}
                    onChange={(e) => setFine(e.target.value)}
                    placeholder="0"
                    style={{ width: "100%", padding: "10px", border: "1px solid var(--brand-warning)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "16px" }}
                  />
                </div>

                {/* 3. Total Due (সর্বমোট পাওনা) - Requirement 6: Below জরিমানা */}
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold", color: "var(--brand-primary)" }}>
                    সর্বমোট পাওনা
                  </label>
                  <input
                    type="text"
                    value={`${totalPayableWithFine} ৳`}
                    readOnly
                    style={{ width: "100%", padding: "10px", backgroundColor: "var(--bg-color)", color: "var(--brand-primary)", border: "2px solid var(--brand-primary)", borderRadius: "var(--radius-sm)", fontWeight: "bold", fontSize: "16px" }}
                  />
                </div>

                {/* 4. Discount */}
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold" }}>
                    ডিসকাউন্ট (-)
                  </label>
                  <input 
                    type="number" 
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="0"
                    style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "16px" }}
                  />
                </div>

                {/* 5. Received Amount */}
                <div>
                  <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold", color: "var(--brand-success)" }}>
                    গৃহীত টাকা (Received) *
                  </label>
                  <input 
                    type="number" 
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "2px solid var(--brand-success)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "17px", fontWeight: "bold" }}
                    required
                  />
                </div>

                <div>
                  <button type="submit" className="btn btn-success" disabled={processing} style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <CheckCircle size={18} /> {processing ? "প্রসেসিং..." : "পেমেন্ট নিন"}
                  </button>
                </div>
              </div>

              {/* Requirement 7: Live Bengali Words Display */}
              {amountPaid && Number(amountPaid) > 0 && (
                <div style={{ marginTop: "12px", fontSize: "13px", color: "var(--brand-success)", fontWeight: "700" }}>
                  কথায়: {numberToBanglaWords(amountPaid)}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {!student && recentPayments.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", color: "var(--text-secondary)" }}>
            <Clock size={18} /> সাম্প্রতিক কালেকশন (Cash in Hand)
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "500px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>রসিদ নং</th>
                  <th style={{ padding: "10px" }}>স্টুডেন্ট</th>
                  <th style={{ padding: "10px" }}>বিভাগ</th>
                  <th style={{ padding: "10px" }}>টাকা</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map(pay => (
                  <tr key={pay.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px" }}>{pay.receipt_no}</td>
                    <td style={{ padding: "10px" }}>
                      <b>{pay.students?.full_name}</b> <br />
                      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>রোল: {pay.students?.roll_no}</span>
                    </td>
                    <td style={{ padding: "10px" }}>
                      {currentClass?.group_name || "সাধারণ"}
                    </td>
                    <td style={{ padding: "10px", fontWeight: "bold", color: "var(--brand-success)" }}>
                      {pay.amount_paid} ৳
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handlePrintRecentReceipt(pay)}
                          className="btn"
                          style={{ padding: "4px 8px", fontSize: "12px", background: "transparent", border: "1px solid var(--brand-primary)", color: "var(--brand-primary)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Printer size={13} /> রসিদ
                        </button>
                        {userRole !== "assistant" && (
                          <button 
                            onClick={() => handleVoidPayment(pay)}
                            className="btn" 
                            style={{ padding: "4px 8px", fontSize: "12px", background: "transparent", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <XCircle size={13} /> বাতিল
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {receiptData && (
        <ReceiptModal 
          receiptData={receiptData} 
          onClose={() => {
            setReceiptData(null);
            setRollNo("");
            setStudent(null);
          }} 
        />
      )}
    </div>
  );
}
