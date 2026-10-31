const REFUSAL = [
  /api[_\s-]?key/i,
  /\bopenai\b/i,
  /process\.env/i,
  /\bmongodb\b/i,
  /\$where/i,
  /\bpassword\b/i,
  /पासवर्ड/,
  /পাসওয়ার্ড/,
  /jwt[_\s-]?secret/i,
  /begin private key/i,
  /drop\s+database/i,
  /db\.\w+\.(find|aggregate|update|delete)/i,
  /child_process/i,
];

const STOP_DEPARTMENT = new Set([
  'मेरी', 'मेरा', 'इस', 'की', 'আমার', 'এই',
  'the', 'my', 'only', 'just', 'and', 'for', 'of', 'a', 'an',
  'give', 'me', 'this', 'in', 'to', 'report', 'attendance', 'summary', 'show',
]);

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 */
function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * @param {string} message
 * @returns {string}
 */
/**
 * @param {string} phrase
 */
function cleanDepartmentPhrase(phrase) {
  const words = String(phrase || '').split(/\s+/).filter((word) => (
    word && !STOP_DEPARTMENT.has(word.toLowerCase())
  ));
  return words.join(' ').trim();
}

export function extractDepartmentName(message) {
  const english = [...String(message).matchAll(
    /\b([A-Za-z][A-Za-z0-9-]*(?:\s+[A-Za-z][A-Za-z0-9-]*){0,3})\s+department\b/gi
  )];
  const hindi = message.match(/([A-Za-z0-9][A-Za-z0-9 &-]{0,40}|[\u0900-\u097F]+)\s+विभाग/);
  const bengali = message.match(/([A-Za-z0-9][A-Za-z0-9 &-]{0,40}|[\u0980-\u09FF]+)\s+বিভাগ/);
  const phrase = english.length ? english[english.length - 1][1] : '';
  const raw = cleanDepartmentPhrase(phrase) || (hindi?.[1] || bengali?.[1] || '').trim();
  if (!raw || STOP_DEPARTMENT.has(raw) || STOP_DEPARTMENT.has(raw.toLowerCase())) return '';
  return raw;
}

/**
 * Map a user message to one allowlisted tool, a refusal, or null.
 * This router never builds a database query.
 * @param {string} message
 * @returns {{ refused: true } | { name: string, args: object } | null}
 */
export function routeIntent(message) {
  const text = String(message || '').trim();
  if (!text) return null;
  if (hasAny(text, REFUSAL)) return { refused: true };

  const departmentName = extractDepartmentName(text);
  const yesterday = /\byesterday\b/i.test(text) || /গতকাল|बीता कल|कल की|कल का/.test(text);
  const asksWho = /\bwho\b/i.test(text) || /कौन/.test(text) || /কারা/.test(text);
  const meeting = hasAny(text, [/meeting/i, /मीटिंग/, /बैठक/, /মিটিং/]);
  const leave = hasAny(text, [/leave/i, /छुट्टी/, /अवकाश/, /ছুটি/]);
  const project = hasAny(text, [/project/i, /प्रोजेक्ट/, /परियोजना/, /প্রজেক্ট/, /প্রকল্প/]);
  const task = hasAny(text, [/\btasks?\b/i, /टास्क/, /कार्य/, /টাস্ক/]);
  const pending = hasAny(text, [/pending/i, /लंबित/, /পেন্ডিং/, /বাকি/]);
  const work = hasAny(text, [/\bwork\b/i, /assigned/i, /असाइन/, /काम/, /কাজ/]);
  const status = hasAny(text, [/status/i, /progress/i, /स्थिति/, /অবস্থা/, /প্রগ্রেস/]);
  const attendance = hasAny(text, [
    /attendance/i,
    /present/i,
    /अटेंडेंस/,
    /हाजिर/,
    /उपस्थिति/,
    /অ্যাটেনডেন্স/,
    /উপস্থিত/,
  ]);
  const employeeSummary = hasAny(text, [
    /employee summary/i,
    /headcount/i,
    /how many employees/i,
    /कर्मचारी/,
    /কর্মী/,
    /কর্মচারী/,
  ]);

  if (/morning brief|daily brief|brief me/i.test(text) || /आज का सार|আজকের সারাংশ/.test(text)) {
    return { name: 'getMorningBrief', args: {} };
  }
  if (asksWho && /late|absent|on leave|लेट|अनुपस्थित/i.test(text)) {
    return {
      name: 'getAttendanceExceptions',
      args: {
        ...(departmentName ? { departmentName } : {}),
        period: yesterday ? 'yesterday' : 'today',
      },
    };
  }
  if (/leave balance|leaves left|remaining leave|how many leaves|छुट्टी बैलेंस|ছুটির ব্যালেন্স/i.test(text)) {
    return { name: 'getMyLeaveBalance', args: {} };
  }
  if (/overtime|work[-\s]?from[-\s]?home|\bwfh\b|hiring/i.test(text)) {
    return { name: 'getPendingApprovals', args: {} };
  }
  const announcement = /announcement/i.test(text) || /घोषणा|ঘোষণা/.test(text);
  const policy = /\bpolic/i.test(text) || /नीति|পলিসি|নীতি/.test(text);
  if (announcement || policy) {
    let topic = 'both';
    if (announcement && !policy) topic = 'announcements';
    if (policy && !announcement) topic = 'policies';
    return { name: 'getCompanyNotices', args: { topic } };
  }

  if (meeting) return { name: 'getMeetings', args: { when: 'today' } };
  if (leave) return { name: 'getPendingLeaves', args: {} };
  if (project) return { name: 'getProjectStatus', args: {} };
  if (task || (pending && work && !attendance)) return { name: 'getMyTasks', args: {} };
  if (work && (status || /assigned/i.test(text))) return { name: 'getWorkStatus', args: {} };
  if (attendance) {
    const own = /\bmy\b/i.test(text)
      || /\bwas i\b/i.test(text)
      || /\bi was\b/i.test(text)
      || /मेरी|मेरा|मैं/.test(text)
      || /আমার|আমি/.test(text);
    const month = /\bmonth\b/i.test(text) || /इस महीने|इस माह|এই মাস/.test(text);
    if (own) return { name: 'getMyAttendance', args: { period: 'month' } };
    return {
      name: 'getAttendanceReport',
      args: {
        ...(departmentName ? { departmentName } : {}),
        period: yesterday ? 'yesterday' : month ? 'month' : 'today',
      },
    };
  }
  if (employeeSummary) {
    return {
      name: 'getEmployeeSummary',
      args: departmentName ? { departmentName } : {},
    };
  }
  return null;
}
