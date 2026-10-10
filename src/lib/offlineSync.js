export const saveOfflinePayment = (paymentData, studentData) => {
  const offlinePayments = JSON.parse(localStorage.getItem("offline_payments") || "[]");
  offlinePayments.push({ paymentData, studentData, timestamp: Date.now() });
  localStorage.setItem("offline_payments", JSON.stringify(offlinePayments));
};

export const getOfflinePayments = () => {
  return JSON.parse(localStorage.getItem("offline_payments") || "[]");
};

export const clearOfflinePayments = () => {
  localStorage.removeItem("offline_payments");
};

export const syncOfflinePayments = async (supabase) => {
  if (!navigator.onLine) return;
  
  const offlinePayments = getOfflinePayments();
  if (offlinePayments.length === 0) return;

  try {
    for (const { paymentData, studentData } of offlinePayments) {
      // Insert Payment Record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([paymentData]);

      if (paymentError) throw paymentError;

      // Update Student Due
      const { error: studentError } = await supabase
        .from("students")
        .update({ opening_due: paymentData.due_remaining })
        .eq("id", paymentData.student_id);

      if (studentError) throw studentError;
    }
    
    // Clear offline payments on successful sync
    clearOfflinePayments();
    console.log("Successfully synced offline payments to cloud.");
    return true;
  } catch (error) {
    console.error("Error syncing offline payments:", error);
    return false;
  }
};

export const purgeAllLocalData = () => {
  localStorage.clear();
  sessionStorage.clear();
  console.log("Local cache and storage purged.");
};
