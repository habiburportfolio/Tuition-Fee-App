"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Printer, X, Download, FileText } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PrintReportsModal({ classId, classInfo, onClose }) {
  const [reportType, setReportType] = useState("collection"); // "collection" or "deposit"
  const [period, setPeriod] = useState("monthly"); // "monthly" or "yearly"
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentClass, setCurrentClass] = useState(classInfo || null);

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  useEffect(() => {
    const fetchData = async () => {
      if (!classId && reportType === "collection") return;
      setLoading(true);
      
      try {
        if (reportType === "collection") {
          // Fetch students in this class
          const { data: students } = await supabase.from("students").select("id").eq("class_id", classId);
          const studentIds = students ? students.map(s => s.id) : [];

          if (studentIds.length === 0) {
            setData([]);
            setLoading(false);
            return;
          }

          // Fetch payments
          const { data: payments } = await supabase
            .from("payments")
            .select("*, students(full_name, roll_no)")
            .in("student_id", studentIds)
            .eq("is_voided", false)
            .order("paid_at", { ascending: true });

          // Filter by date
          const filtered = (payments || []).filter(p => {
            const date = new Date(p.paid_at);
            if (period === "yearly") {
              return date.getFullYear() === selectedYear;
            } else {
              return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
            }
          });
          
          setData(filtered);
        } else {
          // Deposits
          const { data: deposits } = await supabase
            .from("deposits")
            .select("*")
            .order("deposited_at", { ascending: true });
            
          const filtered = (deposits || []).filter(d => {
            const date = new Date(d.deposited_at);
            if (period === "yearly") {
              return date.getFullYear() === selectedYear;
            } else {
              return date.getFullYear() === selectedYear && (date.getMonth() + 1) === selectedMonth;
            }
          });
          
          setData(filtered);
        }
      } catch (error) {
        toast.error("ডাটা ফেচ করতে সমস্যা হয়েছে");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportType, period, selectedMonth, selectedYear, classId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    if (data.length === 0) return toast.error("কোনো ডাটা নেই");
    
    let exportData = [];
    if (reportType === "collection") {
      exportData = data.map(item => ({
        "তারিখ": new Date(item.paid_at).toLocaleDateString('bn-BD'),
        "স্টুডেন্ট": item.students?.full_name,
        "রোল": item.students?.roll_no,
        "বিভাগ (Group)": currentClass?.group_name || "-",
        "রসিদ নং": item.receipt_no,
        "পরিমাণ (৳)": item.amount_paid
      }));
    } else {
      exportData = data.map(item => ({
        "তারিখ": new Date(item.deposited_at).toLocaleDateString('bn-BD'),
        "মাধ্যম": item.deposit_channel,
        "ব্যাংকের নাম": item.bank_name || "-",
        "স্লিপ নং": item.slip_number || "-",
        "পরিমাণ (৳)": item.total_amount
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${reportType}_report.xlsx`);
  };

  const handleExportPDF = () => {
    if (data.length === 0) return toast.error("কোনো ডাটা নেই");
    const doc = new jsPDF();
    
    doc.text(reportType === "collection" ? "Student Collection Report" : "Deposit Report", 14, 10);
    
    let tableData = [];
    let headers = [];
    
    if (reportType === "collection") {
      headers = [["Date", "Student Name", "Roll", "Group", "Receipt No", "Amount"]];
      tableData = data.map(item => [
        new Date(item.paid_at).toLocaleDateString('en-GB'),
        item.students?.full_name || "",
        item.students?.roll_no || "",
        currentClass?.group_name || "-",
        item.receipt_no || "",
        item.amount_paid
      ]);
    } else {
      headers = [["Date", "Channel", "Bank", "Slip No", "Amount"]];
      tableData = data.map(item => [
        new Date(item.deposited_at).toLocaleDateString('en-GB'),
        item.deposit_channel,
        item.bank_name || "-",
        item.slip_number || "-",
        item.total_amount
      ]);
    }

    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 20,
    });
    
    doc.save(`${reportType}_report.pdf`);
  };

  const totalAmount = data.reduce((sum, item) => sum + Number(reportType === "collection" ? item.amount_paid : item.total_amount), 0);
  
  const monthNames = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
          .print-hide { display: none !important; }
        }
      `}</style>
      
      <div className="card" style={{ width: "95%", maxWidth: "800px", padding: 0, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        
        <div className="print-hide" style={{ background: "var(--brand-primary)", color: "white", padding: "15px", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>রিপোর্ট প্রিন্ট</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X /></button>
        </div>

        <div className="print-hide" style={{ padding: "15px", borderBottom: "1px solid var(--border-color)", display: "flex", gap: "10px", flexWrap: "wrap", background: "var(--bg-color)" }}>
          <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
            <option value="collection">কালেকশন রিপোর্ট</option>
            <option value="deposit">জমা রিপোর্ট</option>
          </select>
          
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
            <option value="monthly">মাসিক</option>
            <option value="yearly">বার্ষিক</option>
          </select>
          
          {period === "monthly" && (
            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          )}

          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}>
            {[...Array(5)].map((_, i) => {
              const y = new Date().getFullYear() - i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>

          <div style={{ display: "flex", gap: "5px", marginLeft: "auto" }}>
            <button onClick={handleExportExcel} className="btn" style={{ display: "flex", alignItems: "center", gap: "5px", background: "#107c41", color: "white" }}>
              <Download size={16} /> Excel
            </button>
            <button onClick={handleExportPDF} className="btn" style={{ display: "flex", alignItems: "center", gap: "5px", background: "#F40F02", color: "white" }}>
              <FileText size={16} /> PDF
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Printer size={16} /> প্রিন্ট করুন
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" style={{ padding: "20px", overflowY: "auto", flex: 1, backgroundColor: "white" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h2>{reportType === "collection" ? "স্টুডেন্ট কালেকশন রিপোর্ট" : "বিদ্যালয়ে জমা রিপোর্ট"}</h2>
            {currentClass && reportType === "collection" && (
              <h4 style={{ margin: "4px 0", color: "#333" }}>
                শ্রেণি: {currentClass.class_name} {currentClass.group_name ? `(${currentClass.group_name})` : ''} {currentClass.section_name ? `[শাখা: ${currentClass.section_name}]` : ''}
              </h4>
            )}
            <p style={{ margin: "5px 0", color: "#666" }}>
              {period === "monthly" ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : `${selectedYear} সাল`}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px" }}>লোড হচ্ছে...</div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "gray" }}>কোনো ডাটা পাওয়া যায়নি</div>
          ) : (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", border: "1px solid black" }}>
                <thead>
                  <tr style={{ background: "#f2f2f2" }}>
                    <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>তারিখ</th>
                    {reportType === "collection" ? (
                      <>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>স্টুডেন্ট</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>রোল</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>বিভাগ (Group)</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>রসিদ নং</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>মাধ্যম</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>ব্যাংকের নাম</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>স্লিপ নং</th>
                      </>
                    )}
                    <th style={{ padding: "8px", border: "1px solid black", textAlign: "right" }}>পরিমাণ (৳)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td style={{ padding: "6px", border: "1px solid black" }}>
                        {new Date(reportType === "collection" ? item.paid_at : item.deposited_at).toLocaleDateString('bn-BD')}
                      </td>
                      
                      {reportType === "collection" ? (
                        <>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.students?.full_name}</td>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.students?.roll_no}</td>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{currentClass?.group_name || "-"}</td>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.receipt_no}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.deposit_channel}</td>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.bank_name || "-"}</td>
                          <td style={{ padding: "6px", border: "1px solid black" }}>{item.slip_number || "-"}</td>
                        </>
                      )}
                      
                      <td style={{ padding: "6px", border: "1px solid black", textAlign: "right", fontWeight: "bold" }}>
                        {reportType === "collection" ? item.amount_paid : item.total_amount}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr>
                    <td colSpan={reportType === "collection" ? 5 : 4} style={{ padding: "8px", border: "1px solid black", textAlign: "right", fontWeight: "bold" }}>
                      সর্বমোট:
                    </td>
                    <td style={{ padding: "8px", border: "1px solid black", textAlign: "right", fontWeight: "bold", fontSize: "16px" }}>
                      {totalAmount} ৳
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
