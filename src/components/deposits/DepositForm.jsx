"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Landmark, CheckSquare, Square, Upload } from "lucide-react";

export default function DepositForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [unDeposited, setUnDeposited] = useState([]);
  const [depositHistory, setDepositHistory] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  
  const [formData, setFormData] = useState({
    deposit_channel: "Bank",
    bank_name: "",
    slip_number: "",
  });

  useEffect(() => {
    const fetchUnDeposited = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("payments")
        .select("*, students(full_name, roll_no)")
        .eq("teacher_id", user.id)
        .eq("is_voided", false)
        .is("deposit_id", null)
        .order("paid_at", { ascending: false });

      if (!error && data) {
        setUnDeposited(data);
      }
    };

    const fetchHistory = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("deposits")
        .select("*")
        .eq("teacher_id", user.id)
        .order("deposited_at", { ascending: false })
        .limit(10);
      if (data) setDepositHistory(data);
    };

    fetchUnDeposited();
    fetchHistory();
  }, [user]);

  // We need to recreate fetchUnDeposited below if it is used outside.
  const fetchUnDepositedForSubmit = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("payments")
      .select("*, students(full_name, roll_no)")
      .eq("teacher_id", user.id)
      .eq("is_voided", false)
      .is("deposit_id", null)
      .order("paid_at", { ascending: false });
    if (data) setUnDeposited(data);
    
    const { data: hist } = await supabase
      .from("deposits")
      .select("*")
      .eq("teacher_id", user.id)
      .order("deposited_at", { ascending: false })
      .limit(10);
    if (hist) setDepositHistory(hist);
  };

  const togglePayment = (id) => {
    setSelectedPayments(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedPayments.length === unDeposited.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(unDeposited.map(p => p.id));
    }
  };

  const totalSelectedAmount = unDeposited
    .filter(p => selectedPayments.includes(p.id))
    .reduce((sum, p) => sum + Number(p.amount_paid), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (selectedPayments.length === 0) {
      toast.error("জমা দেওয়ার জন্য অন্তত একটি কালেকশন নির্বাচন করুন!");
      return;
    }

    if (formData.deposit_channel === "Bank" && !formData.bank_name) {
      toast.error("ব্যাংকের নাম উল্লেখ করুন।");
      return;
    }

    setLoading(true);
    try {
      // 1. Create deposit record
      const { data: deposit, error: depositError } = await supabase
        .from("deposits")
        .insert([{
          teacher_id: user.id,
          deposit_channel: formData.deposit_channel,
          bank_name: formData.bank_name || null,
          slip_number: formData.slip_number || null,
          total_amount: totalSelectedAmount
        }])
        .select()
        .single();

      if (depositError) throw depositError;

      // 2. Update selected payments to link this deposit_id
      const { error: updateError } = await supabase
        .from("payments")
        .update({ deposit_id: deposit.id })
        .in("id", selectedPayments);

      if (updateError) throw updateError;

      toast.success(`✅ সফলভাবে ${totalSelectedAmount} ৳ জমা করা হয়েছে!`);
      
      // Reset form
      setFormData({ deposit_channel: "Bank", bank_name: "", slip_number: "" });
      setSelectedPayments([]);
      fetchUnDepositedForSubmit();

    } catch (error) {
      toast.error(`❌ জমা করতে সমস্যা: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDeposit = async (depositId) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই জমা রেকর্ডটি মুছে ফেলতে চান? (এর সাথে যুক্ত পেমেন্টগুলো মুছে যাবে না, সেগুলো আবার 'হাতে থাকা ক্যাশ' এ চলে আসবে)")) return;
    
    try {
      // 1. Unlink payments
      const { error: unlinkError } = await supabase
        .from("payments")
        .update({ deposit_id: null })
        .eq("deposit_id", depositId);
      
      if (unlinkError) throw unlinkError;

      // 2. Delete deposit record
      const { error: delError } = await supabase
        .from("deposits")
        .delete()
        .eq("id", depositId);
        
      if (delError) {
        // If RLS prevents delete, it will fail here. We catch it.
        throw delError;
      }
      
      toast.success("জমা রেকর্ডটি সফলভাবে মুছে ফেলা হয়েছে!");
      fetchUnDepositedForSubmit();
    } catch (error) {
      toast.error(`❌ ডিলিট করতে সমস্যা: ${error.message}`);
    }
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h3 style={{ color: "var(--brand-primary)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <Landmark /> কালেকশন জমা (Deposit)
      </h3>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "30px" }}>
        
        {/* Left Side: Un-deposited List */}
        <div style={{ flex: "1 1 350px" }}>
          <h4 style={{ marginBottom: "15px" }}>হাতে থাকা ক্যাশ (Cash in Hand)</h4>
          
          {unDeposited.length === 0 ? (
            <p style={{ color: "var(--text-secondary)" }}>জমা দেওয়ার মতো কোনো ক্যাশ নেই।</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", padding: "10px", background: "var(--bg-color)", borderRadius: "var(--radius-sm)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "bold" }}>
                  <input type="checkbox" checked={selectedPayments.length === unDeposited.length} onChange={toggleAll} style={{ width: "16px", height: "16px", accentColor: "var(--brand-primary)" }} /> 
                  সব নির্বাচন করুন
                </label>
                <span style={{ fontWeight: "bold", color: "var(--brand-primary)" }}>{unDeposited.length} টি</span>
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)" }}>
                {unDeposited.map(pay => (
                  <label key={pay.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input 
                        type="checkbox" 
                        checked={selectedPayments.includes(pay.id)}
                        onChange={() => togglePayment(pay.id)}
                        style={{ width: "16px", height: "16px", accentColor: "var(--brand-primary)" }}
                      />
                      <div>
                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>{pay.students?.full_name} (রোল: {pay.students?.roll_no})</div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>রসিদ: {pay.receipt_no}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: "bold", color: "var(--brand-success)" }}>{pay.amount_paid} ৳</div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right Side: Deposit Form */}
        <div style={{ flex: "1 1 300px" }}>
          <form onSubmit={handleSubmit} style={{ background: "var(--bg-color)", padding: "20px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>জমা দেওয়ার মাধ্যম</label>
              <select 
                value={formData.deposit_channel}
                onChange={(e) => setFormData({ ...formData, deposit_channel: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
              >
                <option value="Bank">ব্যাংক (Bank)</option>
                <option value="bKash/Nagad">বিকাশ/নগদ (Mobile Banking)</option>
                <option value="Headmaster">প্রধান শিক্ষক (Cash)</option>
              </select>
            </div>

            {formData.deposit_channel === "Bank" && (
              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>ব্যাংকের নাম</label>
                <select 
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
                >
                  <option value="">ব্যাংক নির্বাচন করুন</option>
                  <option value="Sonali Bank">Sonali Bank</option>
                  <option value="Janata Bank">Janata Bank</option>
                  <option value="Agrani Bank">Agrani Bank</option>
                  <option value="Rupali Bank">Rupali Bank</option>
                  <option value="Islami Bank">Islami Bank</option>
                  <option value="Dutch-Bangla Bank (DBBL)">Dutch-Bangla Bank (DBBL)</option>
                  <option value="BRAC Bank">BRAC Bank</option>
                  <option value="City Bank">City Bank</option>
                  <option value="Pubali Bank">Pubali Bank</option>
                  <option value="Other">অন্যান্য (Other)</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>স্লিপ/ট্রানজ্যাকশন নম্বর (ঐচ্ছিক)</label>
              <input 
                type="text" 
                value={formData.slip_number}
                onChange={(e) => setFormData({ ...formData, slip_number: e.target.value })}
                placeholder="স্লিপ বা ট্রানজ্যাকশন আইডি"
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
              />
            </div>

            <div style={{ borderTop: "2px dashed var(--border-color)", paddingTop: "15px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ color: "var(--text-secondary)" }}>মোট নির্বাচিত:</span>
                <span style={{ fontWeight: "bold" }}>{selectedPayments.length} টি</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <span style={{ color: "var(--text-secondary)" }}>মোট জমার পরিমাণ:</span>
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "var(--brand-primary)" }}>{totalSelectedAmount} ৳</span>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || selectedPayments.length === 0}
              style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", padding: "12px" }}
            >
              <Upload size={18} /> {loading ? "জমা হচ্ছে..." : "ফাইনাল জমা দিন"}
            </button>
          </form>
        </div>
      </div>

      {/* Deposit History */}
      <div style={{ marginTop: "40px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
        <h4 style={{ marginBottom: "15px", color: "var(--brand-primary)" }}>সাম্প্রতিক জমা রেকর্ড (Deposit History)</h4>
        
        {depositHistory.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>কোনো জমা রেকর্ড পাওয়া যায়নি।</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>তারিখ</th>
                  <th style={{ padding: "10px" }}>মাধ্যম</th>
                  <th style={{ padding: "10px" }}>ব্যাংক/বিস্তারিত</th>
                  <th style={{ padding: "10px" }}>পরিমাণ</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {depositHistory.map(dep => (
                  <tr key={dep.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px" }}>{new Date(dep.deposited_at).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: "10px", fontWeight: "bold" }}>{dep.deposit_channel}</td>
                    <td style={{ padding: "10px" }}>
                      {dep.bank_name || "-"}
                      {dep.slip_number && <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>স্লিপ: {dep.slip_number}</div>}
                    </td>
                    <td style={{ padding: "10px", fontWeight: "bold", color: "var(--brand-success)" }}>{dep.total_amount} ৳</td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <button 
                        onClick={() => handleDeleteDeposit(dep.id)}
                        className="btn"
                        style={{ padding: "4px 8px", fontSize: "12px", background: "none", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)" }}
                      >
                        মুছে ফেলুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
