import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  User, 
  UserCheck,
  Settings as SettingsIcon, 
  Search, 
  FileText, 
  Send, 
  CheckCircle, 
  ExternalLink, 
  FileDown, 
  X, 
  ChevronRight, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Terminal,
  Save,
  Globe,
  Plus,
  Sun,
  Moon,
  Upload,
  Clock,
  Bell
} from 'lucide-react';

const CRM_FOLLOW_UP_DAYS = 7;

function buildContactStatusPayload(newStatus, existing = {}) {
  const now = new Date().toISOString();
  const payload = { status: newStatus };

  if (newStatus === 'Invite Sent' || newStatus === 'Waiting') {
    payload.inviteSentAt = existing.inviteSentAt || now;
    const followUp = new Date(payload.inviteSentAt);
    followUp.setDate(followUp.getDate() + CRM_FOLLOW_UP_DAYS);
    payload.nextFollowUpAt = followUp.toISOString();
    payload.followUpNeeded = false;
    if (!existing.lastOutboundDate) payload.lastOutboundDate = now;
  } else if (newStatus === 'To Contact' || newStatus === 'To Source') {
    payload.followUpNeeded = true;
  } else if (newStatus === 'Follow Up Needed') {
    payload.followUpNeeded = true;
  } else if (newStatus === 'Replied') {
    payload.followUpNeeded = false;
    payload.nextFollowUpAt = '';
  }

  return payload;
}

