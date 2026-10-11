"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { X, Edit3 } from "lucide-react";

export default function EditStudentModal({ student, classInfo, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    roll_no: student?.roll_no?.toString() || "",
    full_name: student?.full_name || "",
    parent_name: student?.parent_name || "",
    parent_phone: student?.parent_phone || "",
    opening_due: student?.opening_due?.toString() || "0",
    waiver_status: student?.waiver_status || "None",
    status: student?.status || "Active"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!student?.id) return;

    if (!formData.roll_no || !formData.full_name) {
      toast.error("রোল এবং নাম দেওয়া আবশ্যক!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          roll_no: parseInt(formData.roll_no, 10),
          full_name: formData.full_name.trim(),
          parent_name: formData.parent_name ? formData.parent_name.trim() : null,
          parent_phone: formData.parent_phone ? formData.parent_phone.trim() : null,
          opening_due: parseFloat(formData.opening_due) || 0,
          waiver_status: formData.waiver_status,
          status: formData.status
        })
        .eq("id", student.id);

      if (error) {
        if (error.code === "23505") {
          throw new Error("এই রোল নম্বরটি ইতোমধ্যে এই ক্লাসে বিদ্যমান।");
        }
        throw error;
      }

      toast.success("✅ শিক্ষার্থীর তথ্য সফলভাবে আপডেট করা হয়েছে!");
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      onClose();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "15px"
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Edit3 size={20} /> শিক্ষার্থীর তথ্য এডিট করুন
            </h3>
            {classInfo && (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                ক্লাস: <b>{classInfo.class_name}</b> {classInfo.group_name ? `(${classInfo.group_name})` : ""} {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ""}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>রোল নম্বর *</label>
              <input
                type="number"
                name="roll_no"
                value={formData.roll_no}
                onChange={handleChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>শিক্ষার্থীর নাম *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>অভিভাবকের নাম</label>
            <input
              type="text"
              name="parent_name"
              value={formData.parent_name}
              onChange={handleChange}
              placeholder="পিতা / মাতার নাম"
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>মোবাইল নম্বর (WhatsApp)</label>
            <input
              type="text"
              name="parent_phone"
              value={formData.parent_phone}
              onChange={handleChange}
              placeholder="যেমন: 017XXXXXXXX"
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "flex", gap: "15px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>পূর্বের বকেয়া (৳)</label>
              <input
                type="number"
                name="opening_due"
                value={formData.opening_due}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>বৃত্তি/ছাড় সুবিধা (Waiver)</label>
              <select
                name="waiver_status"
                value={formData.waiver_status}
                onChange={handleChange}
                style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
              >
                <option value="None">নেই (সাধারণ শিক্ষার্থী)</option>
                <option value="উপবৃত্তিপ্রাপ্ত (বেতন ফ্রি)">🎓 উপবৃত্তিপ্রাপ্ত (বেতন ফ্রি)</option>
                <option value="বৃত্তিপ্রাপ্ত (বেতন ফ্রি)">🏆 বৃত্তিপ্রাপ্ত (বেতন ফ্রি)</option>
                <option value="Full Free">বিনা-বেতন (Full Free - ১০০% ছাড়)</option>
                <option value="Half Free">অর্ধ-বেতন (Half Free - ৫০% ছাড়)</option>
                <option value="Special">বিশেষ ছাড় (Special)</option>
              </select>
            </div>

          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px" }}>স্ট্যাটাস</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
            >
              <option value="Active">সক্রিয় (Active)</option>
              <option value="Inactive">নিষ্ক্রিয় (Inactive)</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button type="button" className="btn" onClick={onClose} disabled={loading} style={{ border: "1px solid var(--border-color)" }}>
              বাতিল
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "আপডেট হচ্ছে..." : "আপডেট সংরক্ষণ করুন"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
