"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { LogOut, BookOpen, Users, DollarSign, CreditCard, Landmark, LayoutDashboard, Moon, Sun, Eye, EyeOff, Settings, Lock, Unlock } from "lucide-react";

// Components
import AcademicSetupForm from "@/components/setup/AcademicSetupForm";
import StudentList from "@/components/students/StudentList";
import FeesSetupForm from "@/components/setup/FeesSetupForm";
import CollectionForm from "@/components/collection/CollectionForm";
import DepositForm from "@/components/deposits/DepositForm";
import Dashboard from "@/components/dashboard/Dashboard";
import ProfileSetupForm from "@/components/setup/ProfileSetupForm";

export default function Home() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const { isLocked, lock, openUnlockModal } = useLock();

  
  // Auth state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // App state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [activeTab, setActiveTab] = useState("collection");
  const [theme, setTheme] = useState("light");

  // Load theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // Fetch classes for logged in user
  useEffect(() => {
    if (user) {
      supabase.from("academic_classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setClasses(data || []);
          if (data && data.length > 0 && !selectedClassId) {
            setSelectedClassId(data[0].id);
          }
        });
    }
  }, [user, selectedClassId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("লগইন করতে ইমেইল এবং পাসওয়ার্ড দিন!");
      return;
    }
    try {
      await login(email, password);
      toast.success("লগইন সফল হয়েছে!");
    } catch (error) {
      toast.error(`❌ লগইন এরর: ${error.message}`);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      toast.error("রেজিস্ট্রেশন করতে ইমেইল এবং পাসওয়ার্ড দিন!");
      return;
    }
    if (password.length < 6) {
      toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে!");
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      
      // Auto create teacher profile on signup
      if (data?.user) {
        await supabase.from("teachers").insert([{
          id: data.user.id,
          email: email,
          full_name: "Teacher User",
          school_name: "My School"
        }]);
      }
      toast.success("রেজিস্ট্রেশন সফল! লগইন করা হয়েছে।");
    } catch (error) {
      toast.error(`❌ রেজিস্ট্রেশন এরর: ${error.message}`);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("পাসওয়ার্ড রিসেট করতে আগে আপনার ইমেইলটি ইমেইলের ঘরে লিখুন!");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast.success("আপনার ইমেইলে পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! দয়া করে ইমেইল চেক করুন।");
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে!");
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে!");
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (error) {
      toast.error(`❌ পাসওয়ার্ড আপডেট এরর: ${error.message}`);
    }
  };

  if (authLoading) return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>লোড হচ্ছে...</div>;

  // Login UI
  if (!user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "var(--bg-color)" }}>
        <div className="card-glass animate-fade-in" style={{ width: "100%", maxWidth: "420px", padding: "40px 30px" }}>
          <h2 style={{ textAlign: "center", background: "linear-gradient(135deg, var(--brand-primary), #8e44ad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "40px", fontSize: "32px", fontWeight: "800", letterSpacing: "-1px" }}>ClassFee Tracker</h2>
          
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>ইমেইল</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} />
            </div>
            
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>পাসওয়ার্ড</label>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: "100%", padding: "10px", paddingRight: "40px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: "absolute", right: "10px", top: "32px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="submit" className="btn btn-primary" style={{ padding: "12px", flex: 1 }}>লগইন করুন</button>
            </div>
            
            <button 
              type="button" 
              onClick={handleForgotPassword} 
              style={{ background: "none", border: "none", color: "var(--brand-primary)", textDecoration: "underline", cursor: "pointer", fontSize: "14px", textAlign: "right" }}
            >
              পাসওয়ার্ড ভুলে গেছেন?
            </button>
            
            <div style={{ textAlign: "center", margin: "10px 0", color: "var(--text-secondary)" }}>অথবা</div>
            
            <button type="button" onClick={handleRegister} className="btn" style={{ border: "1px solid var(--brand-primary)", color: "var(--brand-primary)", background: "var(--card-bg)", padding: "12px" }}>নতুন একাউন্ট খুলুন</button>
          </form>
        </div>
      </div>
    );
  }

  // Tabs configuration
  const tabs = [
    { id: "dashboard", label: "ড্যাশবোর্ড", icon: <LayoutDashboard size={18} /> },
    { id: "collection", label: "কালেকশন", icon: <CreditCard size={18} /> },
    { id: "deposit", label: "জমা (Deposit)", icon: <Landmark size={18} /> },
    { id: "students", label: "স্টুডেন্ট লিস্ট", icon: <Users size={18} /> },
    { id: "fees", label: "ফি সেটআপ", icon: <DollarSign size={18} /> },
    { id: "setup", label: "ক্লাস সেটআপ", icon: <BookOpen size={18} /> },
    { id: "profile", label: "সেটিংস", icon: <Settings size={18} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      
      {/* Top Navbar */}
      <nav className="card-glass" style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", padding: "16px 24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, gap: "15px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "800", background: "linear-gradient(135deg, var(--brand-primary), #8e44ad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", flexShrink: 0, letterSpacing: "-0.5px" }}>ClassFee Tracker</h2>
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          
          {/* Global Class Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", fontWeight: "bold" }}>বর্তমান ক্লাস:</span>
            <select 
              value={selectedClassId} 
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--brand-primary)", fontWeight: "bold", outline: "none" }}
            >
              <option value="">নির্বাচন করুন</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} {c.group_name ? `(${c.group_name})` : ''} {c.section_name ? `[${c.section_name}]` : ''} - {c.session_year}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={isLocked ? () => openUnlockModal() : lock}
            className="btn"
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-full)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: isLocked ? "rgba(231, 76, 60, 0.12)" : "rgba(46, 204, 113, 0.12)",
              border: `1px solid ${isLocked ? "var(--brand-danger)" : "var(--brand-success)"}`,
              color: isLocked ? "var(--brand-danger)" : "var(--brand-success)",
              fontWeight: "700"
            }}
            title={isLocked ? "ডাটা লক করা আছে (ক্লিক করে আনলক করুন)" : "ডাটা আনলক করা আছে (ক্লিক করে লক করুন)"}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            <span>{isLocked ? "সিস্টেম লক" : "সিস্টেম আনলক"}</span>
          </button>

          <button onClick={() => setShowPasswordModal(true)} className="btn" style={{ padding: "8px", background: "transparent", border: "1px solid var(--brand-primary)", color: "var(--brand-primary)" }} title="পাসওয়ার্ড পরিবর্তন করুন">
            Change Password
          </button>
          
          <button onClick={logout} className="btn" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--brand-danger)" }}>
            <LogOut size={16} /> লগআউট
          </button>
          <button onClick={toggleTheme} className="btn" style={{ padding: "8px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)" }} title="থিম পরিবর্তন">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>


      <div style={{ display: "flex", flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%", padding: "20px", gap: "20px", flexDirection: "column" }}>
        
        {/* Navigation Tabs */}
        <div className="card-glass" style={{ padding: "12px", display: "flex", gap: "12px", overflowX: "auto", marginBottom: "10px" }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="btn"
              style={{
                display: "flex", alignItems: "center", gap: "8px", padding: "12px 20px", whiteSpace: "nowrap",
                background: activeTab === tab.id ? "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 100%)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-secondary)",
                border: "none",
                borderRadius: "var(--radius-full)",
                boxShadow: activeTab === tab.id ? "0 4px 14px 0 rgba(0, 118, 255, 0.39)" : "none",
                fontWeight: activeTab === tab.id ? "700" : "600",
                transition: "all 0.3s ease"
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1 }}>
          {activeTab !== "setup" && activeTab !== "deposit" && activeTab !== "profile" && !selectedClassId ? (
            <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
              <BookOpen size={48} style={{ marginBottom: "15px", opacity: 0.5 }} />
              <h3>কোনো ক্লাস নির্বাচিত নেই</h3>
              <p>দয়া করে উপরের মেনু থেকে একটি ক্লাস নির্বাচন করুন অথবা &quot;ক্লাস সেটআপ&quot; থেকে নতুন ক্লাস তৈরি করুন।</p>
            </div>
          ) : (
            <>
              {activeTab === "dashboard" && <Dashboard classId={selectedClassId} classInfo={classes.find(c => c.id === selectedClassId)} />}
              {activeTab === "collection" && <CollectionForm classId={selectedClassId} classInfo={classes.find(c => c.id === selectedClassId)} />}
              {activeTab === "deposit" && <DepositForm />}
              {activeTab === "students" && <StudentList classId={selectedClassId} classInfo={classes.find(c => c.id === selectedClassId)} />}
              {activeTab === "fees" && <FeesSetupForm classId={selectedClassId} classInfo={classes.find(c => c.id === selectedClassId)} />}
              {activeTab === "setup" && <AcademicSetupForm />}
              {activeTab === "profile" && <ProfileSetupForm />}
            </>
          )}
        </div>

      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ width: "100%", maxWidth: "400px", position: "relative" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--brand-primary)" }}>পাসওয়ার্ড পরিবর্তন করুন</h3>
            
            <form onSubmit={handleUpdatePassword}>
              <div style={{ marginBottom: "15px", position: "relative" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>নতুন পাসওয়ার্ড</label>
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="নতুন পাসওয়ার্ড লিখুন"
                  required
                  style={{ width: "100%", padding: "10px", paddingRight: "40px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}
                />
                <button 
                  type="button" 
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ position: "absolute", right: "10px", top: "32px", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="btn" style={{ border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-primary)" }}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn-primary">
                  আপডেট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
