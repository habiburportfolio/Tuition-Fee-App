"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import { Search, User, CreditCard, CheckCircle, Clock, XCircle, Printer, Award, Calendar, Plus, X, Tag } from "lucide-react";
import { numberToBanglaWords } from "@/utils/numberToBanglaWords";
import toast from "react-hot-toast";
import ReceiptModal from "./ReceiptModal";

const BANGLA_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

export default function CollectionForm({ classId, classIds, classInfo, selectedDepartment, onSelectDepartment }) {
  const { user, userRole } = useAuth();
  const { guardAction } = useLock();
  
  const [rollNo, setRollNo] = useState("");
  const [student, setStudent] = useState(null);
  const [multipleMatches, setMultipleMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState(classInfo || null);

  const targetClassIds = useMemo(() => {
    if (classIds && classIds.length > 0) return classIds;
    return classId ? [classId] : [];
  }, [classId, classIds]);
  
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
  const [collectionScope, setCollectionScope] = useState("current"); // "current" | "all"

  // On-the-spot dynamic fee heads & Add Fee Modal state
  const [customOnTheSpotFees, setCustomOnTheSpotFees] = useState([]);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [saveFeePermanently, setSaveFeePermanently] = useState(true);
  const [addingFee, setAddingFee] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  const fetchRecentPayments = async (scope = collectionScope) => {
    if (targetClassIds.length === 0 && scope === "current") return;

    let query;
    if (scope === "current" && targetClassIds.length > 0) {
      query = supabase
        .from("payments")
        .select("*, students!inner(full_name, roll_no, class_id, waiver_status, parent_phone, academic_classes(id, class_name, section_name, group_name))")
        .in("students.class_id", targetClassIds)
        .eq("is_voided", false)
        .is("deposit_id", null)
        .order("paid_at", { ascending: false })
        .limit(8);
    } else {
      query = supabase
        .from("payments")
        .select("*, students(full_name, roll_no, class_id, waiver_status, parent_phone, academic_classes(id, class_name, section_name, group_name))")
        .eq("is_voided", false)
        .is("deposit_id", null)
        .order("paid_at", { ascending: false })
        .limit(8);
    }

    const { data } = await query;
    if (data) setRecentPayments(data);
  };

  useEffect(() => {
    if (targetClassIds.length > 0) {
      supabase.from("fees_setup").select("*").in("class_id", targetClassIds).eq("is_active", true)
        .then(({ data }) => setFees(data || []));
        
      fetchRecentPayments(collectionScope);
    }
  }, [JSON.stringify(targetClassIds), collectionScope]);

  const fetchRecentPaymentsForSubmit = async () => {
    fetchRecentPayments(collectionScope);
  };

  const selectStudent = (data) => {
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
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (targetClassIds.length === 0) {
      toast.error("আগে ক্লাস নির্বাচন করুন।");
      return;
    }
    if (!rollNo) return;
    
    setLoading(true);
    setMultipleMatches([]);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*, academic_classes(id, class_name, section_name, group_name)")
        .in("class_id", targetClassIds)
        .eq("roll_no", parseInt(rollNo, 10));

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("এই রোলের কোনো শিক্ষার্থী পাওয়া যায়নি!");
        setStudent(null);
      } else if (data.length === 1) {
        selectStudent(data[0]);
      } else {
        // Multiple matches across departments
        setMultipleMatches(data);
        toast("রোল " + rollNo + "-এ একাধিক বিভাগের শিক্ষার্থী পাওয়া গেছে, অনুগ্রহ করে নির্বাচন করুন।", { icon: "ℹ️" });
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

  // Combine predefined fees from fees_setup + any custom on-the-spot fees
  const allAvailableOtherFees = [
    ...fees.filter(f => f.fee_type !== "Monthly" && f.fee_type !== "মাসিক বেতন"),
    ...customOnTheSpotFees
  ];

  // Calculate fees breakdown
  // 1. Regular non-monthly or separately selected fees
  const selectedOtherFees = selectedFees.map(id => allAvailableOtherFees.find(f => f.id === id)).filter(Boolean);
  
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

  const handleAddNewFee = async (e) => {
    e.preventDefault();
    if (!newFeeName.trim()) {
      toast.error("খাতের নাম লিখুন");
      return;
    }
    const amt = parseFloat(newFeeAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("সঠিক টাকার পরিমাণ লিখুন");
      return;
    }

    setAddingFee(true);
    try {
      if (saveFeePermanently && classId && user) {
        // Save to Supabase fees_setup table for this class
        const { data: createdFee, error } = await supabase
          .from("fees_setup")
          .insert([{
            teacher_id: user.id,
            class_id: classId,
            fee_type: newFeeName.trim(),
            amount: amt,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;

        // Add to fees list and auto-select
        setFees(prev => [...prev, createdFee]);
        setSelectedFees(prev => [...prev, createdFee.id]);
        toast.success(`✅ "${createdFee.fee_type}" খাতটি যুক্ত ও সিলেক্ট করা হয়েছে!`);
      } else {
        // Add as dynamic on-the-spot fee for this session
        const customId = `custom_${Date.now()}`;
        const customItem = {
          id: customId,
          fee_type: newFeeName.trim(),
          amount: amt,
          isCustom: true
        };
        setCustomOnTheSpotFees(prev => [...prev, customItem]);
        setSelectedFees(prev => [...prev, customId]);
        toast.success(`✅ "${customItem.fee_type}" খাতটি যুক্ত ও সিলেক্ট করা হয়েছে!`);
      }

      // Reset modal form
      setNewFeeName("");
      setNewFeeAmount("");
      setShowAddFeeModal(false);
    } catch (err) {
      console.error("Error adding fee head:", err);
      toast.error(`❌ খাত যুক্ত করতে সমস্যা: ${err.message}`);
    } finally {
      setAddingFee(false);
    }
  };

  const handleRemoveCustomFee = (customId) => {
    setCustomOnTheSpotFees(prev => prev.filter(f => f.id !== customId));
    setSelectedFees(prev => prev.filter(id => id !== customId));
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
      classInfo: pay.students?.academic_classes || currentClass,
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

      {/* Multiple Matches Resolution when searching in unified class */}
      {multipleMatches.length > 1 && (
        <div style={{ marginTop: "14px", marginBottom: "14px", padding: "12px 16px", background: "rgba(0, 112, 243, 0.08)", borderRadius: "var(--radius-md)", border: "1.5px solid var(--brand-primary)" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", marginBottom: "8px", color: "var(--brand-primary)" }}>
            ℹ️ রোল {rollNo}-এ একাধিক বিভাগের শিক্ষার্থী পাওয়া গেছে, নির্বাচন করুন:
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {multipleMatches.map(m => {
              const grp = m.academic_classes?.group_name;
              const grpLabel = grp === "Science" ? "বিজ্ঞান" : grp === "Commerce" ? "ব্যবসায় শিক্ষা" : grp === "Arts" ? "মানবিক" : grp || "সাধারণ";
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    selectStudent(m);
                    setMultipleMatches([]);
                  }}
                  className="btn btn-primary"
                  style={{ padding: "6px 14px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <b>{m.full_name}</b> — <span>{grpLabel} (রোল {m.roll_no})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                {student.academic_classes?.class_name ? (
                  <> | শ্রেণি: <b>{student.academic_classes.class_name}</b></>
                ) : currentClass?.class_name ? (
                  <> | শ্রেণি: <b>{currentClass.class_name}</b></>
                ) : null}
                {student.academic_classes?.group_name ? (
                  <> | বিভাগ: <b>{student.academic_classes.group_name === "Science" ? "বিজ্ঞান" : student.academic_classes.group_name === "Commerce" ? "ব্যবসায় শিক্ষা" : student.academic_classes.group_name === "Arts" ? "মানবিক" : student.academic_classes.group_name}</b></>
                ) : currentClass?.group_name ? (
                  <> | বিভাগ: <b>{currentClass.group_name}</b></>
                ) : null}
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

            {/* Other Fees (Exam, Session, Custom, etc.) */}
            <div style={{ marginBottom: "20px", background: "var(--card-bg)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Tag size={16} /> অন্যান্য ফি এর খাতসমূহ:
                </span>
                
                <button
                  type="button"
                  onClick={() => setShowAddFeeModal(true)}
                  className="btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    fontSize: "12px",
                    background: "rgba(0, 118, 255, 0.1)",
                    color: "var(--brand-primary)",
                    border: "1px solid var(--brand-primary)",
                    borderRadius: "var(--radius-full)",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  <Plus size={14} /> নতুন খাত যুক্ত করুন
                </button>
              </div>

              {allAvailableOtherFees.length === 0 ? (
                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", padding: "6px 0" }}>
                  কোনো অতিরিক্ত ফি এর খাত যুক্ত নেই। যেকোনো ফি এর টাকা আদায় করতে উপরের <b>&quot;+ নতুন খাত যুক্ত করুন&quot;</b> বাটনে ক্লিক করুন।
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {allAvailableOtherFees.map(fee => {
                    const isChecked = selectedFees.includes(fee.id);
                    return (
                      <div
                        key={fee.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 12px",
                          background: isChecked ? "rgba(0, 112, 243, 0.08)" : "var(--bg-color)",
                          border: `1px solid ${isChecked ? "var(--brand-primary)" : "var(--border-color)"}`,
                          borderRadius: "var(--radius-sm)",
                          cursor: "pointer",
                          color: "var(--text-primary)"
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleFee(fee.id)}
                            style={{ accentColor: "var(--brand-primary)" }}
                          />
                          <span style={{ fontSize: "13.5px", fontWeight: isChecked ? "700" : "500" }}>
                            {fee.fee_type} - <b>{fee.amount} ৳</b>
                          </span>
                        </label>
                        {fee.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveCustomFee(fee.id);
                            }}
                            title="মুছে ফেলুন"
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--brand-danger)",
                              cursor: "pointer",
                              padding: "0 2px",
                              marginLeft: "4px"
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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
      {!student && (
        <div style={{ marginTop: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, color: "var(--text-secondary)" }}>
              <Clock size={18} /> সাম্প্রতিক কালেকশন (Cash in Hand)
            </h4>

            {/* Scope Filter: Current Class vs All Classes */}
            <div style={{ display: "inline-flex", background: "var(--bg-color)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <button
                type="button"
                onClick={() => {
                  setCollectionScope("current");
                  fetchRecentPayments("current");
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: collectionScope === "current" ? "700" : "500",
                  background: collectionScope === "current" ? "var(--brand-primary)" : "transparent",
                  color: collectionScope === "current" ? "white" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                এই ক্লাসের ({currentClass?.class_name || ""} {currentClass?.group_name ? `[${currentClass.group_name}]` : ""})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCollectionScope("all");
                  fetchRecentPayments("all");
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: collectionScope === "all" ? "700" : "500",
                  background: collectionScope === "all" ? "var(--brand-primary)" : "transparent",
                  color: collectionScope === "all" ? "white" : "var(--text-secondary)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                সকল ক্লাসের ক্যাশ
              </button>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "25px", background: "var(--card-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "13px" }}>
              {collectionScope === "current" 
                ? "এই ক্লাসে সম্প্রতি কোনো ফি আদায় করা হয়নি।" 
                : "বর্তমানে কোনো অবিতরণকৃত কালেকশন নেই।"}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "500px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                    <th style={{ padding: "10px" }}>রসিদ নং</th>
                    <th style={{ padding: "10px" }}>স্টুডেন্ট</th>
                    <th style={{ padding: "10px" }}>শ্রেণি ও বিভাগ</th>
                    <th style={{ padding: "10px" }}>টাকা</th>
                    <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map(pay => {
                    const studentClass = pay.students?.academic_classes;
                    return (
                      <tr key={pay.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "10px" }}>{pay.receipt_no}</td>
                        <td style={{ padding: "10px" }}>
                          <b>{pay.students?.full_name}</b> <br />
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>রোল: {pay.students?.roll_no}</span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          {studentClass ? (
                            <span>
                              {studentClass.class_name} {studentClass.group_name ? `(${studentClass.group_name})` : ""}{studentClass.section_name ? ` [${studentClass.section_name}]` : ""}
                            </span>
                          ) : (
                            <span>{currentClass?.class_name} ({currentClass?.group_name || "সাধারণ"})</span>
                          )}
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Modal: Add New Fee Head Directly From Collection Form */}
      {showAddFeeModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1100,
          padding: "16px"
        }}>
          <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "460px", padding: "24px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Plus size={18} /> নতুন ফি এর খাত যুক্ত করুন
              </h3>
              <button
                type="button"
                onClick={() => setShowAddFeeModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div style={{ marginBottom: "15px" }}>
              <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                দ্রুত সিলেক্ট করুন (ক্লিক করুন):
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["পরীক্ষার ফি", "আইডি কার্ড", "উন্নয়ন ফি", "স্কাউট ফি", "প্রবেশপত্র", "পিকনিক ফি", "প্রশংসাপত্র"].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewFeeName(tag)}
                    style={{
                      padding: "3px 8px",
                      fontSize: "11px",
                      borderRadius: "var(--radius-full)",
                      border: "1px solid var(--border-color)",
                      background: newFeeName === tag ? "var(--brand-primary)" : "var(--bg-color)",
                      color: newFeeName === tag ? "#fff" : "var(--text-primary)",
                      cursor: "pointer"
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddNewFee}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold" }}>
                  ফি / খাতের নাম *
                </label>
                <input
                  type="text"
                  value={newFeeName}
                  onChange={(e) => setNewFeeName(e.target.value)}
                  placeholder="যেমন: পরীক্ষার ফি, পিকনিক ফি, আইডি কার্ড"
                  required
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "13px", fontWeight: "bold" }}>
                  টাকার পরিমাণ (৳) *
                </label>
                <input
                  type="number"
                  value={newFeeAmount}
                  onChange={(e) => setNewFeeAmount(e.target.value)}
                  placeholder="যেমন: 150"
                  min="1"
                  required
                  style={{ width: "100%", padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ marginBottom: "20px", background: "var(--bg-color)", padding: "10px 12px", borderRadius: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px" }}>
                  <input
                    type="checkbox"
                    checked={saveFeePermanently}
                    onChange={(e) => setSaveFeePermanently(e.target.checked)}
                    style={{ accentColor: "var(--brand-primary)" }}
                  />
                  <span>এই ক্লাসের ফি তালিকায় স্থায়ীভাবে সংরক্ষণ করুন (অন্য শিক্ষার্থীদের জন্যও থাকবে)</span>
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddFeeModal(false)}
                  className="btn"
                  style={{ padding: "8px 16px", border: "1px solid var(--border-color)" }}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={addingFee}
                  className="btn btn-primary"
                  style={{ padding: "8px 20px" }}
                >
                  {addingFee ? "যুক্ত হচ্ছে..." : "যুক্ত করুন ও সিলেক্ট করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
