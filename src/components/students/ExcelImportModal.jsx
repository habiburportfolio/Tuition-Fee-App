"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { X, UploadCloud, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

const normalizeKey = (str) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[_\-\.\:\(\)\[\]\/]/g, " ")
    .replace(/\s+/g, " ");

const isRollKey = (norm) => {
  if (norm.includes("phone") || norm.includes("mobile") || norm.includes("নাম")) return false;
  return (
    ["roll", "roll no", "roll no.", "roll number", "roll_no", "id", "student id", "sl", "sl no", "serial", "রোল", "রোল নং", "রোল নম্বর", "আইডি", "ক্রমিক"].includes(norm) ||
    norm.startsWith("roll") ||
    norm.startsWith("রোল")
  );
};

const isNameKey = (norm) => {
  if (
    norm.includes("parent") ||
    norm.includes("father") ||
    norm.includes("mother") ||
    norm.includes("guardian") ||
    norm.includes("পিতা") ||
    norm.includes("মাতা") ||
    norm.includes("অভিভাবক")
  ) {
    return false;
  }
  return (
    ["name", "full name", "student name", "student's name", "students name", "student", "নাম", "শিক্ষার্থীর নাম", "ছাত্রের নাম", "ছাত্রীর নাম", "ছাত্র/ছাত্রীর নাম"].includes(norm) ||
    norm.includes("student name") ||
    norm.endsWith("name") ||
    norm.includes("নাম")
  );
};

const isParentKey = (norm) => {
  return (
    norm.includes("father") ||
    norm.includes("parent") ||
    norm.includes("mother") ||
    norm.includes("guardian") ||
    norm.includes("পিতা") ||
    norm.includes("মাতা") ||
    norm.includes("অভিভাবক")
  );
};

const isPhoneKey = (norm) => {
  return (
    norm.includes("phone") ||
    norm.includes("mobile") ||
    norm.includes("contact") ||
    norm.includes("মোবাইল") ||
    norm.includes("ফোন") ||
    norm.includes("যোগাযোগ")
  );
};

const isDueKey = (norm) => {
  return (
    norm.includes("due") ||
    norm.includes("arrear") ||
    norm.includes("বকেয়া") ||
    norm.includes("ডিউ")
  );
};

