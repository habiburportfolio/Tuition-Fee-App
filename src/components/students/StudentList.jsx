"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import ExcelImportModal from "./ExcelImportModal";
import ManualStudentModal from "./ManualStudentModal";
import EditStudentModal from "./EditStudentModal";
import DeleteGroupModal from "./DeleteGroupModal";
import PromoteStudentsModal from "./PromoteStudentsModal";
import SchoolPrintHeader from "@/components/common/SchoolPrintHeader";
import toast from "react-hot-toast";
import { Users, FileSpreadsheet, Plus, ArrowRight, Edit, Trash2, AlertTriangle, Printer, Award } from "lucide-react";

export default function StudentList({ classId, classInfo }) {
  const { user, userRole } = useAuth();
  const { guardAction } = useLock();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentClass, setCurrentClass] = useState(classInfo || null);
  const [filterWaiver, setFilterWaiver] = useState("all");

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  const fetchStudents = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .order("roll_no", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error(`❌ স্টুডেন্ট ফেচ করতে সমস্যা: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (user && classId) {
      fetchStudents();
    }
  }, [user, classId, fetchStudents]);

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map(s => s.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    guardAction(`নির্বাচিত ${selectedIds.length} জন শিক্ষার্থী ডিলিট`, async () => {
      if (!window.confirm(`⚠️ আপনি কি নিশ্চিত যে নির্বাচিত ${selectedIds.length} জন শিক্ষার্থীকে মুছে ফেলতে চান? (পেমেন্ট রেকর্ড থাকলে ডিলিট হবে না)`)) {
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from("students").delete().in("id", selectedIds);
        if (error) {
          if (error.code === '23503') throw new Error("কিছু শিক্ষার্থীর পেমেন্ট রেকর্ড থাকায় তাদের মুছে ফেলা সম্ভব নয়।");
          throw error;
        }
        toast.success(`✅ সফলভাবে ${selectedIds.length} জন শিক্ষার্থী মুছে ফেলা হয়েছে!`);
        fetchStudents();
      } catch (error) {
        toast.error(`❌ এরর: ${error.message}`);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteAllInClass = () => {
    if (students.length === 0) return toast.error("এই ক্লাসে মোছার মতো কোনো শিক্ষার্থী নেই!");
    const groupName = currentClass?.group_name ? `(${currentClass.group_name})` : "";
    
    guardAction("ক্লাসের সকল শিক্ষার্থী ডিলিট", async () => {
      if (!window.confirm(`🚨 সাবধান: আপনি কি বর্তমান ক্লাসের [${currentClass?.class_name || ""} ${groupName}] সকল (${students.length} জন) শিক্ষার্থীকে মুছে ফেলতে চান?`)) {
        return;
      }

      setLoading(true);
      try {
        const { error } = await supabase.from("students").delete().eq("class_id", classId);
        if (error) {
          if (error.code === '23503') throw new Error("কিছু শিক্ষার্থীর পেমেন্ট রেকর্ড সংরক্ষিত থাকায় সম্পূর্ণ মোছা যায়নি।");
          throw error;
        }
        toast.success("✅ এই ক্লাসের সকল শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে!");
        fetchStudents();
      } catch (error) {
        toast.error(`❌ এরর: ${error.message}`);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleDeleteSingleStudent = (student) => {
    guardAction(`শিক্ষার্থী ডিলিট (রোল ${student.roll_no})`, async () => {
      if (!window.confirm(`আপনি কি রোল ${student.roll_no} (${student.full_name})-কে ডিলিট করতে চান? (পেমেন্ট রেকর্ড থাকলে ডিলিট হবে না)`)) return;
      try {
        const { error } = await supabase.from("students").delete().eq("id", student.id);
        if (error) {
          if (error.code === '23503') throw new Error("এই শিক্ষার্থীর পেমেন্ট রেকর্ড থাকায় ডিলিট করা সম্ভব নয়।");
          throw error;
        }
        toast.success("শিক্ষার্থী সফলভাবে মুছে ফেলা হয়েছে!");
        setSelectedIds(prev => prev.filter(x => x !== student.id));
        fetchStudents();
      } catch (error) {
        toast.error(`❌ এরর: ${error.message}`);
      }
    });
  };

  const handleEditStudent = (student) => {
    guardAction(`শিক্ষার্থী তথ্য এডিট (রোল ${student.roll_no})`, () => {
      setEditingStudent(student);
    });
  };

  const handlePrintStudentList = () => {
    window.print();
  };

  const getGroupBadge = (group) => {
    if (!group) return <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>সাধারণ</span>;
    const isSci = group.toLowerCase() === "science";
    const isCom = group.toLowerCase() === "commerce";
    const isArt = group.toLowerCase() === "arts";

    const label = isSci ? "Science (বিজ্ঞান)" : isCom ? "Commerce (ব্যবসায় শিক্ষা)" : isArt ? "Arts (মানবিক)" : group;
    const color = isSci ? "#0070f3" : isCom ? "#27ae60" : isArt ? "#8e44ad" : "var(--brand-primary)";
    const bg = isSci ? "rgba(0, 112, 243, 0.12)" : isCom ? "rgba(39, 174, 96, 0.12)" : isArt ? "rgba(142, 68, 173, 0.12)" : "rgba(0,0,0,0.06)";

    return (
      <span style={{ 
        padding: "3px 10px", 
        borderRadius: "var(--radius-full)", 
        fontSize: "12px", 
        fontWeight: "700",
        color: color, 
        backgroundColor: bg,
        border: `1px solid ${color}`
      }}>
        {label}
      </span>
    );
  };

  const getWaiverBadge = (status) => {
    if (!status || status === "None") return <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>সাধারণ</span>;
    if (status.includes("উপবৃত্তি") || status.includes("Upobritti")) {
      return (
        <span style={{ padding: "3px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: "700", background: "rgba(39, 174, 96, 0.15)", color: "var(--brand-success)", border: "1px solid var(--brand-success)" }}>
          🎓 উপবৃত্তি (বেতন ফ্রি)
        </span>
      );
    }
    if (status.includes("বৃত্তি") || status.includes("Scholarship")) {
      return (
        <span style={{ padding: "3px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: "700", background: "rgba(0, 112, 243, 0.15)", color: "var(--brand-primary)", border: "1px solid var(--brand-primary)" }}>
          🏆 বৃত্তি (বেতন ফ্রি)
        </span>
      );
    }
    if (status === "Full Free") {
      return (
        <span style={{ padding: "3px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: "700", background: "rgba(39, 174, 96, 0.15)", color: "var(--brand-success)", border: "1px solid var(--brand-success)" }}>
          বিনা-বেতন (১০০% ফ্রি)
        </span>
      );
    }
    if (status === "Half Free") {
      return (
        <span style={{ padding: "3px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: "700", background: "rgba(243, 156, 18, 0.15)", color: "var(--brand-warning)", border: "1px solid var(--brand-warning)" }}>
          অর্ধ-বেতন (৫০% ছাড়)
        </span>
      );
    }
    return (
      <span style={{ padding: "3px 8px", borderRadius: "var(--radius-full)", fontSize: "11px", fontWeight: "700", background: "rgba(0,0,0,0.06)", color: "var(--text-primary)" }}>
        {status}
      </span>
    );
  };

  const filteredStudents = students.filter(s => {
    if (filterWaiver === "all") return true;
    if (filterWaiver === "waiver") return s.waiver_status && s.waiver_status !== "None";
    if (filterWaiver === "due") return Number(s.opening_due) > 0;
    return true;
  });

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      
      {/* Action Header (Hidden in Print) */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h3 style={{ color: "var(--brand-primary)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Users /> স্টুডেন্ট লিস্ট ({filteredStudents.length} জন)
          </h3>
          {currentClass && (
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
              ক্লাস: <b>{currentClass.class_name}</b> {currentClass.group_name ? `(${currentClass.group_name})` : ''} {currentClass.section_name ? `[শাখা: ${currentClass.section_name}]` : ''} - সেশন: {currentClass.session_year}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button 
            className="btn btn-primary" 
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
            onClick={() => setShowManualModal(true)}
          >
            <Plus size={16} /> নতুন এন্ট্রি
          </button>
          
          <button 
            className="btn btn-success" 
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
            onClick={() => setShowImportModal(true)}
          >
            <FileSpreadsheet size={16} /> এক্সেল আপলোড
          </button>

          <button 
            className="btn" 
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            onClick={handlePrintStudentList}
            title="শিক্ষার্থী তালিকা প্রিন্ট করুন"
          >
            <Printer size={16} /> প্রিন্ট
          </button>

          {/* Delete All / Group-wise Delete Options */}
          {userRole !== 'assistant' && (
            <>
              <button 
                className="btn" 
                style={{ display: "flex", alignItems: "center", gap: "5px", background: "#c0392b", color: "white" }}
                onClick={() => guardAction("গ্রুপভিত্তিক শিক্ষার্থী মোছা", () => setShowDeleteGroupModal(true))}
                title="গ্রুপ/বিভাগ বা ক্লাস নির্বাচন করে একসাথে স্টুডেন্ট মুছুন"
              >
                <AlertTriangle size={16} /> গ্রুপভিত্তিক মুছুন
              </button>
              {students.length > 0 && (
                <button 
                  className="btn" 
                  style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)" }}
                  onClick={handleDeleteAllInClass}
                  title="বর্তমান ক্লাসের সকল স্টুডেন্ট একসাথে মুছে ফেলুন"
                >
                  <Trash2 size={16} /> ক্লাসের সব মুছুন
                </button>
              )}
            </>
          )}

          {userRole !== 'assistant' && students.length > 0 && (
            <button 
              className="btn" 
              style={{ display: "flex", alignItems: "center", gap: "5px", background: "#8e44ad", color: "white" }}
              onClick={() => setShowPromoteModal(true)}
              title="এই ক্লাসের সকল স্টুডেন্টকে নতুন ক্লাসে প্রোমোট করুন"
            >
              <ArrowRight size={16} /> Promote
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips (Hidden in Print) */}
      <div className="no-print" style={{ display: "flex", gap: "10px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-secondary)" }}>ফিল্টার:</span>
        <button
          onClick={() => setFilterWaiver("all")}
          className="btn"
          style={{
            padding: "4px 12px", fontSize: "12px",
            background: filterWaiver === "all" ? "var(--brand-primary)" : "transparent",
            color: filterWaiver === "all" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}
        >
          সবাই ({students.length})
        </button>
        <button
          onClick={() => setFilterWaiver("waiver")}
          className="btn"
          style={{
            padding: "4px 12px", fontSize: "12px",
            background: filterWaiver === "waiver" ? "var(--brand-success)" : "transparent",
            color: filterWaiver === "waiver" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}
        >
          🎓 উপবৃত্তি ও বৃত্তিপ্রাপ্ত ({students.filter(s => s.waiver_status && s.waiver_status !== "None").length})
        </button>
        <button
          onClick={() => setFilterWaiver("due")}
          className="btn"
          style={{
            padding: "4px 12px", fontSize: "12px",
            background: filterWaiver === "due" ? "var(--brand-danger)" : "transparent",
            color: filterWaiver === "due" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)"
          }}
        >
          ⚠️ বকেয়া আছে ({students.filter(s => Number(s.opening_due) > 0).length})
        </button>
      </div>

      {/* Selected Action Bar */}
      {selectedIds.length > 0 && (
        <div className="no-print" style={{
          padding: "10px 15px",
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--brand-danger)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <span style={{ fontWeight: "bold", color: "var(--brand-danger)", fontSize: "14px" }}>
            {selectedIds.length} জন শিক্ষার্থী সিলেক্ট করা হয়েছে
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setSelectedIds([])}
              className="btn"
              style={{ padding: "6px 12px", fontSize: "12px", background: "white", border: "1px solid var(--border-color)" }}
            >
              বাতিল
            </button>
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger"
              style={{ padding: "6px 14px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Trash2 size={14} /> নির্বাচিত {selectedIds.length} জন মুছুন
            </button>
          </div>
        </div>
      )}

      {/* Printable Wrapper */}
      <div id="printable-student-list" className="printable-area">
        
        {/* School Header for Print (Requirement 4) */}
        <div style={{ display: "none" }} className="print-only">
          <SchoolPrintHeader
            title="শিক্ষার্থী তালিকা ও ফি বিবরণী"
            subtitle={currentClass ? `শ্রেণি: ${currentClass.class_name} ${currentClass.group_name ? `(${currentClass.group_name})` : ""} - সেশন: ${currentClass.session_year}` : ""}
            extraInfo={`তারিখ: ${new Date().toLocaleDateString("bn-BD")} | মোট শিক্ষার্থী: ${filteredStudents.length} জন`}
          />
        </div>

        {loading ? (
          <p style={{ padding: "20px", textAlign: "center" }}>লোড হচ্ছে...</p>
        ) : filteredStudents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <p>কোনো শিক্ষার্থী পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                  {userRole !== 'assistant' && (
                    <th className="no-print" style={{ padding: "12px", width: "40px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedIds.length === filteredStudents.length}
                        onChange={handleSelectAll}
                        style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--brand-primary)" }}
                        title="সবাইকে সিলেক্ট করুন"
                      />
                    </th>
                  )}
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>রোল</th>
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>নাম</th>
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বিভাগ (Group)</th>
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বৃত্তি / সুবিধা</th>
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>অভিভাবক ও ফোন</th>
                  <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বকেয়া (৳)</th>
                  <th className="no-print" style={{ padding: "12px", color: "var(--text-secondary)", textAlign: "right" }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const isSelected = selectedIds.includes(student.id);
                  return (
                    <tr 
                      key={student.id} 
                      style={{ 
                        borderBottom: "1px solid var(--border-color)",
                        backgroundColor: isSelected ? "rgba(0, 118, 255, 0.05)" : "transparent"
                      }}
                    >
                      {userRole !== 'assistant' && (
                        <td className="no-print" style={{ padding: "12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(student.id)}
                            style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--brand-primary)" }}
                          />
                        </td>
                      )}
                      <td style={{ padding: "12px", fontWeight: "bold" }}>{student.roll_no}</td>
                      <td style={{ padding: "12px", fontWeight: "600" }}>{student.full_name}</td>
                      <td style={{ padding: "12px" }}>
                        {getGroupBadge(currentClass?.group_name)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        {getWaiverBadge(student.waiver_status)}
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {student.parent_name && <div>{student.parent_name}</div>}
                        {student.parent_phone && <div style={{ fontSize: "12px" }}>📱 {student.parent_phone}</div>}
                        {!student.parent_name && !student.parent_phone && <span>-</span>}
                      </td>
                      <td style={{ padding: "12px", fontWeight: "700", color: student.opening_due > 0 ? "var(--brand-danger)" : "var(--brand-success)" }}>
                        {student.opening_due} ৳
                      </td>
                      <td className="no-print" style={{ padding: "12px", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="btn"
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              background: "transparent",
                              border: "1px solid var(--brand-primary)",
                              color: "var(--brand-primary)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="তথ্য এডিট করুন"
                          >
                            <Edit size={13} /> এডিট
                          </button>
                          {userRole !== 'assistant' && (
                            <button 
                              onClick={() => handleDeleteSingleStudent(student)}
                              className="btn" 
                              style={{
                                padding: "4px 8px",
                                fontSize: "12px",
                                background: "transparent",
                                border: "1px solid var(--brand-danger)",
                                color: "var(--brand-danger)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={13} /> ডিলিট
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          classInfo={currentClass}
          onClose={() => setEditingStudent(null)}
          onSuccess={fetchStudents}
        />
      )}

      {/* Delete Group/All Modal */}
      {showDeleteGroupModal && (
        <DeleteGroupModal
          currentClassId={classId}
          teacherId={user?.id}
          onClose={() => setShowDeleteGroupModal(false)}
          onSuccess={fetchStudents}
        />
      )}

      {/* Manual Student Entry Modal */}
      {showManualModal && (
        <ManualStudentModal
          classId={classId}
          classInfo={currentClass}
          onClose={() => setShowManualModal(false)}
          onSuccess={fetchStudents}
        />
      )}

      {/* Excel Import Modal */}
      {showImportModal && (
        <ExcelImportModal
          classId={classId}
          classInfo={currentClass}
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchStudents}
        />
      )}

      {/* Promote Students Modal */}
      {showPromoteModal && (
        <PromoteStudentsModal
          currentClassId={classId}
          currentClassInfo={currentClass}
          students={students}
          onClose={() => setShowPromoteModal(false)}
          onSuccess={fetchStudents}
        />
      )}

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          #printable-student-list {
            visibility: visible !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
