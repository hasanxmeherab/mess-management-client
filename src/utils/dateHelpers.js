/** Calculates the start of the month (YYYY-MM-01 00:00:00). */
export const getStartOfMonth = (date) => {
    const d = new Date(date);
    d.setDate(1); // Set to the first day of the month
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Formats a Date object to a YYYY-MM-DD string key. */
export const formatDate = (date) => date.toISOString().split('T')[0];

/** Utility to copy text to clipboard and provide visual feedback. */
export const copyToClipboard = (text, setStatus) => {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            setStatus('Copied!');
            setTimeout(() => setStatus(''), 1500);
        }).catch(() => {
            // Fallback for environments where clipboard API is restricted
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            try {
                document.execCommand('copy');
                setStatus('Copied!');
                setTimeout(() => setStatus(''), 1500);
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

/** Generates a simple, short unique ID for expenses, etc. */
export const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 9);
};