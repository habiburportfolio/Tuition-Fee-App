"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { Settings, Save, Upload } from "lucide-react";

export default function ProfileSetupForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    school_name: "",
    eiin_number: "",
    school_email: "",
    phone_number: "",
    head_teacher_phone: "",
    logo_url: "",
    signature_url: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("teachers")
          .select("*")
          .eq("id", user.id)
          .single();
          
        if (error) throw error;
        if (data) {
          setFormData({
            school_name: data.school_name || "",
            eiin_number: data.eiin_number || "",
            school_email: data.school_email || "",
            phone_number: data.phone_number || "",
            head_teacher_phone: data.head_teacher_phone || "",
            logo_url: data.logo_url || "",
            signature_url: data.signature_url || ""
          });
        }
      } catch (error) {
        toast.error("প্রোফাইল লোড করতে সমস্যা হয়েছে!");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB max
        toast.error("ফাইলের সাইজ ১ এমবি এর কম হতে হবে!");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result }); // Base64 string
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("teachers")
        .update({
          school_name: formData.school_name,
          eiin_number: formData.eiin_number,
          school_email: formData.school_email,
          phone_number: formData.phone_number,
          head_teacher_phone: formData.head_teacher_phone,
          logo_url: formData.logo_url,
          signature_url: formData.signature_url
        })
        .eq("id", user.id);
        
      if (error) throw error;
      toast.success("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>লোড হচ্ছে...</div>;

  return (
    <div className="card-glass animate-fade-in" style={{ marginTop: "20px", maxWidth: "800px", margin: "20px auto" }}>
      <h3 style={{ color: "var(--brand-primary)", marginBottom: "25px", display: "flex", alignItems: "center", gap: "10px", fontSize: "22px" }}>
        <Settings size={24} /> প্রোফাইল ও স্কুল সেটিংস
      </h3>
      
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>স্কুলের নাম (School Name) *</label>
            <input 
              type="text" 
              name="school_name"
              value={formData.school_name}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>EIIN নম্বর</label>
            <input 
              type="text" 
              name="eiin_number"
              value={formData.eiin_number}
              onChange={handleChange}
              placeholder="যেমন: 123456"
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>স্কুলের ইমেইল</label>
            <input 
              type="email" 
              name="school_email"
              value={formData.school_email}
              onChange={handleChange}
              placeholder="example@school.com"
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            />
          </div>
          
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>আপনার (ক্লাস টিচার) মোবাইল নম্বর</label>
            <input 
              type="text" 
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="017XXXXXXXX"
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>প্রধান শিক্ষকের মোবাইল নম্বর</label>
            <input 
              type="text" 
              name="head_teacher_phone"
              value={formData.head_teacher_phone}
              onChange={handleChange}
              placeholder="01XXXXXXXXX"
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          
          {/* Logo Upload */}
          <div style={{ background: "var(--card-bg)", padding: "15px", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>স্কুলের লোগো (Logo)</label>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" style={{ width: "80px", height: "80px", objectFit: "contain", borderRadius: "8px", border: "1px solid var(--border-color)" }} />
              ) : (
                <div style={{ width: "80px", height: "80px", background: "var(--bg-color)", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-secondary)" }}>No Logo</div>
              )}
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, "logo_url")}
                  style={{ width: "100%", fontSize: "14px" }}
                />
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "5px" }}>যেকোনো ছবি আপলোড করুন (সর্বোচ্চ ১ এমবি)। মানি রসিদে এটি প্রিন্ট হবে।</p>
              </div>
            </div>
          </div>

          {/* Signature Upload */}
          <div style={{ background: "var(--card-bg)", padding: "15px", borderRadius: "var(--radius-md)", border: "1px dashed var(--border-color)" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>ক্লাস টিচারের স্বাক্ষর (Signature)</label>
            <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
              {formData.signature_url ? (
                <img src={formData.signature_url} alt="Signature" style={{ height: "60px", maxWidth: "150px", objectFit: "contain", borderBottom: "1px solid var(--border-color)" }} />
              ) : (
                <div style={{ height: "60px", width: "150px", background: "var(--bg-color)", display: "flex", justifyContent: "center", alignItems: "center", color: "var(--text-secondary)", borderBottom: "1px solid var(--border-color)" }}>No Signature</div>
              )}
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, "signature_url")}
                  style={{ width: "100%", fontSize: "14px" }}
                />
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "5px" }}>সাদা কাগজে সাইন করে ছবি তুলে আপলোড করুন।</p>
              </div>
            </div>
          </div>
          
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 30px" }}>
            <Save size={18} /> {saving ? "সেভ হচ্ছে..." : "আপডেট করুন"}
          </button>
        </div>
      </form>
    </div>
  );
}
