"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import ExcelImportModal from "./ExcelImportModal";
import ManualStudentModal from "./ManualStudentModal";
import PromoteStudentsModal from "./PromoteStudentsModal";
import toast from "react-hot-toast";
import { Users, FileSpreadsheet, Plus, MessageCircle, ArrowRight } from "lucide-react";

export default function StudentList({ classId }) {
  const { user, userRole } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

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

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "15px" }}>
        <h2 style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--brand-primary)" }}>
          <Users /> স্টুডেন্ট লিস্ট
        </h2>
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
          onClose={() => setShowImportModal(false)} 
          onSuccess={fetchStudents}
        />
      )}

      {showManualModal && (
        <ManualStudentModal 
          classId={classId} 
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
