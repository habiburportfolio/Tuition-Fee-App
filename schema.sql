-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Teachers Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    school_name TEXT NOT NULL,
    phone_number TEXT,
    eiin_number TEXT,
    school_email TEXT,
    head_teacher_phone TEXT,
    logo_url TEXT,
    signature_url TEXT,
    role TEXT DEFAULT 'teacher', -- 'teacher' or 'assistant'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Academic Classes Table
CREATE TABLE academic_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    session_year TEXT NOT NULL,
    class_name TEXT NOT NULL,
    section_name TEXT,
    group_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(teacher_id, session_year, class_name, section_name, group_name)
);

-- 3. Students Table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
    roll_no INTEGER NOT NULL,
    full_name TEXT NOT NULL,
    parent_name TEXT,
    parent_phone TEXT,
    opening_due NUMERIC DEFAULT 0,
    waiver_status TEXT DEFAULT 'None',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(class_id, roll_no)
);

-- 4. Fees Setup Table
CREATE TABLE fees_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES academic_classes(id) ON DELETE CASCADE,
    fee_type TEXT NOT NULL,
    month_name TEXT,
    amount NUMERIC NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Deposits Table (Created before Payments due to FK constraint)
CREATE TABLE deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    deposit_channel TEXT NOT NULL,
    bank_name TEXT,
    slip_number TEXT,
    total_amount NUMERIC NOT NULL,
    deposited_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_id UUID REFERENCES fees_setup(id) ON DELETE SET NULL,
    amount_paid NUMERIC NOT NULL,
    due_remaining NUMERIC NOT NULL,
    receipt_no TEXT UNIQUE NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    is_voided BOOLEAN DEFAULT FALSE,
    void_reason TEXT,
    deposit_id UUID REFERENCES deposits(id) ON DELETE SET NULL,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Teachers Policy
CREATE POLICY "Teachers can view own profile" ON teachers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Teachers can insert own profile" ON teachers FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Teachers can update own profile" ON teachers FOR UPDATE USING (auth.uid() = id);

-- Academic Classes Policy
CREATE POLICY "View own classes" ON academic_classes FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own classes" ON academic_classes FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own classes" ON academic_classes FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Delete own classes" ON academic_classes FOR DELETE USING (auth.uid() = teacher_id);

-- Students Policy
CREATE POLICY "View own students" ON students FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own students" ON students FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own students" ON students FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Delete own students" ON students FOR DELETE USING (auth.uid() = teacher_id);

-- Fees Setup Policy
CREATE POLICY "View own fees" ON fees_setup FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own fees" ON fees_setup FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own fees" ON fees_setup FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Delete own fees" ON fees_setup FOR DELETE USING (auth.uid() = teacher_id);

-- Deposits Policy
CREATE POLICY "View own deposits" ON deposits FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own deposits" ON deposits FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own deposits" ON deposits FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Delete own deposits" ON deposits FOR DELETE USING (auth.uid() = teacher_id);

-- Payments Policy
CREATE POLICY "View own payments" ON payments FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own payments" ON payments FOR UPDATE USING (auth.uid() = teacher_id);

-- 7. Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES academic_classes(id) ON DELETE CASCADE,
    expense_category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    expense_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own expenses" ON expenses FOR SELECT USING (auth.uid() = teacher_id);
CREATE POLICY "Insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Update own expenses" ON expenses FOR UPDATE USING (auth.uid() = teacher_id);
CREATE POLICY "Delete own expenses" ON expenses FOR DELETE USING (auth.uid() = teacher_id);
