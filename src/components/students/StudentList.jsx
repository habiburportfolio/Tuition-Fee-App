"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import ExcelImportModal from "./ExcelImportModal";
import ManualStudentModal from "./ManualStudentModal";
import EditStudentModal from "./EditStudentModal";
import DeleteGroupModal from "./DeleteGroupModal";
import PromoteStudentsModal from "./PromoteStudentsModal";
import toast from "react-hot-toast";
import { Users, FileSpreadsheet, Plus, MessageCircle, ArrowRight, Edit, Trash2, AlertTriangle } from "lucide-react";

export default function StudentList({ classId, classInfo }) {
  const { user, userRole } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentClass, setCurrentClass] = useState(classInfo || null);

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

  const handleSendDueReminders = () => {
    const dueStudents = students.filter(s => s.opening_due > 0);
    if (dueStudents.length === 0) {
      toast.success("কারো কোনো বকেয়া নেই!");
      return;
    }
    toast.success(`সাফল্যের সাথে ${dueStudents.length} জন স্টুডেন্টকে বকেয়া রিমাইন্ডার (SMS) পাঠানো হয়েছে!`, { duration: 4000 });
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
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
  };

  const handleDeleteAllInClass = async () => {
    if (students.length === 0) return toast.error("এই ক্লাসে মোছার মতো কোনো শিক্ষার্থী নেই!");
    const groupName = currentClass?.group_name ? `(${currentClass.group_name})` : "";
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
        backgroundColor: bg,
        color: color,
        border: `1px solid ${color}`
      }}>
        {label}
      </span>
    );
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--brand-primary)", margin: 0 }}>
            <Users /> স্টুডেন্ট লিস্ট
          </h2>
          {currentClass && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: "700", fontSize: "15px" }}>{currentClass.class_name}</span>
              {currentClass.group_name && getGroupBadge(currentClass.group_name)}
              {currentClass.section_name && (
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  শাখা: <b>{currentClass.section_name}</b>
                </span>
              )}
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                শিক্ষাবর্ষ: <b>{currentClass.session_year}</b>
              </span>
              <span style={{ fontSize: "13px", fontWeight: "bold", background: "rgba(0, 118, 255, 0.1)", color: "var(--brand-primary)", padding: "2px 8px", borderRadius: "10px" }}>
                মোট: {students.length} জন
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button 
            className="btn" 
            style={{ display: "flex", alignItems: "center", gap: "5px", background: "#f39c12", color: "white" }}
            onClick={handleSendDueReminders}
            title="যাদের বকেয়া আছে তাদের সবাইকে SMS পাঠান"
          >
            <MessageCircle size={16} /> Due Reminders
          </button>
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

          {/* Delete All / Group-wise Delete Options */}
          {userRole !== 'assistant' && (
            <>
              <button 
                className="btn" 
                style={{ display: "flex", alignItems: "center", gap: "5px", background: "#c0392b", color: "white" }}
                onClick={() => setShowDeleteGroupModal(true)}
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

      {/* Selected Items Batch Action Banner */}
      {selectedIds.length > 0 && (
        <div style={{
          background: "rgba(231, 76, 60, 0.1)",
          border: "1px solid var(--brand-danger)",
          padding: "10px 16px",
          borderRadius: "var(--radius-sm)",
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

      {loading ? (
        <p>লোড হচ্ছে...</p>
      ) : students.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          <p>এই ক্লাসে এখনো কোনো স্টুডেন্ট যুক্ত করা হয়নি।</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                {userRole !== 'assistant' && (
                  <th style={{ padding: "12px", width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedIds.length === students.length}
                      onChange={handleSelectAll}
                      style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "var(--brand-primary)" }}
                      title="সবাইকে সিলেক্ট করুন"
                    />
                  </th>
                )}
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>রোল</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>নাম</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বিভাগ (Group)</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>অভিভাবক ও ফোন</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>স্ট্যাটাস</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বকেয়া (৳)</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)", textAlign: "right" }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
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
                      <td style={{ padding: "12px", textAlign: "center" }}>
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
                    <td style={{ padding: "12px", fontSize: "13px", color: "var(--text-secondary)" }}>
                      {student.parent_name && <div>{student.parent_name}</div>}
                      {student.parent_phone && <div style={{ fontSize: "12px" }}>📱 {student.parent_phone}</div>}
                      {!student.parent_name && !student.parent_phone && <span>-</span>}
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ 
                        padding: "4px 8px", 
                        borderRadius: "var(--radius-sm)", 
                        fontSize: "12px",
                        backgroundColor: student.status === 'Active' ? "var(--brand-success)" : "var(--brand-warning)",
                        color: "white"
                      }}>
                        {student.status === 'Active' ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </td>
                    <td style={{ padding: "12px", fontWeight: "600", color: student.opening_due > 0 ? "var(--brand-danger)" : "inherit" }}>
                      {student.opening_due} ৳
                    </td>
                    <td style={{ padding: "12px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => setEditingStudent(student)}
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
                            onClick={async () => {
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
                            }}
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

      {showImportModal && (
        <ExcelImportModal 
          classId={classId} 
          classInfo={currentClass}
          onClose={() => setShowImportModal(false)} 
          onSuccess={fetchStudents}
        />
      )}

      {showManualModal && (
        <ManualStudentModal 
          classId={classId} 
          classInfo={currentClass}
          onClose={() => setShowManualModal(false)} 
          onSuccess={fetchStudents}
        />
      )}

      {showPromoteModal && (
        <PromoteStudentsModal
          currentClassId={classId}
          teacherId={user.id}
          students={students}
          onClose={() => setShowPromoteModal(false)}
        />
      )}
    </div>
  );
}
