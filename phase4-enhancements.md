# 🚀 Phase 4: Advanced Enhancements (Implementation Plan)

এই ফেজে আমরা ক্লাস-ফি ট্র্যাকারের জন্য নতুন ৬টি মেজর ফিচার যুক্ত করব। 

## 📝 Implementation Steps

### Step 1: Dark Mode & UI/UX Improvements
- `globals.css` এবং `variables.css` আপডেট করে CSS ভেরিয়েবলের মাধ্যমে ডার্ক মোড সাপোর্ট যুক্ত করা।
- `page.js` বা `Providers.jsx` এ থিম টগল (Theme Toggle) বাটন যোগ করা।

### Step 2: Advanced Reporting (Charts & Exports)
- `recharts` এবং `xlsx` বা `jspdf` লাইব্রেরি ইনস্টল করা।
- `Dashboard.jsx` এ ডেটা ভিজ্যুয়ালাইজেশনের জন্য Pie Chart ও Bar Chart যোগ করা।
- বকেয়া তালিকা এবং কালেকশন রিপোর্ট এক্সেলে ডাউনলোড করার বাটন যোগ করা।

### Step 3: Guardian Portal (Public View)
- `app/portal/page.js` নামে একটি নতুন পাবলিক রাউট তৈরি করা।
- যেখানে কোনো লগইন ছাড়াই অভিভাবক রোল নম্বর ও ক্লাস আইডি দিয়ে সার্চ করে বকেয়া দেখতে পারবেন।

### Step 4: Expense Tracking Module
- Supabase-এ `expenses` নামে নতুন একটি টেবিল তৈরি করা (`schema.sql` আপডেট)।
- ড্যাশবোর্ডে বা নতুন ট্যাবে `ExpenseTracker.jsx` কম্পোনেন্ট যোগ করা।

### Step 5: Bulk SMS / Automated Due Reminders
- কালেকশন পেজে "Send Due Reminder SMS" বাটন যোগ করা।
- একটি মক SMS API ইন্টিগ্রেশন বা WhatsApp bulk message link তৈরি করা।

### Step 6: Assistant Role (Role Based Access)
- `teachers` টেবিলে `role` (teacher/assistant) কলাম যোগ করা।
- অ্যাসিস্ট্যান্টদের জন্য ডিলিট বা এডিট পারমিশন হাইড করার লজিক `CollectionForm.jsx` এ যুক্ত করা।

---
**Status:** In Progress
