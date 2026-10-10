"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User, DollarSign } from "lucide-react";

export default function GuardianPortal() {
  const [rollNumber, setRollNumber] = useState("");
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rollNumber) return;
    
    setLoading(true);
    setError("");
    setStudentData(null);

    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          academic_classes (class_name, section_name, session_year)
        `)
        .eq("roll_no", rollNumber)
        .single();

      if (error) throw error;
      if (!data) throw new Error("স্টুডেন্ট পাওয়া যায়নি। রোল নম্বর চেক করুন।");

      setStudentData(data);
    } catch (err) {
      setError(err.message || "কোনো তথ্য পাওয়া যায়নি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px" }}>
      <div className="card" style={{ width: "100%", maxWidth: "500px", textAlign: "center" }}>
        <h2 style={{ color: "var(--brand-primary)", marginBottom: "10px" }}>Guardian Portal</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "20px" }}>লগইন ছাড়াই বকেয়া ও পেমেন্ট ইনফো দেখুন</p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="স্টুডেন্টের রোল নম্বর দিন..."
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", background: "var(--card-bg)", color: "var(--text-primary)" }}
            required
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "খুঁজছে..." : <Search size={20} />}
          </button>
        </form>

        {error && (
          <div style={{ color: "var(--brand-danger)", padding: "10px", backgroundColor: "rgba(255,0,0,0.1)", borderRadius: "var(--radius-sm)" }}>
            {error}
          </div>
        )}

        {studentData && (
          <div style={{ textAlign: "left", marginTop: "20px", padding: "15px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", background: "var(--card-bg)" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px", marginBottom: "10px" }}>
              <User size={20} color="var(--brand-primary)" /> {studentData.full_name}
            </h3>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", color: "var(--text-secondary)" }}>
              <span>ক্লাস: {studentData.academic_classes?.class_name} {studentData.academic_classes?.section_name}</span>
              <span>রোল: {studentData.roll_no}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,0,0,0.05)", padding: "15px", borderRadius: "var(--radius-md)" }}>
              <span style={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}><DollarSign size={18} /> মোট বকেয়া (Due):</span>
              <span style={{ fontSize: "24px", fontWeight: "bold", color: "var(--brand-danger)" }}>৳ {studentData.opening_due || 0}</span>
            </div>
            
            <p style={{ marginTop: "15px", fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>
              বিস্তারিত পেমেন্ট হিস্ট্রির জন্য ক্লাস টিচারের সাথে যোগাযোগ করুন।
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
