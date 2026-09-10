const COMBINING_MARKS = /[̀-ͯؐ-ًؚ-ٰٟـ]/g;
const ALEF_VARIANTS = /[أإآٱ]/g;
const ARABIC_INDIC_DIGITS = /[٠-٩]/g;
const EXTENDED_ARABIC_DIGITS = /[۰-۹]/g;
const NON_WORD_CHARACTERS = /[^a-z0-9ء-ي]+/g;

const asciiDigit = (digit: string, base: number): string => String(digit.charCodeAt(0) - base);

export const foldText = (text: string): string =>
  text
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .replace(ALEF_VARIANTS, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(ARABIC_INDIC_DIGITS, (digit) => asciiDigit(digit, 0x0660))
    .replace(EXTENDED_ARABIC_DIGITS, (digit) => asciiDigit(digit, 0x06f0))
    .toLowerCase();

export const paddedFoldedText = (text: string): string =>
  ` ${foldText(text).replace(NON_WORD_CHARACTERS, " ").trim()} `;
