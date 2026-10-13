"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function SchoolPrintHeader({ title, subtitle, extraInfo, profile: propProfile }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(propProfile || null);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
      return;
    }
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
  }, [user, propProfile]);

  const hasLogo = Boolean(profile?.logo_url);

  return (
    <div className="school-print-header-wrapper">
      <style>{`
        .school-print-header-wrapper {
          width: 100%;
          text-align: center;
          padding-bottom: 12px;
          margin-bottom: 18px;
          position: relative;
          color: #0f172a;
          box-sizing: border-box;
        }

        .school-header-grid {
          display: grid;
          grid-template-columns: ${hasLogo ? "84px 1fr 84px" : "1fr"};
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        .school-logo-slot {
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }

        .school-logo-img {
          width: 68px;
          height: 68px;
          object-fit: contain;
          border-radius: 50%;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          padding: 2px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }

        .school-center-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .school-title-text {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          line-height: 1.25;
        }

        .school-contact-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 12.5px;
          color: #475569;
          font-weight: 500;
          margin-top: 4px;
        }

        .contact-bullet {
          color: #94a3b8;
          font-size: 11px;
        }

        .report-title-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 22px;
          background-color: #f8fafc;
          border: 1.5px solid #0f172a;
          border-radius: 9999px;
          color: #0f172a;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.2px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
          margin-top: 9px;
          margin-bottom: 6px;
        }

        .meta-badges-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 2px;
        }

        .meta-badge-subtitle {
          display: inline-block;
          background-color: #f1f5f9;
          border: 1px solid #e2e8f0;
          padding: 2px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .meta-badge-extrainfo {
          display: inline-block;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 2px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
        }

        .header-bottom-rule {
          width: 100%;
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .rule-thick {
          width: 100%;
          height: 2.5px;
          background-color: #0f172a;
        }

        .rule-thin {
          width: 100%;
          height: 1px;
          background-color: #94a3b8;
        }

        @media (max-width: 580px) {
          .school-header-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .school-logo-slot {
            justify-content: center;
          }
          .school-balance-slot {
            display: none;
          }
          .school-title-text {
            font-size: 20px;
          }
        }

        @media print {
          .school-print-header-wrapper {
            position: static !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            padding-bottom: 8px !important;
            margin-bottom: 12px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .school-header-grid {
            display: grid !important;
            grid-template-columns: ${hasLogo ? "72px 1fr 72px" : "1fr"} !important;
            margin-bottom: 4px !important;
          }
          .school-logo-slot {
            display: flex !important;
            justify-content: flex-start !important;
          }
          .school-balance-slot {
            display: block !important;
            width: 72px !important;
          }
          .school-logo-img {
            width: 56px !important;
            height: 56px !important;
            box-shadow: none !important;
            border: 1px solid #475569 !important;
          }
          .school-title-text {
            font-size: 19px !important;
            color: #000000 !important;
          }
          .school-contact-row {
            font-size: 11px !important;
            color: #111111 !important;
            margin-top: 2px !important;
          }
          .report-title-badge {
            font-size: 13.5px !important;
            padding: 3px 18px !important;
            margin-top: 5px !important;
            margin-bottom: 4px !important;
            border: 1.5px solid #000000 !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
          .meta-badge-subtitle {
            font-size: 11.5px !important;
            padding: 1.5px 8px !important;
            color: #000000 !important;
            border-color: #475569 !important;
          }
          .meta-badge-extrainfo {
            font-size: 11px !important;
            padding: 1.5px 8px !important;
            color: #222222 !important;
            border-color: #64748b !important;
          }
          .rule-thick {
            height: 2px !important;
            background-color: #000000 !important;
          }
          .rule-thin {
            height: 1px !important;
            background-color: #000000 !important;
          }
        }
      `}</style>

      {/* Symmetrical 3-Column Grid: Logo (Left) | Centered Info | Balanced Spacer (Right) */}
      <div className="school-header-grid">
        {hasLogo ? (
          <div className="school-logo-slot">
            <img
              src={profile.logo_url}
              crossOrigin="anonymous"
              alt="School Logo"
              className="school-logo-img"
            />
          </div>
        ) : null}

        <div className="school-center-content">
          <h2 className="school-title-text">
            {profile?.school_name || "বিদ্যালয়ের নাম"}
          </h2>

          {(profile?.eiin_number || profile?.school_email || profile?.phone_number) && (
            <div className="school-contact-row">
              {profile?.eiin_number && <span>EIIN: {profile.eiin_number}</span>}
              {profile?.eiin_number && (profile?.school_email || profile?.phone_number) && (
                <span className="contact-bullet">•</span>
              )}
              {profile?.phone_number && <span>মোবাইল: {profile.phone_number}</span>}
              {profile?.phone_number && profile?.school_email && (
                <span className="contact-bullet">•</span>
              )}
              {profile?.school_email && <span>ইমেইল: {profile.school_email}</span>}
            </div>
          )}

          {title && (
            <div className="report-title-badge">
              {title}
            </div>
          )}

          {(subtitle || extraInfo) && (
            <div className="meta-badges-row">
              {subtitle && (
                <span className="meta-badge-subtitle">
                  {subtitle}
                </span>
              )}
              {extraInfo && (
                <span className="meta-badge-extrainfo">
                  {extraInfo}
                </span>
              )}
            </div>
          )}
        </div>

        {hasLogo ? (
          <div className="school-balance-slot" style={{ width: "84px" }} aria-hidden="true" />
        ) : null}
      </div>

      {/* Premium Institutional Dual Rule Divider */}
      <div className="header-bottom-rule" aria-hidden="true">
        <div className="rule-thick" />
        <div className="rule-thin" />
      </div>
    </div>
  );
}
