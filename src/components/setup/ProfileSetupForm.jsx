"use client";

import { useState, useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import toast from "react-hot-toast";
import { Settings, Save, Upload, Lock, Unlock, KeyRound, ShieldCheck } from "lucide-react";
import DataBackupSection from "@/components/setup/DataBackupSection";

export default function ProfileSetupForm() {
  const { user } = useAuth();
  const { isLocked, lock, openUnlockModal, updatePin } = useLock();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [showPinChange, setShowPinChange] = useState(false);

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
          .maybeSingle();

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
        console.error("Profile load error:", error);
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
      const defaultName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Teacher User";
      const { error } = await supabase
        .from("teachers")
        .upsert({
          id: user.id,
          email: user.email,
          full_name: defaultName,
          school_name: formData.school_name,
          eiin_number: formData.eiin_number,
          school_email: formData.school_email,
          phone_number: formData.phone_number,
          head_teacher_phone: formData.head_teacher_phone,
          logo_url: formData.logo_url,
          signature_url: formData.signature_url
        }, { onConflict: "id" });
        
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

      {/* Requirement 8: Settings Lock / Unlock System for Data Edits & Deletes */}
      <div style={{ marginTop: "35px", borderTop: "2px dashed var(--border-color)", paddingTop: "25px" }}>
        <h4 style={{ color: "var(--brand-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
          <ShieldCheck size={20} /> ডাটা এডিট ও ডিলিট লক সিস্টেম (Data Security Lock)
        </h4>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "18px", lineHeight: "1.6" }}>
          অননুমোদিত বা ভুলবশত কোনো শিক্ষার্থীর তথ্য, ফি, ক্লাস কিংবা পেমেন্ট রেকর্ড এডিট বা মুছে ফেলা ঠেকাতে এই লক সিস্টেম কাজ করে। লক অন থাকলে কোনো ফাইল এডিট বা ডিলিট করা যাবে না।
        </p>

        <div style={{
          background: isLocked ? "rgba(231, 76, 60, 0.08)" : "rgba(46, 204, 113, 0.08)",
          border: `1px solid ${isLocked ? "var(--brand-danger)" : "var(--brand-success)"}`,
          padding: "16px",
          borderRadius: "var(--radius-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "800", fontSize: "16px", color: isLocked ? "var(--brand-danger)" : "var(--brand-success)" }}>
              {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
              <span>{isLocked ? "বর্তমানে ডাটা লক করা আছে (সক্রিয়)" : "বর্তমানে ডাটা আনলক করা আছে (এডিট/ডিলিট চালু)"}</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
              {isLocked
                ? "লক থাকা অবস্থায় কোনো ডাটা বা রেকর্ড মুছে ফেলা বা পরিবর্তন করা যাবে না।"
                : "সতর্কতা: আনলক থাকা অবস্থায় যেকোনো অনুমোদিত ইউজার এডিট ও ডিলিট করতে পারবেন। কাজ শেষ হলে পুনরায় লক করুন।"}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {isLocked ? (
              <button
                type="button"
                onClick={() => openUnlockModal()}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px" }}
              >
                <Unlock size={16} /> পিন দিয়ে আনলক করুন
              </button>
            ) : (
              <button
                type="button"
                onClick={lock}
                className="btn btn-danger"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 18px" }}
              >
                <Lock size={16} /> এখনই লক করুন
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowPinChange(!showPinChange)}
              className="btn"
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "transparent", border: "1px solid var(--border-color)", padding: "10px 14px", color: "var(--text-primary)" }}
            >
              <KeyRound size={16} /> {showPinChange ? "পিন ফর্ম বন্ধ" : "পিন কোড পরিবর্তন"}
            </button>
          </div>
        </div>

        {/* Change PIN Form */}
        {showPinChange && (
          <div style={{ marginTop: "15px", background: "var(--card-bg)", padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <h5 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700" }}>লক সিকিউরিটি পিন পরিবর্তন (ডিফল্ট পিন: 1234)</h5>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "140px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "bold" }}>বর্তমান পিন *</label>
                <input
                  type="password"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value)}
                  placeholder="বর্তমান পিন দিন"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "140px" }}>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: "bold" }}>নতুন পিন (কমপক্ষে ৪ সংখ্যা) *</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="নতুন পিন দিন"
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const success = updatePin(oldPin, newPin);
                  if (success) {
                    setOldPin("");
                    setNewPin("");
                    setShowPinChange(false);
                  }
                }}
                className="btn btn-primary"
                style={{ padding: "8px 16px" }}
              >
                পিন সংরক্ষণ করুন
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Requirement: All Data Backup & Restore (Export / Import) */}
      <DataBackupSection />
    </div>
  );
}

