# 📡 API & Server Actions Specification

**Project Name:** ClassFee Tracker (শ্রেণি শিক্ষক স্কুল ফি ও কালেকশন ম্যানেজার)  
**Phase:** Phase 2 (সিস্টেম ডিজাইন ও ডাটাবেজ - Step 9)  
**Status:** Draft

---

## ১. API আর্কিটেকচার (API Architecture Overview)

যেহেতু আমরা **Supabase (PostgreSQL)** এবং **Next.js/React** ব্যবহার করছি, আমাদের ট্রেডিশনাল REST API এর বদলে **Supabase JS Client** (RPC / Direct Queries) অথবা **Next.js Server Actions** ব্যবহার করব। 

তবে লজিক্যাল স্পষ্টতার জন্য আমরা মূল ডাটাবেজ অপারেশনগুলোকে (CRUD) এন্ডপয়েন্ট/ফাংশন হিসেবে নিচে উল্লেখ করছি।

---

## ২. ফাংশন স্পেসিফিকেশন (Function Specifications)

### ২.১ ক্লাস ও স্টুডেন্ট ম্যানেজমেন্ট (Academic & Students)

#### `create_class`
* **উদ্দেশ্য:** নতুন সেশন ও ক্লাস তৈরি করা।
* **Input (Payload):**
  ```json
  {
    "session_year": "2026",
    "class_name": "Class 9",
    "section_name": "A",
    "group_name": "Science"
  }
  ```
* **Output:** `class_id` এবং ক্লাসের ডিটেইলস।

#### `import_students_bulk`
* **উদ্দেশ্য:** এক্সেল থেকে একসাথে স্টুডেন্ট আপলোড করা।
* **Input:**
  ```json
  {
    "class_id": "uuid",
    "students": [
      {
        "roll_no": 1,
        "full_name": "Tamim Iqbal",
        "parent_phone": "017...",
        "opening_due": 0
      }
    ]
  }
  ```
* **Output:** `success: true` এবং কতজন ইমপোর্ট হয়েছে তার count।

#### `get_student_details_by_roll`
* **উদ্দেশ্য:** ক্লাসরুমে রোল সার্চ করলে স্টুডেন্টের তথ্য ও বকেয়া নিয়ে আসা।
* **Input:** `class_id` (uuid), `roll_no` (integer)
* **Output:**
  ```json
  {
    "student_id": "uuid",
    "full_name": "Tamim Iqbal",
    "status": "Active",
    "waiver_status": "None",
    "total_due_remaining": 500,
    "unpaid_fees": [
      {"fee_id": "uuid", "fee_type": "Monthly", "month": "January", "amount": 500}
    ]
  }
  ```

---

### ২.২ ফি কালেকশন (Fee Collection)

#### `process_payment`
* **উদ্দেশ্য:** স্টুডেন্টের ফি গ্রহণ করা।
* **Input:**
  ```json
  {
    "student_id": "uuid",
    "fee_id": "uuid (optional for specific fee)",
    "amount_paid": 500,
    "payment_method": "Cash",
    "months_selected": ["January"]
  }
  ```
* **Logic:**
  1. `payments` টেবিলে একটি নতুন রেকর্ড তৈরি হবে।
  2. একটি ইউনিক `receipt_no` জেনারেট হবে।
  3. স্টুডেন্টের মোট বকেয়া আপডেট হবে।
* **Output:**
  ```json
  {
    "success": true,
    "receipt_no": "REC-1001",
    "transaction_id": "uuid",
    "whatsapp_text": "আপনার সন্তানের জানুয়ারি মাসের ৫00 টাকা..."
  }
  ```

#### `void_payment`
* **উদ্দেশ্য:** ভুল এন্ট্রি বাতিল করা।
* **Input:** `payment_id` (uuid), `void_reason` (string)
* **Logic:** 
  `payments` টেবিলে `is_voided = true` সেট করবে এবং `students` টেবিলে বকেয়া আবার যোগ করে দেবে।
* **Output:** `{ "success": true }`

---

### ২.৩ ক্যাশ ক্লোজিং ও ব্যাংক ডিপোজিট (Deposits & Vouchers) ⭐

#### `get_undeposited_cash_summary`
* **উদ্দেশ্য:** "Mark as Deposited" পেজে যাওয়ার সময় মোট কত টাকা হাতে আছে তা দেখানো।
* **Input:** `teacher_id` (from auth context)
* **Output:**
  ```json
  {
    "total_undeposited_amount": 5400,
    "payment_count": 15,
    "breakdown": [
      {"date": "2026-10-08", "amount": 2400},
      {"date": "2026-10-09", "amount": 3000}
    ]
  }
  ```

#### `create_deposit_record`
* **উদ্দেশ্য:** সংগৃহীত টাকা ব্যাংক বা ক্যাশে জমা দিয়ে ডুয়েল ভাউচার জেনারেট করা।
* **Input:**
  ```json
  {
    "deposit_channel": "Bank",
    "bank_name": "Sonali Bank",
    "slip_number": "SL-9842",
    "total_amount": 5400
  }
  ```
* **Logic:**
  1. `deposits` টেবিলে নতুন রেকর্ড তৈরি হবে।
  2. `payments` টেবিলের যে পেমেন্টগুলোর `deposit_id` NULL ছিল, সেগুলোকে এই নতুন `deposit_id` দিয়ে আপডেট করা হবে (Transaction)।
* **Output:** 
  ```json
  {
    "success": true,
    "deposit_id": "uuid",
    "voucher_data": {
      "teacher_name": "John Doe",
      "date": "...",
      "total": 5400
    }
  }
  ```

---

## ৩. Error Handling (Supabase/DB Errors)

প্রতিটি অপারেশনে সাধারণ এররগুলো সেন্ট্রালি হ্যান্ডেল করা হবে:
- **`23505` (Unique Violation):** যেমন- একই রোলে দুজন স্টুডেন্ট বা একই রসিদ নম্বর।
  * *Response:* "এই রোল নম্বরটি ইতোমধ্যে এই ক্লাসে বিদ্যমান।"
- **`PGRST116` (RLS Violation):** অন্য শিক্ষকের ডেটা এক্সেসের চেষ্টা।
  * *Response:* "আপনার এই ডেটা দেখার বা এডিট করার অনুমতি নেই।"

---

## ৪. পরবর্তী ধাপ
API স্পেসিফিকেশন সম্পন্ন হয়েছে। পরবর্তী ধাপে (`ui-ux.md`) আমরা স্ক্রিনের তালিকা এবং ইউজার ইন্টারফেস (UI) ডিজাইন প্ল্যান তৈরি করব।
