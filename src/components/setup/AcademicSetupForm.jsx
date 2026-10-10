"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

export default function AcademicSetupForm() {
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [formData, setFormData] = useState({
    session_year: new Date().getFullYear().toString(),
    class_name: "",
    section_name: "",
    group_name: "",
  });

  const fetchClasses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("academic_classes")
      .select("*")
      .eq("teacher_id", user.id)
      .order("session_year", { ascending: false });
    if (!error && data) {
      setClasses(data);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("আপনাকে লগইন করতে হবে।");
      return;
    }

    if (!formData.session_year || !formData.class_name) {
      toast.error("শিক্ষাবর্ষ এবং শ্রেণি নির্বাচন করা আবশ্যক।");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("academic_classes")
        .insert([
          {
            teacher_id: user.id,
            session_year: formData.session_year,
            class_name: formData.class_name,
            section_name: formData.section_name || null,
            group_name: formData.group_name || null,
          }
        ])
        .select();

      if (error) {
        if (error.code === "23505") {
          throw new Error("এই ক্লাসের ডেটা ইতোমধ্যে যুক্ত করা হয়েছে।");
        }
        throw error;
      }

      toast.success("✅ নতুন ক্লাস সফলভাবে তৈরি করা হয়েছে!");
      setFormData({
        session_year: new Date().getFullYear().toString(),
        class_name: "",
        section_name: "",
        group_name: "",
      });
      fetchClasses();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে এই ক্লাসটি ডিলিট করতে চান? (এর সাথে যুক্ত সব স্টুডেন্ট এবং পেমেন্ট রেকর্ডও ডিলিট হয়ে যাবে)")) return;
    
    try {
      const { error } = await supabase.from("academic_classes").delete().eq("id", classId);
      if (error) throw error;
      toast.success("ক্লাস সফলভাবে ডিলিট হয়েছে!");
      fetchClasses();
    } catch (error) {
      toast.error(`❌ ডিলিট এরর: ${error.message}`);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "20px auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="card">
        <h2 style={{ marginBottom: "20px", color: "var(--brand-primary)" }}>নতুন ক্লাস সেটআপ করুন</h2>
        
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>শিক্ষাবর্ষ (Session Year) *</label>
          <select 
            name="session_year" 
            value={formData.session_year} 
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            required
          >
            <option value="2025">২০২৫</option>
            <option value="2026">২০২৬</option>
            <option value="2027">২০২৭</option>
            <option value="2028">২০২৮</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>শ্রেণি (Class) *</label>
          <select 
            name="class_name" 
            value={formData.class_name} 
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            required
          >
            <option value="">নির্বাচন করুন</option>
            <option value="Class 1">১ম শ্রেণি</option>
            <option value="Class 2">২য় শ্রেণি</option>
            <option value="Class 3">৩য় শ্রেণি</option>
            <option value="Class 4">৪র্থ শ্রেণি</option>
            <option value="Class 5">৫ম শ্রেণি</option>
            <option value="Class 6">৬ষ্ঠ শ্রেণি</option>
            <option value="Class 7">৭ম শ্রেণি</option>
            <option value="Class 8">৮ম শ্রেণি</option>
            <option value="Class 9">৯ম শ্রেণি</option>
            <option value="Class 10">১০ম শ্রেণি</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>শাখা (Section)</label>
          <select 
            name="section_name" 
            value={formData.section_name} 
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
          >
            <option value="">প্রযোজ্য নয় / Single Section</option>
            <option value="A">ক শাখা</option>
            <option value="B">খ শাখা</option>
            <option value="C">গ শাখা</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>বিভাগ (Group)</label>
          <select 
            name="group_name" 
            value={formData.group_name} 
            onChange={handleChange}
            style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
          >
            <option value="">সাধারণ / প্রযোজ্য নয়</option>
            <option value="Science">বিজ্ঞান (Science)</option>
            <option value="Commerce">ব্যবসায় শিক্ষা (Commerce)</option>
            <option value="Arts">মানবিক (Arts)</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
          style={{ marginTop: "10px", padding: "12px", fontSize: "16px" }}
        >
          {loading ? "সংরক্ষণ করা হচ্ছে..." : "নতুন ক্লাস তৈরি করুন"}
        </button>

      </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "15px", color: "var(--brand-primary)" }}>বিদ্যমান ক্লাসসমূহ</h3>
        {classes.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>কোনো ক্লাস তৈরি করা হয়নি।</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>শিক্ষাবর্ষ</th>
                  <th style={{ padding: "10px" }}>ক্লাস</th>
                  <th style={{ padding: "10px" }}>শাখা ও বিভাগ</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <td style={{ padding: "10px", fontWeight: "bold" }}>{c.session_year}</td>
                    <td style={{ padding: "10px" }}>{c.class_name}</td>
                    <td style={{ padding: "10px" }}>
                      {c.section_name && `শাখা: ${c.section_name} `}
                      {c.group_name && `(${c.group_name})`}
                      {!c.section_name && !c.group_name && '-'}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      {userRole !== 'assistant' && (
                        <button 
                          onClick={() => handleDeleteClass(c.id)}
                          style={{ background: "none", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Trash2 size={14} /> ডিলিট
                        </button>
                      )}
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
