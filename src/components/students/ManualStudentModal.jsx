"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { X, UserPlus } from "lucide-react";

export default function ManualStudentModal({ classId, classInfo, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    roll_no: "",
    full_name: "",
    parent_name: "",
    parent_phone: "",
    opening_due: "0",
    waiver_status: "None"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !classId) return;

    if (!formData.roll_no || !formData.full_name) {
      toast.error("রোল এবং নাম দেওয়া আবশ্যক!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("students").insert([{
        teacher_id: user.id,
        class_id: classId,
        roll_no: parseInt(formData.roll_no),
        full_name: formData.full_name,
        parent_name: formData.parent_name || null,
        parent_phone: formData.parent_phone || null,
        opening_due: parseFloat(formData.opening_due) || 0,
        waiver_status: formData.waiver_status,
      }]);

      if (error) {
        if (error.code === "23505") throw new Error("এই রোল নম্বরটি ইতোমধ্যে এই ক্লাসে বিদ্যমান।");
        throw error;
      }

      toast.success("✅ স্টুডেন্ট সফলভাবে যোগ করা হয়েছে!");
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div className="card" style={{ width: "90%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <UserPlus size={20} /> নতুন স্টুডেন্ট যোগ করুন
            </h3>
            {classInfo && (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                ক্লাস: <b>{classInfo.class_name}</b> {classInfo.group_name ? `(${classInfo.group_name})` : ''} {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>রোল নম্বর *</label>
              <input type="number" name="roll_no" value={formData.roll_no} onChange={handleChange} required style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>শিক্ষার্থীর নাম *</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>অভিভাবকের নাম (ঐচ্ছিক)</label>
            <input type="text" name="parent_name" value={formData.parent_name} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>মোবাইল নম্বর (ঐচ্ছিক, WhatsApp এর জন্য)</label>
            <input type="text" name="parent_phone" value={formData.parent_phone} onChange={handleChange} placeholder="যেমন: 017XXXXXXXX" style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>পূর্বের বকেয়া (৳)</label>
              <input type="number" name="opening_due" value={formData.opening_due} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>বৃত্তি/ছাড় (Waiver)</label>
              <select name="waiver_status" value={formData.waiver_status} onChange={handleChange} style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                <option value="None">নেই (None)</option>
                <option value="Half Free">অর্ধ-বেতন (Half Free)</option>
                <option value="Full Free">বিনা-বেতন (Full Free)</option>
                <option value="Special">বিশেষ ছাড় (Special)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading}>বাতিল</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "সংরক্ষণ করা হচ্ছে..." : "সংরক্ষণ করুন"}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
