/**
 * Utility to extract exact and human-readable error messages from Backend API responses
 * Handles ASP.NET Core ProblemDetails, Identity Result errors, FluentValidation dictionaries,
 * custom error objects { code, description }, string responses, and network errors.
 */

/**
 * Normalizes and cleans up common redundant Identity messages.
 * For example:
 * "Username 'xxx@gmail.com' is already taken.; Email 'xxx@gmail.com' is already taken."
 * -> "Email 'xxx@gmail.com' is already taken."
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return msg;

  let cleaned = msg.trim();

  // If both Username '...' is already taken and Email '...' is already taken are present, keep only the Email one
  const emailMatch = cleaned.match(/Email\s+['"][^'"]+['"]\s+is already taken\.?/i);
  if (
    cleaned.toLowerCase().includes('is already taken') &&
    cleaned.toLowerCase().includes('username') &&
    emailMatch
  ) {
    return emailMatch[0].endsWith('.') ? emailMatch[0] : `${emailMatch[0]}.`;
  }

  // If only Username 'xxx@domain.com' is already taken (where username is an email format)
  const singleUserEmail = cleaned.match(/^Username\s+(['"][^'"]+@[^'"]+['"])\s+is already taken\.?$/i);
  if (singleUserEmail) {
    return `Email ${singleUserEmail[1]} is already taken.`;
  }

  return cleaned;
}

function getRawApiErrorMessage(error, fallbackMessage = 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.') {
  if (!error) return fallbackMessage;

  // 1. If error is already a string
  if (typeof error === 'string' && error.trim()) {
    return error.trim();
  }

  const res = error.response;

  // 2. Network or client-level connection errors
  if (!res) {
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      return 'تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت أو حالة السيرفر.';
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return 'انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى.';
    }
    return error.message || fallbackMessage;
  }

  const status = res.status;
  const data = res.data;

  // 3. Status code defaults if no data body is returned
  if (!data) {
    if (status === 401) return 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.';
    if (status === 403) return 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء.';
    if (status === 404) return 'العنصر المطلوب غير موجود أو تم حذفه.';
    if (status === 409) return 'يوجد تعارض في البيانات المدخلة، قد يكون السجل موجوداً مسبقاً.';
    if (status >= 500) return 'حدث خطأ داخلي في الخادم (Internal Server Error). يرجى مراجعة الدعم الفني.';
    return fallbackMessage;
  }

  // 4. Plain text response
  if (typeof data === 'string' && data.trim()) {
    return data.trim();
  }

  // 5. Backend custom error field: data.error or data.Error
  const errProp = data.error ?? data.Error;
  if (errProp) {
    if (typeof errProp === 'string' && errProp.trim()) {
      return errProp.trim();
    }
    if (typeof errProp === 'object') {
      if (errProp.description && typeof errProp.description === 'string') return errProp.description;
      if (errProp.message && typeof errProp.message === 'string') return errProp.message;
      if (errProp.code && typeof errProp.code === 'string') return errProp.code;
    }
  }

  // 6. Validation Errors Dictionary (FluentValidation or ASP.NET ModelState)
  // Example: { errors: { Email: ["Email is required"], PhoneNumber: ["Invalid format"] } }
  const valErrors = data.errors ?? data.Errors;
  if (valErrors) {
    // Array of errors (e.g. Identity errors [{ code: '...', description: '...' }])
    if (Array.isArray(valErrors) && valErrors.length > 0) {
      const messages = valErrors
        .map((e) => {
          if (typeof e === 'string') return e;
          if (e?.description) return e.description;
          if (e?.errorMessage) return e.errorMessage;
          if (e?.message) return e.message;
          return null;
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join(' | ');
    } else if (typeof valErrors === 'object') {
      const messages = [];
      for (const key of Object.keys(valErrors)) {
        const item = valErrors[key];
        if (Array.isArray(item)) {
          messages.push(...item.filter((m) => typeof m === 'string' && m.trim()));
        } else if (typeof item === 'string' && item.trim()) {
          messages.push(item.trim());
        }
      }
      if (messages.length > 0) return messages.join(' | ');
    }
  }

  // 7. General message field: data.message or data.Message
  if (data.message && typeof data.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (data.Message && typeof data.Message === 'string' && data.Message.trim()) {
    return data.Message.trim();
  }

  // 8. ProblemDetails: data.detail or data.title
  if (data.detail && typeof data.detail === 'string' && data.detail.trim()) {
    return data.detail.trim();
  }
  if (
    data.title &&
    typeof data.title === 'string' &&
    data.title.trim() &&
    data.title !== 'One or more validation errors occurred.'
  ) {
    return data.title.trim();
  }

  // 9. Standard status fallbacks if nothing matched inside data
  if (status === 401) return 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.';
  if (status === 403) return 'ليس لديك الصلاحية الكافية للقيام بهذا الإجراء.';
  if (status === 404) return 'العنصر المطلوب غير موجود أو تم حذفه.';
  if (status === 409) return 'يوجد تعارض في البيانات المدخلة، قد يكون السجل موجوداً مسبقاً.';
  if (status >= 500) return 'حدث خطأ في الخادم أثناء معالجة الطلب.';

  return fallbackMessage;
}

export function extractApiErrorMessage(error, fallbackMessage = 'حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.') {
  const raw = getRawApiErrorMessage(error, fallbackMessage);
  return sanitizeErrorMessage(raw);
}