function formatFollowUpDate(isoDate) {
  if (!isoDate) return 'Not set';
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const RECRUITER_AGENCIES = [
  'hays', 'onset', 'wow recruitment', 'latitude it', 'salt', 'talent international',
  'hudson', 'robert half', 'michael page', 'adecco', 'randstad', 'genesis', 'aurec',
  'paxus', 'greythorn', 'chandler macleod', 'espy', 'allura', 'halcyon knights',
  'prestige staffing', 'charterhouse', 'command', 'davidson', 'sharp & carter',
  'tribe', 'reo group', 'denovo', 'sourced', 'g2', 'kinexus', 'm&t resources',
  'polyglot', 'peoplebank', 'talenza', 'trs resourcing', 'sirius', 'bluefin',
  'concept recruitment', 'method recruitment', 'mitchellake', 'xpand', 'interpro',
  'robert walters', 'executive search', 'cox purtell', 'purtell staffing'
];

function shortRoleTitle(title = '') {
  return String(title)
    .replace(/\s*[-–—|]\s*(software delivery|hybrid|remote|sydney|melbourne).*/i, '')
    .trim() || title;
}

function isRecruiterPosting(company = '', isRecruiter = false) {
  if (isRecruiter) return true;
  const lower = String(company).toLowerCase();
  return RECRUITER_AGENCIES.some((agency) => lower.includes(agency));
}

function formatOutreachWorkRightsLine(visa = '') {
  const v = String(visa || '').trim();
  if (/pr|permanent resident/i.test(v)) {
    return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
  }
  if (v) return `${v} — looking forward to connect.`;
  return 'Australian PR (Global Talent visa), relocating to AU — looking forward to connect.';
}

function buildQuickOutreachMessage({
  title = '',
  company = '',
  contactFirstName = '',
  isRecruiter = false,
  visa = ''
} = {}) {
  const first = (contactFirstName || '').trim().split(' ')[0];
  const greeting = first ? `Hey ${first},` : 'Hey,';
  const role = shortRoleTitle(title) || 'this role';
  const recruiter = isRecruiterPosting(company, isRecruiter);
  const workRights = formatOutreachWorkRightsLine(visa);

  let body;
  if (recruiter) {
    body = `Eugene here — just applied for the ${role} role that you posted. ${workRights}`;
  } else {
    const atCompany = company ? ` at ${company}` : '';
    body = `Eugene here — just applied for the ${role} role${atCompany}. ${workRights}`;
  }

  return `${greeting}\n\n${body}`.slice(0, 300);
}

function formatModelBadge(job) {
  const parts = [];
  if (job?.tailoredByModel) parts.push(`CV: ${job.tailoredByModel}`);
  if (job?.coverLetterByModel) parts.push(`Letter: ${job.coverLetterByModel}`);
  return parts.join(' · ');
}

function flattenInsightText(text) {
  return String(text || '')
    .replace(/^Suitability Score:\s*\d+\/10\s*/i, '')
    .replace(/^Okay, the score is\s*\d+\/10\.\s*[^\n]*\n*/i, '')
    .replace(/^-\s+/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function CollapsibleInsightCard({ title, text, badge, accentColor, bgColor, borderColor }) {
  const [expanded, setExpanded] = useState(false);
  const preview = flattenInsightText(text);

  if (!text) return null;

  return (
    <div
      className="glass-card"
      style={{
        background: bgColor,
        borderColor,
        marginBottom: '16px',
        padding: expanded ? '16px' : '10px 12px'
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        style={{
          width: '100%',
          margin: 0,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <ChevronRight
            size={14}
            style={{
              color: accentColor,
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s ease',
              flexShrink: 0
            }}
          />
          <h5
            style={{
              fontSize: '0.85rem',
              fontWeight: 'bold',
              color: accentColor,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              flex: '1 1 auto'
            }}
          >
            {title}
          </h5>
          {badge && (
            <span className="badge" style={{ fontSize: '0.65rem', borderColor: accentColor, color: accentColor }}>
              {badge}
            </span>
          )}
        </div>
        {!expanded && preview && (
          <p
            style={{
              margin: '6px 0 0 22px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              fontStyle: 'italic',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {preview}
          </p>
        )}
      </button>
      {expanded && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap', margin: '10px 0 0 22px' }}>
          {text}
        </p>
      )}
    </div>
  );
}

function getContactsForJob(contacts, job) {
  if (!job) return [];
  return contacts.filter(
    (c) =>
      c.jobId === job.id ||
      (String(c.company || '').toLowerCase() === String(job.company || '').toLowerCase() &&
        String(c.jobTitle || '').toLowerCase() === String(job.title || '').toLowerCase())
  );
}

const OUTREACH_BOARD_COLUMNS = [
  { id: 'to-reach-out', title: 'To Reach Out', hint: 'Find HM & send invite', color: '#38bdf8' },
  { id: 'waiting', title: 'Invite Sent — Wait', hint: 'Waiting for reply', color: '#a78bfa' },
  { id: 'follow-up', title: 'Follow Up', hint: 'Nudge needed', color: '#f59e0b' },
  { id: 'done', title: 'Done', hint: 'Replied / connected', color: '#10b981' }
];

function getJobOutreachInfo(job, contacts) {
  const linked = getContactsForJob(contacts, job);
  if (!['Applied', 'Invited'].includes(job?.status)) {
    return { stage: 'n/a', label: '—', contacts: linked, primaryContact: null };
  }

  if (linked.length === 0) {
    return { stage: 'to-reach-out', label: 'Find HM', contacts: [], primaryContact: null };
  }

  const primary =
    linked.find((c) => c.status === 'Follow Up Needed' || c.followUpNeeded) ||
    linked.find((c) => c.status === 'Waiting' || c.status === 'Invite Sent') ||
    linked.find((c) => c.status === 'Replied') ||
    linked[0];

  const status = primary.status || 'To Contact';
  if (status === 'Replied') {
    return { stage: 'done', label: 'Connected', contacts: linked, primaryContact: primary };
  }
  if (status === 'Follow Up Needed' || primary.followUpNeeded) {
    return { stage: 'follow-up', label: 'Follow Up', contacts: linked, primaryContact: primary };
  }
  if (status === 'Invite Sent' || status === 'Waiting') {
    return { stage: 'waiting', label: 'Waiting', contacts: linked, primaryContact: primary };
  }
  return { stage: 'to-reach-out', label: 'Reach Out', contacts: linked, primaryContact: primary };
}

function buildOutreachBoard(jobs, contacts) {
  const board = Object.fromEntries(OUTREACH_BOARD_COLUMNS.map((col) => [col.id, []]));
  jobs
    .filter((j) => j.status === 'Applied' || j.status === 'Invited')
    .forEach((job) => {
      const info = getJobOutreachInfo(job, contacts);
      if (board[info.stage]) {
        board[info.stage].push({ job, ...info });
      }
    });
  return board;
}

function parseCSV(text) {
  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (inQuotes && next === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push('');
    } else if ((c === '\r' || c === '\n') && !inQuotes) {
      if (c === '\r' && next === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += c;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  
  if (lines.length === 0) return [];
  const headers = lines[0].map(h => h.trim());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    if (values.length < headers.length) continue;
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] !== undefined ? values[index].trim() : '';
    });
    data.push(obj);
  }
  return data;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);
  const [settings, setSettings] = useState({
    geminiApiKey: '',
    deepSeekApiKey: '',
    targetKeywords: [],
    targetLocations: [],
    excludeCompanies: [],
    customInstructions: '',
    profile: {
      name: '',
      title: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      website: '',
      visa: '',
      address: '',
      summary: '',
      experience: []
    }
  });

  const [localProfile, setLocalProfile] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    linkedin: '',
    github: '',
    website: '',
    visa: '',
    address: '',
    summary: '',
    experience: []
  });

  useEffect(() => {
    if (settings.profile) {
      setLocalProfile(settings.profile);
    }
  }, [settings.profile]);
  
  const [jobs, setJobs] = useState([]);
  const [searchLogs, setSearchLogs] = useState([]);
  const [applyLogs, setApplyLogs] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isApplyingJobId, setIsApplyingJobId] = useState(null);
  const [tailoringJobId, setTailoringJobId] = useState(null);
  const [isGeneratingPdfId, setIsGeneratingPdfId] = useState(null);
  const [dismissalAnalysisLoading, setDismissalAnalysisLoading] = useState(null);
  const [customText, setCustomText] = useState('');
  const [customPdfUrl, setCustomPdfUrl] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingCoverLetter, setEditingCoverLetter] = useState('');
  const [editingWhyInterested, setEditingWhyInterested] = useState('');
  const [editingCustomInstructions, setEditingCustomInstructions] = useState('');
  const [editingJobTitle, setEditingJobTitle] = useState('');
  const [editingJobCompany, setEditingJobCompany] = useState('');
  const [editingJobLocation, setEditingJobLocation] = useState('');
  const [editingJobUrl, setEditingJobUrl] = useState('');
  const [editingJobAppUrl, setEditingJobAppUrl] = useState('');
  const [editingHiringManager, setEditingHiringManager] = useState('');
  const [editingHiringManagerIntro, setEditingHiringManagerIntro] = useState('');
  const [editingJobIsRecruiter, setEditingJobIsRecruiter] = useState(false);
  const [editingJobScore, setEditingJobScore] = useState('');

  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedWhyInterested, setCopiedWhyInterested] = useState(false);
  const [copiedHiringManagerIntro, setCopiedHiringManagerIntro] = useState(false);
  const [isGeneratingHiringIntro, setIsGeneratingHiringIntro] = useState(false);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  
  const [promptRevisionLoading, setPromptRevisionLoading] = useState(false);
  const [promptRevisionResult, setPromptRevisionResult] = useState(null);
  const [editableRevisedPrompt, setEditableRevisedPrompt] = useState('');
  
  // Contacts CRM state
  const [contacts, setContacts] = useState([]);
  const [isEditingContact, setIsEditingContact] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('All');
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactProfileUrl, setContactProfileUrl] = useState('');
  const [contactThreadUrl, setContactThreadUrl] = useState('');
  const [contactNotes, setContactNotes] = useState('');
  const [contactStatus, setContactStatus] = useState('To Contact');
  const [contactJobId, setContactJobId] = useState('');
  const [contactJobTitle, setContactJobTitle] = useState('');
  
  // Filtering for jobs pipeline
  const [statusFilter, setStatusFilter] = useState('To Process');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const [dateRangeFilter, setDateRangeFilter] = useState('7days'); // '7days' | 'all'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [importUrlsText, setImportUrlsText] = useState('');
  const [sourcingMode, setSourcingMode] = useState('search'); // 'search' | 'import'

  const searchTerminalEndRef = useRef(null);
  const applyTerminalEndRef = useRef(null);

  // Load Settings, Jobs and Contacts on mount
  useEffect(() => {
    fetchSettings();
    fetchJobs();
    fetchContacts();
  }, []);

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setEditingCoverLetter(job.coverLetter || '');
    setEditingWhyInterested(job.whyInterested || '');
    setEditingCustomInstructions(job.customInstructions || '');
    setEditingJobTitle(job.title || '');
    setEditingJobCompany(job.company || '');
    setEditingJobLocation(job.location || '');
    setEditingJobUrl(job.url || '');
    setEditingJobAppUrl(job.applicationUrl || '');
    setEditingHiringManager(job.hiringManager || '');
    setEditingHiringManagerIntro(
      job.hiringManagerIntro ||
      (job.status === 'Applied'
        ? buildQuickOutreachMessage({
            title: job.title,
            company: job.company,
            isRecruiter: !!job.isRecruiter,
            visa: localProfile?.visa
          })
        : '')
    );
    setEditingJobIsRecruiter(job.isRecruiter || false);
    setEditingJobScore(job.suitabilityScore || '');
  };

  // Scroll terminal logs to bottom
  useEffect(() => {
    if (searchTerminalEndRef.current) {
      searchTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [searchLogs]);

  useEffect(() => {
    if (applyTerminalEndRef.current) {
      applyTerminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [applyLogs]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data);
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      setContacts(data);
    } catch (e) {
      console.error('Failed to fetch contacts:', e);
    }
  };

  const handleSaveContact = async (e) => {
    if (e) e.preventDefault();
    const basePayload = {
      firstName: contactFirstName,
      lastName: contactLastName,
      company: contactCompany,
      jobId: contactJobId,
      jobTitle: contactJobTitle,
      profileUrl: contactProfileUrl,
      threadUrl: contactThreadUrl,
      notes: contactNotes,
      status: contactStatus
    };
    const payload = {
      ...basePayload,
      ...buildContactStatusPayload(contactStatus, isEditingContact || {})
    };

    try {
      let res;
      if (isEditingContact) {
        res = await fetch(`/api/contacts/${isEditingContact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/contacts/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      const resData = await res.json();
      if (resData.success) {
        fetchContacts();
        setShowAddContactModal(false);
        setIsEditingContact(null);
        clearContactForm();
      } else {
        alert('Failed to save contact: ' + resData.error);
      }
    } catch (err) {
      alert('Error saving contact: ' + err.message);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    try {
      await fetch(`/api/contacts/${contactId}`, {
        method: 'DELETE'
      });
      setContacts(prev => prev.filter(c => c.id !== contactId));
    } catch (e) {
      alert('Failed to delete contact');
    }
  };

  const handleUpdateContactStatus = async (contactId, newStatus, extra = {}) => {
    try {
      const existing = contacts.find((c) => c.id === contactId) || {};
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...buildContactStatusPayload(newStatus, existing),
          ...extra
        })
      });
      const data = await res.json();
      if (data.success) {
        setContacts((prev) => prev.map((c) => (c.id === contactId ? data.data : c)));
      }
    } catch (e) {
      console.error('Failed to update contact status:', e);
    }
  };

  const handleSnoozeFollowUp = async (contactId, days = CRM_FOLLOW_UP_DAYS) => {
    const existing = contacts.find((c) => c.id === contactId);
    if (!existing) return;
    const nextFollowUpAt = new Date();
    nextFollowUpAt.setDate(nextFollowUpAt.getDate() + days);
    await handleUpdateContactStatus(contactId, 'Waiting', {
      nextFollowUpAt: nextFollowUpAt.toISOString(),
      followUpNeeded: false
    });
  };

  const handleAddContactForJob = (job, preset = {}) => {
    clearContactForm();
    setIsEditingContact(null);
    setContactCompany(job.company || '');
    setContactJobId(job.id || '');
    setContactJobTitle(job.title || '');
    setContactProfileUrl(job.hiringManager?.startsWith('http') ? job.hiringManager : '');
    if (job.hiringManager && !job.hiringManager.startsWith('http')) {
      const parts = job.hiringManager.trim().split(' ');
      setContactFirstName(parts[0] || '');
      setContactLastName(parts.slice(1).join(' ') || '');
    }
    setContactNotes(preset.notes || `Outreach for ${job.title} at ${job.company}`);
    setContactStatus(preset.status || 'To Contact');
    setShowAddContactModal(true);
  };

  const clearContactForm = () => {
    setContactFirstName('');
    setContactLastName('');
    setContactCompany('');
    setContactJobId('');
    setContactJobTitle('');
    setContactProfileUrl('');
    setContactThreadUrl('');
    setContactNotes('');
    setContactStatus('To Contact');
  };

  const handleOpenEditContact = (contact) => {
    setIsEditingContact(contact);
    setContactFirstName(contact.firstName || '');
    setContactLastName(contact.lastName || '');
    setContactCompany(contact.company || '');
    setContactProfileUrl(contact.profileUrl || '');
    setContactThreadUrl(contact.threadUrl || '');
    setContactNotes(contact.notes || '');
    setContactStatus(contact.status || 'To Contact');
    setContactJobId(contact.jobId || '');
    setContactJobTitle(contact.jobTitle || '');
    setShowAddContactModal(true);
  };

  const handleImportContactsCSV = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        alert('No contacts parsed from CSV.');
        return;
      }
      
      const formatted = parsed.map(row => {
        const firstName = row.firstName || '';
        const lastName = row.lastName || '';
        const company = row.company || '';
        const profileUrl = row.profileUrl || '';
        const threadUrl = row.threadUrl || '';
        const notes = row.notes || '';
        let status = 'To Contact';
        if (row.manualStatus === 'invite_sent') {
          status = 'Invite Sent';
        } else if (row.manualStatus === 'replied') {
          status = 'Replied';
        } else if (row.followUpNeeded === 'true') {
          status = 'Follow Up Needed';
        }
        return {
          id: Math.random().toString(36).substring(2, 11),
          firstName,
          lastName,
          company,
          profileUrl,
          threadUrl,
          lastOutboundDate: row.lastOutboundDate || '',
          lastOutboundSnippet: row.lastOutboundSnippet || '',
          lastInboundDate: row.lastInboundDate || '',
          lastInboundSnippet: row.lastInboundSnippet || '',
          followUpNeeded: row.followUpNeeded === 'true',
          status: status,
          notes: notes,
          updatedAt: row.updatedAt || new Date().toISOString()
        };
      });

      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formatted)
        });
        const resData = await res.json();
        if (resData.success) {
          fetchContacts();
          alert(`Successfully imported ${formatted.length} contacts!`);
        } else {
          alert('Failed to import contacts: ' + resData.error);
        }
      } catch (err) {
        alert('Import error: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      setSettings(data);
      alert('Settings saved successfully!');
    } catch (e) {
      alert('Failed to save settings: ' + e.message);
    }
  };

  const handleSaveProfile = async (updatedProfile) => {
    try {
      const updatedSettings = { ...settings, profile: updatedProfile };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      setSettings(data);
      alert('Profile updated successfully!');
    } catch (e) {
      alert('Failed to save profile: ' + e.message);
    }
  };

  // Trigger DuckDuckGo Search (SSE Log Stream)
  const handleSearchJobs = () => {
    if (isSearching) return;
    setIsSearching(true);
    setSearchLogs(['Initiating search session...']);
    
    const eventSource = new EventSource('/api/jobs/search', {
      // Connect to event stream via POST is not supported natively by EventSource.
      // But we can trigger a POST search request, and standard EventSource can stream if we use GET or SSE connection.
      // Wait, we designed the backend to expect a POST request, but SSE EventSource is usually GET. 
      // Let's call standard fetch POST /api/jobs/search first, or we can make a GET endpoint, 
      // or we can stream using normal fetch reader!
      // Fetch response.body.getReader() is extremely robust, modern, and supports POST request bodies!
      // Let's implement fetch reader stream. It works perfectly in React!
    });
  };

  // Web fetch reader stream for real-time logs
  const startJobSearch = async () => {
    if (isSearching) return;
    setIsSearching(true);
    setSearchLogs(['[System] Initializing search copilot...', '[System] Launching browser query...']);
    
    try {
      const response = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep last incomplete line in buffer
        
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.type === 'log') {
                setSearchLogs(prev => [...prev, data.message]);
              } else if (data.type === 'done') {
                setSearchLogs(prev => [...prev, `[Success] Search complete! Added ${data.count} new jobs.`]);
                fetchJobs();
                setIsSearching(false);
              } else if (data.type === 'error') {
                setSearchLogs(prev => [...prev, `[Error] ${data.error}`]);
                setIsSearching(false);
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      setSearchLogs(prev => [...prev, `[System Error] Sourcing failed: ${e.message}`]);
      setIsSearching(false);
    }
  };

  const startJobImport = async () => {
    if (isSearching) return;
    const urls = importUrlsText.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      alert('Please enter at least one URL.');
      return;
    }
    setIsSearching(true);
    setSearchLogs(['[System] Initializing direct URL importer...', `[System] Processing ${urls.length} links...`]);
    
    try {
      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();
        
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.type === 'log') {
                setSearchLogs(prev => [...prev, data.message]);
              } else if (data.type === 'done') {
                setSearchLogs(prev => [...prev, `[Success] Import complete! Added ${data.count} new jobs.`]);
                fetchJobs();
                setIsSearching(false);
                setImportUrlsText('');
              } else if (data.type === 'error') {
                setSearchLogs(prev => [...prev, `[Error] ${data.error}`]);
                setIsSearching(false);
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      setSearchLogs(prev => [...prev, `[System Error] Import failed: ${e.message}`]);
      setIsSearching(false);
    }
  };

  // AI tailoring
  const handleTailorJob = async (jobId) => {
    setTailoringJobId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/tailor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customInstructions: editingCustomInstructions })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        // Update jobs list
        setJobs(prev => prev.map(j => j.id === jobId ? data : j));
        if (selectedJob && selectedJob.id === jobId) {
          handleSelectJob(data);
        }
        const modelLabel = formatModelBadge(data);
        alert(modelLabel ? `CV tailored successfully!\n\nGenerated by: ${modelLabel}` : 'CV tailored successfully!');
        await handleGeneratePdf(jobId);
      }
    } catch (e) {
      alert('Failed to tailor: ' + e.message);
    } finally {
      setTailoringJobId(null);
    }
  };

  // PDF generation
  const handleGeneratePdf = async (jobId) => {
    setIsGeneratingPdfId(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/pdf`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        // Update jobs list
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, pdfPath: data.pdfUrl, docxPath: data.docxUrl } : j));
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(prev => ({ ...prev, pdfPath: data.pdfUrl, docxPath: data.docxUrl }));
        }
        alert('CV exported successfully!');
      }
    } catch (e) {
      alert('Failed to print PDF: ' + e.message);
    } finally {
      setIsGeneratingPdfId(null);
    }
  };

  const handleAutofillJob = () => {
    if (selectedJob) {
      handleApplyJob(selectedJob.id);
    }
  };

  // Guided Apply (Headed Browser SSE stream logs)
  const handleApplyJob = async (jobId) => {
    if (isApplyingJobId) return;
    setIsApplyingJobId(jobId);
    setApplyLogs(['[System] Launching headed Playwright Chromium browser...', '[System] Waiting for page load...']);
    
    try {
      // First save cover letter edits if selectedJob is open
      if (selectedJob && selectedJob.id === jobId && editingCoverLetter !== selectedJob.coverLetter) {
        const updatedJobs = jobs.map(j => {
          if (j.id === jobId) {
            return { ...j, coverLetter: editingCoverLetter };
          }
          return j;
        });
        setJobs(updatedJobs);
        await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJobs)
        });
      }

      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();
        
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6).trim());
              if (data.type === 'log') {
                setApplyLogs(prev => [...prev, data.message]);
              } else if (data.type === 'done') {
                setApplyLogs(prev => [...prev, '[Success] Guided application completed! Status updated to Applied.']);
                fetchJobs();
                setIsApplyingJobId(null);
              } else if (data.type === 'error') {
                setApplyLogs(prev => [...prev, `[Error] ${data.error}`]);
                setIsApplyingJobId(null);
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      setApplyLogs(prev => [...prev, `[System Error] Application failed: ${e.message}`]);
      setIsApplyingJobId(null);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to remove this job from your pipeline?')) return;
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      });
      setJobs(prev => prev.filter(j => j.id !== jobId));
      if (selectedJob && selectedJob.id === jobId) setSelectedJob(null);
    } catch (e) {
      alert('Failed to delete job');
    }
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    const updated = jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j);
    setJobs(updated);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (newStatus === 'Applied') {
        await fetchContacts();
      }
      if (selectedJob?.id === jobId) {
        const data = await res.json();
        if (data?.data) setSelectedJob(data.data);
      }
    } catch (e) {
      console.error('Failed to update status in DB');
    }
  };

  const handleUpdateJobLocation = async (jobId, newLocation) => {
    const updated = jobs.map(j => j.id === jobId ? { ...j, location: newLocation } : j);
    setJobs(updated);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newLocation })
      });
    } catch (e) {
      console.error('Failed to update location in DB');
    }
  };

  const handleUpdateJobScore = async (jobId, newScore) => {
    const parsedScore = newScore !== '' ? parseInt(newScore, 10) : null;
    const updated = jobs.map(j => j.id === jobId ? { ...j, suitabilityScore: parsedScore } : j);
    setJobs(updated);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suitabilityScore: parsedScore })
      });
    } catch (e) {
      console.error('Failed to update score in DB');
    }
  };

  const handleAnalyzeDismissal = async (jobId) => {
    setDismissalAnalysisLoading(jobId);
    try {
      const res = await fetch(`/api/jobs/${jobId}/analyze-dismissal`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, dismissalAnalysis: data.dismissalAnalysis } : j));
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(prev => ({ ...prev, dismissalAnalysis: data.dismissalAnalysis }));
        }
        alert('Rejection analysis completed successfully!');
      }
    } catch (e) {
      alert('Failed to analyze dismissal: ' + e.message);
    } finally {
      setDismissalAnalysisLoading(null);
    }
  };

  const handleSuggestPromptRevision = async (jobId) => {
    setPromptRevisionLoading(true);
    setPromptRevisionResult(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/suggest-prompt-revision`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!data.success) {
        alert('Failed to get prompt revision suggestion: ' + data.error);
      } else {
        setPromptRevisionResult(data);
        setEditableRevisedPrompt(data.revisedCustomInstructions || '');
      }
    } catch (e) {
      alert('Failed to get prompt revision suggestion: ' + e.message);
    } finally {
      setPromptRevisionLoading(false);
    }
  };

  const handleApplyPromptRevision = async () => {
    try {
      const updatedSettings = { ...settings, customInstructions: editableRevisedPrompt };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      setSettings(data);
      setPromptRevisionResult(null);
      alert('Custom Instructions updated successfully!');
    } catch (e) {
      alert('Failed to save updated instructions: ' + e.message);
    }
  };

  // Filter and search logic
  const filteredJobs = jobs.filter(j => {
    const isToProcessStatus = !['Applied', 'Invited', 'Dismissed', 'Skipped', 'Saved'].includes(j.status);
    const matchesStatus = statusFilter === 'All' || 
                          (statusFilter === 'To Process' ? isToProcessStatus : j.status === statusFilter);
    const matchesSource = sourceFilter === 'All' || j.source === sourceFilter;
    const matchesSearch = j.title.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          j.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          j.location.toLowerCase().includes(searchFilter.toLowerCase());

    const jLoc = (j.location || '').toLowerCase();
    const targetLocs = (settings.targetLocations || []);
    const matchesLocation = locationFilter === 'All' ? true :
                            locationFilter === 'Other' ? !targetLocs.some(loc => jLoc.includes(loc.toLowerCase())) :
                            jLoc.includes(locationFilter.toLowerCase());

    let matchesDate = true;
    if (dateRangeFilter === '7days') {
      const jobDate = new Date(j.lastActionDate || j.scrapedAt || 0);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0);
      matchesDate = jobDate >= oneWeekAgo;
    }

    return matchesStatus && matchesSource && matchesSearch && matchesLocation && matchesDate;
  }).sort((a, b) => {
    const dateA = new Date(a.lastActionDate || a.scrapedAt || 0).getTime();
    const dateB = new Date(b.lastActionDate || b.scrapedAt || 0).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  };

  const getStats = () => {
    const toProcessJobs = jobs.filter(j => !['Applied', 'Invited', 'Dismissed', 'Skipped', 'Saved'].includes(j.status));
    return {
      total: jobs.length,
      toProcess: toProcessJobs.length,
      saved: jobs.filter(j => j.status === 'Saved').length,
      toProcessToday: toProcessJobs.filter(j => isToday(j.scrapedAt)).length,
      tailored: jobs.filter(j => j.tailoredCv).length,
      applied: jobs.filter(j => j.status === 'Applied').length,
      appliedToday: jobs.filter(j => j.status === 'Applied' && isToday(j.lastActionDate || j.scrapedAt)).length,
      invited: jobs.filter(j => j.status === 'Invited').length,
      invitedToday: jobs.filter(j => j.status === 'Invited' && isToday(j.lastActionDate)).length,
      dismissed: jobs.filter(j => j.status === 'Dismissed').length,
      dismissedToday: jobs.filter(j => j.status === 'Dismissed' && isToday(j.lastActionDate)).length,
      skipped: jobs.filter(j => j.status === 'Skipped').length,
      changedToday: jobs.filter(j => isToday(j.lastActionDate)).length,
      extensionSourced: jobs.filter(j => j.source === 'Extension Sourced').length,
      searchSourced: jobs.filter(j => j.source === 'Auto Search').length,
      importSourced: jobs.filter(j => j.source === 'Direct Import').length
    };
  };

  const stats = getStats();

  const outreachReadyContacts = contacts.filter(
    (c) => c.status === 'To Contact' || c.status === 'To Source'
  );
  const waitingContacts = contacts.filter(
    (c) => c.status === 'Invite Sent' || c.status === 'Waiting'
  );
  const followUpDueContacts = contacts.filter(
    (c) =>
      c.followUpNeeded ||
      c.status === 'Follow Up Needed' ||
      ((c.status === 'Invite Sent' || c.status === 'Waiting') &&
        c.nextFollowUpAt &&
        new Date(c.nextFollowUpAt).getTime() <= Date.now())
  );
  const appliedJobsNeedingOutreach = jobs.filter((job) => {
    if (job.status !== 'Applied') return false;
    const linked = getContactsForJob(contacts, job);
    if (linked.length === 0) return true;
    return linked.every((c) => c.status === 'To Source' || c.status === 'To Contact');
  });

  const outreachBoard = buildOutreachBoard(jobs, contacts);
  const appliedOutreachCount = jobs.filter((j) => j.status === 'Applied' || j.status === 'Invited').length;
  const outreachTasksCount =
    outreachBoard['to-reach-out'].length +
    outreachBoard['follow-up'].length;

  const handleCopyQuickMsgForJob = (job) => {
    const msg = buildQuickOutreachMessage({
      title: job.title,
      company: job.company,
      contactFirstName: job.hiringManager?.startsWith('http') ? '' : job.hiringManager,
      isRecruiter: !!job.isRecruiter,
      visa: localProfile?.visa
    });
    navigator.clipboard.writeText(msg);
    alert('Connect message copied!');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-glow">
              <Globe size={20} />
            </div>
            <div className="logo-text">
              <h1>100x job</h1>
              <p>100x Job Pilot</p>
            </div>
          </div>
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="btn btn-secondary" 
            style={{ padding: '6px', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(125, 125, 125, 0.1)', cursor: 'pointer' }}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={16} style={{ color: 'var(--text-main)' }} /> : <Sun size={16} style={{ color: 'var(--text-main)' }} />}
          </button>
        </div>

        <div className="nav-links">
          <div 
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setCurrentTab('jobs')}
          >
            <Briefcase size={18} />
            <span>Job Pipeline</span>
            {outreachTasksCount > 0 && (
              <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: '10px' }}>
                {outreachTasksCount}
              </span>
            )}
          </div>
          <div 
            className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentTab('profile')}
          >
            <User size={18} />
            <span>Base Profile</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setCurrentTab('contacts')}
          >
            <UserCheck size={18} />
            <span>Contacts CRM</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'customPdf' ? 'active' : ''}`}
            onClick={() => setCurrentTab('customPdf')}
          >
            <FileText size={18} />
            <span>Custom PDF</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'roadmap' ? 'active' : ''}`}
            onClick={() => setCurrentTab('roadmap')}
          >
            <Calendar size={18} />
            <span>Roadmap</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </div>
        </div>


      </div>

      {/* Main Content */}
      <div className="main-content">
        
        {/* TAB 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <div>
            <div className="dashboard-header">
              <div>
                <h2>Overview & Control</h2>
                <p>Welcome back, Eugene. {stats.changedToday} jobs updated today ({stats.appliedToday} applied, {stats.invitedToday} invited, {stats.dismissedToday} dismissed).</p>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div 
                className="glass-card stat-card cyan" 
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => { setCurrentTab('jobs'); setStatusFilter('To Process'); setSourceFilter('All'); }}
              >
                <div className="stat-icon"><FileText size={20} /></div>
                <div className="stat-info">
                  <h3>{stats.toProcess}</h3>
                  <p>To Process</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{stats.toProcessToday} added today</span>
                </div>
              </div>
              {stats.saved > 0 && (
                <div 
                  className="glass-card stat-card" 
                  style={{ borderColor: 'rgba(167, 139, 250, 0.35)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onClick={() => { setCurrentTab('jobs'); setStatusFilter('Saved'); setSourceFilter('All'); }}
                >
                  <div className="stat-icon" style={{ color: '#a78bfa' }}><Save size={20} /></div>
                  <div className="stat-info">
                    <h3>{stats.saved}</h3>
                    <p>Saved for later</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Bookmarked — tailor when ready</span>
                  </div>
                </div>
              )}
              <div 
                className="glass-card stat-card green" 
                style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => { setCurrentTab('jobs'); setStatusFilter('Applied'); setSourceFilter('All'); }}
              >
                <div className="stat-icon"><CheckCircle size={20} /></div>
                <div className="stat-info">
                  <h3>{stats.applied}</h3>
                  <p>Applied</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{stats.appliedToday} applied today</span>
                </div>
              </div>
              <div 
                className="glass-card stat-card green" 
                style={{ borderColor: 'rgba(34, 197, 94, 0.3)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => { setCurrentTab('jobs'); setStatusFilter('Invited'); setSourceFilter('All'); }}
              >
                <div className="stat-icon" style={{ color: '#22c55e' }}><Calendar size={20} /></div>
                <div className="stat-info">
                  <h3>{stats.invited}</h3>
                  <p>Invited (Interviews)</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{stats.invitedToday} invited today</span>
                </div>
              </div>
              <div 
                className="glass-card stat-card red" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => { setCurrentTab('jobs'); setStatusFilter('Dismissed'); setSourceFilter('All'); }}
              >
                <div className="stat-icon" style={{ color: '#ef4444' }}><AlertCircle size={20} /></div>
                <div className="stat-info">
                  <h3>{stats.dismissed}</h3>
                  <p>Dismissed</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>{stats.dismissedToday} dismissed today</span>
                </div>
              </div>
            </div>

            {/* Daily Processing Checklist */}
            {stats.toProcess > 0 ? (
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--accent-purple)', background: 'var(--bg-tertiary)', marginBottom: '24px' }}>
                <span style={{ fontSize: '1.8rem' }}>🎯</span>
                <a href="?status=To%20Process" className="process-link" style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => { e.preventDefault(); setCurrentTab('jobs'); setStatusFilter('To Process'); }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>You have {stats.toProcess} roles to process today!</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                      Tailor your CV and Cover Letter for these new roles to stand out to hiring managers.
                    </p>
                  </div>
                </a>
              </div>
            ) : (
              <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '4px solid var(--accent-green)', background: 'var(--bg-tertiary)', marginBottom: '24px' }}>
                <span style={{ fontSize: '1.8rem' }}>🎉</span>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>You're all caught up! No tasks left for today.</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                    Awesome work! Time to trigger the <strong>Sourcing Engine</strong> below to find and scrape more job opportunities.
                  </p>
                </div>
              </div>
            )}

            {/* Post-Apply Outreach CRM */}
            {(appliedJobsNeedingOutreach.length > 0 || outreachReadyContacts.length > 0 || waitingContacts.length > 0 || followUpDueContacts.length > 0) && (
              <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-cyan)', background: 'var(--bg-tertiary)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCheck size={18} className="text-cyan" />
                    Post-Apply Outreach CRM
                  </h3>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setCurrentTab('contacts')}>
                    Open Full CRM
                  </button>
                </div>

                {appliedJobsNeedingOutreach.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-cyan)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Applied — Find & Add Hiring Manager ({appliedJobsNeedingOutreach.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {appliedJobsNeedingOutreach.slice(0, 5).map((job) => (
                        <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{job.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{job.company}</div>
                          </div>
                          <button className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleAddContactForJob(job)}>
                            Add Hiring Manager
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {outreachReadyContacts.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Ready to Message ({outreachReadyContacts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {outreachReadyContacts.slice(0, 5).map((contact) => {
                        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Hiring Manager';
                        const outreachMsg = contact.lastOutboundSnippet || (contact.notes?.includes('AI Outreach Message: ') ? contact.notes.split('AI Outreach Message: ')[1] : '');
                        return (
                          <div key={contact.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                {fullName} · <span style={{ color: 'var(--accent-cyan)' }}>{contact.company}</span>
                              </div>
                              {contact.jobTitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: {contact.jobTitle}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {contact.profileUrl && (
                                <a href={contact.profileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none' }}>
                                  <ExternalLink size={12} /> Profile
                                </a>
                              )}
                              {outreachMsg && (
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => { navigator.clipboard.writeText(outreachMsg); alert('Outreach message copied!'); }}>
                                  Copy Intro
                                </button>
                              )}
                              <button className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleUpdateContactStatus(contact.id, 'Waiting')}>
                                Invite Sent — Wait
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {waitingContacts.length > 0 && (
                  <div style={{ marginBottom: followUpDueContacts.length > 0 ? '16px' : 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#a78bfa', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> Waiting for Reply ({waitingContacts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {waitingContacts.slice(0, 5).map((contact) => {
                        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Hiring Manager';
                        const daysLeft = daysUntil(contact.nextFollowUpAt);
                        return (
                          <div key={contact.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{fullName} at {contact.company}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Invited {contact.inviteSentAt ? formatFollowUpDate(contact.inviteSentAt) : 'recently'}
                                {contact.nextFollowUpAt && ` · Follow up ${daysLeft !== null && daysLeft <= 0 ? 'due now' : `in ${daysLeft}d`} (${formatFollowUpDate(contact.nextFollowUpAt)})`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleUpdateContactStatus(contact.id, 'Replied')}>
                                Got Reply
                              </button>
                              <button className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleSnoozeFollowUp(contact.id)}>
                                Remind in 7d
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {followUpDueContacts.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={14} /> Follow Up Needed ({followUpDueContacts.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {followUpDueContacts.slice(0, 5).map((contact) => {
                        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Hiring Manager';
                        const outreachMsg = contact.lastOutboundSnippet || '';
                        return (
                          <div key={contact.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(245, 158, 11, 0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.25)', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{fullName} at {contact.company}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No reply yet — time to nudge</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {outreachMsg && (
                                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => { navigator.clipboard.writeText(outreachMsg); alert('Message copied — send a follow-up!'); }}>
                                  Copy Message
                                </button>
                              )}
                              <button className="btn btn-cyan" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleSnoozeFollowUp(contact.id)}>
                                Remind in 7d
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleUpdateContactStatus(contact.id, 'Replied')}>
                                Replied
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Relocation Card & Sourcing */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              
              {/* Job Sourcing Controller */}
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Search size={18} className="text-cyan" />
                    Sourcing Engine
                  </h3>
                  <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '2px' }}>
                    <button 
                      className={`btn ${sourcingMode === 'search' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '6px' }}
                      onClick={() => setSourcingMode('search')}
                      disabled={isSearching}
                    >
                      Auto Search
                    </button>
                    <button 
                      className={`btn ${sourcingMode === 'import' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', border: 'none', borderRadius: '6px' }}
                      onClick={() => setSourcingMode('import')}
                      disabled={isSearching}
                    >
                      Import URLs
                    </button>
                  </div>
                </div>

                {sourcingMode === 'search' ? (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                      Scrape Greenhouse, Lever, and Ashby job boards across Australia matching your target parameters. Solve any captchas in the browser pop-up.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                      <div>
                        <strong>Keywords:</strong> {settings.targetKeywords.map(k => (
                          <span key={k} style={{ display: 'inline-block', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px', margin: '2px', fontSize: '0.8rem' }}>{k}</span>
                        ))}
                      </div>
                      <div>
                        <strong>Target Locations:</strong> {settings.targetLocations.join(', ')}
                      </div>
                    </div>

                    <button 
                      className={`btn btn-cyan ${isSearching ? 'pulse-glow' : ''}`} 
                      onClick={startJobSearch}
                      disabled={isSearching}
                    >
                      <Search size={16} />
                      {isSearching ? <span className="loading-dots">Scanning Australian Job Boards</span> : 'Start Sourcing Session'}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '12px' }}>
                      Directly import job detail links from Greenhouse, Lever, or Ashby. Paste one link per line.
                    </p>
                    
                    <textarea
                      className="form-input"
                      placeholder="https://boards.greenhouse.io/company/jobs/123456&#10;https://jobs.lever.co/company/abcdef-1234"
                      style={{ height: '100px', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '16px' }}
                      value={importUrlsText}
                      onChange={(e) => setImportUrlsText(e.target.value)}
                      disabled={isSearching}
                    />

                    <button 
                      className={`btn btn-cyan ${isSearching ? 'pulse-glow' : ''}`} 
                      onClick={startJobImport}
                      disabled={isSearching || !importUrlsText.trim()}
                    >
                      <Plus size={16} />
                      {isSearching ? <span className="loading-dots">Importing URLs</span> : 'Import Job Links'}
                    </button>
                  </>
                )}

                {/* Scraper Log Console */}
                {(isSearching || searchLogs.length > 0) && (
                  <div>
                    <h4 style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Live Scraper Console</h4>
                    <div className="terminal-console">
                      {searchLogs.map((log, index) => (
                        <div key={index} className={`terminal-line ${log.startsWith('[Error]') ? 'error' : log.startsWith('[Success]') ? 'done' : ''}`}>
                          &gt; {log}
                        </div>
                      ))}
                      {isSearching && <div className="terminal-line pulse-glow">&gt; Working...<span className="loading-dots"></span></div>}
                      <div ref={searchTerminalEndRef} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JOB PIPELINE */}
        {currentTab === 'jobs' && (
          <div>
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2>Job Application Pipeline</h2>
                <p>Manage, tailor, auto-apply, and track outreach for each role.</p>
              </div>
              {outreachTasksCount > 0 && (
                <button
                  className="btn btn-cyan"
                  style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                  onClick={() => setStatusFilter('Applied')}
                >
                  {outreachTasksCount} outreach task{outreachTasksCount === 1 ? '' : 's'} pending
                </button>
              )}
            </div>

            {/* Outreach board — linked to Applied jobs */}
            {appliedOutreachCount > 0 && (statusFilter === 'Applied' || statusFilter === 'Invited' || statusFilter === 'All') && (
              <div className="glass-card" style={{ marginBottom: '20px', padding: '16px', borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserCheck size={18} className="text-cyan" />
                      Outreach Board
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Applied jobs → who to message → waiting → follow up → done
                    </p>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setCurrentTab('contacts')}>
                    Full CRM
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: '12px', overflowX: 'auto' }}>
                  {OUTREACH_BOARD_COLUMNS.map((col) => (
                    <div key={col.id} style={{ background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)', minHeight: '120px' }}>
                      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: col.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {col.title} ({outreachBoard[col.id].length})
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{col.hint}</div>
                      </div>
                      <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                        {outreachBoard[col.id].length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '8px', textAlign: 'center' }}>—</div>
                        ) : (
                          outreachBoard[col.id].map(({ job, primaryContact }) => (
                            <div
                              key={job.id}
                              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                              onClick={() => handleSelectJob(job)}
                            >
                              <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>{job.company}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>{job.title}</div>
                              {primaryContact && (
                                <div style={{ fontSize: '0.68rem', color: col.color }}>
                                  {primaryContact.firstName} {primaryContact.lastName}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                                <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => handleCopyQuickMsgForJob(job)}>
                                  Copy Msg
                                </button>
                                {col.id === 'to-reach-out' && !primaryContact && (
                                  <button className="btn btn-cyan" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => handleAddContactForJob(job)}>
                                    Add HM
                                  </button>
                                )}
                                {primaryContact && col.id === 'to-reach-out' && (
                                  <button className="btn btn-cyan" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => handleUpdateContactStatus(primaryContact.id, 'Waiting')}>
                                    Sent
                                  </button>
                                )}
                                {primaryContact && col.id === 'waiting' && (
                                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => handleUpdateContactStatus(primaryContact.id, 'Replied')}>
                                    Replied
                                  </button>
                                )}
                                {primaryContact && col.id === 'follow-up' && (
                                  <button className="btn btn-cyan" style={{ padding: '2px 6px', fontSize: '0.65rem' }} onClick={() => handleSnoozeFollowUp(primaryContact.id)}>
                                    +7d
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter controls */}
            <div className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['All', 'To Process', 'Saved', 'Applied', 'Invited', 'Dismissed', 'Skipped'].map(status => (
                  <button 
                    key={status}
                    className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => { setStatusFilter(status); setSourceFilter('All'); }}
                  >
                    {status}
                  </button>
                ))}
                
                {sourceFilter !== 'All' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', padding: '4px 10px', borderRadius: '16px', border: '1px solid rgba(167, 139, 250, 0.3)', marginLeft: '8px' }}>
                    <span>Source: {sourceFilter}</span>
                    <button 
                      onClick={() => setSourceFilter('All')} 
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      title="Clear source filter"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '6px' }}>Date:</span>
                  <select 
                    value={dateRangeFilter} 
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="7days" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>Past Week</option>
                    <option value="all" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>All History</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '6px' }}>Location:</span>
                  <select 
                    value={locationFilter} 
                    onChange={(e) => setLocationFilter(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="All" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>All Locations</option>
                    {(settings.targetLocations || []).map(loc => (
                      <option key={loc} value={loc} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>{loc}</option>
                    ))}
                    <option value="Other" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>Other</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '300px' }}>
                  <Search size={16} className="text-muted" style={{ marginRight: '8px' }} />
                  <input 
                    type="text" 
                    placeholder="Filter by title or company..." 
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Pipeline Table */}
            <div className="glass-card" style={{ padding: '0px', overflowX: 'auto' }}>
              {filteredJobs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle style={{ display: 'block', margin: '0 auto 12px auto' }} />
                  No jobs found matching the active filter.
                </div>
              ) : (
                <table className="pipeline-table">
                  <thead>
                    <tr>
                      <th>Company & Title</th>
                      <th>Location</th>
                      <th onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} style={{ cursor: 'pointer', userSelect: 'none' }}>Last Action Date {sortOrder === 'desc' ? '↓' : '↑'}</th>
                      <th>Source</th>
                      <th>Relevance</th>
                      <th>Status</th>
                      <th>Outreach</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map(job => (
                      <tr key={job.id} className="pipeline-row">
                        <td>
                          <a 
                            href={job.url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="job-link"
                          >
                            <div className="company-name" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {job.company}
                              {job.isRecruiter && (
                                <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 6px', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', background: 'rgba(192, 132, 252, 0.05)', marginLeft: '4px' }}>Recruiter</span>
                              )}
                              {job.hiringManager && (
                                <a 
                                  href={job.hiringManager.startsWith('http') ? job.hiringManager : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(job.hiringManager)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="badge"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ 
                                    fontSize: '0.65rem', 
                                    padding: '1px 6px', 
                                    borderColor: 'rgba(56, 189, 248, 0.4)', 
                                    color: '#38bdf8', 
                                    background: 'rgba(56, 189, 248, 0.08)', 
                                    marginLeft: '4px',
                                    textDecoration: 'none',
                                    cursor: 'pointer'
                                  }}
                                  title={`Hiring Manager: ${job.hiringManager}`}
                                >
                                  Hiring Manager
                                </a>
                              )}
                            </div>
                            <div className="job-title">{job.title}</div>
                          </a>
                        </td>
                        <td>
                          <select
                            className="status-select"
                            value={
                              (settings.targetLocations || []).includes(job.location)
                                ? job.location
                                : (job.location ? 'Other' : '')
                            }
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val === 'Other_custom') {
                                const customLoc = window.prompt("Enter location:", job.location || '');
                                if (customLoc !== null && customLoc.trim() !== '') {
                                  handleUpdateJobLocation(job.id, customLoc.trim());
                                }
                              } else {
                                handleUpdateJobLocation(job.id, val);
                              }
                            }}
                            style={{ 
                              cursor: 'pointer',
                              padding: '4px 24px 4px 10px',
                              fontFamily: 'inherit',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-main)'
                            }}
                          >
                            <option value="" disabled>-- Select Location --</option>
                            {(settings.targetLocations || []).map(loc => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))}
                            {job.location && !(settings.targetLocations || []).includes(job.location) && (
                              <option value="Other">{job.location}</option>
                            )}
                            <option value="Other_custom">Other...</option>
                          </select>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {new Date(job.lastActionDate || job.scrapedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-source-${(job.source || 'Auto Search').toLowerCase().replace(/\s+/g, '-')}`}>
                            {job.source || 'Auto Search'}
                          </span>
                        </td>
                        <td>
                          <select
                            className="status-select"
                            value={job.suitabilityScore !== null && job.suitabilityScore !== undefined ? job.suitabilityScore : ''}
                            onChange={(e) => handleUpdateJobScore(job.id, e.target.value)}
                            style={{
                              cursor: 'pointer',
                              padding: '4px 24px 4px 10px',
                              fontFamily: 'inherit',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              border: '1px solid',
                              textTransform: 'none',
                              background: !job.suitabilityScore 
                                ? 'var(--bg-tertiary)' 
                                : job.suitabilityScore >= 7 
                                ? 'rgba(16, 185, 129, 0.12)' 
                                : job.suitabilityScore >= 5 
                                ? 'rgba(245, 158, 11, 0.12)' 
                                : 'rgba(239, 68, 68, 0.12)',
                              color: !job.suitabilityScore 
                                ? 'var(--text-muted)' 
                                : job.suitabilityScore >= 7 
                                ? '#10b981' 
                                : job.suitabilityScore >= 5 
                                ? '#f59e0b' 
                                : '#ef4444',
                              borderColor: !job.suitabilityScore 
                                ? 'var(--border-color)' 
                                : job.suitabilityScore >= 7 
                                ? 'rgba(16, 185, 129, 0.3)' 
                                : job.suitabilityScore >= 5 
                                ? 'rgba(245, 158, 11, 0.3)' 
                                : 'rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>N/A</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                              <option key={score} value={score} style={{ background: 'var(--bg-secondary)', color: 'var(--text-main)' }}>
                                {score}/10
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className={`status-select badge badge-${(job.status || 'To Process').toLowerCase()}`}
                            value={job.status || 'To Process'}
                            onChange={(e) => handleUpdateJobStatus(job.id, e.target.value)}
                            style={{ 
                              cursor: 'pointer',
                              padding: '4px 24px 4px 10px',
                              fontFamily: 'inherit',
                              borderRadius: '20px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontSize: '0.75rem',
                              fontWeight: '600'
                            }}
                          >
                            {['To Process', 'Saved', 'Tailored', 'Applied', 'Invited', 'Dismissed', 'Skipped'].map(s => (
                              <option key={s} value={s} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', textTransform: 'none' }}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {(() => {
                            const outreach = getJobOutreachInfo(job, contacts);
                            if (outreach.stage === 'n/a') {
                              return <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>—</span>;
                            }
                            const stageColors = {
                              'to-reach-out': '#38bdf8',
                              waiting: '#a78bfa',
                              'follow-up': '#f59e0b',
                              done: '#10b981'
                            };
                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                <span className="badge" style={{ fontSize: '0.65rem', borderColor: stageColors[outreach.stage], color: stageColors[outreach.stage] }}>
                                  {outreach.label}
                                </span>
                                {outreach.stage === 'to-reach-out' && (
                                  <button className="btn btn-cyan" style={{ padding: '2px 8px', fontSize: '0.65rem' }} onClick={() => handleCopyQuickMsgForJob(job)}>
                                    Copy Msg
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                              className="btn" 
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '0.8rem', 
                                backgroundColor: '#000000', 
                                color: '#ffffff', 
                                border: '1px solid #27272a' 
                              }}
                              onClick={() => handleSelectJob(job)}
                            >
                              Details
                            </button>

                            <button 
                              className="btn btn-danger"
                              style={{ padding: '6px 8px' }}
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* DETAIL / TAILOR SLIDE-OUT PANEL */}
            {selectedJob && (
              <div className="slide-panel-backdrop" onClick={() => setSelectedJob(null)}>
                <div className="slide-panel" style={{ width: '80%', maxWidth: '1000px' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.4rem' }}>{selectedJob.title}</h3>
                      <p style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectedJob.company}
                        {selectedJob.isRecruiter && (
                          <span className="badge" style={{ fontSize: '0.65rem', padding: '1px 6px', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)', background: 'rgba(192, 132, 252, 0.05)' }}>Recruiter</span>
                        )}
                        — {selectedJob.location}
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '6px' }} onClick={() => setSelectedJob(null)}>
                      <X size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
                    
                    {/* LEFT COLUMN: Job Metadata & Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
                      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', margin: 0 }}>Edit Job Details</h4>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/jobs/${selectedJob.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    title: editingJobTitle,
                                    company: editingJobCompany,
                                    location: editingJobLocation,
                                    url: editingJobUrl,
                                    applicationUrl: editingJobAppUrl,
                                    hiringManager: editingHiringManager,
                                    hiringManagerIntro: editingHiringManagerIntro,
                                    isRecruiter: editingJobIsRecruiter,
                                    suitabilityScore: editingJobScore !== '' ? parseInt(editingJobScore, 10) : null
                                  })
                                });
                                const resData = await response.json();
                                if (resData.success) {
                                  // Update jobs list in state
                                  const updatedJobs = jobs.map(j => j.id === selectedJob.id ? { ...j, ...resData.data } : j);
                                  setJobs(updatedJobs);
                                  setSelectedJob({ ...selectedJob, ...resData.data });
                                  alert('Job details updated successfully!');
                                } else {
                                  alert('Failed to update job details: ' + resData.error);
                                }
                              } catch (err) {
                                alert('Error updating job details: ' + err.message);
                              }
                            }}
                          >
                            Save Details
                          </button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Job Title</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              value={editingJobTitle} 
                              onChange={(e) => setEditingJobTitle(e.target.value)} 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Company</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              value={editingJobCompany} 
                              onChange={(e) => setEditingJobCompany(e.target.value)} 
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <input 
                                type="checkbox" 
                                id="editingJobIsRecruiter"
                                checked={editingJobIsRecruiter} 
                                onChange={(e) => setEditingJobIsRecruiter(e.target.checked)} 
                                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
                              />
                              <label htmlFor="editingJobIsRecruiter" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>Is Recruiter Posting</label>
                            </div>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Location</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <select
                              className="status-select"
                              value={
                                (settings.targetLocations || []).includes(editingJobLocation)
                                  ? editingJobLocation
                                  : (editingJobLocation ? 'Other' : '')
                              }
                              onChange={(e) => {
                                const selectVal = e.target.value;
                                if (selectVal === 'Other') {
                                  if ((settings.targetLocations || []).includes(editingJobLocation)) {
                                    setEditingJobLocation('');
                                  }
                                } else {
                                  setEditingJobLocation(selectVal);
                                }
                              }}
                              style={{ fontSize: '0.8rem', padding: '4px 24px 4px 12px', width: '100%', borderRadius: '10px' }}
                            >
                              <option value="" disabled>-- Select Location --</option>
                              {(settings.targetLocations || []).map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                              <option value="Other">Other</option>
                            </select>
                            {!(settings.targetLocations || []).includes(editingJobLocation) && (
                              <input 
                                type="text" 
                                className="form-input" 
                                style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                value={editingJobLocation} 
                                placeholder="Type location manually..."
                                onChange={(e) => setEditingJobLocation(e.target.value)} 
                              />
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Sourced URL (Job Post)</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              value={editingJobUrl} 
                              onChange={(e) => setEditingJobUrl(e.target.value)} 
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Direct Application URL</label>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                              value={editingJobAppUrl || ''} 
                              placeholder="Not set yet"
                              onChange={(e) => setEditingJobAppUrl(e.target.value)} 
                            />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Hiring Manager Profile Link / Name</label>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                            value={editingHiringManager} 
                            placeholder="LinkedIn URL or Name"
                            onChange={(e) => setEditingHiringManager(e.target.value)} 
                          />
                        </div>

                        {selectedJob.status === 'Applied' && (
                          <div className="glass-card" style={{ borderLeft: '4px solid var(--accent-cyan)', background: 'var(--bg-tertiary)', padding: '14px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <h5 style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent-cyan)' }}>
                                Outreach CRM
                              </h5>
                              <button className="btn btn-cyan" style={{ padding: '4px 10px', fontSize: '0.7rem' }} onClick={() => handleAddContactForJob(selectedJob)}>
                                <Plus size={12} /> Add Contact
                              </button>
                            </div>
                            {getContactsForJob(contacts, selectedJob).length === 0 ? (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                Applied — now find the hiring manager on LinkedIn, add them here, send an invite, then mark as waiting.
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {getContactsForJob(contacts, selectedJob).map((contact) => {
                                  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Hiring Manager';
                                  const daysLeft = daysUntil(contact.nextFollowUpAt);
                                  return (
                                    <div key={contact.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                                        <div>
                                          <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{fullName}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Status: {contact.status}
                                            {contact.nextFollowUpAt && ` · Follow up ${daysLeft !== null && daysLeft <= 0 ? 'due' : `in ${daysLeft}d`}`}
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                          {contact.profileUrl && (
                                            <a href={contact.profileUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', textDecoration: 'none' }}>
                                              Profile
                                            </a>
                                          )}
                                          {(contact.status === 'To Contact' || contact.status === 'To Source') && (
                                            <button className="btn btn-cyan" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleUpdateContactStatus(contact.id, 'Waiting')}>
                                              Invite Sent
                                            </button>
                                          )}
                                          {(contact.status === 'Waiting' || contact.status === 'Invite Sent' || contact.status === 'Follow Up Needed') && (
                                            <>
                                              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleSnoozeFollowUp(contact.id)}>
                                                Remind 7d
                                              </button>
                                              <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleUpdateContactStatus(contact.id, 'Replied')}>
                                                Replied
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Relevance Score (1-10)</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                            min="1"
                            max="10"
                            value={editingJobScore} 
                            placeholder="Not rated yet"
                            onChange={(e) => setEditingJobScore(e.target.value ? parseInt(e.target.value, 10) : '')} 
                          />
                        </div>
                      </div>

                      <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Job Description</h4>
                      <div className="glass-card" style={{ flex: 1, minHeight: '200px', overflowY: 'auto', background: 'var(--bg-primary)', padding: '16px', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {selectedJob.description}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <a href={selectedJob.url} target="_blank" rel="noreferrer" className="btn btn-secondary">
                          <ExternalLink size={14} /> Open Original Job Post
                        </a>
                        {selectedJob.applicationUrl && (
                          <a 
                            href={selectedJob.applicationUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-secondary"
                            style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                          >
                            <ExternalLink size={14} /> Open Application Page
                          </a>
                        )}
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Tailoring CV / Cover Letter */}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Tailored Artifacts</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <label className="form-label" style={{ margin: 0, fontSize: '0.75rem' }}>Pipeline Status:</label>
                          <select 
                            className="status-select"
                            value={selectedJob.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              handleUpdateJobStatus(selectedJob.id, newStatus);
                              setSelectedJob(prev => ({ ...prev, status: newStatus }));
                            }}
                            style={{ fontSize: '0.8rem', padding: '4px 24px 4px 12px' }}
                          >
                            {['To Process', 'Saved', 'Tailored', 'Applied', 'Invited', 'Dismissed', 'Skipped'].map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="glass-card" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={handleAutofillJob}
                            disabled={!selectedJob}
                          >
                            Prefill Form (Autofill)
                          </button>
                        </div>


                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="form-label" style={{ margin: 0 }}>Job-Specific Custom Instructions / Context Injection</label>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                              onClick={() => {
                                const updatedJob = { ...selectedJob, customInstructions: editingCustomInstructions };
                                setSelectedJob(updatedJob);
                                const updatedJobs = jobs.map(j => j.id === selectedJob.id ? updatedJob : j);
                                setJobs(updatedJobs);
                                fetch('/api/jobs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedJobs)
                                });
                                alert('Custom instructions saved!');
                              }}
                            >
                              Save Context
                            </button>
                          </div>
                          <textarea
                            className="form-input"
                            style={{ height: '80px', fontSize: '0.85rem' }}
                            placeholder="e.g. Spenmo: Highlight experience with regional payment compliance workflows. Vincere: focus on multi-client ATS architecture."
                            value={editingCustomInstructions}
                            onChange={(e) => setEditingCustomInstructions(e.target.value)}
                          />
                        </div>

                        {selectedJob.status === 'Dismissed' && (
                          <div className="glass-card" style={{ borderLeft: '4px solid #ef4444', background: 'var(--bg-tertiary)', padding: '16px', marginBottom: '16px' }}>
                            <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <AlertCircle size={14} /> Rejection Analysis
                            </h5>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                              Compare the CV submitted for this role against the Job Description to identify gaps and improve future applications.
                            </p>
                            {selectedJob.dismissalAnalysis ? (
                              <div>
                                {typeof selectedJob.dismissalAnalysis === 'string' ? (
                                  <div className="dismissal-analysis-markdown" style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap', maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}>
                                    {selectedJob.dismissalAnalysis}
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                      <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-main)' }}>What Went Wrong:</div>
                                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                                        {selectedJob.dismissalAnalysis.whatWentWrong}
                                      </div>
                                    </div>
                                    {selectedJob.dismissalAnalysis.recommendedPromptChanges && (
                                      <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-main)' }}>Next Steps / Suggestions:</div>
                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem', background: 'var(--bg-primary)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', borderLeft: '3px solid var(--accent-cyan)', color: 'var(--text-main)' }}>
                                          {selectedJob.dismissalAnalysis.recommendedPromptChanges}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                    onClick={() => handleAnalyzeDismissal(selectedJob.id)}
                                    disabled={dismissalAnalysisLoading === selectedJob.id}
                                  >
                                    {dismissalAnalysisLoading === selectedJob.id ? <span className="loading-dots">Analyzing Rejection</span> : 'Rerun Rejection Analysis'}
                                  </button>
                                  <button
                                    className="btn btn-cyan"
                                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                    onClick={() => handleSuggestPromptRevision(selectedJob.id)}
                                    disabled={promptRevisionLoading}
                                  >
                                    {promptRevisionLoading ? <span className="loading-dots">Reviewing Prompt</span> : 'Revise System Prompt'}
                                  </button>
                                </div>

                                {promptRevisionResult && (
                                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                    <h6 style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--accent-purple)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                      ✨ Proposed Prompt Revision
                                    </h6>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>
                                      <strong>Explanation:</strong> {promptRevisionResult.explanation}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      <div>
                                        <label className="form-label" style={{ fontSize: '0.7rem', margin: '0 0 4px 0' }}>Current Global Custom Instructions</label>
                                        <textarea
                                          className="form-input"
                                          style={{ height: '70px', fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                                          readOnly
                                          value={promptRevisionResult.originalCustomInstructions || 'None'}
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label" style={{ fontSize: '0.7rem', margin: '0 0 4px 0' }}>Proposed Global Custom Instructions (Editable)</label>
                                        <textarea
                                          className="form-input"
                                          style={{ height: '120px', fontSize: '0.75rem', borderColor: 'var(--accent-purple)' }}
                                          value={editableRevisedPrompt}
                                          onChange={(e) => setEditableRevisedPrompt(e.target.value)}
                                        />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <button
                                          className="btn btn-primary"
                                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                          onClick={handleApplyPromptRevision}
                                        >
                                          Accept & Save to Settings
                                        </button>
                                        <button
                                          className="btn btn-secondary"
                                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                                          onClick={() => setPromptRevisionResult(null)}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                className="btn btn-danger"
                                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                onClick={() => handleAnalyzeDismissal(selectedJob.id)}
                                disabled={dismissalAnalysisLoading === selectedJob.id}
                              >
                                {dismissalAnalysisLoading === selectedJob.id ? <span className="loading-dots">Analyzing Rejection</span> : 'Run Rejection Analysis'}
                              </button>
                            )}
                          </div>
                        )}
                        
                        {selectedJob.suitabilityAssessment && (
                          <CollapsibleInsightCard
                            key={`assess-${selectedJob.id}`}
                            title="🔍 Suitability Assessment"
                            text={
                              selectedJob.suitabilityScore
                                ? `Suitability Score: ${selectedJob.suitabilityScore}/10\n\n${selectedJob.suitabilityAssessment}`
                                : selectedJob.suitabilityAssessment
                            }
                            accentColor="#10b981"
                            bgColor="rgba(16, 185, 129, 0.05)"
                            borderColor="rgba(16, 185, 129, 0.2)"
                          />
                        )}

                        <div style={{ padding: '40px 20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                            {selectedJob.tailoredCv ? 'CV already generated. Click to regenerate.' : 'CV optimization and cover letter have not been generated yet.'}
                          </p>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleTailorJob(selectedJob.id)}
                            disabled={tailoringJobId === selectedJob.id}
                          >
                            {tailoringJobId === selectedJob.id ? <span className="loading-dots">Generating AI Tailoring</span> : (selectedJob.tailoredCv ? 'Regenerate CV & Letter' : 'Tailor CV & Letter Now')}
                          </button>
                        </div>
                        
                        {selectedJob.tailoredCv && (
                          <>
                            {selectedJob.tailoringExplanation && (
                              <CollapsibleInsightCard
                                key={`tailor-${selectedJob.id}`}
                                title="✨ Tailoring Changes & Highlights"
                                text={selectedJob.tailoringExplanation}
                                badge={formatModelBadge(selectedJob) || null}
                                accentColor="var(--accent-purple)"
                                bgColor="rgba(99, 102, 241, 0.05)"
                                borderColor="rgba(99, 102, 241, 0.2)"
                              />
                            )}

                            {(selectedJob.experienceGaps?.length > 0 || selectedJob.gapBridgeNote || selectedJob.transferableHighlights?.length > 0) && (
                              <div className="glass-card" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.35)', marginBottom: '16px', padding: '16px' }}>
                                <h5 style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#f59e0b', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  ⚠️ Domain Gaps
                                </h5>
                                {selectedJob.experienceGaps?.length > 0 && (
                                  <ul style={{ margin: '0 0 10px 16px', padding: 0, fontSize: '0.8rem', color: '#fcd34d', lineHeight: 1.5 }}>
                                    {selectedJob.experienceGaps.map((gap, i) => (
                                      <li key={i}>{gap}</li>
                                    ))}
                                  </ul>
                                )}
                                {selectedJob.gapBridgeNote && (
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                                    {selectedJob.gapBridgeNote}
                                  </p>
                                )}
                                {selectedJob.transferableHighlights?.length > 0 && (
                                  <ul style={{ margin: '0 0 8px 16px', padding: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                                    {selectedJob.transferableHighlights.map((item, i) => (
                                      <li key={i}>{item}</li>
                                    ))}
                                  </ul>
                                )}
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                  Bridge domain gaps honestly in the cover letter — never add disclaimers to the CV PDF.
                                </p>
                              </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="form-label" style={{ margin: 0 }}>Cover Letter (AI Generated & Relocation Oriented)</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button 
                                    className="btn btn-cyan"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={async () => {
                                      setIsGeneratingCoverLetter(true);
                                      try {
                                        const res = await fetch(`/api/jobs/${selectedJob.id}/cover-letter`, {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ customInstructions: editingCustomInstructions })
                                        });
                                        const resData = await res.json();
                                        if (resData.success && resData.coverLetter) {
                                          setEditingCoverLetter(resData.coverLetter);
                                          const updatedJob = { ...selectedJob, coverLetter: resData.coverLetter };
                                          setSelectedJob(updatedJob);
                                          setJobs(prev => prev.map(j => j.id === selectedJob.id ? updatedJob : j));
                                        } else {
                                          alert('Error generating cover letter: ' + (resData.error || 'Unknown error'));
                                        }
                                      } catch (err) {
                                        alert('Failed to generate cover letter: ' + err.message);
                                      } finally {
                                        setIsGeneratingCoverLetter(false);
                                      }
                                    }}
                                    disabled={isGeneratingCoverLetter}
                                  >
                                    {isGeneratingCoverLetter ? 'Generating...' : 'Gen Cover Letter'}
                                  </button>
                                  <button 
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', color: copiedCoverLetter ? 'var(--accent-green)' : 'inherit' }}
                                    onClick={() => {
                                      navigator.clipboard.writeText(editingCoverLetter);
                                      setCopiedCoverLetter(true);
                                      setTimeout(() => setCopiedCoverLetter(false), 2000);
                                    }}
                                  >
                                    {copiedCoverLetter ? '✓ Copied!' : 'Copy Letter'}
                                  </button>
                                  <button 
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      // Save changes
                                      const updatedJob = { ...selectedJob, coverLetter: editingCoverLetter, whyInterested: editingWhyInterested, customInstructions: editingCustomInstructions, hiringManagerIntro: editingHiringManagerIntro };
                                      setSelectedJob(updatedJob);
                                      const updatedJobs = jobs.map(j => j.id === selectedJob.id ? updatedJob : j);
                                      setJobs(updatedJobs);
                                      fetch('/api/jobs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(updatedJobs)
                                      });
                                      alert('Cover letter, interest statement, custom instructions, and hiring manager intro saved!');
                                    }}
                                  >
                                    Save Edits
                                  </button>
                                </div>
                              </div>
                              <textarea
                                className="form-input"
                                style={{ height: '180px', fontSize: '0.85rem', fontStyle: 'normal', fontFamily: 'SF Mono, Menlo, Monaco, Consolas, Courier New, monospace' }}
                                value={editingCoverLetter}
                                onChange={(e) => setEditingCoverLetter(e.target.value)}
                              />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="form-label" style={{ margin: 0 }}>"Why Interested" Statement (Used for Form Autofill)</label>
                                <button 
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: copiedWhyInterested ? 'var(--accent-green)' : 'inherit' }}
                                  onClick={() => {
                                    navigator.clipboard.writeText(editingWhyInterested || '');
                                    setCopiedWhyInterested(true);
                                    setTimeout(() => setCopiedWhyInterested(false), 2000);
                                  }}
                                >
                                  {copiedWhyInterested ? '✓ Copied!' : 'Copy Statement'}
                                </button>
                              </div>
                              <textarea
                                className="form-input"
                                style={{ height: '100px', fontSize: '0.85rem', fontStyle: 'normal', fontFamily: 'SF Mono, Menlo, Monaco, Consolas, Courier New, monospace' }}
                                value={editingWhyInterested || ''}
                                onChange={(e) => setEditingWhyInterested(e.target.value)}
                              />
                            </div>

                            <div style={{ marginBottom: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label className="form-label" style={{ margin: 0 }}>Connect Message (Recruiter / HM)</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      const msg = buildQuickOutreachMessage({
                                        title: selectedJob.title,
                                        company: selectedJob.company,
                                        contactFirstName: editingHiringManager?.startsWith('http') ? '' : editingHiringManager,
                                        isRecruiter: !!selectedJob.isRecruiter,
                                        visa: localProfile?.visa
                                      });
                                      setEditingHiringManagerIntro(msg);
                                      navigator.clipboard.writeText(msg);
                                    }}
                                  >
                                    Quick Msg
                                  </button>
                                  <button 
                                    className="btn btn-cyan"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={async () => {
                                      setIsGeneratingHiringIntro(true);
                                      try {
                                        const chatRes = await fetch('/api/chat', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            jobTitle: selectedJob.title,
                                            companyName: selectedJob.company,
                                            jobDescription: selectedJob.description || '',
                                            suitabilityAssessment: selectedJob.suitabilityAssessment || '',
                                            isRecruiter: selectedJob.isRecruiter || false,
                                            messages: [
                                              { role: 'user', content: 'Draft an extremely short, high-impact LinkedIn connection invite message to the hiring manager for this role. It MUST be strictly under 300 characters (including spaces). Focus on APAC fintech/payments product leadership and permanent residency (PR).' }
                                            ]
                                          })
                                        });
                                        const resData = await chatRes.json();
                                        if (resData.reply) {
                                          setEditingHiringManagerIntro(resData.reply);
                                          // Auto-save the generated intro to pipeline
                                          const updatedJob = { ...selectedJob, hiringManagerIntro: resData.reply };
                                          setSelectedJob(updatedJob);
                                          const updatedJobs = jobs.map(j => j.id === selectedJob.id ? updatedJob : j);
                                          setJobs(updatedJobs);
                                          await fetch('/api/jobs', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(updatedJobs)
                                          });
                                        } else {
                                          alert('Error generating intro: ' + resData.error);
                                        }
                                      } catch (err) {
                                        alert('Failed to generate intro: ' + err.message);
                                      } finally {
                                        setIsGeneratingHiringIntro(false);
                                      }
                                    }}
                                    disabled={isGeneratingHiringIntro}
                                  >
                                    {isGeneratingHiringIntro ? 'Generating...' : 'Gen Intro Message'}
                                  </button>
                                  {editingHiringManagerIntro && (
                                    <button 
                                      className="btn btn-secondary"
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: copiedHiringManagerIntro ? 'var(--accent-green)' : 'inherit' }}
                                      onClick={() => {
                                        navigator.clipboard.writeText(editingHiringManagerIntro);
                                        setCopiedHiringManagerIntro(true);
                                        setTimeout(() => setCopiedHiringManagerIntro(false), 2000);
                                      }}
                                    >
                                      {copiedHiringManagerIntro ? '✓ Copied!' : 'Copy Intro'}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <textarea
                                className="form-input"
                                style={{ height: '100px', fontSize: '0.85rem', fontStyle: 'normal', fontFamily: 'SF Mono, Menlo, Monaco, Consolas, Courier New, monospace' }}
                                value={editingHiringManagerIntro || ''}
                                placeholder="Click 'Gen Intro Message' or type one here..."
                                onChange={(e) => setEditingHiringManagerIntro(e.target.value)}
                              />
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                              <h5 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-main)' }}>CV Adjustments Preview</h5>
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                Bullet points and summary rephrased to fit target JD keywords without changing facts or dates.
                              </p>
                              
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {!selectedJob.pdfPath ? (
                                  <button 
                                    className="btn btn-cyan"
                                    onClick={() => handleGeneratePdf(selectedJob.id)}
                                    disabled={isGeneratingPdfId === selectedJob.id}
                                  >
                                    {isGeneratingPdfId === selectedJob.id ? <span className="loading-dots">Exporting PDF</span> : 'Print & Export PDF CV'}
                                  </button>
                                ) : (
                                  <>
                                    <a 
                                      href={selectedJob.pdfPath}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-secondary"
                                      style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}
                                    >
                                      <FileDown size={14} /> Open PDF CV
                                    </a>
                                    {selectedJob.docxPath && (
                                      <a 
                                        href={selectedJob.docxPath}
                                        download
                                        className="btn btn-secondary"
                                        style={{ color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                                      >
                                        <FileDown size={14} /> Download Word CV
                                      </a>
                                    )}
                                  </>
                                )}


                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Automation Apply Console Stream */}
                  {isApplyingJobId === selectedJob.id && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} /> Playwright Automation Console
                      </h4>
                      <div className="terminal-console" style={{ maxH: '150px' }}>
                        {applyLogs.map((log, index) => (
                          <div key={index} className="terminal-line">
                            &gt; {log}
                          </div>
                        ))}
                        <div ref={applyTerminalEndRef} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CUSTOM PDF */}
        {currentTab === 'customPdf' && (
          <div className="glass-card" style={{ padding: '24px' }}>
            <h2>Generate PDF from Plain Text CV</h2>
            <textarea
              className="form-input"
              style={{ width: '100%', height: '200px', fontFamily: 'monospace', marginBottom: '12px' }}
              placeholder="Paste your edited CV text here..."
              value={customText}
              onChange={e => setCustomText(e.target.value)}
            />
            <button
              className="btn btn-cyan"
              onClick={async () => {
                try {
                  const res = await fetch('/api/custom-pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rawText: customText })
                  });
                  const data = await res.json();
                  if (data.error) {
                    alert('Error: ' + data.error);
                  } else {
                    setCustomPdfUrl(data.pdfUrl);
                  }
                } catch (e) {
                  alert('Failed to generate PDF: ' + e.message);
                }
              }}
              disabled={!customText.trim()}
              style={{ marginRight: '12px' }}
            >
              Generate PDF
            </button>
            {customPdfUrl && (
              <a href={customPdfUrl} target="_blank" rel="noopener" className="btn btn-primary">
                Download PDF
              </a>
            )}
          </div>
        )}

        {/* TAB: ROADMAP */}
        {currentTab === 'roadmap' && (
          <div>
            <div className="dashboard-header">
              <div>
                <h2>Roadmap & Milestones</h2>
                <p>Project milestones, recently shipped features, and planned capabilities.</p>
              </div>
              <div className="badge badge-tailored">Current Active Phase</div>
            </div>

            <div className="glass-card" style={{ padding: '32px' }}>
              <div className="roadmap-timeline">
                
                {/* Milestone 1 */}
                <div className="roadmap-item completed">
                  <div className="roadmap-badge-col">
                    <div className="roadmap-dot checked">✓</div>
                    <div className="roadmap-line"></div>
                  </div>
                  <div className="roadmap-content-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Milestone 1: Automated Sourcing Scraper</h3>
                      <span className="badge badge-applied" style={{ color: '#38bdf8', borderColor: '#38bdf8' }}>Shipped</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Built the background crawling system using Google Search queries, scraping boards like Greenhouse, Lever, and Ashby for Product Manager roles in Australia. Integrated Gemini models to score candidate fit, automatically tailor bullet points, and compile final PDF copies.
                    </p>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="roadmap-item completed">
                  <div className="roadmap-badge-col">
                    <div className="roadmap-dot checked">✓</div>
                    <div className="roadmap-line"></div>
                  </div>
                  <div className="roadmap-content-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Milestone 2: Copilot Chrome Extension (V1.0)</h3>
                      <span className="badge badge-applied" style={{ color: '#38bdf8', borderColor: '#38bdf8' }}>Shipped</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Created a custom manifest V3 extension panel. Enabled local server handshakes, auto-filling standard application forms (contact info, PR visa rights details, notice period, portfolio links), and one-click PDF downloading and submission.
                    </p>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="roadmap-item active">
                  <div className="roadmap-badge-col">
                    <div className="roadmap-dot pulse-glow-cyan" style={{ background: '#38bdf8', color: '#000000', fontWeight: 'bold' }}>⚡</div>
                    <div className="roadmap-line"></div>
                  </div>
                  <div className="roadmap-content-col" style={{ borderLeft: '3px solid #38bdf8', paddingLeft: '16px', background: 'rgba(56, 189, 248, 0.02)', borderRadius: '0 12px 12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: '#38bdf8', fontWeight: '700' }}>Milestone 3: LinkedIn Sourcing & Extension Pipeline</h3>
                      <span className="badge badge-tailored" style={{ color: '#c084fc', borderColor: '#c084fc' }}>Active</span>
                    </div>
                    <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: '1.5', fontWeight: '500' }}>
                      Allows direct, user-driven sourcing while browsing LinkedIn. When the user selects jobs, the extension intercepts details, resolves query parameters into a canonical link, and saves it directly to the database. These are marked as "Extension Sourced" in the Pipeline.
                    </p>
                    <div style={{ marginTop: '12px', background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                      <strong>How to test this feature:</strong>
                      <ol style={{ paddingLeft: '20px', marginTop: '6px', color: 'var(--text-muted)' }}>
                        <li>Install the unpacked extension folder <code>chrome-extension/</code> in your Chrome browser.</li>
                        <li>Navigate to any LinkedIn job search or view page.</li>
                        <li>Open the Copilot sidebar by clicking the floating icon.</li>
                        <li>Click <strong>"Save to Pipeline"</strong> to store it in the pipeline as <em>Extension Sourced</em>.</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Milestone 4 */}
                <div className="roadmap-item planned">
                  <div className="roadmap-badge-col">
                    <div className="roadmap-dot">4</div>
                    <div className="roadmap-line"></div>
                  </div>
                  <div className="roadmap-content-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Milestone 4: Interview & Screening Prep AI</h3>
                      <span className="badge" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>Planned</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Generate custom behavioral interview prep briefs, salary range benchmarking, and specific questions to ask the interviewer based on the tailored CV and target company details.
                    </p>
                  </div>
                </div>

                {/* Milestone 5 */}
                <div className="roadmap-item planned">
                  <div className="roadmap-badge-col">
                    <div className="roadmap-dot">5</div>
                  </div>
                  <div className="roadmap-content-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>Milestone 5: Multi-Channel Email Tracker</h3>
                      <span className="badge" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>Planned</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Integrate Gmail IMAP parsing to auto-identify incoming responses, record application rejections or schedule interview calls directly in the dashboard calendar view.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BASE PROFILE */}
        {currentTab === 'profile' && (
          <div>
            <div className="dashboard-header">
              <div>
                <h2>Base CV Profile</h2>
                <p>Edit your core CV data which will be used for LLM optimizations.</p>
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ marginBottom: '20px' }}>Personal & Visa Details</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.name || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Professional Title</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.title || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, title: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={localProfile.email || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="+61 XXX XXX XXX or local"
                    value={localProfile.phone || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, phone: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">LinkedIn (Username/URL)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.linkedin || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, linkedin: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">GitHub Profile</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.github || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, github: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Personal Website / Portfolio</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.website || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, website: e.target.value })} 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Address / Location</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 9 Revell Crescent, St Albans, VIC 3021"
                    value={localProfile.address || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, address: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Visa / Work Rights Summary</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={localProfile.visa || ''} 
                    onChange={(e) => setLocalProfile({ ...localProfile, visa: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="form-label">Base CV Summary</label>
                <textarea 
                  className="form-input" 
                  style={{ height: '100px' }}
                  value={localProfile.summary || ''} 
                  onChange={(e) => setLocalProfile({ ...localProfile, summary: e.target.value })} 
                />
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ marginBottom: '16px' }}>Experience Timeline ({(localProfile.experience || []).length} Roles)</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                These roles represent the structural background used to match JDs. Modifying here updates the original pool of bullet points.
              </p>

              {(localProfile.experience || []).map((exp, expIdx) => (
                <div key={expIdx} style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ color: 'var(--accent-purple)' }}>{exp.company}</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{exp.period}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Role</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={exp.role || ''} 
                        onChange={(e) => {
                          const updatedExp = [...localProfile.experience];
                          updatedExp[expIdx].role = e.target.value;
                          setLocalProfile({ ...localProfile, experience: updatedExp });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Location</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={exp.location || ''} 
                        onChange={(e) => {
                          const updatedExp = [...localProfile.experience];
                          updatedExp[expIdx].location = e.target.value;
                          setLocalProfile({ ...localProfile, experience: updatedExp });
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Bullet Points</label>
                    {(exp.bullets || []).map((b, bulletIdx) => (
                      <div key={bulletIdx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ fontSize: '0.85rem' }}
                          value={b || ''} 
                          onChange={(e) => {
                            const updatedExp = [...localProfile.experience];
                            updatedExp[expIdx].bullets[bulletIdx] = e.target.value;
                            setLocalProfile({ ...localProfile, experience: updatedExp });
                          }}
                        />
                        <button 
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '8px 12px' }}
                          onClick={() => {
                            const updatedExp = [...localProfile.experience];
                            updatedExp[expIdx].bullets.splice(bulletIdx, 1);
                            setLocalProfile({ ...localProfile, experience: updatedExp });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', marginTop: '4px' }}
                      onClick={() => {
                        const updatedExp = [...localProfile.experience];
                        updatedExp[expIdx].bullets.push('');
                        setLocalProfile({ ...localProfile, experience: updatedExp });
                      }}
                    >
                      <Plus size={12} /> Add Bullet Point
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSaveProfile(localProfile)}
                >
                  <Save size={16} /> Save Profile Changes
                </button>
                <button 
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setLocalProfile(settings.profile);
                    alert('Reverted profile changes to last saved state.');
                  }}
                >
                  Revert Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3.5: CONTACTS CRM */}
        {currentTab === 'contacts' && (
          <div>
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Contact Sourcing & CRM</h2>
                <p>Track LinkedIn/Telegram outreach, connections, and responses in one unified local view.</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Upload size={16} /> Import CRM CSV
                  <input 
                    type="file" 
                    accept=".csv" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImportContactsCSV(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <button 
                  className="btn btn-cyan" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    clearContactForm();
                    setIsEditingContact(null);
                    setShowAddContactModal(true);
                  }}
                >
                  <Plus size={16} /> Add Lead
                </button>
              </div>
            </div>

            {/* CRM Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: '24px' }}>
              <div className="glass-card stat-card cyan">
                <div className="stat-icon"><User size={20} /></div>
                <div className="stat-info">
                  <h3>{contacts.length}</h3>
                  <p>Total Leads</p>
                </div>
              </div>
              <div className="glass-card stat-card green" style={{ borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                <div className="stat-icon" style={{ color: '#38bdf8' }}><Send size={20} /></div>
                <div className="stat-info">
                  <h3>{contacts.filter(c => c.status === 'To Contact').length}</h3>
                  <p>Outreach Pending</p>
                </div>
              </div>
              <div className="glass-card stat-card green" style={{ borderColor: 'rgba(167, 139, 250, 0.3)' }}>
                <div className="stat-icon" style={{ color: '#a78bfa' }}><Clock size={20} /></div>
                <div className="stat-info">
                  <h3>{contacts.filter(c => c.status === 'Invite Sent' || c.status === 'Waiting').length}</h3>
                  <p>Waiting for Reply</p>
                </div>
              </div>
              <div className="glass-card stat-card green" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                <div className="stat-icon" style={{ color: '#f59e0b' }}><Bell size={20} /></div>
                <div className="stat-info">
                  <h3>{contacts.filter(c => c.followUpNeeded || c.status === 'Follow Up Needed').length}</h3>
                  <p>Follow Up Due</p>
                </div>
              </div>
              <div className="glass-card stat-card green">
                <div className="stat-icon"><CheckCircle size={20} /></div>
                <div className="stat-info">
                  <h3>{contacts.filter(c => c.status === 'Replied').length}</h3>
                  <p>Replies / Connected</p>
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['All', 'To Contact', 'To Source', 'Waiting', 'Invite Sent', 'Replied', 'Follow Up Needed'].map(status => (
                  <button 
                    key={status}
                    className={`btn ${contactStatusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    onClick={() => setContactStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '300px' }}>
                  <Search size={16} className="text-muted" style={{ marginRight: '8px' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name, company, or notes..." 
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>

            {/* CRM Contacts Table */}
            <div className="glass-card" style={{ padding: '0px', overflowX: 'auto' }}>
              {contacts.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle style={{ display: 'block', margin: '0 auto 12px auto' }} />
                  No contacts found. Use the "Import CRM CSV" button above or add one manually.
                </div>
              ) : (
                <table className="pipeline-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Company</th>
                      <th>Linked Role</th>
                      <th>Outreach Status</th>
                      <th>Follow Up</th>
                      <th>Outbox Shortcut</th>
                      <th>Latest Message Snippet / Notes</th>
                      <th>Last Update</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts
                      .filter(c => {
                        const matchesStatus = contactStatusFilter === 'All' || c.status === contactStatusFilter;
                        const query = contactSearch.toLowerCase();
                        const matchesSearch = 
                          `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase().includes(query) ||
                          (c.company || '').toLowerCase().includes(query) ||
                          (c.notes || '').toLowerCase().includes(query) ||
                          (c.lastOutboundSnippet || '').toLowerCase().includes(query) ||
                          (c.lastInboundSnippet || '').toLowerCase().includes(query);
                        return matchesStatus && matchesSearch;
                      })
                      .map(contact => {
                        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Hiring Manager';
                        const snippet = contact.lastOutboundSnippet || contact.lastInboundSnippet || contact.notes || '';
                        
                        return (
                          <tr key={contact.id} className="pipeline-row">
                            <td>
                              {contact.profileUrl ? (
                                <a 
                                  href={contact.profileUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                  {fullName} <ExternalLink size={12} className="text-muted" />
                                </a>
                              ) : (
                                <span style={{ fontWeight: 'bold' }}>{fullName}</span>
                              )}
                            </td>
                            <td>
                              <span style={{ color: 'var(--text-muted)' }}>{contact.company || 'N/A'}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {contact.jobTitle || '—'}
                              </span>
                            </td>
                            <td>
                              <select
                                className={`status-select badge badge-${(contact.status || 'To Contact').toLowerCase().replace(/\s+/g, '-')}`}
                                value={contact.status || 'To Contact'}
                                onChange={(e) => handleUpdateContactStatus(contact.id, e.target.value)}
                                style={{ 
                                  cursor: 'pointer',
                                  padding: '4px 24px 4px 10px',
                                  fontFamily: 'inherit',
                                  borderRadius: '20px',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}
                              >
                                {['To Contact', 'To Source', 'Waiting', 'Invite Sent', 'Replied', 'Follow Up Needed'].map(s => (
                                  <option key={s} value={s} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', textTransform: 'none' }}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.8rem', color: contact.followUpNeeded || contact.status === 'Follow Up Needed' ? '#f59e0b' : 'var(--text-muted)' }}>
                                {contact.status === 'Waiting' || contact.status === 'Invite Sent'
                                  ? (contact.nextFollowUpAt
                                    ? (daysUntil(contact.nextFollowUpAt) <= 0 ? 'Due now' : `In ${daysUntil(contact.nextFollowUpAt)}d`)
                                    : 'Waiting')
                                  : contact.followUpNeeded || contact.status === 'Follow Up Needed'
                                    ? 'Action needed'
                                    : '—'}
                              </span>
                            </td>
                            <td>
                              {contact.threadUrl ? (
                                <a 
                                  href={contact.threadUrl} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="badge" 
                                  style={{ 
                                    borderColor: 'var(--accent-cyan)', 
                                    color: 'var(--accent-cyan)', 
                                    background: 'rgba(56, 189, 248, 0.05)',
                                    textDecoration: 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  Open Chat
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Link</span>
                              )}
                            </td>
                            <td style={{ maxWidth: '300px' }}>
                              <div 
                                style={{ 
                                  fontSize: '0.85rem', 
                                  color: 'var(--text-muted)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }} 
                                title={snippet}
                              >
                                {snippet || '—'}
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {contact.updatedAt ? new Date(contact.updatedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn btn-secondary" 
                                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                  onClick={() => handleOpenEditContact(contact)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-danger"
                                  style={{ padding: '6px 8px' }}
                                  onClick={() => handleDeleteContact(contact.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Add/Edit Contact Modal */}
            {showAddContactModal && (
              <div className="slide-panel-backdrop" onClick={() => { setShowAddContactModal(false); setIsEditingContact(null); clearContactForm(); }}>
                <div className="slide-panel" style={{ width: '450px', maxWidth: '95%', padding: '24px', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <h3 style={{ fontSize: '1.2rem' }}>{isEditingContact ? 'Edit Contact Details' : 'Add New Lead / Recruiter'}</h3>
                    <button className="btn btn-secondary" style={{ padding: '4px' }} onClick={() => { setShowAddContactModal(false); setIsEditingContact(null); clearContactForm(); }}>
                      <X size={18} />
                    </button>
                  </div>
                  <form onSubmit={handleSaveContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">First Name</label>
                      <input type="text" className="form-input" value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Last Name</label>
                      <input type="text" className="form-input" value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Company</label>
                      <input type="text" className="form-input" value={contactCompany} onChange={(e) => setContactCompany(e.target.value)} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Linked Job Role</label>
                      <select
                        className="status-select"
                        style={{ width: '100%', borderRadius: '8px' }}
                        value={contactJobId || ''}
                        onChange={(e) => {
                          const job = jobs.find((j) => j.id === e.target.value);
                          setContactJobId(e.target.value);
                          setContactJobTitle(job?.title || '');
                          if (job?.company && !contactCompany) setContactCompany(job.company);
                        }}
                      >
                        <option value="">-- Optional: link to applied job --</option>
                        {jobs.filter((j) => j.status === 'Applied' || j.status === 'Invited').map((job) => (
                          <option key={job.id} value={job.id}>{job.title} @ {job.company}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">LinkedIn Profile URL</label>
                      <input type="url" className="form-input" value={contactProfileUrl} onChange={(e) => setContactProfileUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Chat Thread URL (LinkedIn / Telegram)</label>
                      <input type="url" className="form-input" value={contactThreadUrl} onChange={(e) => setContactThreadUrl(e.target.value)} placeholder="https://www.linkedin.com/messaging/thread/... or Telegram chat link" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Outreach Status</label>
                      <select className="status-select" style={{ width: '100%', borderRadius: '8px' }} value={contactStatus} onChange={(e) => setContactStatus(e.target.value)}>
                        <option value="To Contact">To Contact</option>
                        <option value="To Source">To Source (find HM)</option>
                        <option value="Waiting">Waiting (invite sent)</option>
                        <option value="Invite Sent">Invite Sent</option>
                        <option value="Replied">Replied</option>
                        <option value="Follow Up Needed">Follow Up Needed</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Conversation Notes & Outbox Snip</label>
                      <textarea className="form-input" style={{ height: '100px' }} value={contactNotes} onChange={(e) => setContactNotes(e.target.value)} placeholder="E.g. Relocating, has Australian PR..." />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => { setShowAddContactModal(false); setIsEditingContact(null); clearContactForm(); }}>Cancel</button>
                      <button type="submit" className="btn btn-cyan">Save Lead</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS */}
        {currentTab === 'settings' && (
          <div>
            <div className="dashboard-header">
              <div>
                <h2>Configuration & Settings</h2>
                <p>Configure search keywords, locations, and your DeepSeek or Gemini API key.</p>
              </div>
            </div>

            <div className="glass-card">
              <form onSubmit={handleSaveSettings}>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Gemini API Key</label>
                    <span className="badge" style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--text-main)', borderColor: 'var(--text-main)', textTransform: 'uppercase' }}>Primary</span>
                  </div>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter your Gemini key (starts with AIzaSy or AQ.)" 
                    value={settings.geminiApiKey || ''} 
                    onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })} 
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Recommended model: <code>gemini-2.5-pro</code>. Used by default for CV tailoring and job matching.
                  </p>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>DeepSeek API Key</label>
                    <span className="badge" style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--text-muted)', borderColor: 'var(--border-color)', textTransform: 'uppercase' }}>Fallback</span>
                  </div>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter your DeepSeek key (starts with sk-)" 
                    value={settings.deepSeekApiKey || ''} 
                    onChange={(e) => setSettings({ ...settings, deepSeekApiKey: e.target.value })} 
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Used automatically if Gemini is rate limited, unavailable (e.g. 503 errors), or fails to respond.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Keywords (one per line)</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '120px' }}
                    value={settings.targetKeywords.join('\n')} 
                    onChange={(e) => setSettings({ ...settings, targetKeywords: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Target Locations (one per line)</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '80px' }}
                    value={settings.targetLocations.join('\n')} 
                    onChange={(e) => setSettings({ ...settings, targetLocations: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Excluded Companies (one per line, case-insensitive)</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '80px' }}
                    placeholder="e.g. MYOB&#10;Atlassian"
                    value={(settings.excludeCompanies || []).join('\n')} 
                    onChange={(e) => setSettings({ ...settings, excludeCompanies: e.target.value.split('\n').filter(Boolean) })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Custom Tailoring Instructions (AI System Prompt Additions)</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '100px' }}
                    placeholder="e.g. Keep the tone very strong, sharp, and confident. Focus on B2B SaaS and scaling. Emphasize my yield infra cofounder experience."
                    value={settings.customInstructions || ''} 
                    onChange={(e) => setSettings({ ...settings, customInstructions: e.target.value })} 
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    These instructions will be appended to the AI prompt when tailoring your CV and Cover Letter.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Base CV Tailoring System Prompt Template</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: '240px', fontFamily: 'SF Mono, Menlo, Monaco, Consolas, Courier New, monospace', fontSize: '0.8rem' }}
                    placeholder="Enter the base system prompt template..."
                    value={settings.cvSystemPrompt || ''} 
                    onChange={(e) => setSettings({ ...settings, cvSystemPrompt: e.target.value })} 
                  />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Define the core prompt instructions for CV tailoring. Supported placeholders: 
                    <code>{"{{name}}"}</code>, <code>{"{{title}}"}</code>, <code>{"{{summary}}"}</code>, 
                    <code>{"{{visa}}"}</code>, <code>{"{{address}}"}</code>, <code>{"{{experience}}"}</code>, 
                    <code>{"{{jobTitle}}"}</code>, <code>{"{{companyName}}"}</code>, <code>{"{{jobDescription}}"}</code>, 
                    <code>{"{{detectedDomain}}"}</code>, <code>{"{{customInstructions}}"}</code>.
                  </p>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Configuration
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
