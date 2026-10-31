const HELP = {
  en: 'I can help with attendance, who is late or on leave, leave balance, pending requests, announcements, policies, a morning brief, assigned work, and today’s meetings.',
  hi: 'मैं अटेंडेंस, लेट या छुट्टी, छुट्टी बैलेंस, लंबित अनुरोध, घोषणा, नीति, सुबह का सार, काम और आज की मीटिंग में मदद कर सकती हूँ।',
  bn: 'আমি অ্যাটেনডেন্স, লেট বা ছুটি, ছুটির ব্যালেন্স, বাকি অনুরোধ, ঘোষণা, নীতি, সকালের সারাংশ, কাজ এবং আজকের মিটিং নিয়ে সাহায্য করতে পারি।',
};

const REFUSAL = {
  en: 'I can’t help with that request.',
  hi: 'मैं इस अनुरोध में मदद नहीं कर सकती।',
  bn: 'আমি এই অনুরোধে সাহায্য করতে পারি না।',
};

/**
 * @param {string} language
 */
function copy(language) {
  return language === 'hi' || language === 'bn' ? language : 'en';
}

/**
 * @param {unknown} value
 */
function formatDay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatAttendanceSummary(language, data) {
  if (!data.personalRecords) {
    if (language === 'hi') return 'आपकी भूमिका के लिए व्यक्तिगत अटेंडेंस रिकॉर्ड नहीं रखे जाते।';
    if (language === 'bn') return 'আপনার ভূমিকার জন্য ব্যক্তিগত অ্যাটেনডেন্স রেকর্ড রাখা হয় না।';
    return 'Personal attendance records are not kept for your role.';
  }

  const present = data.present || 0;
  let lead;
  if (language === 'hi') lead = `इस महीने आप ${present} दिन उपस्थित रहे।`;
  else if (language === 'bn') lead = `এই মাসে আপনি ${present} দিন উপস্থিত ছিলেন।`;
  else lead = `You were present for ${present} days this month.`;

  const extras = [];
  if (data.absent) extras.push(language === 'hi' ? `${data.absent} अनुपस्थित` : language === 'bn' ? `${data.absent} অনুপস্থিত` : `${data.absent} absent`);
  if (data.late) extras.push(language === 'hi' ? `${data.late} लेट` : language === 'bn' ? `${data.late} লেট` : `${data.late} late`);
  if (data.halfDay) extras.push(language === 'hi' ? `${data.halfDay} हाफ डे` : language === 'bn' ? `${data.halfDay} হাফ ডে` : `${data.halfDay} half-day`);
  if (data.onLeave) extras.push(language === 'hi' ? `${data.onLeave} छुट्टी` : language === 'bn' ? `${data.onLeave} ছুটিতে` : `${data.onLeave} on leave`);
  if (!extras.length) return lead;
  if (language === 'hi') return `${lead} साथ में: ${extras.join(', ')}.`;
  if (language === 'bn') return `${lead} সাথে: ${extras.join(', ')}।`;
  return `${lead} Also recorded: ${extras.join(', ')}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function statusWord(language, data) {
  if (data.late) return language === 'hi' ? 'लेट' : language === 'bn' ? 'লেট' : 'late';
  if (data.absent) return language === 'hi' ? 'अनुपस्थित' : language === 'bn' ? 'অনুপস্থিত' : 'absent';
  if (data.onLeave) return language === 'hi' ? 'छुट्टी पर' : language === 'bn' ? 'ছুটিতে' : 'on leave';
  if (data.halfDay) return language === 'hi' ? 'हाफ डे' : language === 'bn' ? 'হাফ ডে' : 'half-day';
  if (data.present) return language === 'hi' ? 'उपस्थित' : language === 'bn' ? 'উপস্থিত' : 'present';
  return '';
}

/**
 * @param {Array<{ name: string, present?: number, late?: number, absent?: number, onLeave?: number }>|undefined} departments
 */
function formatDepartmentSplit(departments) {
  const lines = (departments || []).slice(0, 12).map((dept) => (
    `${dept.name}: ${dept.present || 0} present, ${dept.late || 0} late, ${dept.absent || 0} absent, ${dept.onLeave || 0} on leave`
  ));
  if (!lines.length) return '';
  const extra = departments.length > 12 ? ` ${departments.length - 12} more departments.` : '';
  return ` By department: ${lines.join('. ')}.${extra}`;
}

function formatAttendanceReport(language, data) {
  if (data.scope === 'self') {
    if (!data.personalRecords) {
      if (language === 'hi') return 'आपकी भूमिका के लिए व्यक्तिगत अटेंडेंस रिकॉर्ड नहीं रखे जाते।';
      if (language === 'bn') return 'আপনার ভূমিকার জন্য ব্যক্তিগত অ্যাটেনডেন্স রেকর্ড রাখা হয় না।';
      return 'Personal attendance records are not kept for your role.';
    }
    const word = statusWord(language, data);
    if (!word) {
      if (data.period === 'yesterday') {
        if (language === 'hi') return 'कल आपकी कोई अटेंडेंस दर्ज नहीं है।';
        if (language === 'bn') return 'গতকাল আপনার কোনো অ্যাটেনডেন্স নেই।';
        return 'There is no attendance record for you yesterday.';
      }
      if (language === 'hi') return 'आज आपकी कोई अटेंडेंस दर्ज नहीं है।';
      if (language === 'bn') return 'আজ আপনার কোনো অ্যাটেনডেন্স নেই।';
      return 'There is no attendance record for you today.';
    }
    if (data.period === 'yesterday') {
      if (language === 'hi') return `कल आप ${word} थे।`;
      if (language === 'bn') return `গতকাল আপনি ${word} ছিলেন।`;
      return `Yesterday you were marked ${word}.`;
    }
    if (language === 'hi') return `आज आप ${word} हैं।`;
    if (language === 'bn') return `আজ আপনি ${word}।`;
    return `Today you are marked ${word}.`;
  }

  const present = data.present || 0;
  const late = data.late || 0;
  const absent = data.absent || 0;
  const onLeave = data.onLeave || 0;
  const halfDay = data.halfDay || 0;
  const where = data.departmentName
    ? (language === 'hi'
      ? `${data.departmentName} विभाग में`
      : language === 'bn'
        ? `${data.departmentName} বিভাগে`
        : `in the ${data.departmentName} department`)
    : (language === 'hi' ? 'पूरी कंपनी में' : language === 'bn' ? 'পুরো কোম্পানিতে' : 'across the company');

  if (data.period === 'month') {
    const bits = `${present} present, ${absent} absent, ${late} late, ${halfDay} half-day, ${onLeave} on leave`;
    const split = formatDepartmentSplit(data.departments);
    if (language === 'hi') return `इस महीने ${where} अटेंडेंस: ${bits}.${split}`;
    if (language === 'bn') return `এই মাসে ${where} অ্যাটেনডেন্স: ${bits}।${split}`;
    return `This month's attendance ${where}: ${bits}.${split}`;
  }

  const dayWord = data.period === 'yesterday'
    ? (language === 'hi' ? 'कल' : language === 'bn' ? 'গতকাল' : 'Yesterday')
    : (language === 'hi' ? 'आज' : language === 'bn' ? 'আজ' : 'Today');

  let line;
  if (language === 'hi') {
    line = `${dayWord} ${where} ${present} उपस्थित, ${late} लेट, ${absent} अनुपस्थित, और ${onLeave} छुट्टी पर हैं।`;
  } else if (language === 'bn') {
    line = `${dayWord} ${where} ${present} জন উপস্থিত, ${late} জন লেট, ${absent} জন অনুপস্থিত, এবং ${onLeave} জন ছুটিতে।`;
  } else {
    line = `${dayWord} ${where}: ${present} present, ${late} late, ${absent} absent, and ${onLeave} on leave.`;
  }
  if (!halfDay) return line;
  if (language === 'hi') return `${line} ${halfDay} हाफ डे भी हैं।`;
  if (language === 'bn') return `${line} আরও ${halfDay} জন হাফ ডে।`;
  return `${line} ${halfDay} are half-day.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatTasks(language, data) {
  const count = data.count || 0;
  if (!count) {
    if (language === 'hi') return 'आपके कोई लंबित कार्य नहीं हैं।';
    if (language === 'bn') return 'আপনার কোনো বাকি কাজ নেই।';
    return 'You have no pending tasks.';
  }
  const lines = (data.items || []).slice(0, 5).map((item) => {
    const project = item.projectName ? ` (${item.projectName})` : '';
    return `${item.title}${project} — ${item.status}`;
  });
  const lead = language === 'hi'
    ? `आपके ${count} लंबित कार्य हैं।`
    : language === 'bn'
      ? `আপনার ${count}টি বাকি কাজ আছে।`
      : `You have ${count} pending tasks.`;
  return `${lead} ${lines.join('; ')}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatWork(language, data) {
  const pending = data.pending || 0;
  const total = data.total || 0;
  if (language === 'hi') return `आपके असाइन किए गए काम में से ${pending} खुले हैं, कुल ${total} में से।`;
  if (language === 'bn') return `আপনার অ্যাসাইন করা কাজের মধ্যে ${pending}টি খোলা আছে, মোট ${total}টির মধ্যে।`;
  return `You have ${pending} open assigned items out of ${total}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatLeaves(language, data) {
  const count = data.count || 0;
  const preview = (data.items || []).slice(0, 5).map((item) => {
    const who = item.employeeName ? `${item.employeeName}: ` : '';
    const start = formatDay(item.startDate);
    const end = formatDay(item.endDate);
    return `${who}${item.leaveType || 'leave'} (${start}–${end})`;
  }).filter(Boolean);

  let lead;
  if (data.scope === 'self') {
    if (language === 'hi') lead = `आपकी ${count} छुट्टी स्वीकृति के लिए लंबित है।`;
    else if (language === 'bn') lead = `আপনার ${count}টি ছুটি অনুমোদনের অপেক্ষায় আছে।`;
    else lead = `You have ${count} leave requests pending approval.`;
  } else if (language === 'hi') lead = `${count} छुट्टी अनुरोध स्वीकृति के लिए लंबित हैं।`;
  else if (language === 'bn') lead = `${count}টি ছুটির আবেদন অনুমোদনের অপেক্ষায় আছে।`;
  else lead = `${count} leave requests are pending approval.`;

  return preview.length ? `${lead} ${preview.join('; ')}.` : lead;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatProjects(language, data) {
  const count = data.count || 0;
  if (!count) {
    if (language === 'hi') return 'आपको कोई प्रोजेक्ट नहीं दिख रहा।';
    if (language === 'bn') return 'আপনার দেখার মতো কোনো প্রজেক্ট নেই।';
    return 'You do not have any visible projects.';
  }
  const lines = (data.projects || []).slice(0, 5).map(
    (project) => `${project.name}: ${project.status}, ${project.progress}%`
  );
  const lead = language === 'hi'
    ? `आप ${count} प्रोजेक्ट देख सकते हैं।`
    : language === 'bn'
      ? `আপনি ${count}টি প্রজেক্ট দেখতে পারেন।`
      : `You can see ${count} projects.`;
  return `${lead} ${lines.join('; ')}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatMeetings(language, data) {
  const count = data.count || 0;
  if (!count) {
    if (language === 'hi') return 'आज आपकी कोई मीटिंग नहीं है।';
    if (language === 'bn') return 'আজ আপনার কোনো মিটিং নেই।';
    return 'You have no meetings today.';
  }
  const lines = (data.items || []).slice(0, 5).map((item) => {
    const time = item.startTime ? ` at ${item.startTime}` : '';
    return `${item.title}${time}`;
  });
  const lead = language === 'hi'
    ? `आज आपकी ${count} मीटिंग है।`
    : language === 'bn'
      ? `আজ আপনার ${count}টি মিটিং আছে।`
      : `You have ${count} meetings today.`;
  return `${lead} ${lines.join('; ')}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatEmployees(language, data) {
  const total = data.total || 0;
  const roles = Object.entries(data.byRole || {})
    .map(([role, count]) => `${role} ${count}`)
    .join(', ');
  const roleText = roles ? ` (${roles})` : '';
  if (data.departmentName) {
    if (language === 'hi') return `${data.departmentName} विभाग में ${total} सक्रिय लोग हैं${roleText}.`;
    if (language === 'bn') return `${data.departmentName} বিভাগে ${total} জন সক্রিয় আছেন${roleText}।`;
    return `The ${data.departmentName} department has ${total} active people${roleText}.`;
  }
  if (language === 'hi') return `सक्रिय लोगों की संख्या ${total} है${roleText}.`;
  if (language === 'bn') return `সক্রিয় মানুষের সংখ্যা ${total}${roleText}।`;
  return `There are ${total} active people in view${roleText}.`;
}

/**
 * @param {string[]} names
 */
function joinNames(names) {
  const shown = (names || []).slice(0, 12);
  if (!shown.length) return '';
  const extra = names.length > 12 ? `, and ${names.length - 12} more` : '';
  return `${shown.join(', ')}${extra}`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatAttendancePeople(language, data) {
  if (data.scope === 'self' && !data.personalRecords) {
    if (language === 'hi') return 'आपकी भूमिका के लिए व्यक्तिगत अटेंडेंस रिकॉर्ड नहीं रखे जाते।';
    if (language === 'bn') return 'আপনার ভূমিকার জন্য ব্যক্তিগত অ্যাটেনডেন্স রেকর্ড রাখা হয় না।';
    return 'Personal attendance records are not kept for your role.';
  }

  const where = data.departmentName
    ? (language === 'hi'
      ? `${data.departmentName} विभाग में`
      : language === 'bn'
        ? `${data.departmentName} বিভাগে`
        : `in the ${data.departmentName} department`)
    : (language === 'hi' ? 'पूरी कंपनी में' : language === 'bn' ? 'পুরো কোম্পানিতে' : 'across the company');
  const when = data.period === 'yesterday'
    ? (language === 'hi' ? 'कल' : language === 'bn' ? 'গতকাল' : 'Yesterday')
    : (language === 'hi' ? 'आज' : language === 'bn' ? 'আজ' : 'Today');

  if (data.scope === 'self') {
    const name = data.late?.[0] || data.absent?.[0] || data.onLeave?.[0] || '';
    const states = [];
    if (data.late?.length) states.push(language === 'hi' ? 'लेट' : language === 'bn' ? 'লেট' : 'late');
    if (data.absent?.length) states.push(language === 'hi' ? 'अनुपस्थित' : language === 'bn' ? 'অনুপস্থিত' : 'absent');
    if (data.onLeave?.length) states.push(language === 'hi' ? 'छुट्टी पर' : language === 'bn' ? 'ছুটিতে' : 'on leave');
    if (!states.length) {
      if (language === 'hi') return 'आज आप लेट, अनुपस्थित या छुट्टी पर नहीं हैं।';
      if (language === 'bn') return 'আজ আপনি লেট, অনুপস্থিত বা ছুটিতে নন।';
      return 'You are not marked late, absent, or on leave today.';
    }
    return `${when}, ${name} is marked ${states.join(' and ')}.`;
  }

  const parts = [];
  if (data.late?.length) {
    parts.push(language === 'hi' ? `लेट: ${joinNames(data.late)}` : language === 'bn' ? `লেট: ${joinNames(data.late)}` : `late: ${joinNames(data.late)}`);
  }
  if (data.absent?.length) {
    parts.push(language === 'hi' ? `अनुपस्थित: ${joinNames(data.absent)}` : language === 'bn' ? `অনুপস্থিত: ${joinNames(data.absent)}` : `absent: ${joinNames(data.absent)}`);
  }
  if (data.onLeave?.length) {
    parts.push(language === 'hi' ? `छुट्टी पर: ${joinNames(data.onLeave)}` : language === 'bn' ? `ছুটিতে: ${joinNames(data.onLeave)}` : `on leave: ${joinNames(data.onLeave)}`);
  }
  if (!parts.length) {
    if (language === 'hi') return `${when} ${where} कोई लेट, अनुपस्थित या छुट्टी पर नहीं है।`;
    if (language === 'bn') return `${when} ${where} কেউ লেট, অনুপস্থিত বা ছুটিতে নেই।`;
    return `Nobody is marked late, absent, or on leave ${when.toLowerCase()}.`;
  }
  return `${when} ${where}, ${parts.join('. ')}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatApprovals(language, data) {
  const bits = [];
  if (data.overtime != null) bits.push(`${data.overtime} overtime`);
  if (data.wfh != null) bits.push(`${data.wfh} work-from-home`);
  if (data.hiring != null) bits.push(`${data.hiring} hiring`);
  const list = bits.join(', ').replace(/, ([^,]+)$/, ', and $1');
  if (language === 'hi') return `लंबित अनुरोध: ${list}.`;
  if (language === 'bn') return `বাকি অনুরোধ: ${list}।`;
  return `Pending requests: ${list}.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatLeaveBalance(language, data) {
  if (!data.eligible) {
    if (language === 'hi') return 'आपके रोजगार प्रकार पर अर्जित छुट्टी लागू नहीं होती।';
    if (language === 'bn') return 'আপনার চাকরির ধরনে অর্জিত ছুটি প্রযোজ্য নয়।';
    return 'Earned leave does not apply to your employment type.';
  }
  const remaining = data.remaining || 0;
  const earned = data.earned || 0;
  if (language === 'hi') return `आपकी छुट्टी बैलेंस ${remaining} दिन है, इस साल अर्जित ${earned} में से।`;
  if (language === 'bn') return `আপনার ছুটির ব্যালেন্স ${remaining} দিন, এই বছর অর্জিত ${earned} দিনের মধ্যে।`;
  return `Your leave balance is ${remaining} days remaining, from ${earned} earned this year.`;
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatNotices(language, data) {
  const parts = [];
  const announcements = data.announcements || [];
  const policies = data.policies || [];
  if (announcements.length) {
    const lines = announcements.map((item) => (item.type ? `${item.title} (${item.type})` : item.title));
    parts.push(language === 'hi'
      ? `घोषणाएँ: ${lines.join('; ')}.`
      : language === 'bn'
        ? `ঘোষণা: ${lines.join('; ')}।`
        : `Announcements you can read: ${lines.join('; ')}.`);
  } else if (data.topic !== 'policies') {
    parts.push(language === 'hi'
      ? 'अभी आपके लिए कोई घोषणा नहीं है।'
      : language === 'bn'
        ? 'এখন আপনার জন্য কোনো ঘোষণা নেই।'
        : 'There are no announcements for you right now.');
  }
  if (policies.length) {
    const lines = policies.map((item) => (item.category ? `${item.title} (${item.category})` : item.title));
    parts.push(language === 'hi'
      ? `नीतियाँ: ${lines.join('; ')}.`
      : language === 'bn'
        ? `নীতি: ${lines.join('; ')}।`
        : `Policies you can read: ${lines.join('; ')}.`);
  } else if (data.topic !== 'announcements') {
    parts.push(language === 'hi'
      ? 'अभी कोई सक्रिय नीति नहीं है।'
      : language === 'bn'
        ? 'এখন কোনো সক্রিয় নীতি নেই।'
        : 'There are no active policies right now.');
  }
  return parts.join(' ');
}

/**
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 */
function formatBrief(language, data) {
  const parts = [];
  if (data.attendance) parts.push(formatAttendanceReport(language, data.attendance));
  if (data.leaves) parts.push(formatLeaves(language, data.leaves));
  if (data.meetings) parts.push(formatMeetings(language, data.meetings));
  return parts.filter(Boolean).join(' ');
}

/**
 * Turn a tool payload into a short reply in the user's language.
 * @param {'en'|'hi'|'bn'} language
 * @param {object} data
 * @returns {string}
 */
export function formatResult(language, data) {
  const lang = copy(language);
  if (!data || data.type === 'help') return HELP[lang];
  if (data.type === 'refused') return REFUSAL[lang];
  if (data.type === 'attendance_summary') return formatAttendanceSummary(lang, data);
  if (data.type === 'attendance_report') return formatAttendanceReport(lang, data);
  if (data.type === 'attendance_people') return formatAttendancePeople(lang, data);
  if (data.type === 'pending_approvals') return formatApprovals(lang, data);
  if (data.type === 'leave_balance') return formatLeaveBalance(lang, data);
  if (data.type === 'company_notices') return formatNotices(lang, data);
  if (data.type === 'morning_brief') return formatBrief(lang, data);
  if (data.type === 'task_list') return formatTasks(lang, data);
  if (data.type === 'work_status') return formatWork(lang, data);
  if (data.type === 'pending_leaves') return formatLeaves(lang, data);
  if (data.type === 'project_status') return formatProjects(lang, data);
  if (data.type === 'meetings') return formatMeetings(lang, data);
  if (data.type === 'employee_summary') return formatEmployees(lang, data);
  return HELP[lang];
}

export function helpPayload() {
  return { type: 'help' };
}

export function refusalPayload() {
  return { type: 'refused' };
}
