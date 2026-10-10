"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { X, UploadCloud } from "lucide-react";
// We will dynamically import xlsx to keep the initial bundle small as per architecture
import * as XLSX from "xlsx";

export default function ExcelImportModal({ classId, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Basic validation and mapping
      const mappedData = data.map(row => ({
        roll_no: row["রোল"] || row["Roll"] || row["roll_no"],
        full_name: row["নাম"] || row["Name"] || row["full_name"],
        parent_phone: row["মোবাইল"] || row["Phone"] || row["parent_phone"] || null,
        opening_due: row["বকেয়া"] || row["Due"] || row["opening_due"] || 0,
      })).filter(row => row.roll_no && row.full_name);

      setPreview(mappedData);
    };
    reader.readAsBinaryString(selectedFile);
  };

  const handleImport = async () => {
    if (!user || !classId) return;
    if (preview.length === 0) {
      toast.error("কোনো বৈধ ডেটা পাওয়া যায়নি!");
      return;
    }

    setLoading(true);
    try {
      const insertData = preview.map(student => ({
        teacher_id: user.id,
        class_id: classId,
        roll_no: parseInt(student.roll_no),
        full_name: student.full_name,
        parent_phone: student.parent_phone ? String(student.parent_phone) : null,
        opening_due: parseFloat(student.opening_due) || 0,
      }));

      const { error } = await supabase.from("students").insert(insertData);

      if (error) {
        if (error.code === "23505") throw new Error("কিছু স্টুডেন্টের রোল নম্বর ইতোমধ্যে বিদ্যমান।");
        throw error;
      }

      toast.success(`✅ সফলভাবে ${insertData.length} জন স্টুডেন্ট ইমপোর্ট করা হয়েছে!`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(`❌ এরর: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div className="card" style={{ width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, color: "var(--brand-primary)" }}>এক্সেল থেকে স্টুডেন্ট আপলোড</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X /></button>
        </div>

        <div style={{ 
          border: "2px dashed var(--border-color)", 
          padding: "40px", 
          textAlign: "center",
          borderRadius: "var(--radius-md)",
          marginBottom: "20px"
        }}>
          <UploadCloud size={48} color="var(--brand-primary)" style={{ marginBottom: "10px" }} />
          <p style={{ marginBottom: "10px" }}>এক্সেল ফাইল নির্বাচন করুন (.xlsx বা .csv)</p>
          <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
          
          <div style={{ marginTop: "15px", fontSize: "13px", color: "var(--text-secondary)" }}>
            * এক্সেলে অবশ্যই <b>রোল</b> এবং <b>নাম</b> কলাম থাকতে হবে।
          </div>
        </div>

        {preview.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <h4>প্রিভিউ ({preview.length} জন পাওয়া গেছে)</h4>
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border-color)", marginTop: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead style={{ background: "var(--bg-color)" }}>
                  <tr>
                    <th style={{ padding: "8px", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>রোল</th>
                    <th style={{ padding: "8px", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>নাম</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((s, i) => (
                    <tr key={i}>
                      <td style={{ padding: "8px", borderBottom: "1px solid var(--border-color)" }}>{s.roll_no}</td>
                      <td style={{ padding: "8px", borderBottom: "1px solid var(--border-color)" }}>{s.full_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 5 && <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "5px" }}>আরো {preview.length - 5} জন স্টুডেন্ট রয়েছে...</p>}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button className="btn" onClick={onClose} disabled={loading}>বাতিল</button>
          <button className="btn btn-success" onClick={handleImport} disabled={loading || preview.length === 0}>
            {loading ? "আপলোড হচ্ছে..." : "ফাইনাল ইমপোর্ট করুন"}
          </button>
        </div>

      </div>
    </div>
  );
}
