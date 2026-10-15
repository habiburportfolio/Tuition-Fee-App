"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import toast from "react-hot-toast";

export default function FeesSetupForm({ classId, classIds, classInfo, selectedDepartment, onSelectDepartment }) {
  const { user } = useAuth();
  const { guardAction } = useLock();
  const [loading, setLoading] = useState(false);

  const targetClassIds = useMemo(() => {
    if (classIds && classIds.length > 0) return classIds;
    return classId ? [classId] : [];
  }, [classId, classIds]);

  const [feeScope, setFeeScope] = useState("all");
  const [fees, setFees] = useState([]);
  const [formData, setFormData] = useState({
    fee_type: "Monthly",
    month_name: "",
    amount: "",
  });

  const fetchFees = useCallback(async () => {
    if (targetClassIds.length === 0) return;
    const { data, error } = await supabase
      .from("fees_setup")
      .select("*, academic_classes(id, class_name, section_name, group_name)")
      .in("class_id", targetClassIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("ফি লিস্ট লোড করতে সমস্যা হয়েছে।");
    } else {
      setFees(data || []);
    }
  }, [targetClassIds]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || targetClassIds.length === 0) return;

    if (!formData.amount || isNaN(formData.amount)) {
      toast.error("সঠিক টাকার পরিমাণ দিন।");
      return;
    }

    const feeTypeFinal = formData.fee_type === "Others" && formData.custom_fee_name ? formData.custom_fee_name : formData.fee_type;
    const monthFinal = formData.fee_type === "Monthly" ? formData.month_name : null;
    const amountFinal = parseFloat(formData.amount);

    setLoading(true);
    try {
      const inserts = (feeScope === "all" && classInfo?.allVariants && classInfo.allVariants.length > 1)
        ? classInfo.allVariants.map(v => ({
            teacher_id: user.id,
            class_id: v.id,
            fee_type: feeTypeFinal,
            month_name: monthFinal,
            amount: amountFinal,
            is_active: true
          }))
        : [{
            teacher_id: user.id,
            class_id: feeScope !== "all" ? feeScope : classId,
            fee_type: feeTypeFinal,
            month_name: monthFinal,
            amount: amountFinal,
            is_active: true
          }];

      const { error } = await supabase.from("fees_setup").insert(inserts);

      if (error) throw error;

      toast.success("✅ নতুন ফি সফলভাবে যোগ করা হয়েছে!");
      setFormData({ fee_type: "Monthly", month_name: "", amount: "" });
      fetchFees();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (feeId) => {
    guardAction("ফি মুছে ফেলা", async () => {
      if (!window.confirm("আপনি কি নিশ্চিত যে এই ফি টি মুছে ফেলতে চান?")) return;
      try {
        const { error } = await supabase.from("fees_setup").delete().eq("id", feeId);
        if (error) throw error;
        toast.success("ফি সফলভাবে মুছে ফেলা হয়েছে!");
        fetchFeesForSubmit();
      } catch (error) {
        toast.error(`❌ ডিলিট এরর: ${error.message}`);
      }
    });
  };


  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <h3 style={{ color: "var(--brand-primary)", marginBottom: "15px" }}>নতুন ফি সেটআপ</h3>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "flex-end" }}>
        
        {classInfo?.allVariants && classInfo.allVariants.length > 1 && (
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>প্রযোজ্য বিভাগ</label>
            <select
              value={feeScope}
              onChange={(e) => setFeeScope(e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--brand-primary)", fontWeight: "600", fontSize: "13px" }}
            >
              <option value="all">সকল বিভাগ (All Groups)</option>
              {classInfo.allVariants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.group_name === "Science" ? "বিজ্ঞান (Science)" : v.group_name === "Commerce" ? "ব্যবসায় শিক্ষা (Commerce)" : v.group_name === "Arts" ? "মানবিক (Arts)" : (v.group_name || "সাধারণ")}
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: "1", minWidth: "150px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>ফি এর ধরণ</label>
          <select 
            name="fee_type" 
            value={formData.fee_type} 
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
          >
            <option value="Monthly">মাসিক বেতন (Monthly)</option>
            <option value="Exam">পরীক্ষার ফি (Exam Fee)</option>
            <option value="Session">সেশন ফি (Session Fee)</option>
            <option value="Practical">ল্যাব / প্র্যাক্টিকাল (Lab Fee)</option>
            <option value="Others">বিবিধ (কাস্টম নাম লিখুন)</option>
          </select>
        </div>

        {formData.fee_type === "Others" && (
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>ফি এর নাম</label>
            <input 
              type="text" 
              name="custom_fee_name" 
              value={formData.custom_fee_name || ""} 
              onChange={handleChange}
              placeholder="যেমন: পিকনিক ফি"
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
              required
            />
          </div>
        )}

        {formData.fee_type === "Monthly" && (
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>মাস</label>
            <select 
              name="month_name" 
              value={formData.month_name} 
              onChange={handleChange}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
              required
            >
              <option value="">মাস নির্বাচন করুন</option>
              <option value="January">জানুয়ারি</option>
              <option value="February">ফেব্রুয়ারি</option>
              <option value="March">মার্চ</option>
              <option value="April">এপ্রিল</option>
              <option value="May">মে</option>
              <option value="June">জুন</option>
              <option value="July">জুলাই</option>
              <option value="August">আগস্ট</option>
              <option value="September">সেপ্টেম্বর</option>
              <option value="October">অক্টোবর</option>
              <option value="November">নভেম্বর</option>
              <option value="December">ডিসেম্বর</option>
            </select>
          </div>
        )}

        <div style={{ flex: "1", minWidth: "150px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>টাকার পরিমাণ (৳)</label>
          <input 
            type="number" 
            name="amount" 
            value={formData.amount} 
            onChange={handleChange}
            placeholder="যেমন: 500"
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            required
          />
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || !classId}
          style={{ padding: "10px 20px", height: "39px" }}
        >
          {loading ? "..." : "যুক্ত করুন"}
        </button>
      </form>

      {fees.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>সংরক্ষিত ফি সমূহ</h4>
          <ul style={{ listStyle: "none", padding: 0, marginTop: "10px" }}>
            {fees.map((fee) => (
              <li key={fee.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid var(--border-color)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{fee.fee_type} {fee.month_name ? `(${fee.month_name})` : ''}</span>
                  {fee.academic_classes?.group_name && (
                    <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "var(--radius-full)", background: "rgba(0, 112, 243, 0.12)", color: "var(--brand-primary)", fontWeight: "bold" }}>
                      {fee.academic_classes.group_name === "Science" ? "বিজ্ঞান" : fee.academic_classes.group_name === "Commerce" ? "ব্যবসায় শিক্ষা" : fee.academic_classes.group_name === "Arts" ? "মানবিক" : fee.academic_classes.group_name}
                    </span>
                  )}
                </span>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                  <span style={{ fontWeight: "bold" }}>{fee.amount} ৳</span>
                  <button 
                    onClick={() => handleDelete(fee.id)}
                    style={{ background: "none", border: "none", color: "var(--brand-danger)", cursor: "pointer", fontSize: "12px", padding: "4px 8px", borderRadius: "4px", border: "1px solid var(--brand-danger)" }}
                  >
                    ডিলিট
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
