"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { X, AlertTriangle, Trash2 } from "lucide-react";

export default function DeleteGroupModal({ currentClassId, teacherId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [targetClassId, setTargetClassId] = useState(currentClassId || "");
  const [confirmText, setConfirmText] = useState("");
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherId) return;
      const { data } = await supabase
        .from("academic_classes")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("class_name", { ascending: true });
      if (data) setClasses(data);
    };
    fetchClasses();
  }, [teacherId]);

  useEffect(() => {
    const fetchCount = async () => {
      if (!targetClassId) {
        setStudentCount(0);
        return;
      }
      const { count } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .eq("class_id", targetClassId);
      setStudentCount(count || 0);
    };
    fetchCount();
  }, [targetClassId]);

  const selectedClass = classes.find((c) => c.id === targetClassId);

  const handleDelete = async () => {
    if (!targetClassId) {
      toast.error("দয়া করে একটি ক্লাস বা বিভাগ নির্বাচন করুন");
      return;
    }

    if (studentCount === 0) {
      toast.error("এই ক্লাসে মোছার মতো কোনো স্টুডেন্ট নেই!");
      return;
    }

    if (confirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("নিশ্চিত করতে বক্সে 'DELETE' টাইপ করুন!");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("class_id", targetClassId);

      if (error) {
        if (error.code === "23503") {
          throw new Error("কিছু স্টুডেন্টের পেমেন্ট রেকর্ড সংরক্ষিত থাকায় তাদের সম্পূর্ণ মোছা যায়নি।");
        }
        throw error;
      }

      toast.success(`✅ ${selectedClass?.class_name || ""} ${selectedClass?.group_name ? `(${selectedClass.group_name})` : ""} এর সকল শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে!`);
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      onClose();
    } catch (err) {
      toast.error(`❌ এরর: ${err.message}`);
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
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "15px"
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "480px", border: "1px solid var(--brand-danger)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
          <h3 style={{ margin: 0, color: "var(--brand-danger)", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={22} /> বিভাগ / গ্রুপভিত্তিক স্টুডেন্ট মুছুন
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: "1.5", marginTop: 0 }}>
          নিচের তালিকা থেকে যে ক্লাস বা বিভাগের সকল শিক্ষার্থী মুছে ফেলতে চান তা নির্বাচন করুন।
        </p>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "14px" }}>
            ক্লাস ও বিভাগ (Group) নির্বাচন করুন:
          </label>
          <select
            value={targetClassId}
            onChange={(e) => {
              setTargetClassId(e.target.value);
              setConfirmText("");
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-color)",
              color: "var(--text-primary)",
              fontWeight: "600"
            }}
          >
            <option value="">নির্বাচন করুন</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.class_name} {c.group_name ? `(${c.group_name})` : ""} {c.section_name ? `[শাখা: ${c.section_name}]` : ""} - {c.session_year}
              </option>
            ))}
          </select>
        </div>

        {selectedClass && (
          <div
            style={{
              background: "rgba(231, 76, 60, 0.08)",
              border: "1px solid rgba(231, 76, 60, 0.3)",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "15px",
              fontSize: "13px"
            }}
          >
            <div>
              নির্বাচিত শ্রেণি: <b>{selectedClass.class_name}</b> {selectedClass.group_name && <span>(বিভাগ: <b>{selectedClass.group_name}</b>)</span>}
            </div>
            <div style={{ marginTop: "4px" }}>
              মোট শিক্ষার্থী: <b style={{ color: "var(--brand-danger)", fontSize: "15px" }}>{studentCount} জন</b>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold" }}>
            নিশ্চিত করতে নিচে <span style={{ color: "var(--brand-danger)" }}>DELETE</span> লিখুন:
          </label>
          <input
            type="text"
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "var(--radius-sm)",
              border: "2px solid var(--brand-danger)",
              backgroundColor: "var(--bg-color)",
              color: "var(--text-primary)",
              fontWeight: "bold",
              letterSpacing: "1px"
            }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" className="btn" onClick={onClose} disabled={loading} style={{ border: "1px solid var(--border-color)" }}>
            বাতিল
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading || confirmText.trim().toUpperCase() !== "DELETE" || studentCount === 0}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Trash2 size={16} />
            {loading ? "মুছে ফেলা হচ্ছে..." : `সকল (${studentCount}) শিক্ষার্থী মুছুন`}
          </button>
        </div>
      </div>
    </div>
  );
}
