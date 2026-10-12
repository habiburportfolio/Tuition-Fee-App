"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Printer, X, Download, FileText, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import SchoolPrintHeader from "@/components/common/SchoolPrintHeader";

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

          // Fetch linked payments to construct fee breakdown (খাতসমূহের বিবরণ)
          const depositIds = filtered.map(d => d.id);
          if (depositIds.length > 0) {
            const { data: depPayments } = await supabase
              .from("payments")
              .select("deposit_id, amount_paid, payment_method")
              .in("deposit_id", depositIds)
              .eq("is_voided", false);

            if (depPayments) {
              const breakdownMap = {};
              depPayments.forEach(p => {
                if (!breakdownMap[p.deposit_id]) breakdownMap[p.deposit_id] = {};
                let parsed = false;
                if (p.payment_method) {
                  try {
                    const meta = JSON.parse(p.payment_method);
                    if (meta && Array.isArray(meta.items)) {
                      parsed = true;
                      meta.items.forEach(it => {
                        let kName = it.name || "সাধারণ ফি";
                        if (kName === "পূর্বের বকেয়া আদায়") kName = "মাসিক বেতন ও পূর্বের বকেয়া";
                        breakdownMap[p.deposit_id][kName] = (breakdownMap[p.deposit_id][kName] || 0) + Number(it.amount || 0);
                      });
                      if (meta.fine && Number(meta.fine) > 0) {
                        breakdownMap[p.deposit_id]["বিলম্ব ফি"] = (breakdownMap[p.deposit_id]["বিলম্ব ফি"] || 0) + Number(meta.fine);
                      }
                    }
                  } catch {
                    // plain
                  }
                }
                if (!parsed) {
                  breakdownMap[p.deposit_id]["মাসিক বেতন ও বকেয়া ফি"] = (breakdownMap[p.deposit_id]["মাসিক বেতন ও বকেয়া ফি"] || 0) + Number(p.amount_paid || 0);
                }
              });

              filtered.forEach(d => {
                const breakdown = breakdownMap[d.id] || {};
                const entries = Object.entries(breakdown);
                if (entries.length > 0) {
                  d.khatList = entries.map(([name, amt]) => ({ name, amt }));
                  d.khatSummary = entries.map(([name, amt]) => `${name}: ${amt}৳`).join(", ");
                } else {
                  d.khatList = [{ name: "মাসিক বেতন ও বকেয়া ফি", amt: d.total_amount }];
                  d.khatSummary = `মাসিক বেতন ও বকেয়া ফি: ${d.total_amount}৳`;
                }
              });
            }
          }

          filtered.forEach(d => {
            if (!d.khatList) {
              d.khatList = [{ name: "মাসিক বেতন ও বকেয়া ফি", amt: d.total_amount }];
              d.khatSummary = `মাসিক বেতন ও বকেয়া ফি: ${d.total_amount}৳`;
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
        "ফি এর খাতসমূহ": item.khatList ? item.khatList.map(k => `${k.name}: ${k.amt}৳`).join("\n") : (item.khatSummary || "মাসিক বেতন ও বকেয়া ফি"),
        "পরিমাণ (৳)": item.total_amount
      }));
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${reportType}_report.xlsx`);
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleExportPDF = async () => {
    if (data.length === 0) return toast.error("কোনো ডাটা নেই");
    const printArea = document.getElementById("print-area");
    if (!printArea) return toast.error("প্রিন্ট এরিয়া পাওয়া যায়নি");

    setGeneratingPdf(true);
    const toastId = toast.loading("পিডিএফ প্রস্তুত করা হচ্ছে...");

    try {
      // Offscreen clone with consistent A4 printable width
      const clone = printArea.cloneNode(true);
      clone.style.width = "794px";
      clone.style.minWidth = "794px";
      clone.style.maxWidth = "794px";
      clone.style.height = "auto";
      clone.style.maxHeight = "none";
      clone.style.overflow = "visible";
      clone.style.position = "fixed";
      clone.style.top = "-9999px";
      clone.style.left = "0";
      clone.style.zIndex = "-9999";
      clone.style.backgroundColor = "#ffffff";
      clone.style.color = "#111111";
      clone.style.boxSizing = "border-box";
      clone.style.padding = "24px";

      document.body.appendChild(clone);

      // Measure row boundaries to avoid slicing rows across pages
      const cloneRect = clone.getBoundingClientRect();
      const rows = Array.from(clone.querySelectorAll("tr"));
      const rowBottomOffsets = rows.map((r) => {
        const rRect = r.getBoundingClientRect();
        return rRect.bottom - cloneRect.top;
      });

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        windowWidth: 1024,
      });

      document.body.removeChild(clone);

      const doc = new jsPDF("p", "mm", "a4");
      const pdfWidth = 190; // A4 (210mm) - 2 * 10mm margins
      const pageHeightMm = 277; // A4 (297mm) - 2 * 10mm margins
      const pxPerMm = (canvas.width / 2) / pdfWidth; // canvas scale was 2
      const pageHeightCssPx = pageHeightMm * pxPerMm;

      let currentTopCssPx = 0;
      const totalCssHeight = canvas.height / 2;
      let pageIndex = 0;

      while (currentTopCssPx < totalCssHeight) {
        let chunkHeightCssPx = Math.min(pageHeightCssPx, totalCssHeight - currentTopCssPx);

        // Find nearest row bottom if not the final page
        if (currentTopCssPx + chunkHeightCssPx < totalCssHeight && rowBottomOffsets.length > 0) {
          const maxCut = currentTopCssPx + chunkHeightCssPx;
          const eligibleRows = rowBottomOffsets.filter(
            (b) => b > currentTopCssPx + (pageHeightCssPx * 0.6) && b <= maxCut
          );
          if (eligibleRows.length > 0) {
            const bestCut = Math.max(...eligibleRows);
            chunkHeightCssPx = bestCut - currentTopCssPx;
          }
        }

        const chunkTopPx = Math.round(currentTopCssPx * 2);
        const chunkHeightPx = Math.round(chunkHeightCssPx * 2);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = chunkHeightPx;
        const pageCtx = pageCanvas.getContext("2d");

        pageCtx.fillStyle = "#ffffff";
        pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        pageCtx.drawImage(
          canvas,
          0, chunkTopPx, canvas.width, chunkHeightPx,
          0, 0, canvas.width, chunkHeightPx
        );

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const sliceHeightMm = chunkHeightCssPx / pxPerMm;

        if (pageIndex > 0) {
          doc.addPage();
        }

        doc.addImage(pageImgData, "JPEG", 10, 10, pdfWidth, sliceHeightMm, undefined, "FAST");

        currentTopCssPx += chunkHeightCssPx;
        pageIndex++;
      }

      const fileName = `${reportType === "collection" ? "Student_Collection_Report" : "Deposit_Report"}_${period === "monthly" ? `${selectedMonth}_${selectedYear}` : selectedYear}.pdf`;
      doc.save(fileName);
      toast.success("পিডিএফ ডাউনলোড সম্পন্ন হয়েছে!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("পিডিএফ ডাউনলোডে সমস্যা হয়েছে। সরাসরি প্রিন্ট অপশন ব্যবহার করুন।", { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
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
            <button
              onClick={handleExportPDF}
              disabled={generatingPdf}
              className="btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "#F40F02",
                color: "white",
                opacity: generatingPdf ? 0.7 : 1,
                cursor: generatingPdf ? "not-allowed" : "pointer",
              }}
            >
              {generatingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              {generatingPdf ? "পিডিএফ হচ্ছে..." : "PDF"}
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <Printer size={16} /> প্রিন্ট করুন
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" style={{ padding: "20px", overflowY: "auto", flex: 1, backgroundColor: "white", color: "#111" }}>
          {/* School Header (Requirement 4) */}
          <SchoolPrintHeader
            title={reportType === "collection" ? "স্টুডেন্ট ফি কালেকশন রিপোর্ট" : "বিদ্যালয়ে জমা রিপোর্ট"}
            subtitle={currentClass && reportType === "collection" ? `শ্রেণি: ${currentClass.class_name} ${currentClass.group_name ? `(${currentClass.group_name})` : ""} ${currentClass.section_name ? `[শাখা: ${currentClass.section_name}]` : ""}` : null}
            extraInfo={`সময়কাল: ${period === "monthly" ? `${monthNames[selectedMonth - 1]} ${selectedYear}` : `${selectedYear} সাল`}`}
          />


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
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>ব্যাংক/শাখা</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left" }}>স্লিপ নং</th>
                        <th style={{ padding: "8px", border: "1px solid black", textAlign: "left", minWidth: "260px" }}>ফি এর খাতসমূহ (জমার বিবরণ)</th>
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
                          <td style={{ padding: "4px 6px", border: "1px solid black", verticalAlign: "top" }}>
                            {item.khatList && item.khatList.length > 0 ? (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", background: "#ffffff" }}>
                                <thead>
                                  <tr style={{ background: "#f1f3f5", borderBottom: "1px solid #ccc" }}>
                                    <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "left", fontSize: "10.5px" }}>খাত</th>
                                    <th style={{ padding: "3px 6px", border: "1px solid #ccc", textAlign: "right", fontSize: "10.5px", width: "65px" }}>পরিমাণ</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.khatList.map((k, ki) => (
                                    <tr key={ki} style={{ background: ki % 2 === 0 ? "#ffffff" : "#fbfbfb" }}>
                                      <td style={{ padding: "3px 6px", border: "1px solid #ddd", textAlign: "left", color: "#111" }}>{k.name}</td>
                                      <td style={{ padding: "3px 6px", border: "1px solid #ddd", textAlign: "right", fontWeight: "600", color: "#111", whiteSpace: "nowrap" }}>
                                        {k.amt} ৳
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <span style={{ fontSize: "12px" }}>{item.khatSummary || "মাসিক বেতন ও বকেয়া ফি"}</span>
                            )}
                          </td>
                        </>
                      )}
                      
                      <td style={{ padding: "6px", border: "1px solid black", textAlign: "right", fontWeight: "bold" }}>
                        {reportType === "collection" ? item.amount_paid : item.total_amount}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Total Row */}
                  <tr>
                    <td colSpan={5} style={{ padding: "8px", border: "1px solid black", textAlign: "right", fontWeight: "bold" }}>
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
