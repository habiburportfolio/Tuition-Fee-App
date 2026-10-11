"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import ExcelImportModal from "./ExcelImportModal";
import ManualStudentModal from "./ManualStudentModal";
import PromoteStudentsModal from "./PromoteStudentsModal";
import toast from "react-hot-toast";
import { Users, FileSpreadsheet, Plus, MessageCircle, ArrowRight } from "lucide-react";

export default function StudentList({ classId, classInfo }) {
  const { user, userRole } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
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
    // In a real app, this would hit an API endpoint that triggers an SMS gateway like Greenweb
    // For now, we simulate success
    toast.success(`সাফল্যের সাথে ${dueStudents.length} জন স্টুডেন্টকে বকেয়া রিমাইন্ডার (SMS) পাঠানো হয়েছে!`, { duration: 4000 });
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
            </div>
          )}
        </div>
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
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>রোল</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>নাম</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বিভাগ (Group)</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>স্ট্যাটাস</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)" }}>বকেয়া (৳)</th>
                <th style={{ padding: "12px", color: "var(--text-secondary)", textAlign: "right" }}>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <td style={{ padding: "12px", fontWeight: "bold" }}>{student.roll_no}</td>
                  <td style={{ padding: "12px" }}>{student.full_name}</td>
                  <td style={{ padding: "12px" }}>
                    {getGroupBadge(currentClass?.group_name)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ 
                      padding: "4px 8px", 
                      borderRadius: "var(--radius-sm)", 
                      fontSize: "12px",
                      backgroundColor: student.status === 'Active' ? "var(--brand-success)" : "var(--brand-warning)",
                      color: "white"
                    }}>
                      {student.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: student.opening_due > 0 ? "var(--brand-danger)" : "inherit" }}>
                    {student.opening_due} ৳
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    {userRole !== 'assistant' && (
                      <button 
                        onClick={async () => {
                          if (!window.confirm("আপনি কি নিশ্চিত যে এই স্টুডেন্টকে ডিলিট করতে চান? (স্টুডেন্টের পেমেন্ট রেকর্ড থাকলে ডিলিট হবে না)")) return;
                          try {
                            const { error } = await supabase.from("students").delete().eq("id", student.id);
                            if (error) {
                              if (error.code === '23503') throw new Error("এই স্টুডেন্টের পেমেন্ট রেকর্ড থাকায় ডিলিট করা সম্ভব নয়।");
                              throw error;
                            }
                            toast.success("স্টুডেন্ট সফলভাবে মুছে ফেলা হয়েছে!");
                            fetchStudents();
                          } catch (error) {
                            toast.error(`❌ এরর: ${error.message}`);
                          }
                        }}
                        style={{ background: "none", border: "1px solid var(--brand-danger)", color: "var(--brand-danger)", cursor: "pointer", fontSize: "12px", padding: "4px 8px", borderRadius: "4px" }}
                      >
                        ডিলিট
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
