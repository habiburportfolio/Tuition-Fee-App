"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function SchoolPrintHeader({ title, subtitle, extraInfo }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("teachers")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  return (
    <div
      className="school-print-header"
      style={{
        textAlign: "center",
        borderBottom: "2px solid #222",
        paddingBottom: "12px",
        marginBottom: "16px",
        width: "100%"
      }}
    >
      <style>{`
        @media print {
          .school-print-header {
            position: static !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            padding-bottom: 6px !important;
            margin-bottom: 10px !important;
          }
          .school-print-header img {
            width: 42px !important;
            height: 42px !important;
          }
          .school-print-header h2 {
            font-size: 18px !important;
          }
          .school-print-header h3 {
            font-size: 14px !important;
            margin: 4px 0 2px 0 !important;
          }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px", marginBottom: "6px" }}>
        {profile?.logo_url && (
          <img
            src={profile.logo_url}
            crossOrigin="anonymous"
            alt="School Logo"
            style={{ width: "55px", height: "55px", objectFit: "contain" }}
          />
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#111" }}>
            {profile?.school_name || "বিদ্যালয়ের নাম"}
          </h2>
          <div style={{ fontSize: "12px", color: "#444", marginTop: "2px" }}>
            {profile?.eiin_number && <span style={{ marginRight: "12px" }}>EIIN: {profile.eiin_number}</span>}
            {profile?.school_email && <span style={{ marginRight: "12px" }}>ইমেইল: {profile.school_email}</span>}
            {profile?.phone_number && <span>মোবাইল: {profile.phone_number}</span>}
          </div>
        </div>
      </div>

      {title && (
        <h3
          style={{
            margin: "8px 0 2px 0",
            fontSize: "16px",
            fontWeight: "700",
            color: "#000",
            textDecoration: "underline"
          }}
        >
          {title}
        </h3>
      )}

      {subtitle && (
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#333", marginTop: "2px" }}>
          {subtitle}
        </div>
      )}

      {extraInfo && (
        <div style={{ fontSize: "12px", color: "#555", marginTop: "2px" }}>
          {extraInfo}
        </div>
      )}
    </div>
  );
}
