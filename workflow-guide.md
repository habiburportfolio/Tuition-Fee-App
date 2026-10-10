# 🚀 AI-Driven Software Development Workflow Guide
> **স্পেসিফিকেশন-ড্রাইভেন ডেভেলপমেন্ট (Specification-Driven Development) মাস্টার গাইডলাইন**  
> এই গাইডলাইনে সফটওয়্যার তৈরির আইডিয়া থেকে শুরু করে কোডিং শেষ হওয়া পর্যন্ত কোন ফাইলের পর কোন ফাইল তৈরি করতে হবে এবং কীভাবে কাজ করতে হবে তা ধাপে ধাপে সাজানো হয়েছে।

---

## 📌 সূচিপত্র ও ফাইল তৈরির পর্যায়ক্রমিক ধারা (Step-by-Step Order)

| ধাপ | ফাইলের নাম | মূল উদ্দেশ্য |
| :--- | :--- | :--- |
| **Step 1** | [`idea.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/idea.md) | প্রজেক্টের ভিশন, সমস্যা ও সমাধানের প্রাথমিক রূপরেখা |
| **Step 2** | [`prd.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/prd.md) | প্রডাক্টের বিস্তারিত প্রয়োজনীয়তা ও ফিচার লিস্ট (PRD) |
| **Step 3** | [`prd-analysis.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/prd-analysis.md) | ফিচারের জটিলতা বিশ্লেষণ ও ফেজ বিভাজন (MVP vs Future) |
| **Step 4** | [`requirement-validation.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/requirement-validation.md) | রিকোয়ারমেন্টের বাস্তবতা, স্পষ্টতা ও ত্রুটি যাচাই |
| **Step 5** | [`architecture.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/architecture.md) | সিস্টেম আর্কিটেকচার, টেকনোলজি স্ট্যাক ও ফোল্ডার স্ট্রাকচার |
| **Step 6** | [`database.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/database.md) | ডাটাবেজ নির্বাচন ও কানেকশন স্ট্র্যাটেজি |
| **Step 7** | [`database-schema.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/database-schema.md) | ডাটাবেজ টেবিল, ফিল্ড, ডেটা টাইপ ও রিলেশনশিপ (ERD) |
| **Step 8** | [`dfd.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/dfd.md) | ডাটা ফ্লো ডায়াগ্রাম (ইউজার ইনপুট থেকে ডাটাবেজ প্রসেসিং) |
| **Step 9** | [`api-spec.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/api-spec.md) | এন্ডপয়েন্ট তালিকা, HTTP মেথড, রিকোয়েস্ট ও রেসপন্স ফরম্যাট |
| **Step 10** | [`ui-ux.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/ui-ux.md) | স্ক্রিনের তালিকা, ইউজার ইন্টারফেস ডিজাইন ও কম্পোনেন্ট প্ল্যান |
| **Step 11** | [`agent.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/agent.md) | AI কোডিং এজেন্টের নিয়মাবলী, রোল এবং কোডিং কনভেনশন |
| **Step 12** | [`tasks.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/tasks.md) | কোডিংয়ের অ্যাকশনেবল চেকলিস্ট (Sprint / Task Checklist) |
| **Step 13** | [`prompt.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/prompt.md) | AI-কে ধাপে ধাপে কোড করানোর এক্সিকিউশন প্রম্পট সিরিজ |
| **Step 14** | [`testing.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/testing.md) | গুরুত্বপূর্ণ ফিচারের জন্য টেস্ট কেস ও কোয়ালিটি চেকলিস্ট |
| **Step 15** | [`README.md`](file:///e:/AI%20For%20Developer%20(Afnam%20Mahmud)/Tution%20Fee%20App/README.md) | প্রজেক্ট ওভারভিউ এবং রান করার কমপ্লিট গাইডলাইন |

---

## 🛠️ প্রতিটি ফাইল কীভাবে তৈরি করতে হবে (বিস্তারিত গাইডলাইন)

### ফেজ ১: প্রজেক্টের পরিকল্পনা ও রিকোয়ারমেন্ট (Phase 1)

#### ১. `idea.md` (Project Concept)
* **কখন বানাবেন:** একদম প্রথমে।
* **কীভাবে লিখবেন:** 
  - **Problem:** ইউজার বা ক্লায়েন্ট বর্তমানে কী সমস্যায় পড়ছে?
  - **Solution:** আপনার অ্যাপটি কীভাবে এই সমস্যার সমাধান করবে?
  - **Target Audience:** কারা এটি ব্যবহার করবে (যেমন: টিচার, স্টুডেন্ট, অ্যাডমিন)?
  - **Core Vision:** অ্যাপের প্রধান ১-২টি ইউনিক পয়েন্ট।

#### ২. `prd.md` (Product Requirements Document)
* **কখন বানাবেন:** `idea.md` অনুমোদিত হওয়ার পর।
* **কীভাবে লিখবেন:**
  - **Core Objectives:** অ্যাপটির মূল লক্ষ্য।
  - **Functional Requirements:** কী কী ফিচার থাকবে (Auth, Student Management, Fee Ledger, Invoice, Reports ইত্যাদি)।
  - **Non-Functional Requirements:** পারফরম্যান্স, সিকিউরিটি, রেসপন্সিভনেস ইত্যাদি।
  - **User Personas & Stories:** "একজন অ্যাডমিন হিসেবে আমি স্টুডেন্টের ফি কালেকশন এন্ট্রি করতে চাই..."।

#### ৩. `prd-analysis.md` (PRD Analysis)
* **কখন বানাবেন:** PRD ফাইনাল করার পর।
* **কীভাবে লিখবেন:**
  - PRD-এর ফিচারগুলোকে বিশ্লেষণ করা।
  - জটিল বা ক্রিটিক্যাল ফিচার চিহ্নিত করা (যেমন: বকেয়া হিসাব, ডিসকাউন্ট লজিক, রসিদ প্রিন্ট)।
  - ফিচারগুলোকে ভাগে ভাগ করা: **MVP (Phase 1)** বনাম **Advanced (Phase 2)**।
  - সম্ভাব্য টেকনিক্যাল চ্যালেঞ্জ বা সীমাবদ্ধতা তালিকাভুক্ত করা।

#### ৪. `requirement-validation.md` (Validation)
* **কখন বানাবেন:** আর্কিটেকচারে যাওয়ার ঠিক আগে।
* **কীভাবে লিখবেন:**
  - প্রতিটি রিকোয়ারমেন্ট স্পষ্ট ও বাস্তবায়নযোগ্য কিনা যাচাইয়ের চেকলিস্ট।
  - কোনো দ্বন্দ্ব (conflict) বা অস্পষ্টতা থাকলে তা দূর করা।
  - কনফার্ম করা যে স্কোপ ডিফাইনড এবং কোনো মিসিং পার্ট নেই।

---

### ফেজ ২: সিস্টেম ডিজাইন ও ডাটাবেজ (Phase 2)

#### ৫. `architecture.md` (System Architecture)
* **কখন বানাবেন:** রিকোয়ারমেন্ট লক হওয়ার পর।
* **কীভাবে লিখবেন:**
  - **Tech Stack:** ফ্রন্টএন্ড, ব্যাকএন্ড, ডাটাবেজ, স্টাইলিং টুলস নির্বাচন।
  - **Folder Structure:** প্রজেক্টের ফোল্ডার ও ডিরেক্টরি স্ট্রাকচার।
  - **Architectural Pattern:** MVC / Modular / Component-based।
  - **State Management & Auth Strategy:** স্টেট ও লগইন কীভাবে হ্যান্ডেল হবে।

#### ৬. `database.md` (Database Choice & Strategy)
* **কখন বানাবেন:** আর্কিটেকচার চূড়ান্ত করার পর।
* **কীভাবে লিখবেন:**
  - ডাটাবেজের ধরণ নির্বাচন (Relational যেমন PostgreSQL/SQLite নাকি NoSQL যেমন MongoDB)।
  - কেন এই ডাটাবেজ বেছে নেওয়া হলো তার যুক্তি।
  - ডাটাবেজ ড্রাইভার বা ORM (Prisma/Drizzle/Mongoose/Direct SQL) নির্বাচন।

#### ৭. `database-schema.md` (Schema & ERD)
* **কখন বানাবেন:** ডাটাবেজ সিলেকশনের পর।
* **কীভাবে লিখবেন:**
  - টেবিল/মডেলের নাম (যেমন: `users`, `students`, `batches`, `fees`, `payments`)।
  - প্রতিটি টেবিলের কলাম, ডেটা টাইপ, Primary Key, Foreign Key, Constraints (`NOT NULL`, `UNIQUE` ইত্যাদি)।
  - টেবিলের রিলেশনশিপ (One-to-Many, Many-to-Many)।

#### ৮. `dfd.md` (Data Flow Diagram)
* **কখন বানাবেন:** স্কিমা রেডি হওয়ার পর।
* **কীভাবে লিখবেন:**
  - মূল অপারেশনগুলোর ফ্লোচার্ট বা ডায়াগ্রাম (Mermaid সিনট্যাক্স ব্যবহার করে)।
  - উদাহরণ: "স্টুডেন্ট ফি প্রদান ➡️ ব্যাকএন্ড ভ্যালিডেশন ➡️ পেমেন্ট টেবিল এন্ট্রি ➡️ স্টুডেন্ট ব্যালেন্স আপডেট ➡️ ইনভয়েস জেনারেশন"।

#### ৯. `api-spec.md` (API Specification)
* **কখন বানাবেন:** স্কিমা ও ফ্লো নিশ্চিত করার পর।
* **কীভাবে লিখবেন:**
  - প্রতিটি এন্ডপয়েন্ট: মেথড (`GET`/`POST`/`PUT`/`DELETE`), URL পাথ (যেমন: `/api/payments`)।
  - Request Headers ও Body প্যারামিটার (JSON)।
  - Success Response ও Error Response উদাহরণ।

#### ১০. `ui-ux.md` (Design System & Wireframes)
* **কখন বানাবেন:** কোডিং শুরু করার আগে।
* **কীভাবে লিখবেন:**
  - পেজ ও ভিউ তালিকা (Dashboard, Student List, Fee Payment Modal, Print Invoice)।
  - কালার প্যালেট (Primary, Background, Accents, Status colors - Due/Paid)।
  - টাইপোগ্রাফি ও লেআউট স্ট্রাকচার।

---

### ফেজ ৩: AI এজেন্ট ও এক্সিকিউশন প্ল্যান (Phase 3)

#### ১১. `agent.md` (AI Agent Rules)
* **কখন বানাবেন:** কোডিং প্রম্পটিং শুরু করার আগে।
* **কীভাবে লিখবেন:**
  - AI-এর রোল (Senior Full-Stack Developer)।
  - কোডিং স্ট্যান্ডার্ডস (Clean code, modular functions, error handling, comments)।
  - বাউন্ডারি (যেমন: অপ্রয়োজনীয় থার্ড-পার্টি লাইব্রেরি ইন্সটল না করা, существующие ফাইল না মুছে ফেলা)।

#### ১২. `tasks.md` (Actionable Task Checklist)
* **কখন বানাবেন:** কোডিং শুরু করার প্রাক্কালে।
* **কীভাবে লিখবেন:**
  - কোডিংয়ের সম্পূর্ণ কাজকে ছোট ছোট টাস্কে ভাগ করা:
    - [ ] Task 1.1: Project initialization & basic setup
    - [ ] Task 1.2: Database connection & schema migration
    - [ ] Task 2.1: Student CRUD APIs
    - [ ] Task 2.2: Student Management UI
  - প্রতি টাস্ক সম্পন্ন হলে টিক মার্ক (`[x]`) দেওয়া।

#### ১৩. `prompt.md` (Execution Prompts)
* **কখন বানাবেন:** টাস্ক লিস্ট ধরে ধরে।
* **কীভাবে লিখবেন:**
  - প্রতিটি টাস্ক সফলভাবে সম্পন্ন করার জন্য নিখুঁত প্রম্পট সিকোয়েন্স।
  - প্রতিটি প্রম্পটে কনটেক্সট ফাইল রেফারেন্স দিয়ে কাজ দেওয়া।

---

### ফেজ ৪: কোয়ালিটি ও ডিপ্লয়মেন্ট (Phase 4)

#### ১৪. `testing.md` (Quality Assurance)
* **কখন বানাবেন:** ফিচারের মূল কোড লেখার পর।
* **কীভাবে লিখবেন:**
  - বিজনেস লজিক টেস্ট কেস (যেমন: আংশিক পেমেন্ট দিলে বাকি বকেয়া ঠিকমতো ক্যালকুলেট হচ্ছে কিনা)।
  - এজ কেস হ্যান্ডলিং (শূন্য টাকা পেমেন্ট, নেগেটিভ ভ্যালু, ডুপ্লিকেট পেমেন্ট)।

#### ১৫. `README.md` (Documentation)
* **কখন বানাবেন:** প্রজেক্ট শেষে।
* **কীভাবে লিখবেন:**
  - প্রজেক্ট ইন্ট্রোডাকশন, ফিচার হাইলাইটস।
  - ইন্সটলেশন গাইড (`npm install`) এবং রান করার কমান্ড (`npm run dev`)।
  - এনভায়রনমেন্ট ভেরিয়েবল সেটআপ (`.env`)।

---

## 💡 AI দিয়ে দ্রুত তৈরির সহজ টেকনিক:
> [!TIP]
> আপনাকে সবগুলো ফাইল হাতে টাইপ করতে হবে না! আপনি কেবল আপনার অ্যাপের মূল আইডিয়া শেয়ার করবেন। এরপর এই গাইডলাইনের ক্রম ধরে আমি (আপনার AI অ্যাসিস্ট্যান্ট) প্রতিটি ফাইল একের পর এক নিখুঁত ফরম্যাটে লিখে দেব।
