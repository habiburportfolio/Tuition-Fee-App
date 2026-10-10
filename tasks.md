# 📝 Actionable Task Checklist (Sprint Plan)

**Project Name:** ClassFee Tracker (শ্রেণি শিক্ষক স্কুল ফি ও কালেকশন ম্যানেজার)  
**Phase:** Phase 3 (AI এজেন্ট ও এক্সিকিউশন প্ল্যান - Step 12)  
**Status:** Draft

---

## স্প্রিন্ট ১: প্রজেক্ট সেটআপ ও ডাটাবেজ (Sprint 1: Foundation)
- [ ] **Task 1.1: Initialize React Project**
  - Next.js (App Router) বা Vite React সেটআপ করা।
  - `public/manifest.json` এবং আইকন যোগ করে PWA বেসিক কনফিগারেশন।
- [ ] **Task 1.2: Base Folder Structure & CSS**
  - `src/` এর ভেতর ফোল্ডার স্ট্রাকচার (components, context, hooks, lib, styles) তৈরি করা।
  - `globals.css` এবং `variables.css` এ কালার টোকেন ও টাইপোগ্রাফি যোগ করা।
- [ ] **Task 1.3: Supabase Project Setup & Auth**
  - Supabase ক্লায়েন্ট ইনিশিয়ালাইজ করা (`lib/supabaseClient.js`)।
  - `.env.local` এ Supabase URL এবং Anon Key যোগ করা।
  - টিচার লগইন/রেজিস্ট্রেশন এবং `AuthContext` তৈরি করা।
- [ ] **Task 1.4: Database Schema & RLS**
  - Supabase SQL Editor এ `teachers`, `academic_classes`, `students`, `fees_setup`, `payments`, `deposits` টেবিল তৈরি করা।
  - প্রতিটি টেবিলে `teacher_id` এর সাপেক্ষে Row Level Security (RLS) পলিসি সেট করা।

---

## স্প্রিন্ট ২: একাডেমিক সেটআপ ও স্টুডেন্ট ম্যানেজমেন্ট (Sprint 2: Academic & Students)
- [ ] **Task 2.1: Academic Setup UI**
  - সেশন, ক্লাস, সেকশন এবং গ্রুপ নির্বাচন করে নতুন ক্লাস তৈরির ফর্ম তৈরি করা।
- [ ] **Task 2.2: Student CRUD & List View**
  - স্টুডেন্টদের ম্যানুয়ালি এন্ট্রি করার ফর্ম।
  - নির্দিষ্ট ক্লাসের স্টুডেন্টদের নামের তালিকা ও স্ট্যাটাস দেখানোর ভিউ।
- [ ] **Task 2.3: Excel Bulk Import**
  - `xlsx` লাইব্রেরি ব্যবহার করে এক্সেল থেকে স্টুডেন্ট ডেটা ইমপোর্ট করার লজিক ও UI।

---

## স্প্রিন্ট ৩: ফি ম্যানেজমেন্ট ও কালেকশন ইঞ্জিন (Sprint 3: Fee Collection Core)
- [ ] **Task 3.1: Fees Setup Module**
  - বিভিন্ন ধরণের ফি (মাসিক, ল্যাব, সেশন) তৈরি করার ফর্ম।
- [ ] **Task 3.2: Quick Roll Search & Student Ledger**
  - রোল সার্চ করার একটি গ্লোবাল ইনপুট বার।
  - সার্চ করলে স্টুডেন্টের ইনফো এবং মোট বকেয়া দেখানোর কার্ড।
- [ ] **Task 3.3: Payment Processing Logic**
  - একাধিক মাস সিলেক্ট করা এবং আংশিক পেমেন্ট ক্যালকুলেট করার লজিক।
  - `payments` টেবিলে পেমেন্ট ইনসার্ট করা এবং `students` টেবিলে বকেয়া আপডেট করা।
- [ ] **Task 3.4: Receipt Generation & WhatsApp Share**
  - ডিজিটাল রসিদ (Receipt Modal) ডিজাইন করা।
  - WhatsApp Intent URI জেনারেট করে মেসেজ পাঠানোর বাটন।
- [ ] **Task 3.5: Void / Mistake Reversal**
  - ভুল এন্ট্রি বাতিল করে আগের অবস্থায় (Rollback) ফিরে যাওয়ার লজিক।

---

## স্প্রিন্ট ৪: ক্যাশ ডিপোজিট ও ডুয়েল ভাউচার (Sprint 4: Deposits & Vouchers ⭐)
- [ ] **Task 4.1: Undeposited Cash Summary UI**
  - বর্তমানে হাতে থাকা নগদ টাকা এবং ট্রানজ্যাকশন লিস্ট দেখানোর পেজ।
- [ ] **Task 4.2: Deposit Form (Cash/Bank)**
  - জমার মাধ্যম (Cash/Bank) এবং স্লিপ নম্বর ইনপুট নেওয়ার ফর্ম।
  - `deposits` টেবিলে সেভ করে `payments` এর `deposit_id` আপডেট করা।
- [ ] **Task 4.3: Dual Voucher Print CSS**
  - এক পাতায় 'Office Copy' এবং 'Teacher Copy' রেন্ডার করার জন্য Print CSS (`@media print`) লেখা।

---

## স্প্রিন্ট ৫: অফলাইন সিঙ্ক ও পলিশিং (Sprint 5: PWA & Offline Support)
- [ ] **Task 5.1: IndexedDB Offline Queue**
  - নেটওয়ার্ক না থাকলে কালেকশন ডেটা লোকালি সেভ করার মেকানিজম (`Dexie.js` বা কাস্টম সলিউশন)।
- [ ] **Task 5.2: Background Cloud Sync**
  - ইন্টারনেট আসলে লোকাল ডেটা Supabase এ পুশ করার লজিক।
- [ ] **Task 5.3: Security & Clean-up**
  - লগআউট করলে লোকাল স্টোরেজ ও ক্যাশ অটো-ক্লিন হওয়ার ফাংশন।
- [ ] **Task 5.4: Toast Notifications & Final Testing**
  - গ্লোবাল সাকসেস/এরর টোস্ট মেসেজ যোগ করা।
  - মোবাইল ও ডেস্কটপে রেসপন্সিভনেস চেক করা।

---

## পরবর্তী ধাপ
টাস্ক লিস্ট সম্পন্ন হয়েছে। পরবর্তী ধাপে (`prompt.md`) আমরা এই টাস্কগুলো এক্সিকিউট করার জন্য AI এর প্রম্পটগুলো তৈরি করব।
