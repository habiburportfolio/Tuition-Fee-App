"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Wallet, Landmark, AlertCircle, TrendingUp, Printer } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import ReceiptModal from "../collection/ReceiptModal";
import PrintReportsModal from "./PrintReportsModal";

export default function Dashboard({ classId, classInfo }) {
  const { user } = useAuth();
  const [currentClass, setCurrentClass] = useState(classInfo || null);
  
  const [stats, setStats] = useState({
    totalDue: 0,
    cashInHand: 0,
    totalDeposited: 0,
    totalCollection: 0,
    collections: [],
    deposits: []
  });

  const [loading, setLoading] = useState(true);
  const [receiptDataToPrint, setReceiptDataToPrint] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(false);

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || !classId) return;
      setLoading(true);
      
      try {
        // 1. Total Due
        const { data: students } = await supabase
          .from("students")
          .select("id, opening_due")
          .eq("class_id", classId);
          
        const totalDue = students?.reduce((sum, s) => sum + Number(s.opening_due), 0) || 0;

        // 2. Cash In Hand (Payments not deposited)
        const { data: cashPayments } = await supabase
          .from("payments")
          .select("amount_paid")
          .eq("is_voided", false)
          .is("deposit_id", null);
          
        const cashInHand = cashPayments?.reduce((sum, p) => sum + Number(p.amount_paid), 0) || 0;

        // 3. Total Deposited
        // Wait, deposits are cross-class, but we might just show total for the teacher or we need to filter by class? 
        // Deposits do not have class_id, they just group payments.
        // Let's get deposited payments for this class.
        const { data: allPayments } = await supabase
          .from("payments")
          .select("amount_paid, deposit_id")
          .eq("is_voided", false);

        // This requires getting payments for the students in this class.
        // A better way is to filter payments by student_id in this class.
        const studentIds = students ? students.map(s => s.id) : [];
        let deposited = 0;
        let totalColl = 0;
        
        let collectionsHistory = [];
        let depositsHistory = [];
        
        if (studentIds.length > 0) {
          const { data: classPayments } = await supabase
            .from("payments")
            .select("amount_paid, due_remaining, deposit_id, receipt_no, paid_at, id, students(id, full_name, roll_no, parent_phone)")
            .in("student_id", studentIds)
            .eq("is_voided", false)
            .order("paid_at", { ascending: false });

          if (classPayments) {
            totalColl = classPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
            deposited = classPayments.filter(p => p.deposit_id !== null).reduce((sum, p) => sum + Number(p.amount_paid), 0);
            collectionsHistory = classPayments.slice(0, 10);
          }
        }

        // Fetch Recent Deposits (Top 10)
        const { data: depositsData } = await supabase
          .from("deposits")
          .select("id, deposited_at, slip_number, total_amount")
          .order("deposited_at", { ascending: false })
          .limit(10);
          
        if (depositsData) {
          depositsHistory = depositsData;
        }

        setStats({
          totalDue,
          cashInHand,
          totalDeposited: deposited,
          totalCollection: totalColl,
          collections: collectionsHistory,
          deposits: depositsHistory
        });

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, classId]);

  const [searchQuery, setSearchQuery] = useState("");

  const handleEditPayment = async (payment) => {
    const newAmount = window.prompt(`নতুন টাকার পরিমাণ লিখুন (আগের পরিমাণ: ${payment.amount_paid} ৳):`, payment.amount_paid);
    if (!newAmount || isNaN(newAmount) || newAmount === payment.amount_paid.toString()) return;
    
    const diff = Number(payment.amount_paid) - Number(newAmount); 
    
    try {
      const { error: payErr } = await supabase.from("payments").update({ amount_paid: newAmount }).eq("id", payment.id);
      if (payErr) throw payErr;
      
      const { data: st, error: stErr } = await supabase.from("students").select("opening_due").eq("id", payment.students.id).single();
      if (stErr) throw stErr;
      
      const newDue = Number(st.opening_due) + diff;
      
      await supabase.from("students").update({ opening_due: newDue }).eq("id", payment.students.id);
      await supabase.from("payments").update({ due_remaining: newDue }).eq("id", payment.id);
      
      alert("পেমেন্ট সফলভাবে আপডেট করা হয়েছে!");
      window.location.reload();
    } catch(err) {
      alert(`এরর: ${err.message}`);
    }
  };

  const handleEditDeposit = async (deposit) => {
    const newAmount = window.prompt(`নতুন জমার পরিমাণ লিখুন (আগের পরিমাণ: ${deposit.total_amount} ৳):`, deposit.total_amount);
    if (!newAmount || isNaN(newAmount) || newAmount === deposit.total_amount.toString()) return;
    
    try {
      const { error } = await supabase.from("deposits").update({ total_amount: newAmount }).eq("id", deposit.id);
      if (error) throw error;
      
      alert("জমার রেকর্ড সফলভাবে আপডেট করা হয়েছে!");
      window.location.reload();
    } catch(err) {
      alert(`এরর: ${err.message}`);
    }
  };

  const handlePrintReceipt = (payment) => {
    setReceiptDataToPrint({
      student: payment.students,
      classInfo: currentClass,
      payment: { amount_paid: payment.amount_paid, due_remaining: payment.due_remaining, receipt_no: payment.receipt_no },
      selectedFeesDetails: null, // Custom fees aren't stored in DB, will show fallback
      totalPayable: Number(payment.amount_paid) + Number(payment.due_remaining)
    });
  };

  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>লোড হচ্ছে...</div>;
  }

  // Filter collections based on search query
  const filteredCollections = stats.collections?.filter(payment => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    const matchName = payment.students?.full_name?.toLowerCase().includes(lowerQuery);
    const matchRoll = payment.students?.roll_no?.toString().includes(lowerQuery);
    const matchReceipt = payment.receipt_no?.toLowerCase().includes(lowerQuery);
    return matchName || matchRoll || matchReceipt;
  }) || [];

  const statCards = [
    {
      title: "হাতে থাকা ক্যাশ",
      amount: stats.cashInHand,
      icon: <Wallet size={28} color="var(--brand-warning)" />,
      color: "var(--brand-warning)",
      bg: "#FFF9E6"
    },
    {
      title: "ব্যাংকে জমা",
      amount: stats.totalDeposited,
      icon: <Landmark size={28} color="var(--brand-success)" />,
      color: "var(--brand-success)",
      bg: "#E6F7ED"
    },
    {
      title: "সর্বমোট কালেকশন",
      amount: stats.totalCollection,
      icon: <TrendingUp size={28} color="var(--brand-primary)" />,
      color: "var(--brand-primary)",
      bg: "#E6F0FF"
    },
    {
      title: "সর্বমোট বকেয়া (Due)",
      amount: stats.totalDue,
      icon: <AlertCircle size={28} color="var(--brand-danger)" />,
      color: "var(--brand-danger)",
      bg: "#FFE6E6"
    }
  ];

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ color: "var(--text-primary)", margin: 0 }}>ফাইন্যান্সিয়াল ওভারভিউ</h3>
        <button 
          onClick={() => setShowReportsModal(true)}
          className="btn btn-primary" 
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Printer size={18} /> রিপোর্ট প্রিন্ট করুন
        </button>
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
        {statCards.map((card, index) => (
          <div key={index} className="card animate-fade-in" style={{ display: "flex", alignItems: "center", gap: "18px", padding: "24px", animationDelay: `${index * 0.1}s` }}>
            <div style={{ padding: "16px", borderRadius: "var(--radius-full)", backgroundColor: card.bg, display: "flex", boxShadow: "0 4px 10px rgba(0,0,0,0.05)" }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "600" }}>{card.title}</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: card.color, letterSpacing: "-0.5px" }}>{card.amount} ৳</div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Visual Analytics Chart */}
      <div className="card" style={{ marginTop: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h4 style={{ color: "var(--brand-primary)", marginBottom: "15px" }}>কালেকশন বনাম বকেয়া (Overview)</h4>
        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            {stats.totalCollection === 0 && stats.totalDue === 0 ? (
              <PieChart>
                <Pie
                  data={[{ name: "কোনো ডাটা নেই", value: 1 }]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value"
                >
                  <Cell fill="var(--border-color)" />
                </Pie>
                <Tooltip formatter={() => "0 ৳"} />
              </PieChart>
            ) : (
              <PieChart>
                <Pie
                  data={[
                    { name: "কালেকশন", value: stats.totalCollection },
                    { name: "বকেয়া", value: stats.totalDue }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="var(--brand-success)" />
                  <Cell fill="var(--brand-danger)" />
                </Pie>
                <Tooltip formatter={(value) => `${value} ৳`} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "10px", fontSize: "14px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={{ width: 12, height: 12, backgroundColor: "var(--brand-success)", borderRadius: "50%" }}></span> কালেকশন: {stats.totalCollection} ৳</span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><span style={{ width: 12, height: 12, backgroundColor: "var(--brand-danger)", borderRadius: "50%" }}></span> বকেয়া: {stats.totalDue} ৳</span>
        </div>
      </div>

      <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        <div className="card animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
            <h4 style={{ color: "var(--brand-primary)", margin: 0, fontSize: "18px" }}>স্টুডেন্ট কালেকশন রেকর্ড</h4>
            <input 
              type="text" 
              placeholder="নাম, রোল বা রসিদ নং দিয়ে খুঁজুন..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--border-color)", fontSize: "14px", width: "100%", maxWidth: "250px", backgroundColor: "var(--bg-color)" }}
            />
          </div>
          
          <div style={{ maxHeight: "350px", overflowX: "auto", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>তারিখ</th>
                  <th style={{ padding: "10px" }}>স্টুডেন্ট</th>
                  <th style={{ padding: "10px" }}>বিভাগ (Group)</th>
                  <th style={{ padding: "10px" }}>রসিদ নং</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>টাকা</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length > 0 ? (
                  filteredCollections.map(payment => (
                    <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px" }}>{new Date(payment.paid_at).toLocaleDateString('bn-BD')}</td>
                      <td style={{ padding: "10px" }}>
                        <b>{payment.students?.full_name}</b> <br/>
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>রোল: {payment.students?.roll_no}</span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        {currentClass?.group_name ? (
                          <span style={{ 
                            padding: "2px 8px", 
                            borderRadius: "var(--radius-full)", 
                            fontSize: "11px", 
                            fontWeight: "700",
                            backgroundColor: currentClass.group_name === "Science" ? "rgba(0, 112, 243, 0.12)" : currentClass.group_name === "Commerce" ? "rgba(39, 174, 96, 0.12)" : "rgba(142, 68, 173, 0.12)",
                            color: currentClass.group_name === "Science" ? "#0070f3" : currentClass.group_name === "Commerce" ? "#27ae60" : "#8e44ad"
                          }}>
                            {currentClass.group_name}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>সাধারণ</span>
                        )}
                      </td>
                      <td style={{ padding: "10px" }}>{payment.receipt_no}</td>
                      <td style={{ padding: "10px", textAlign: "right", color: "var(--brand-success)", fontWeight: "bold" }}>{payment.amount_paid} ৳</td>
                      <td style={{ padding: "10px", textAlign: "right", display: "flex", gap: "5px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleEditPayment(payment)} style={{ background: "none", border: "1px solid var(--brand-warning)", color: "var(--brand-warning)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                        <button onClick={() => handlePrintReceipt(payment)} style={{ background: "none", border: "1px solid var(--brand-primary)", color: "var(--brand-primary)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>Print</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)" }}>কোনো রেকর্ড পাওয়া যায়নি</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <h4 style={{ marginBottom: "20px", color: "var(--brand-success)", fontSize: "18px" }}>বিদ্যালয়ে জমা রেকর্ড</h4>
          <div style={{ maxHeight: "350px", overflowX: "auto", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>তারিখ</th>
                  <th style={{ padding: "10px" }}>স্লিপ/ভাউচার নং</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>টাকা</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {stats.deposits?.length > 0 ? (
                  stats.deposits.map(deposit => (
                    <tr key={deposit.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px" }}>{new Date(deposit.deposited_at).toLocaleDateString('bn-BD')}</td>
                      <td style={{ padding: "10px" }}>{deposit.slip_number || '-'}</td>
                      <td style={{ padding: "10px", textAlign: "right", color: "var(--brand-success)", fontWeight: "bold" }}>{deposit.total_amount} ৳</td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button onClick={() => handleEditDeposit(deposit)} style={{ background: "none", border: "1px solid var(--brand-warning)", color: "var(--brand-warning)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>Edit</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)" }}>কোনো রেকর্ড নেই</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {receiptDataToPrint && (
        <ReceiptModal 
          receiptData={receiptDataToPrint} 
          onClose={() => setReceiptDataToPrint(null)} 
        />
      )}

      {showReportsModal && (
        <PrintReportsModal
          classId={classId}
          classInfo={currentClass}
          onClose={() => setShowReportsModal(false)}
        />
      )}
    </div>
  );
}
