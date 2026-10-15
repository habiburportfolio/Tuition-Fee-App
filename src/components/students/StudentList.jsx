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
import { Users, FileSpreadsheet, Plus, ArrowRight, Edit, Trash2, AlertTriangle, Printer, Award, Lock, Unlock, Check } from "lucide-react";

export default function StudentList({ classId, classIds, classInfo, selectedDepartment, onSelectDepartment }) {
  const { user, userRole } = useAuth();
  const { guardAction, isLocked, openUnlockModal } = useLock();

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

  const targetClassIds = useMemo(() => {
    if (classIds && classIds.length > 0) return classIds;
    return classId ? [classId] : [];
  }, [classId, classIds]);

  useEffect(() => {
    if (classInfo) {
      setCurrentClass(classInfo);
    } else if (classId) {
      supabase.from("academic_classes").select("*").eq("id", classId).single()
        .then(({ data }) => setCurrentClass(data));
    }
  }, [classId, classInfo]);

  const fetchStudents = useCallback(async () => {
    if (targetClassIds.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*, academic_classes(id, class_name, section_name, group_name)")
        .in("class_id", targetClassIds)
        .order("roll_no", { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setSelectedIds([]);
    } catch (error) {
      toast.error(`❌ স্টুডেন্ট ফেচ করতে সমস্যা: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [targetClassIds]);

  useEffect(() => {
    if (user && targetClassIds.length > 0) {
      fetchStudents();
    }
  }, [user, targetClassIds, fetchStudents]);

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

  const handleBulkSetWaiver = async (newWaiverStatus) => {
    if (selectedIds.length === 0) return;

    const waiverLabelMap = {
      "উপবৃত্তিপ্রাপ্ত (বেতন ফ্রি)": "উপবৃত্তিপ্রাপ্ত",
      "বৃত্তিপ্রাপ্ত (বেতন ফ্রি)": "বৃত্তিপ্রাপ্ত",
      "Full Free": "ফুল ফ্রি (১০০%)",
      "Half Free": "অর্ধ-বেতন (৫০%)",
      "None": "সাধারণ (ছাড় নেই)"
    };
    const label = waiverLabelMap[newWaiverStatus] || newWaiverStatus;

    guardAction(`নির্বাচিত ${selectedIds.length} জন শিক্ষার্থীকে ${label} সুবিধা নির্ধারণ`, async () => {
      setLoading(true);
      try {
        const { error } = await supabase
          .from("students")
          .update({ waiver_status: newWaiverStatus })
          .in("id", selectedIds);

        if (error) throw error;

        toast.success(`✅ নির্বাচিত ${selectedIds.length} জন শিক্ষার্থীকে "${label}" হিসেবে নির্ধারণ করা হয়েছে!`);
        fetchStudents();
      } catch (error) {
        toast.error(`❌ আপডেট এরর: ${error.message}`);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleInlineChangeWaiver = async (studentId, newWaiverStatus) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ waiver_status: newWaiverStatus })
        .eq("id", studentId);

      if (error) throw error;

      toast.success("✅ সুবিধা সফলভাবে আপডেট হয়েছে!");
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, waiver_status: newWaiverStatus } : s));
    } catch (error) {
      toast.error(`❌ আপডেট এরর: ${error.message}`);
    }
  };

  const [savingDueId, setSavingDueId] = useState(null);

  const handleInlineUpdateDue = async (studentId, newDue, originalValue) => {
    if (newDue === Number(originalValue || 0)) {
      return false;
    }

    setSavingDueId(studentId);
    try {
      const { error } = await supabase
        .from("students")
        .update({ opening_due: newDue })
        .eq("id", studentId);

      if (error) throw error;

      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, opening_due: newDue } : s));
      const targetRoll = students.find(s => s.id === studentId)?.roll_no;
      toast.success(`✅ রোল ${targetRoll ?? ""}: বকেয়া ${newDue} ৳ সংরক্ষিত হয়েছে!`, {
        id: `due-update-${studentId}`,
        duration: 2000
      });
      return true;
    } catch (err) {
      toast.error(`❌ বকেয়া সেভ করতে সমস্যা: ${err.message}`);
      return false;
    } finally {
      setSavingDueId(null);
    }
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
        const deleteQuery = supabase.from("students").delete();
        const { error } = (selectedDepartment && selectedDepartment !== "all")
          ? await deleteQuery.eq("class_id", selectedDepartment)
          : await deleteQuery.in("class_id", targetClassIds);
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
    const isSci = group.toLowerCase() === "science" || group === "বিজ্ঞান";
    const isCom = group.toLowerCase() === "commerce" || group === "ব্যবসায় শিক্ষা" || group === "ব্যবসায় শিক্ষা";
    const isArt = group.toLowerCase() === "arts" || group === "মানবিক";

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
    if (selectedDepartment && selectedDepartment !== "all") {
      const g = s.academic_classes?.group_name || currentClass?.group_name;
      if (g !== selectedDepartment) return false;
    }
    if (filterWaiver === "all") return true;
    if (filterWaiver === "upobritti") return s.waiver_status && s.waiver_status.includes("উপবৃত্তি");
    if (filterWaiver === "britti") return s.waiver_status && s.waiver_status.includes("বৃত্তি") && !s.waiver_status.includes("উপবৃত্তি");
    if (filterWaiver === "full_free") return s.waiver_status === "Full Free";
    if (filterWaiver === "half_free") return s.waiver_status === "Half Free";
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
      <div className="no-print" style={{ display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "13px", fontWeight: "bold", color: "var(--text-secondary)" }}>ফিল্টার:</span>
        <button
          onClick={() => setFilterWaiver("all")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "all" ? "var(--brand-primary)" : "transparent",
            color: filterWaiver === "all" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          সবাই ({students.length})
        </button>

        <button
          onClick={() => setFilterWaiver("upobritti")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "upobritti" ? "#16a34a" : "transparent",
            color: filterWaiver === "upobritti" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          🎓 উপবৃত্তিপ্রাপ্ত ({students.filter(s => s.waiver_status?.includes("উপবৃত্তি")).length})
        </button>

        <button
          onClick={() => setFilterWaiver("britti")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "britti" ? "#0070f3" : "transparent",
            color: filterWaiver === "britti" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          🏆 বৃত্তিপ্রাপ্ত ({students.filter(s => s.waiver_status?.includes("বৃত্তি") && !s.waiver_status?.includes("উপবৃত্তি")).length})
        </button>

        <button
          onClick={() => setFilterWaiver("full_free")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "full_free" ? "#059669" : "transparent",
            color: filterWaiver === "full_free" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          💯 ফুল ফ্রি ({students.filter(s => s.waiver_status === "Full Free").length})
        </button>

        <button
          onClick={() => setFilterWaiver("half_free")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "half_free" ? "#d97706" : "transparent",
            color: filterWaiver === "half_free" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          🌓 আংশিক ফ্রি ({students.filter(s => s.waiver_status === "Half Free").length})
        </button>

        <button
          onClick={() => setFilterWaiver("due")}
          className="btn"
          style={{
            padding: "4px 10px", fontSize: "12px",
            background: filterWaiver === "due" ? "var(--brand-danger)" : "transparent",
            color: filterWaiver === "due" ? "white" : "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px"
          }}
        >
          ⚠️ বকেয়া আছে ({students.filter(s => Number(s.opening_due) > 0).length})
        </button>
      </div>

      {/* Selected Action Bar: Tick Marks Options */}
      {selectedIds.length > 0 && (
        <div className="no-print" style={{
          padding: "12px 16px",
          backgroundColor: "rgba(0, 112, 243, 0.05)",
          borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--brand-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
          boxShadow: "0 2px 8px rgba(0, 112, 243, 0.06)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: "800", color: "var(--brand-primary)", fontSize: "14px" }}>
              ✓ নির্বাচিত: {selectedIds.length} জন শিক্ষার্থী
            </span>
            <button
              onClick={() => setSelectedIds([])}
              className="btn"
              style={{ padding: "3px 8px", fontSize: "11px", background: "white", border: "1px solid var(--border-color)" }}
            >
              বাতিল
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-secondary)" }}>
              সুবিধা নির্ধারণ করুন:
            </span>

            <button
              onClick={() => handleBulkSetWaiver("উপবৃত্তিপ্রাপ্ত (বেতন ফ্রি)")}
              className="btn"
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "700",
                background: "rgba(39, 174, 96, 0.15)",
                color: "#16a34a",
                border: "1.5px solid #16a34a",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="নির্বাচিত শিক্ষার্থীদের উপবৃত্তিপ্রাপ্ত হিসেবে নির্ধারণ করুন"
            >
              🎓 উপবৃত্তি
            </button>

            <button
              onClick={() => handleBulkSetWaiver("বৃত্তিপ্রাপ্ত (বেতন ফ্রি)")}
              className="btn"
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "700",
                background: "rgba(0, 112, 243, 0.15)",
                color: "#0070f3",
                border: "1.5px solid #0070f3",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="নির্বাচিত শিক্ষার্থীদের মেধা বৃত্তিপ্রাপ্ত হিসেবে নির্ধারণ করুন"
            >
              🏆 মেধা বৃত্তি
            </button>

            <button
              onClick={() => handleBulkSetWaiver("Full Free")}
              className="btn"
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "700",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#059669",
                border: "1.5px solid #059669",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="নির্বাচিত শিক্ষার্থীদের বিনা-বেতন (১০০% ছাড়) নির্ধারণ করুন"
            >
              💯 ফুল ফ্রি
            </button>

            <button
              onClick={() => handleBulkSetWaiver("Half Free")}
              className="btn"
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "700",
                background: "rgba(245, 158, 11, 0.15)",
                color: "#d97706",
                border: "1.5px solid #d97706",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="নির্বাচিত শিক্ষার্থীদের অর্ধ-বেতন (৫০% ছাড়) নির্ধারণ করুন"
            >
              🌓 আংশিক ফ্রি
            </button>

            <button
              onClick={() => handleBulkSetWaiver("None")}
              className="btn"
              style={{
                padding: "5px 8px",
                fontSize: "12px",
                background: "white",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "6px"
              }}
              title="সুবিধা বাতিল করে সাধারণ শিক্ষার্থী করুন"
            >
              ❌ সাধারণ
            </button>

            {userRole !== 'assistant' && (
              <button
                onClick={handleDeleteSelected}
                className="btn btn-danger"
                style={{ padding: "5px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", marginLeft: "6px" }}
              >
                <Trash2 size={13} /> মুছুন ({selectedIds.length})
              </button>
            )}
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
                  <th style={{ padding: "12px", color: "var(--text-secondary)", minWidth: "155px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>বকেয়া (৳)</span>
                      <span className="no-print">
                        {isLocked ? (
                          <button
                            type="button"
                            onClick={() => openUnlockModal()}
                            title="সিস্টেম লক করা আছে। সরাসরি বকেয়া এন্ট্রি করতে ক্লিক করে আনলক করুন।"
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              border: "1px solid var(--brand-danger)",
                              borderRadius: "var(--radius-full)",
                              color: "var(--brand-danger)",
                              fontSize: "11px",
                              padding: "2px 7px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              cursor: "pointer",
                              fontWeight: "600"
                            }}
                          >
                            <Lock size={11} /> লক
                          </button>
                        ) : (
                          <span
                            title="সিস্টেম আনলকড। সরাসরি বকেয়া টাইপ করে এন্ট্রি করতে পারবেন।"
                            style={{
                              background: "rgba(16, 185, 129, 0.12)",
                              border: "1px solid var(--brand-success)",
                              borderRadius: "var(--radius-full)",
                              color: "var(--brand-success)",
                              fontSize: "11px",
                              padding: "2px 7px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontWeight: "600"
                            }}
                          >
                            <Unlock size={11} /> আনলকড
                          </span>
                        )}
                      </span>
                    </div>
                  </th>
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
                        {getGroupBadge(student.academic_classes?.group_name || currentClass?.group_name)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div className="print-only">
                          {getWaiverBadge(student.waiver_status)}
                        </div>
                        <div className="no-print" style={{ display: "inline-flex", alignItems: "center" }}>
                          <select
                            value={student.waiver_status || "None"}
                            onChange={(e) => handleInlineChangeWaiver(student.id, e.target.value)}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              borderRadius: "var(--radius-full)",
                              border: student.waiver_status && student.waiver_status !== "None"
                                ? (student.waiver_status.includes("উপবৃত্তি") ? "1.5px solid var(--brand-success)"
                                  : student.waiver_status.includes("বৃত্তি") ? "1.5px solid var(--brand-primary)"
                                  : student.waiver_status === "Full Free" ? "1.5px solid #059669"
                                  : student.waiver_status === "Half Free" ? "1.5px solid #d97706"
                                  : "1px solid var(--border-color)")
                                : "1px solid var(--border-color)",
                              background: student.waiver_status && student.waiver_status !== "None"
                                ? (student.waiver_status.includes("উপবৃত্তি") ? "rgba(39, 174, 96, 0.12)"
                                  : student.waiver_status.includes("বৃত্তি") ? "rgba(0, 112, 243, 0.12)"
                                  : student.waiver_status === "Full Free" ? "rgba(16, 185, 129, 0.12)"
                                  : student.waiver_status === "Half Free" ? "rgba(245, 158, 11, 0.12)"
                                  : "transparent")
                                : "transparent",
                              color: student.waiver_status && student.waiver_status !== "None"
                                ? (student.waiver_status.includes("উপবৃত্তি") ? "var(--brand-success)"
                                  : student.waiver_status.includes("বৃত্তি") ? "var(--brand-primary)"
                                  : student.waiver_status === "Full Free" ? "#059669"
                                  : student.waiver_status === "Half Free" ? "#d97706"
                                  : "var(--text-primary)")
                                : "var(--text-secondary)",
                              cursor: "pointer",
                              outline: "none"
                            }}
                            title="সুবিধা বা বৃত্তি পরিবর্তন করুন"
                          >
                            <option value="None">সাধারণ (ছাড় নেই)</option>
                            <option value="উপবৃত্তিপ্রাপ্ত (বেতন ফ্রি)">🎓 উপবৃত্তিপ্রাপ্ত</option>
                            <option value="বৃত্তিপ্রাপ্ত (বেতন ফ্রি)">🏆 বৃত্তিপ্রাপ্ত</option>
                            <option value="Full Free">💯 ফুল ফ্রি (১০০%)</option>
                            <option value="Half Free">🌓 আংশিক ফ্রি (৫০%)</option>
                            <option value="Special">বিশেষ ছাড়</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        {student.parent_name && <div>{student.parent_name}</div>}
                        {student.parent_phone && <div style={{ fontSize: "12px" }}>📱 {student.parent_phone}</div>}
                        {!student.parent_name && !student.parent_phone && <span>-</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div className="print-only" style={{ fontWeight: "700", color: student.opening_due > 0 ? "#dc2626" : "#16a34a" }}>
                          {student.opening_due || 0} ৳
                        </div>
                        <div className="no-print">
                          {isLocked ? (
                            <div
                              onClick={() => openUnlockModal()}
                              title="সিস্টেম লক করা। বকেয়া এন্ট্রি/পরিবর্তন করতে ক্লিক করে পিন দিয়ে আনলক করুন।"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                background: Number(student.opening_due) > 0 ? "rgba(239, 68, 68, 0.08)" : "transparent",
                                color: Number(student.opening_due) > 0 ? "var(--brand-danger)" : "var(--brand-success)",
                                fontWeight: "700",
                                border: "1px dashed transparent",
                                transition: "border-color 0.15s ease"
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
                              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
                            >
                              <span>{student.opening_due || 0} ৳</span>
                              <Lock size={12} style={{ color: "var(--text-secondary)", opacity: 0.6 }} />
                            </div>
                          ) : (
                            <InlineDueInput
                              student={student}
                              onSave={handleInlineUpdateDue}
                              isSaving={savingDueId === student.id}
                            />
                          )}
                        </div>
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

function InlineDueInput({ student, onSave, isSaving }) {
  const [val, setVal] = useState(student.opening_due ?? 0);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setVal(student.opening_due ?? 0);
  }, [student.opening_due]);

  const handleSave = async () => {
    const num = Number(val);
    if (isNaN(num) || num < 0) {
      toast.error("সঠিক টাকার পরিমাণ দিন!");
      setVal(student.opening_due ?? 0);
      return;
    }
    if (num === Number(student.opening_due ?? 0)) {
      return;
    }
    const success = await onSave(student.id, num, student.opening_due);
    if (success) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <input
        type="number"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        title="বকেয়ার পরিমাণ লিখুন এবং বাইরে ক্লিক করুন বা Enter চাপুন"
        style={{
          width: "88px",
          padding: "5px 8px",
          fontSize: "13px",
          fontWeight: "700",
          textAlign: "right",
          borderRadius: "var(--radius-sm)",
          border: justSaved ? "1.5px solid var(--brand-success)" : "1px solid var(--border-color)",
          background: Number(val) > 0 ? "rgba(239, 68, 68, 0.08)" : "var(--bg-color)",
          color: Number(val) > 0 ? "var(--brand-danger)" : "var(--brand-success)",
          outline: "none",
          transition: "all 0.15s ease"
        }}
      />
      <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>৳</span>
      {justSaved && (
        <span style={{ fontSize: "12px", color: "var(--brand-success)", fontWeight: "bold" }}>✓</span>
      )}
    </div>
  );
}
