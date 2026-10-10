"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Search, User, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import ReceiptModal from "./ReceiptModal";

export default function CollectionForm({ classId }) {
  const { user, userRole } = useAuth();
  const [rollNo, setRollNo] = useState("");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Payment states
  const [fees, setFees] = useState([]);
  const [selectedFees, setSelectedFees] = useState([]);
  const [amountPaid, setAmountPaid] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // Post-payment & History
  const [receiptData, setReceiptData] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    const fetchRecentPayments = async () => {
      if (!classId) return;
      const { data } = await supabase
        .from("payments")
        .select("*, students(full_name, roll_no)")
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
      .select("*, students(full_name, roll_no)")
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
        setAmountPaid(data.opening_due > 0 ? data.opening_due.toString() : "");
      }
    } catch (error) {
      toast.error(`❌ সার্চ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total payable
  const selectedFeesTotal = selectedFees.reduce((sum, feeId) => {
    const fee = fees.find(f => f.id === feeId);
    return sum + (fee ? Number(fee.amount) : 0);
  }, 0);
  
  const totalPayable = (student ? Number(student.opening_due) : 0) + selectedFeesTotal;

  const [discount, setDiscount] = useState("");
  const [fine, setFine] = useState("");

  // Update input amount automatically when fees, discount, or fine are changed
  useEffect(() => {
    if (student) {
      const discountVal = parseFloat(discount) || 0;
      const fineVal = parseFloat(fine) || 0;
      const netPayable = totalPayable + fineVal - discountVal;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmountPaid(Math.max(netPayable, 0).toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFeesTotal, student, discount, fine]);

  const toggleFee = (feeId) => {
    setSelectedFees(prev => 
      prev.includes(feeId) ? prev.filter(id => id !== feeId) : [...prev, feeId]
    );
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!user || !student) return;

    const paid = parseFloat(amountPaid) || 0;
    const discountValue = parseFloat(discount) || 0;
    const fineValue = parseFloat(fine) || 0;

    if (paid <= 0 && selectedFees.length === 0 && discountValue <= 0) {
      toast.error("টাকার পরিমাণ অথবা ফি নির্বাচন করুন।");
      return;
    }

    const netPayable = totalPayable + fineValue;
    const dueRemaining = netPayable - paid - discountValue;
    if (dueRemaining < 0) {
      toast.error("পরিশোধিত টাকা ও ডিসকাউন্ট মোট পাওনার চেয়ে বেশি হতে পারবে না!");
      return;
    }

    setProcessing(true);
    try {
      const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
      const paymentDataToSave = {
        teacher_id: user.id,
        student_id: student.id,
        amount_paid: paid,
        due_remaining: dueRemaining,
        receipt_no: receiptNo,
        payment_method: "Cash"
      };

      if (!navigator.onLine) {
        const { saveOfflinePayment } = await import("@/lib/offlineSync");
        saveOfflinePayment(paymentDataToSave, student);
        toast.success(`অফলাইনে সেভ করা হয়েছে। ইন্টারনেট আসলে সিঙ্ক হবে। রসিদ: ${receiptNo}`);
      } else {
        // 1. Insert Payment Record
        const { data: paymentData, error: paymentError } = await supabase
          .from("payments")
          .insert([paymentDataToSave])
          .select()
          .single();

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
      const selectedFeesDetails = selectedFees.map(id => {
        const f = fees.find(x => x.id === id);
        return f ? { name: `${f.fee_type} ${f.month_name ? `(${f.month_name})` : ''}`, amount: f.amount } : null;
      }).filter(Boolean);

      setReceiptData({
        student,
        payment: { amount_paid: paid, due_remaining: dueRemaining, receipt_no: receiptNo },
        selectedFeesDetails,
        totalPayable: netPayable,
        discount: discountValue,
        fine: fineValue
      });

      setSelectedFees([]);
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

  const handleVoidPayment = async (payment) => {
    const reason = window.prompt("ভুল এন্ট্রি বাতিলের কারণ লিখুন:");
    if (!reason) return;

    try {
      // 1. Mark payment as voided
      const { error: voidError } = await supabase
        .from("payments")
        .update({ is_voided: true, void_reason: reason })
        .eq("id", payment.id);

      if (voidError) throw voidError;

      // 2. Fetch current student due
      const { data: currentStudent, error: fetchError } = await supabase
        .from("students")
        .select("opening_due")
        .eq("id", payment.student_id)
        .single();
        
      if (fetchError) throw fetchError;

      // 3. Revert due (current due + amount that was paid)
      // Note: If discount was given, the revert amount isn't accurate without storing discount! 
      // We will revert only amount_paid here as a simple approach for now.
      const revertedDue = Number(currentStudent.opening_due) + Number(payment.amount_paid);
      const { error: revertError } = await supabase
        .from("students")
        .update({ opening_due: revertedDue })
        .eq("id", payment.student_id);

      if (revertError) throw revertError;

      toast.success("পেমেন্ট সফলভাবে বাতিল করা হয়েছে।");
      fetchRecentPaymentsForSubmit();
      
      if (student && student.id === payment.student_id) {
        setStudent({ ...student, opening_due: revertedDue });
      }

    } catch (error) {
      toast.error(`❌ বাতিল করতে সমস্যা: ${error.message}`);
    }
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h3 style={{ color: "var(--brand-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <CreditCard /> ফি কালেকশন
      </h3>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <div style={{ flex: "1", position: "relative" }}>
          <Search style={{ position: "absolute", left: "10px", top: "12px", color: "var(--text-secondary)" }} size={20} />
          <input 
            type="number" 
            placeholder="রোল নম্বর লিখে এন্টার চাপুন..." 
            value={rollNo}
            onChange={(e) => setRollNo(e.target.value)}
            style={{ 
              width: "100%", padding: "12px 12px 12px 40px", 
              fontSize: "18px", borderRadius: "var(--radius-md)", 
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px" }}>
            
            <div>
              <h4 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "20px", marginBottom: "5px" }}>
                <User size={24} color="var(--brand-primary)" /> {student.full_name}
              </h4>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                রোল: {student.roll_no} | স্ট্যাটাস: 
                <strong style={{ color: student.status === "Active" ? "var(--brand-success)" : "var(--brand-danger)", marginLeft: "5px" }}>
                  {student.status}
                </strong>
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "5px" }}>পূর্বের বকেয়া</p>
              <h2 style={{ color: student.opening_due > 0 ? "var(--brand-danger)" : "var(--text-primary)", fontSize: "24px" }}>
                {student.opening_due} ৳
              </h2>
            </div>
            
          </div>

          <div style={{ marginTop: "30px", borderTop: "2px dashed var(--border-color)", paddingTop: "20px" }}>
            <h4 style={{ marginBottom: "15px" }}>নতুন ফি নির্বাচন করুন:</h4>
            
            {fees.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>কোনো ফি সেটআপ করা নেই।</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                {fees.map(fee => (
                  <label key={fee.id} style={{ 
                    display: "flex", alignItems: "center", gap: "8px", 
                    padding: "8px 12px", background: "var(--card-bg)", 
                    border: `1px solid ${selectedFees.includes(fee.id) ? 'var(--brand-primary)' : 'var(--border-color)'}`,
                    borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-primary)"
                  }}>
                    <input 
                      type="checkbox" 
                      checked={selectedFees.includes(fee.id)}
                      onChange={() => toggleFee(fee.id)}
                      style={{ accentColor: "var(--brand-primary)" }}
                    />
                    <span style={{ fontSize: "14px" }}>
                      {fee.fee_type} {fee.month_name ? `(${fee.month_name})` : ''} - <b>{fee.amount} ৳</b>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} style={{ display: "flex", gap: "15px", alignItems: "flex-end", background: "var(--card-bg)", padding: "15px", borderRadius: "var(--radius-md)", border: "1px solid var(--brand-success)", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold", color: "var(--text-primary)" }}>সর্বমোট পাওনা</label>
                <input type="text" value={`${totalPayable} ৳`} readOnly style={{ width: "100%", padding: "10px", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", fontWeight: "bold" }} />
              </div>
              
              <div style={{ flex: "1", minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold", color: "var(--text-primary)" }}>জরিমানা (Fine)</label>
                <input 
                  type="number" 
                  value={fine}
                  onChange={(e) => setFine(e.target.value)}
                  placeholder="0"
                  style={{ width: "100%", padding: "10px", border: "1px solid var(--brand-warning)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "16px" }}
                />
              </div>

              <div style={{ flex: "1", minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold", color: "var(--text-primary)" }}>ডিসকাউন্ট (Discount)</label>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  style={{ width: "100%", padding: "10px", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "16px" }}
                />
              </div>

              <div style={{ flex: "1", minWidth: "120px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold", color: "var(--brand-success)" }}>গৃহীত টাকা (Received)</label>
                <input 
                  type="number" 
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  style={{ width: "100%", padding: "10px", border: "2px solid var(--brand-success)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)", fontSize: "16px", fontWeight: "bold" }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={processing} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px" }}>
                <CheckCircle size={18} /> {processing ? "প্রসেসিং..." : "গ্রহণ করুন"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Recent Transactions (Task 3.5 - Void capability) */}
      {!student && recentPayments.length > 0 && (
        <div style={{ marginTop: "40px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "15px", color: "var(--text-secondary)" }}>
            <Clock size={18} /> সাম্প্রতিক কালেকশন (Cash in Hand)
          </h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", minWidth: "400px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                <th style={{ padding: "10px" }}>রসিদ নং</th>
                <th style={{ padding: "10px" }}>স্টুডেন্ট</th>
                <th style={{ padding: "10px" }}>টাকা</th>
                <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map(pay => (
                <tr key={pay.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "10px" }}>{pay.receipt_no}</td>
                  <td style={{ padding: "10px" }}>{pay.students?.full_name} (রোল: {pay.students?.roll_no})</td>
                  <td style={{ padding: "10px", fontWeight: "bold", color: "var(--brand-success)" }}>{pay.amount_paid} ৳</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    {userRole !== 'assistant' && (
                      <button 
                        onClick={() => handleVoidPayment(pay)}
                        className="btn" 
                        style={{ padding: "4px 8px", fontSize: "12px", background: "white", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <XCircle size={14} /> বাতিল (Void)
                      </button>
                    )}
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