export default function ExcelImportModal({ classId, classInfo, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [targetClassId, setTargetClassId] = useState(classId || (classInfo?.allVariants?.[0]?.id) || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedColumns, setDetectedColumns] = useState([]);

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "রোল": 1,
        "নাম": "তানভীর আহমেদ",
        "অভিভাবকের নাম": "মোঃ রফিকুল ইসলাম",
        "মোবাইল নম্বর": "01712345678",
        "পূর্বের বকেয়া": 0
      },
      {
        "রোল": 2,
        "নাম": "সুমাইয়া জাহান",
        "অভিভাবকের নাম": "মোঃ মোর্শেদ আলম",
        "মোবাইল নম্বর": "01812345678",
        "পূর্বের বকেয়া": 500
      },
      {
        "রোল": 3,
        "নাম": "রাকিবুল হাসান",
        "অভিভাবকের নাম": "মোঃ আব্দুল কাদের",
        "মোবাইল নম্বর": "01912345678",
        "পূর্বের বকেয়া": 0
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_Upload_Sample.xlsx");
    toast.success("নমুনা এক্সেল ফাইল ডাউনলোড হয়েছে!");
  };

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setErrorMsg("");
    setPreview([]);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target.result;
        const wb = XLSX.read(buffer, { type: "array" });
        const wsname = wb.SheetNames[0];
        if (!wsname) {
          throw new Error("এক্সেলে কোনো শিট পাওয়া যায়নি।");
        }

        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (!rawData || rawData.length === 0) {
          throw new Error("এক্সেল ফাইলে কোনো ডেটা খুঁজে পাওয়া যায়নি।");
        }

        const headers = Object.keys(rawData[0] || {});
        setDetectedColumns(headers);

        let rollKey = null;
        let nameKey = null;
        let parentKey = null;
        let phoneKey = null;
        let dueKey = null;

        for (const h of headers) {
          const norm = normalizeKey(h);
          if (!rollKey && isRollKey(norm)) rollKey = h;
          else if (!nameKey && isNameKey(norm)) nameKey = h;
          else if (!parentKey && isParentKey(norm)) parentKey = h;
          else if (!phoneKey && isPhoneKey(norm)) phoneKey = h;
          else if (!dueKey && isDueKey(norm)) dueKey = h;
        }

        if (!rollKey || !nameKey) {
          const missing = [];
          if (!rollKey) missing.push("'রোল' (Roll)");
          if (!nameKey) missing.push("'নাম' (Name)");
          const err = `ফাইলে ${missing.join(" এবং ")} কলাম পাওয়া যায়নি। ফাইলে বিদ্যমান কলাম: [${headers.join(", ")}]`;
          setErrorMsg(err);
          toast.error("ফাইলে রোল অথবা নাম কলাম পাওয়া যায়নি!", { duration: 5000 });
          return;
        }

        const mappedData = [];
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          const rawRoll = String(row[rollKey] || "").trim();
          const rawName = String(row[nameKey] || "").trim();

          const parsedRoll = parseInt(rawRoll, 10);
          if (!isNaN(parsedRoll) && rawName) {
            mappedData.push({
              roll_no: parsedRoll,
              full_name: rawName,
              parent_name: parentKey && row[parentKey] ? String(row[parentKey]).trim() : null,
              parent_phone: phoneKey && row[phoneKey] ? String(row[phoneKey]).trim() : null,
              opening_due: dueKey && row[dueKey] ? parseFloat(row[dueKey]) || 0 : 0
            });
          }
        }

        if (mappedData.length === 0) {
          setErrorMsg("ফাইলে বৈধ রোল এবং নাম সম্বলিত কোনো শিক্ষার্থী পাওয়া যায়নি।");
          toast.error("কোনো বৈধ রেকর্ড পাওয়া যায়নি!");
          return;
        }

        // Sort by roll number ascending
        mappedData.sort((a, b) => a.roll_no - b.roll_no);
        setPreview(mappedData);
        toast.success(`✅ ${mappedData.length} জন শিক্ষার্থীর তথ্য পাওয়া গেছে!`);
      } catch (err) {
        console.error("Excel parse error:", err);
        setErrorMsg(`ফাইল পড়তে সমস্যা হয়েছে: ${err.message}`);
        toast.error(`❌ ফাইল রিড এরর: ${err.message}`);
      }
    };

    reader.onerror = () => {
      setErrorMsg("ফাইল লোড করতে ব্যর্থ হয়েছে।");
      toast.error("ফাইল লোড করতে ব্যর্থ হয়েছে।");
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    const finalClassId = targetClassId || classId;
    if (!user || !finalClassId) return;
    if (preview.length === 0) {
      toast.error("কোনো বৈধ ডেটা পাওয়া যায়নি!");
      return;
    }

    setLoading(true);
    try {
      const insertData = preview.map((student) => ({
        teacher_id: user.id,
        class_id: finalClassId,
        roll_no: student.roll_no,
        full_name: student.full_name,
        parent_name: student.parent_name || null,
        parent_phone: student.parent_phone ? String(student.parent_phone) : null,
        opening_due: student.opening_due || 0
      }));

      const { error } = await supabase.from("students").insert(insertData);

      if (error) {
        if (error.code === "23505") {
          throw new Error("কিছু স্টুডেন্টের রোল নম্বর ইতোমধ্যে এই ক্লাসে বিদ্যমান। দয়া করে ডুপ্লিকেট রোল বাদ দিয়ে চেষ্টা করুন।");
        }
        throw error;
      }

      toast.success(`🎉 সফলভাবে ${insertData.length} জন স্টুডেন্ট ইমপোর্ট করা হয়েছে!`, { duration: 4000 });
      if (typeof onSuccess === "function") {
        onSuccess();
      }
      onClose();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`, { duration: 5000 });
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
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "650px",
          maxHeight: "90vh",
          overflowY: "auto",
          position: "relative"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, color: "var(--brand-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <UploadCloud size={24} /> এক্সেল থেকে স্টুডেন্ট আপলোড
            </h3>
            {classInfo && (
              <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                টার্গেট ক্লাস: <b>{classInfo.class_name}</b> {classInfo.group_name ? `(${classInfo.group_name})` : ''} {classInfo.section_name ? `[শাখা: ${classInfo.section_name}]` : ''}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
            <X size={20} />
          </button>
        </div>

        {classInfo?.allVariants && classInfo.allVariants.length > 1 && (
          <div style={{ marginBottom: "16px", padding: "12px", background: "var(--bg-color)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
              বিভাগ / গ্রুপ নির্বাচন করুন (যে বিভাগে স্টুডেন্ট ইমপোর্ট হবে):
            </label>
            <select
              className="form-control"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", fontWeight: "500" }}
            >
              {classInfo.allVariants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.group_name || "সাধারণ"} {v.section_name ? `(${v.section_name})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Download Sample Template Banner */}
        <div
          style={{
            background: "rgba(0, 118, 255, 0.08)",
            border: "1px solid rgba(0, 118, 255, 0.25)",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div style={{ fontSize: "13px" }}>
            <b>ফর্ম্যাট বুঝতে সমস্যা?</b> নমুনা ফাইল ডাউনলোড করে দেখে নিন।
          </div>
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="btn"
            style={{
              padding: "6px 14px",
              fontSize: "13px",
              background: "var(--brand-primary)",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Download size={14} /> নমুনা এক্সেল ডাউনলোড
          </button>
        </div>

        {/* Upload Box */}
        <div
          style={{
            border: "2px dashed var(--border-color)",
            padding: "30px 20px",
            textAlign: "center",
            borderRadius: "var(--radius-md)",
            marginBottom: "20px",
            backgroundColor: "var(--bg-color)"
          }}
        >
          <UploadCloud size={44} color="var(--brand-primary)" style={{ marginBottom: "10px" }} />
          <p style={{ margin: "0 0 10px 0", fontWeight: "600" }}>এক্সেল ফাইল নির্বাচন করুন (.xlsx, .xls, .csv)</p>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            style={{ margin: "0 auto", display: "block" }}
          />
          <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
            * কলাম নাম বাংলায় (<b>রোল</b>, <b>নাম</b>, <b>মোবাইল</b>, <b>বকেয়া</b>) অথবা ইংরেজিতে (<b>Roll</b>, <b>Name</b>, <b>Phone</b>, <b>Due</b>) হতে পারে।
          </div>
        </div>

        {/* Error Notice */}
        {errorMsg && (
          <div
            style={{
              background: "rgba(231, 76, 60, 0.1)",
              border: "1px solid var(--brand-danger)",
              color: "var(--brand-danger)",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              marginBottom: "20px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              fontSize: "13px"
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>ইমপোর্ট করা সম্ভব হচ্ছে না</div>
              <div>{errorMsg}</div>
            </div>
          </div>
        )}

        {/* Preview Table */}
        {preview.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "var(--brand-success)" }}>
                <CheckCircle2 size={18} /> প্রিভিউ ({preview.length} জন শিক্ষার্থী প্রস্তুত)
              </h4>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>রোল অনুযায়ী সাজানো</span>
            </div>

            <div
              style={{
                maxHeight: "220px",
                overflowY: "auto",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-sm)"
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead style={{ background: "var(--bg-color)", position: "sticky", top: 0 }}>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>রোল</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>নাম</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>অভিভাবক</th>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>মোবাইল</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>পূর্বের বকেয়া</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((s, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "8px 12px", fontWeight: "bold" }}>{s.roll_no}</td>
                      <td style={{ padding: "8px 12px" }}>{s.full_name}</td>
                      <td style={{ padding: "8px 12px", color: "var(--text-secondary)" }}>{s.parent_name || "-"}</td>
                      <td style={{ padding: "8px 12px" }}>{s.parent_phone || "-"}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: s.opening_due > 0 ? "var(--brand-danger)" : "inherit" }}>
                        {s.opening_due} ৳
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 10 && (
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "6px" }}>
                আরো {preview.length - 10} জন শিক্ষার্থী তালিকায় রয়েছে...
              </p>
            )}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn" onClick={onClose} disabled={loading} style={{ border: "1px solid var(--border-color)" }}>
            বাতিল
          </button>
          <button
            className="btn btn-success"
            onClick={handleImport}
            disabled={loading || preview.length === 0}
            style={{ minWidth: "160px" }}
          >
            {loading ? "আপলোড হচ্ছে..." : `ফাইনাল ইমপোর্ট করুন ${preview.length > 0 ? `(${preview.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

