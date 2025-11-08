/** 
 * Calculates the start of the month (YYYY-MM-01 00:00:00 local time). 
 */
export const getStartOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Formats a Date object to a YYYY-MM-DD string key using LOCAL TIME (not UTC).
 * Fixes the previous bug where UTC conversion caused the 1st of the month
 * to be stored as the last day of the previous month.
 */
export const formatDate = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // normalize to local midnight
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Safely parse a YYYY-MM-DD string into a local Date object (no UTC shift).
 * Example: parseISODateToLocal('2025-11-01') → Date(2025, 10, 1)
 */
export const parseISODateToLocal = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/** Utility functions (unmodified) **/
export const copyToClipboard = (text, setStatus) => {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setStatus('Copied!');
        setTimeout(() => setStatus(''), 1500);
      })
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
          document.execCommand('copy');
          setStatus('Copied!');
          setTimeout(() => setStatus('', 1500));
        } catch (err) {
          setStatus('Failed to copy');
          setTimeout(() => setStatus('', 1500));
        }
        document.body.removeChild(textarea);
      });
  }
};

/** Generates a unique 8-character ID for the mess. */
export const generateMessId = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

/** Generates a simple 6-digit join key. */
export const generateJoinKey = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/** Generates a short unique ID for expenses, etc. */
export const generateUniqueId = () => {
  return Math.random().toString(36).substring(2, 9);
};
