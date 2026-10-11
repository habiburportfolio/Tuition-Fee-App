"use client";

import { AuthProvider } from "@/context/AuthContext";
import { LockProvider } from "@/context/LockContext";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <LockProvider>
        <Toaster position="top-center" />
        {children}
      </LockProvider>
    </AuthProvider>
  );
}

