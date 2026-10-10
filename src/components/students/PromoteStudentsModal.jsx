"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { X, ArrowRight } from "lucide-react";

export default function PromoteStudentsModal({ currentClassId, teacherId, students, onClose }) {
  const [classes, setClasses] = useState([]);
  const [targetClassId, setTargetClassId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchClasses = async () => {
      const { data } = await supabase
        .from("academic_classes")
        .select("*")
        .eq("teacher_id", teacherId)
        .neq("id", currentClassId)
        .order("session_year", { ascending: false });
      if (data) setClasses(data);
    };
    fetchClasses();
  }, [teacherId, currentClassId]);

  const handlePromote = async () => {
    if (!targetClassId) return toast.error("টার্গেট ক্লাস নির্বাচন করুন");
    if (!students || students.length === 0) return toast.error("এই ক্লাসে কোনো স্টুডেন্ট নেই");
    
    setLoading(true);
    try {
      const newStudents = students.map(s => ({
        teacher_id: teacherId,
        class_id: targetClassId,
        roll_no: s.roll_no,
        full_name: s.full_name,
        parent_name: s.parent_name,
        parent_phone: s.parent_phone,
        opening_due: s.opening_due, // Carry over due
        waiver_status: s.waiver_status,
        status: s.status
      }));

      const { error } = await supabase.from("students").insert(newStudents);
      if (error) throw error;
      
      toast.success("সব স্টুডেন্ট সফলভাবে নতুন ক্লাসে প্রোমোট হয়েছে!");
      onClose();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "500px", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: "20px", top: "20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
          <X size={24} />
        </button>
        
        <h3 style={{ marginBottom: "20px", color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
          <ArrowRight /> স্টুডেন্ট প্রোমোট করুন
        </h3>

        <div style={{ marginBottom: "20px" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "15px" }}>
            এই ক্লাসের সকল স্টুডেন্টকে বকেয়াসহ নতুন ক্লাসে ট্রান্সফার বা প্রোমোট করুন।
          </p>
          
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "bold" }}>টার্গেট ক্লাস নির্বাচন করুন (যেখানে স্টুডেন্ট যাবে):</label>
          <select 
            value={targetClassId} 
            onChange={(e) => setTargetClassId(e.target.value)}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
          >
            <option value="">-- ক্লাস নির্বাচন করুন --</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                {c.class_name} {c.section_name && `(${c.section_name})`} - {c.session_year}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={onClose} className="btn" style={{ border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)" }}>
            বাতিল
          </button>
          <button onClick={handlePromote} disabled={loading || !targetClassId} className="btn btn-primary">
            {loading ? "প্রোমোটিং..." : "প্রোমোট করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}
