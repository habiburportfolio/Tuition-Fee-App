"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { 
  Download, 
  Upload, 
  FileJson, 
  FileSpreadsheet, 
  Database, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  HardDriveDownload,
  HardDriveUpload,
  Layers,
  Users,
  CreditCard,
  Landmark,
  X
} from "lucide-react";

export default function DataBackupSection() {
  const { user } = useAuth();
  const { isLocked, openUnlockModal } = useLock();

  const [exportingJson, setExportingJson] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importing, setImporting] = useState(false);

  // Restore preview modal state
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);

  // Utility to chunk array for safe batch upserts
  const chunkArray = (arr, size = 50) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // 1. Fetch all data for current teacher
  const fetchAllUserData = async () => {
    if (!user) throw new Error("ব্যবহারকারী লগইন অবস্থায় নেই");

    // Fetch Teacher Profile
    const { data: teacher, error: teacherErr } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (teacherErr) throw teacherErr;

    // Fetch Academic Classes
    const { data: classes, error: classesErr } = await supabase
      .from("academic_classes")
      .select("*")
      .eq("teacher_id", user.id);
    if (classesErr) throw classesErr;

    // Fetch Students
    const { data: students, error: studentsErr } = await supabase
      .from("students")
      .select("*")
      .eq("teacher_id", user.id);
    if (studentsErr) throw studentsErr;

    // Fetch Fees Setup
    const { data: fees, error: feesErr } = await supabase
      .from("fees_setup")
      .select("*")
      .eq("teacher_id", user.id);
    if (feesErr) throw feesErr;

    // Fetch Deposits
    const { data: deposits, error: depositsErr } = await supabase
      .from("deposits")
      .select("*")
      .eq("teacher_id", user.id);
    if (depositsErr) throw depositsErr;

    // Fetch Payments
    const { data: payments, error: paymentsErr } = await supabase
      .from("payments")
      .select("*")
      .eq("teacher_id", user.id);
    if (paymentsErr) throw paymentsErr;

    // Fetch Expenses (if table exists)
    let expenses = [];
    try {
      const { data: exp } = await supabase
        .from("expenses")
        .select("*")
        .eq("teacher_id", user.id);
      if (exp) expenses = exp;
    } catch {
      // ignore if expenses not configured
    }

    return {
      teacher,
      classes: classes || [],
      students: students || [],
      fees: fees || [],
      deposits: deposits || [],
      payments: payments || [],
      expenses: expenses || []
    };
  };

  // 2. Export full backup as JSON
  const handleExportJson = async () => {
    if (!user) return toast.error("লগইন প্রয়োজন");
    setExportingJson(true);
    const toastId = toast.loading("সম্পূর্ণ ডাটা ব্যাকআপ প্রস্তুত করা হচ্ছে...");

    try {
      const fullData = await fetchAllUserData();

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const backupPackage = {
        app_name: "ClassFee Tracker",
        app_version: "1.3.0",
        export_date: new Date().toISOString(),
        teacher_email: user.email,
        meta: {
          classes_count: fullData.classes.length,
          students_count: fullData.students.length,
          fees_count: fullData.fees.length,
          deposits_count: fullData.deposits.length,
          payments_count: fullData.payments.length,
          expenses_count: fullData.expenses.length
        },
        data: fullData
      };

      const jsonStr = JSON.stringify(backupPackage, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ClassFee_Full_Backup_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("✅ JSON ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!", { id: toastId });
    } catch (err) {
      console.error("Export JSON error:", err);
      toast.error(`❌ ব্যাকআপ তৈরিতে সমস্যা: ${err.message}`, { id: toastId });
    } finally {
      setExportingJson(false);
    }
  };

  // 3. Export full multi-sheet Excel spreadsheet
  const handleExportExcel = async () => {
    if (!user) return toast.error("লগইন প্রয়োজন");
    setExportingExcel(true);
    const toastId = toast.loading("Excel স্প্রেডশিট ব্যাকআপ তৈরি হচ্ছে...");

    try {
      const fullData = await fetchAllUserData();
      const wb = XLSX.utils.book_new();

      // Sheet 1: Students
      const studentRows = fullData.students.map(s => {
        const cls = fullData.classes.find(c => c.id === s.class_id);
        return {
          "রোল": s.roll_no,
          "নাম": s.full_name,
          "শ্রেণি": cls?.class_name || "-",
          "বিভাগ": cls?.group_name || "-",
          "শাখা": cls?.section_name || "-",
          "অভিভাবক": s.parent_name || "-",
          "মোবাইল": s.parent_phone || "-",
          "পূর্বের বকেয়া": s.opening_due || 0,
          "ওয়েভার স্ট্যাটাস": s.waiver_status || "None",
          "স্ট্যাটাস": s.status || "Active"
        };
      });
      const wsStudents = XLSX.utils.json_to_sheet(studentRows.length > 0 ? studentRows : [{ "তথ্য": "কোনো শিক্ষার্থী নেই" }]);
      XLSX.utils.book_append_sheet(wb, wsStudents, "শিক্ষার্থী তালিকা");

      // Sheet 2: Payments
      const paymentRows = fullData.payments.map(p => {
        const stu = fullData.students.find(s => s.id === p.student_id);
        return {
          "রসিদ নং": p.receipt_no,
          "তারিখ": p.paid_at ? new Date(p.paid_at).toLocaleDateString('bn-BD') : "-",
          "শিক্ষার্থীর নাম": stu?.full_name || "-",
          "রোল": stu?.roll_no || "-",
          "আদায়কৃত টাকা": p.amount_paid,
          "অবশিষ্ট বকেয়া": p.due_remaining,
          "মাধ্যম": p.payment_method || "Cash",
          "বাতিল": p.is_voided ? "হ্যাঁ" : "না"
        };
      });
      const wsPayments = XLSX.utils.json_to_sheet(paymentRows.length > 0 ? paymentRows : [{ "তথ্য": "কোনো পেমেন্ট নেই" }]);
      XLSX.utils.book_append_sheet(wb, wsPayments, "ফি আদায় রেকর্ড");

      // Sheet 3: Deposits
      const depositRows = fullData.deposits.map(d => ({
        "তারিখ": d.deposited_at ? new Date(d.deposited_at).toLocaleDateString('bn-BD') : "-",
        "মাধ্যম": d.deposit_channel,
        "ব্যাংকের নাম": d.bank_name || "-",
        "স্লিপ নং": d.slip_number || "-",
        "মোট জমা (৳)": d.total_amount
      }));
      const wsDeposits = XLSX.utils.json_to_sheet(depositRows.length > 0 ? depositRows : [{ "তথ্য": "কোনো জমা নেই" }]);
      XLSX.utils.book_append_sheet(wb, wsDeposits, "জমা রেকর্ড");

      // Sheet 4: Classes
      const classRows = fullData.classes.map(c => ({
        "শ্রেণির নাম": c.class_name,
        "সেশন সাল": c.session_year,
        "গ্রুপ": c.group_name || "-",
        "শাখা": c.section_name || "-"
      }));
      const wsClasses = XLSX.utils.json_to_sheet(classRows.length > 0 ? classRows : [{ "তথ্য": "কোনো ক্লাস নেই" }]);
      XLSX.utils.book_append_sheet(wb, wsClasses, "ক্লাস তালিকা");

      // Sheet 5: Fees Setup
      const feeRows = fullData.fees.map(f => {
        const cls = fullData.classes.find(c => c.id === f.class_id);
        return {
          "শ্রেণি": cls?.class_name || "-",
          "ফি এর ধরন": f.fee_type,
          "মাসের নাম": f.month_name || "-",
          "পরিমাণ": f.amount,
          "সক্রিয়": f.is_active ? "হ্যাঁ" : "না"
        };
      });
      const wsFees = XLSX.utils.json_to_sheet(feeRows.length > 0 ? feeRows : [{ "তথ্য": "কোনো ফি নেই" }]);
      XLSX.utils.book_append_sheet(wb, wsFees, "ফি কাঠামো");

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 10);
      XLSX.writeFile(wb, `ClassFee_Excel_Backup_${timestamp}.xlsx`);

      toast.success("✅ Excel ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে!", { id: toastId });
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error(`❌ Excel তৈরিতে সমস্যা: ${err.message}`, { id: toastId });
    } finally {
      setExportingExcel(false);
    }
  };

  // 4. Handle JSON file selection for restore
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      toast.error("দয়া করে একটি বৈধ .json ব্যাকআপ ফাইল নির্বাচন করুন!");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || !parsed.data || !parsed.data.classes || !parsed.data.students) {
          throw new Error("ফাইলটিতে সঠিক ClassFee ব্যাকআপ ফরম্যাট পাওয়া যায়নি");
        }
        setBackupPreview(parsed);
        setShowRestoreModal(true);
      } catch (err) {
        toast.error(`❌ অবৈধ ফাইল: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // 5. Execute Data Restore
  const handleConfirmRestore = async () => {
    if (!user) return toast.error("লগইন প্রয়োজন");
    if (!backupPreview || !backupPreview.data) return;

    if (isLocked) {
      toast.error("সিস্টেম লক করা আছে! ডাটা রিস্টোর করতে আগে সিস্টেম আনলক করুন।");
      openUnlockModal();
      return;
    }

    setImporting(true);
    const toastId = toast.loading("ডাটাবেজে ব্যাকআপ রিস্টোর করা হচ্ছে...");

    try {
      const { data } = backupPreview;

      // 1. Update Teacher Profile
      if (data.teacher) {
        const profilePayload = {
          id: user.id,
          school_name: data.teacher.school_name || "বিদ্যালয়ের নাম",
          eiin_number: data.teacher.eiin_number || null,
          school_email: data.teacher.school_email || null,
          phone_number: data.teacher.phone_number || null,
          head_teacher_phone: data.teacher.head_teacher_phone || null,
          logo_url: data.teacher.logo_url || null,
          signature_url: data.teacher.signature_url || null
        };
        await supabase.from("teachers").upsert([profilePayload], { onConflict: "id" });
      }

      // 2. Upsert Academic Classes
      if (data.classes && data.classes.length > 0) {
        const classPayload = data.classes.map(c => ({
          ...c,
          teacher_id: user.id
        }));
        for (const chunk of chunkArray(classPayload, 50)) {
          const { error } = await supabase.from("academic_classes").upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      // 3. Upsert Fees Setup
      if (data.fees && data.fees.length > 0) {
        const feePayload = data.fees.map(f => ({
          ...f,
          teacher_id: user.id
        }));
        for (const chunk of chunkArray(feePayload, 50)) {
          const { error } = await supabase.from("fees_setup").upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      // 4. Upsert Students
      if (data.students && data.students.length > 0) {
        const studentPayload = data.students.map(s => ({
          ...s,
          teacher_id: user.id
        }));
        for (const chunk of chunkArray(studentPayload, 50)) {
          const { error } = await supabase.from("students").upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      // 5. Upsert Deposits
      if (data.deposits && data.deposits.length > 0) {
        const depositPayload = data.deposits.map(d => ({
          ...d,
          teacher_id: user.id
        }));
        for (const chunk of chunkArray(depositPayload, 50)) {
          const { error } = await supabase.from("deposits").upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      // 6. Upsert Payments
      if (data.payments && data.payments.length > 0) {
        const paymentPayload = data.payments.map(p => ({
          ...p,
          teacher_id: user.id
        }));
        for (const chunk of chunkArray(paymentPayload, 50)) {
          const { error } = await supabase.from("payments").upsert(chunk, { onConflict: "id" });
          if (error) throw error;
        }
      }

      // 7. Upsert Expenses
      if (data.expenses && data.expenses.length > 0) {
        try {
          const expensePayload = data.expenses.map(e => ({
            ...e,
            teacher_id: user.id
          }));
          for (const chunk of chunkArray(expensePayload, 50)) {
            await supabase.from("expenses").upsert(chunk, { onConflict: "id" });
          }
        } catch {
          // ignore if table does not exist
        }
      }

      toast.success("🎉 সকল ডাটা সফলভাবে রিস্টোর হয়েছে!", { id: toastId });
      setShowRestoreModal(false);
      setBackupPreview(null);

      // Auto refresh after 1.5 seconds to reload all app views
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error("Restore error:", err);
      toast.error(`❌ ডাটা রিস্টোরে সমস্যা হয়েছে: ${err.message}`, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ marginTop: "35px", borderTop: "2px dashed var(--border-color)", paddingTop: "25px" }}>
      <h4 style={{ color: "var(--brand-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", fontSize: "18px" }}>
        <Database size={20} /> অল ডাটা ব্যাকআপ ও রিস্টোর (Backup & Restore)
      </h4>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: "1.6" }}>
        আপনার বিদ্যালয়ের সকল ক্লাস, শিক্ষার্থী তালিকা, ফি কাঠামো, কালেকশন রসিদ এবং ব্যাংক/ক্যাশ জমা রেকর্ড এক ক্লিকে সম্পূর্ণ ব্যাকআপ সংরক্ষণ করুন অথবা পূর্বে সংরক্ষিত ব্যাকআপ ফাইল থেকে পুনরায় পুনরুদ্ধার করুন।
      </p>

      {/* Action Cards Container */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        
        {/* Export JSON Card */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ background: "rgba(0, 118, 255, 0.12)", color: "var(--brand-primary)", padding: "10px", borderRadius: "10px" }}>
                <HardDriveDownload size={22} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>সম্পূর্ণ সিস্টেম ব্যাকআপ (JSON)</h5>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>সরাসরি রিস্টোরযোগ্য মাস্টার ফাইল</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "10px 0 16px 0" }}>
              মোবাইল বা কম্পিউটারে সুরক্ষিত রাখতে একটি `.json` ব্যাকআপ ফাইল ডাউনলোড করুন। প্রয়োজনে যেকোনো সময় এই ফাইল দিয়ে পুরো সফটওয়্যার রিস্টোর করা যাবে।
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={exportingJson}
            className="btn btn-primary"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px" }}
          >
            {exportingJson ? <RefreshCw size={16} className="animate-spin" /> : <FileJson size={16} />}
            <span>{exportingJson ? "ব্যাকআপ তৈরি হচ্ছে..." : "JSON ব্যাকআপ ডাউনলোড করুন"}</span>
          </button>
        </div>

        {/* Export Excel Card */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ background: "rgba(16, 124, 65, 0.12)", color: "#107c41", padding: "10px", borderRadius: "10px" }}>
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>এক্সেল স্প্রেডশিট ব্যাকআপ (Excel)</h5>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>অফলাইন রিপোর্ট ও হিসাব সংরক্ষণ</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "10px 0 16px 0" }}>
              শিক্ষার্থী, ফি, আদায় ও জমার প্রতিটি বিবরণ আলাদা আলাদা শিটে সাজানো একটি পূর্ণাঙ্গ `.xlsx` ফাইল ডাউনলোড করুন। অফলাইনে দেখতে বা প্রিন্ট করতে পারবেন।
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exportingExcel}
            className="btn"
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "10px", background: "#107c41", color: "white" }}
          >
            {exportingExcel ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
            <span>{exportingExcel ? "এক্সেল তৈরি হচ্ছে..." : "Excel ব্যাকআপ ডাউনলোড করুন"}</span>
          </button>
        </div>

        {/* Import / Restore Card */}
        <div style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <div style={{ background: "rgba(243, 156, 18, 0.12)", color: "#d35400", padding: "10px", borderRadius: "10px" }}>
                <HardDriveUpload size={22} />
              </div>
              <div>
                <h5 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>ডাটা রিস্টোর / পুনরুদ্ধার (Import)</h5>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>ব্যাকআপ ফাইল থেকে ডাটা ফিরিয়ে আনা</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", margin: "10px 0 16px 0" }}>
              পূর্বে সংরক্ষিত `.json` ব্যাকআপ ফাইল আপলোড করে পূর্বের সকল শ্রেণি, শিক্ষার্থী ও পেমেন্ট রেকর্ড নিমেষেই বর্তমান সফটওয়্যারে প্রতিস্থাপন বা রিস্টোর করুন।
            </p>
          </div>

          <label
            className="btn"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px",
              background: "transparent",
              border: "1px solid var(--brand-primary)",
              color: "var(--brand-primary)",
              cursor: "pointer",
              textAlign: "center"
            }}
          >
            <Upload size={16} />
            <span>ব্যাকআপ ফাইল আপলোড (Restore)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </label>
        </div>

      </div>

      {/* Restore Confirmation & Preview Modal */}
      {showRestoreModal && backupPreview && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.65)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000,
          padding: "15px"
        }}>
          <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "520px", position: "relative", padding: "24px" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={22} color="#e67e22" />
                <h3 style={{ margin: 0, fontSize: "18px", color: "var(--text-primary)" }}>ব্যাকআপ ফাইল প্রিভিউ ও নিশ্চিতকরণ</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowRestoreModal(false); setBackupPreview(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              নির্বাচিত ব্যাকআপ ফাইলটিতে নিম্নলিখিত তথ্যসমূহ পাওয়া গেছে:
            </p>

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "var(--bg-color)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Layers size={13} /> শ্রেণি / ক্লাস
                </span>
                <b style={{ fontSize: "16px", color: "var(--brand-primary)", marginTop: "2px", display: "block" }}>
                  {backupPreview.data?.classes?.length || 0} টি
                </b>
              </div>

              <div style={{ background: "var(--bg-color)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Users size={13} /> শিক্ষার্থী
                </span>
                <b style={{ fontSize: "16px", color: "var(--brand-primary)", marginTop: "2px", display: "block" }}>
                  {backupPreview.data?.students?.length || 0} জন
                </b>
              </div>

              <div style={{ background: "var(--bg-color)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <CreditCard size={13} /> কালেকশন / রসিদ
                </span>
                <b style={{ fontSize: "16px", color: "var(--brand-success)", marginTop: "2px", display: "block" }}>
                  {backupPreview.data?.payments?.length || 0} টি
                </b>
              </div>

              <div style={{ background: "var(--bg-color)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Landmark size={13} /> ব্যাংক/ক্যাশ জমা
                </span>
                <b style={{ fontSize: "16px", color: "var(--brand-success)", marginTop: "2px", display: "block" }}>
                  {backupPreview.data?.deposits?.length || 0} টি
                </b>
              </div>
            </div>

            {backupPreview.export_date && (
              <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "16px", background: "rgba(0, 118, 255, 0.06)", padding: "8px 12px", borderRadius: "6px" }}>
                📅 ব্যাকআপ তৈরির সময়কাল: <b>{new Date(backupPreview.export_date).toLocaleString('bn-BD')}</b>
                {backupPreview.teacher_email && <span> | ইমেইল: <b>{backupPreview.teacher_email}</b></span>}
              </div>
            )}

            <div style={{ background: "rgba(231, 76, 60, 0.08)", border: "1px solid rgba(231, 76, 60, 0.3)", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--brand-danger)", lineHeight: "1.5" }}>
                ⚠️ <b>সতর্কতা:</b> এই ব্যাকআপ রিস্টোর করলে ফাইলটির ডাটাগুলো বর্তমান ডাটাবেজের সাথে প্রতিস্থাপিত/যুক্ত হবে। আপনি কি রিস্টোর প্রক্রিয়া শুরু করতে চান?
              </p>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => { setShowRestoreModal(false); setBackupPreview(null); }}
                className="btn"
                disabled={importing}
                style={{ padding: "8px 16px", border: "1px solid var(--border-color)" }}
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={importing}
                className="btn btn-primary"
                style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                {importing ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                <span>{importing ? "রিস্টোর হচ্ছে..." : "হ্যাঁ, রিস্টোর নিশ্চিত করুন"}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
