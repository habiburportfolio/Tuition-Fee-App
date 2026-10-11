/**
 * Converts a numerical amount into Bengali words.
 * Example: 1550 -> "এক হাজার পাঁচ শত পঞ্চাশ টাকা মাত্র"
 */

const banglaDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBanglaNumber(number) {
  if (number === null || number === undefined || isNaN(number)) return "০";
  return number.toString().replace(/\d/g, (d) => banglaDigits[parseInt(d, 10)]);
}

const banglaNumbers = [
  "শূন্য", "এক", "দুই", "তিন", "চার", "পাঁচ", "ছয়", "সাত", "আট", "নয়", "দশ",
  "এগারো", "বারো", "তেরো", "চৌদ্দ", "পনেরো", "ষোলো", "সতেরো", "আঠারো", "উনিশ", "বিশ",
  "একুশ", "বাইশ", "তেইশ", "চব্বিশ", "পঁচিশ", "ছাব্বিশ", "সাতাশ", "আঠাশ", "ঊনত্রিশ", "ত্রিশ",
  "একত্রিশ", "বত্রিশ", "তেত্রিশ", "চৌত্রিশ", "পঁয়ত্রিশ", "ছত্রিশ", "সাঁইত্রিশ", "আটত্রিশ", "ঊনচল্লিশ", "চল্লিশ",
  "একচল্লিশ", "বিয়াল্লিশ", "তেতাল্লিশ", "চুয়াল্লিশ", "পঁয়তাল্লিশ", "ছেচল্লিশ", "সাতচল্লিশ", "আটচল্লিশ", "ঊনপঞ্চাশ", "পঞ্চাশ",
  "একান্ন", "বায়ান্ন", "তিপ্পান্ন", "চুয়ান্ন", "পঞ্চান্ন", "ছাপ্পান্ন", "সাতান্ন", "আটান্ন", "ঊনষাট", "ষাট",
  "একষট্টি", "বাষট্টি", "তেষট্টি", "চৌষট্টি", "পঁয়ষট্টি", "ছেষট্টি", "সাতষট্টি", "আটষট্টি", "ঊনসত্তর", "সত্তর",
  "একাত্তর", "বাহাত্তর", "তিয়াত্তর", "চুয়াত্তর", "পঁচাত্তর", "ছিয়াত্তর", "সাতাত্তর", "আটাত্তর", "ঊনআশি", "আশি",
  "একাশি", "বিরাশি", "তিরাশি", "চুরাশি", "পঁচাশি", "ছিয়াশি", "সাতাশি", "অষ্টআশি", "ঊননব্বই", "নব্বই",
  "একানব্বই", "বানব্বই", "তিরানব্বই", "চুরানব্বই", "পঁচানব্বই", "ছিয়ানব্বই", "সাতানব্বই", "আটানব্বই", "নিরানব্বই"
];

function convertBelowThousand(n) {
  let result = "";
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    result += banglaNumbers[hundreds] + " শত ";
  }

  if (remainder > 0) {
    result += banglaNumbers[remainder] + " ";
  }

  return result.trim();
}

export function numberToBanglaWords(num) {
  const amount = Math.floor(Number(num) || 0);
  if (amount === 0) return "শূন্য টাকা মাত্র";
  if (amount < 0) return "মাইনাস " + numberToBanglaWords(Math.abs(amount));

  let remaining = amount;
  const parts = [];

  // Crores (কোটি)
  const crore = Math.floor(remaining / 10000000);
  if (crore > 0) {
    parts.push(numberToBanglaWords(crore).replace(" টাকা মাত্র", "") + " কোটি");
    remaining %= 10000000;
  }

  // Lakhs (লাখ)
  const lakh = Math.floor(remaining / 100000);
  if (lakh > 0) {
    parts.push(banglaNumbers[lakh] + " লাখ");
    remaining %= 100000;
  }

  // Thousands (হাজার)
  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    parts.push(banglaNumbers[thousand] + " হাজার");
    remaining %= 1000;
  }

  // Hundreds & Below
  if (remaining > 0) {
    parts.push(convertBelowThousand(remaining));
  }

  return parts.join(" ").trim() + " টাকা মাত্র";
}
