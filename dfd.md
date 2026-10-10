# 🔄 Data Flow Diagram (DFD)

**Project Name:** ClassFee Tracker (শ্রেণি শিক্ষক স্কুল ফি ও কালেকশন ম্যানেজার)  
**Phase:** Phase 2 (সিস্টেম ডিজাইন ও ডাটাবেজ - Step 8)  
**Status:** Draft

---

## ১. হাই-লেভেল ডাটা ফ্লো (Context Diagram - Level 0)

পুরো সিস্টেমটি কীভাবে বাহ্যিক এন্টিটি (যেমন: শিক্ষক, স্টুডেন্ট) এর সাথে ডেটা আদান-প্রদান করে তার ওভারভিউ।

```mermaid
graph TD
    Teacher[Teacher / User] -- 1. Setup Class & Fees --> System((ClassFee Tracker System))
    Teacher -- 2. Collect Fees --> System
    Teacher -- 3. Generate Reports/Vouchers --> System
    
    System -- 4. WhatsApp SMS Notification --> Parent[Student/Parent]
    System -- 5. Printed Receipt --> Parent
    System -- 6. Deposit Voucher --> Bank[Bank / Cash Counter]
```

---

## ২. মডিউল-ভিত্তিক বিস্তারিত ডাটা ফ্লো (Level 1 DFD)

### ২.১ একাডেমিক ও স্টুডেন্ট এন্ট্রি ফ্লো (Academic Setup & Student Entry)
কীভাবে একজন শিক্ষক নতুন সেশন শুরু করেন এবং স্টুডেন্ট আপলোড করেন।

```mermaid
graph LR
    T((Teacher)) -->|1. Create Class/Section| F1(Academic Config Form)
    F1 -->|Save| DB1[(academic_classes)]
    
    T -->|2. Upload Excel/CSV| F2(Student Import Engine)
    F2 -->|Validate & Sanitize| P1(Data Sanitizer)
    P1 -->|Bulk Insert| DB2[(students)]
    
    T -->|3. Setup Fees| F3(Fee Setup Form)
    F3 -->|Insert Fee Rules| DB3[(fees_setup)]
```

### ২.২ ফি কালেকশন ফ্লো (Fee Collection Flow)
যখন একজন স্টুডেন্ট টাকা দিতে আসে, তখন সিস্টেম কীভাবে কাজ করে।

```mermaid
graph TD
    T((Teacher)) -->|1. Enter Roll No| UI(Collection Screen)
    UI -->|Fetch Student & Dues| DB1[(students & fees_setup)]
    DB1 -.->|Return Pending Fees| UI
    
    T -->|2. Select Months & Enter Amount| UI
    UI -->|Submit Payment| P1(Payment Processor)
    
    P1 -->|3. Validate Payment Logic| P1
    P1 -->|4. Save Transaction| DB2[(payments)]
    P1 -->|5. Update Remaining Due| DB1
    
    DB2 -.->|6. Payment Success| UI
    UI -->|7. Generate Receipt| R(Receipt Generator)
    R -->|8. Send WhatsApp Text| WA(WhatsApp API/Intent)
```

### ২.৩ ক্যাশ ক্লোজিং ও ব্যাংক ডিপোজিট ফ্লো (Deposit & Dual Voucher Flow) ⭐
শিক্ষক কীভাবে সংগৃহীত টাকা ব্যাংকে বা স্কুলের ক্যাশে জমা দেন এবং ডুয়েল ভাউচার প্রিন্ট করেন।

```mermaid
graph TD
    T((Teacher)) -->|1. Click 'Mark as Deposited'| UI(Deposit Screen)
    UI -->|Fetch Undeposited Payments| DB1[(payments WHERE deposit_id IS NULL)]
    DB1 -.->|Return Total Cash in Hand| UI
    
    T -->|2. Enter Bank Slip/Cash Details| UI
    UI -->|Submit Deposit| P1(Deposit Processor)
    
    P1 -->|3. Save Deposit Record| DB2[(deposits)]
    P1 -->|4. Update Payments with deposit_id| DB1
    
    DB2 -.->|5. Deposit Success| UI
    UI -->|6. Generate Dual Voucher| V(Dual Voucher Generator)
    V -->|7. Print Office Copy & Teacher Copy| P(Printer)
```

### ২.৪ ভুল পেমেন্ট বাতিল ഫ্লো (Void/Reversal Flow)
ভুল করে অন্য রোল বা ভুল অ্যামাউন্ট এন্ট্রি করলে কীভাবে রিভার্স হয়।

```mermaid
graph LR
    T((Teacher)) -->|1. Select Payment & Click Void| P1(Void Processor)
    P1 -->|2. Require Reason| UI(Void Reason Prompt)
    UI -->|Submit Reason| P1
    
    P1 -->|3. Update Payment (is_voided=true)| DB1[(payments)]
    P1 -->|4. Restore Student Due| DB2[(students)]
```

---

## ৩. অফলাইন ডাটা ফ্লো (Offline-First Architecture)
ইন্টারনেট সংযোগ না থাকলে সিস্টেম কীভাবে কাজ করবে।

```mermaid
sequenceDiagram
    participant T as Teacher
    participant App as PWA (Browser)
    participant IDB as IndexedDB (Local)
    participant Supa as Supabase (Cloud)

    T->>App: Submits Payment (Offline)
    App->>IDB: Save to Local Transaction Queue
    IDB-->>App: Return Temporary ID & Local Receipt
    App-->>T: Show "Saved Offline" Toast

    Note over App,Supa: When Internet Restores (Online Event)
    
    App->>IDB: Fetch Pending Queue
    App->>Supa: Push Transactions (FIFO)
    Supa-->>App: Return Cloud IDs (Success)
    App->>IDB: Clear Synced Items
```

---

## ৪. পরবর্তী ধাপ
ডাটা ফ্লো ডায়াগ্রাম (DFD) সম্পন্ন হয়েছে। পরবর্তী ধাপে (`api-spec.md`) আমরা ডাটা ফ্লো এর উপর ভিত্তি করে API/Server Actions গুলোর স্পেসিফিকেশন তৈরি করব।
