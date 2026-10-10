# 🗣️ AI Execution Prompts

**Project Name:** ClassFee Tracker (শ্রেণি শিক্ষক স্কুল ফি ও কালেকশন ম্যানেজার)  
**Phase:** Phase 3 (AI এজেন্ট ও এক্সিকিউশন প্ল্যান - Step 13)  
**Status:** Draft

---

## প্রম্পট ব্যবহার বিধি (How to use these Prompts)
এই প্রম্পটগুলো কপি করে একের পর এক AI-কে দিতে হবে। AI এই প্রম্পট এবং পূর্ববর্তী সকল ডকুমেন্ট (`architecture.md`, `database-schema.md`, `ui-ux.md` ইত্যাদি) এর রেফারেন্স পড়ে কোড তৈরি করবে।

---

### Prompt 1: Project Initialization & Base CSS (Task 1.1, 1.2)
```text
@agent.md অনুযায়ী, তুমি একজন Senior Full-Stack Developer। 
অনুগ্রহ করে `tasks.md` এর Task 1.1 এবং 1.2 এক্সিকিউট করো। 
১. প্রথমে একটি Next.js বা Vite React প্রজেক্ট ইনিশিয়ালাইজ করো। 
২. `architecture.md` এর সেকশন ৩ অনুযায়ী ফোল্ডার স্ট্রাকচার তৈরি করো। 
৩. `ui-ux.md` এর কালার টোকেন এবং টাইপোগ্রাফি ব্যবহার করে `styles/globals.css` এবং `styles/variables.css` তৈরি করো।
```

### Prompt 2: Supabase Auth & RLS (Task 1.3, 1.4)
```text
এবার `tasks.md` এর Task 1.3 এবং 1.4 এক্সিকিউট করো।
১. Supabase JS Client কনফিগার করো `lib/supabaseClient.js` ফাইলে।
২. একটি `AuthContext.jsx` তৈরি করো টিচার লগইন এর জন্য।
৩. `database-schema.md` পড়ে ঠিক সেই অনুযায়ী Supabase SQL Editor-এ রান করার জন্য সম্পূর্ণ একটি `schema.sql` ফাইল তৈরি করে দাও, যেখানে সব টেবিল এবং Row Level Security (RLS) পলিসিগুলো থাকবে।
```

### Prompt 3: Academic Setup UI (Task 2.1)
```text
Task 2.1 এক্সিকিউট করো।
`ui-ux.md` ফলো করে ক্লাস, সেকশন এবং গ্রুপ তৈরি করার একটি ক্লিন এবং মোবাইল-ফ্রেন্ডলি ফর্ম (`components/setup/AcademicSetupForm.jsx`) তৈরি করো। ফর্ম সাবমিট হলে তা Supabase এর `academic_classes` টেবিলে সেভ হবে।
```

### Prompt 4: Student List & Import (Task 2.2, 2.3)
```text
Task 2.2 এবং 2.3 এক্সিকিউট করো।
১. স্টুডেন্টদের নামের তালিকা দেখানোর জন্য `StudentList.jsx` তৈরি করো।
২. `xlsx` লাইব্রেরি ব্যবহার করে এক্সেল থেকে বাল্ক স্টুডেন্ট আপলোড করার একটি মডাল (`ExcelImportModal.jsx`) তৈরি করো।
খেয়াল রাখবে, আপলোড হওয়া ডেটা যেন Supabase এর `students` টেবিলে সঠিক ফরম্যাটে যায়।
```

### Prompt 5: Fee Setup & Roll Search (Task 3.1, 3.2)
```text
Task 3.1 এবং 3.2 এক্সিকিউট করো।
১. মাসিক ফি, ল্যাব ফি ইত্যাদি তৈরি করার একটি ফর্ম বানাও যা `fees_setup` টেবিলে সেভ হবে।
২. ফি কালেকশনের মূল পেজটি বানাও যেখানে একটি বড় সার্চবার থাকবে। রোল নম্বর লিখে সার্চ করলে যেন স্টুডেন্টের নাম এবং বকেয়া (Due) চলে আসে।
```

### Prompt 6: Payment Engine (Task 3.3)
```text
সবচেয়ে গুরুত্বপূর্ণ পার্ট: Task 3.3 এক্সিকিউট করো।
`api-spec.md` এর `process_payment` লজিক অনুযায়ী পেমেন্ট প্রসেস করার ফাংশনটি লেখো। 
একাধিক মাস সিলেক্ট করা এবং আংশিক পেমেন্ট ক্যালকুলেট করার লজিক ঠিকভাবে ইমপ্লিমেন্ট করো। ট্রানজ্যাকশন সফল হলে একটি টোস্ট মেসেজ দেখাবে।
```

### Prompt 7: Receipt & WhatsApp Share (Task 3.4, 3.5)
```text
Task 3.4 এবং 3.5 এক্সিকিউট করো।
১. পেমেন্ট সফল হওয়ার পর স্ক্রিনে একটি ডিজিটাল রসিদ (`ReceiptModal.jsx`) দেখাও। 
২. একটি "Send WhatsApp Slip" বাটন রাখো যা `whatsapp://send?text=...` ব্যবহার করে কাজ করবে।
৩. ভুল পেমেন্ট বাতিল (Void) করার ফাংশনটি যোগ করো।
```

### Prompt 8: Cash Deposit & Dual Voucher (Task 4.1, 4.2, 4.3)
```text
Task 4.1, 4.2 এবং 4.3 এক্সিকিউট করো।
১. "Mark as Deposited" স্ক্রিনটি বানাও। এটি `deposits` টেবিলে ডেটা সেভ করবে।
২. `ui-ux.md` এর ৪.২ সেকশন অনুযায়ী **ডুয়েল ভাউচার প্রিন্ট CSS** (`print.css` বা `@media print`) লেখো, যাতে এক পাতায় অফিস কপি এবং শিক্ষক কপি রেন্ডার হয় এবং মাঝখানে ড্যাশড লাইন থাকে।
```

### Prompt 9: Offline PWA & Final Polish (Task 5.1 - 5.4)
```text
সর্বশেষ স্প্রিন্ট: Task 5.1 থেকে 5.4 এক্সিকিউট করো।
১. `Dexie.js` বা `localStorage` ব্যবহার করে অফলাইন কিউ (Queue) তৈরি করো যাতে ইন্টারনেট না থাকলেও পেমেন্ট সেভ হয়।
২. লগআউট করলে যেন লোকাল ক্যাশ মুছে যায় (Auto-purge) তার লজিক লেখো।
৩. অ্যাপটির সম্পূর্ণ রেসপন্সিভনেস এবং UI পলিশিং চেক করে কনফার্ম করো।
```
