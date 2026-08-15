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
  ChevronLeft,
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
  Bell,
  Sparkles,
  Layers
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
  isRecruiter = false
} = {}) {
  const first = (contactFirstName || '').trim().split(' ')[0];
  const greeting = first ? `Hey ${first},` : 'Hey,';
  const role = shortRoleTitle(title) || 'this role';
  const atCompany = (company && !isRecruiter) ? ` at ${company}` : '';

  const body = `Eugene here. Got full PR to Australia, living in Melbourne with 10+ years in Product. Just applied for the ${role} role${atCompany} — would love to connect and chat if you're open to it!`;

  return `${greeting}\n\n${body}`.slice(0, 290);
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
    experience: [],
    auxiliaryProjects: [],
    education: []
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
  
  const [groupAnalysisLoading, setGroupAnalysisLoading] = useState(false);
  const [groupAnalysisResult, setGroupAnalysisResult] = useState(null);
  const [editableGroupPrompt, setEditableGroupPrompt] = useState('');
  const [groupPromptSaved, setGroupPromptSaved] = useState(false);
  const [savedAnalysisData, setSavedAnalysisData] = useState(null);
  const [savedAnalysisTimestamp, setSavedAnalysisTimestamp] = useState(null);
  const [abSimulatingJobId, setAbSimulatingJobId] = useState('');
  const [abSimulationLoading, setAbSimulationLoading] = useState(false);
  const [activeAnalysisModalTab, setActiveAnalysisModalTab] = useState('insights'); // 'insights' | 'ab_test' | 'prompt'
  const [inspectPromptLoading, setInspectPromptLoading] = useState(false);
  const [promptPreviewData, setPromptPreviewData] = useState(null);
  const [activePromptPreviewKey, setActivePromptPreviewKey] = useState('cvTailoring');
  const [copiedPromptToast, setCopiedPromptToast] = useState(false);
  
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
  const [dateRangeFilter, setDateRangeFilter] = useState('all'); // '7days' | 'all'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [importUrlsText, setImportUrlsText] = useState('');
  const [sourcingMode, setSourcingMode] = useState('search'); // 'search' | 'import'
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  const handleToggleSelectJob = (id) => {
    setSelectedJobIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredJobs.map(j => j.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedJobIds.includes(id));
    if (allSelected) {
      setSelectedJobIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedJobIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayIds = jobs.filter(j => {
      const d = (j.scrapedAt || j.lastActionDate || '').split('T')[0];
      return d === todayStr;
    }).map(j => j.id);
    if (todayIds.length === 0) {
      alert('No jobs were saved or updated today.');
      return;
    }
    setSelectedJobIds(todayIds);
  };

  const handleBulkUpdateStatus = async (newStatus) => {
    if (selectedJobIds.length === 0) return;
    try {
      await fetch('/api/jobs/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedJobIds, status: newStatus })
      });
      fetchJobs();
      setSelectedJobIds([]);
    } catch (e) {
      console.error('Bulk update status failed:', e);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedJobIds.length} selected jobs permanently?`)) return;
    try {
      await fetch('/api/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedJobIds })
      });
      fetchJobs();
      setSelectedJobIds([]);
    } catch (e) {
      console.error('Bulk delete failed:', e);
    }
  };

  const searchTerminalEndRef = useRef(null);
  const applyTerminalEndRef = useRef(null);

  const fetchLatestAnalysis = async () => {
    try {
      const res = await fetch('/api/jobs/latest-dismissals-group');
      const data = await res.json();
      if (data.success && data.groupAnalysis) {
        setSavedAnalysisData(data.groupAnalysis);
        setSavedAnalysisTimestamp(data.savedAt);
      }
    } catch (e) {
      console.error('Failed to fetch latest analysis:', e);
    }
  };

  // Load Settings, Jobs and Contacts on mount
  useEffect(() => {
    fetchSettings();
    fetchJobs();
    fetchContacts();
    fetchLatestAnalysis();
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

  const handleUpdateJobNotes = async (jobId, newNotes) => {
    const updated = jobs.map(j => j.id === jobId ? { ...j, notes: newNotes } : j);
    setJobs(updated);
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob(prev => prev ? { ...prev, notes: newNotes } : null);
    }
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes })
      });
    } catch (e) {
      console.error('Failed to update notes in DB');
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

  const handleAnalyzeGroupDismissals = async (targetIds = null) => {
    const idsToAnalyze = Array.isArray(targetIds) && targetIds.length > 0
      ? targetIds
      : (selectedJobIds.length > 0 ? selectedJobIds : null);
    
    setGroupAnalysisLoading(true);
    setGroupPromptSaved(false);
    try {
      const res = await fetch('/api/jobs/analyze-dismissals-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToAnalyze })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Group Analysis Error: ' + (data.error || 'Failed to analyze'));
      } else {
        setGroupAnalysisResult(data.groupAnalysis);
        setSavedAnalysisData(data.groupAnalysis);
        setSavedAnalysisTimestamp(data.savedAt);
        setEditableGroupPrompt(data.groupAnalysis.suggestedRevisedInstructions || settings.customInstructions || '');
        setAbSimulationResult(null);
        setActiveAnalysisModalTab('insights');
      }
    } catch (e) {
      alert('Failed to run group dismissal analysis: ' + e.message);
    } finally {
      setGroupAnalysisLoading(false);
    }
  };

  const handleOpenSavedAnalysis = () => {
    if (!savedAnalysisData) return;
    setGroupAnalysisResult(savedAnalysisData);
    setEditableGroupPrompt(savedAnalysisData.suggestedRevisedInstructions || settings.customInstructions || '');
    setAbSimulationResult(null);
    setActiveAnalysisModalTab('insights');
  };

  const handleRunAbSimulation = async () => {
    const targetJobId = abSimulatingJobId || (filteredJobs.find(j => j.status === 'Dismissed')?.id || jobs[0]?.id);
    if (!targetJobId) {
      alert('Please select a job to run the A/B simulation test against.');
      return;
    }
    setAbSimulationLoading(true);
    try {
      const res = await fetch('/api/jobs/simulate-prompt-ab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: targetJobId,
          proposedInstructions: editableGroupPrompt
        })
      });
      const data = await res.json();
      if (!data.success) {
        alert('A/B Test Error: ' + (data.error || 'Simulation failed'));
      } else {
        setAbSimulationResult(data);
      }
    } catch (e) {
      alert('Failed to run A/B simulation: ' + e.message);
    } finally {
      setAbSimulationLoading(false);
    }
  };

  const handleApplyGroupPromptRevision = async () => {
    try {
      const updatedSettings = { ...settings, customInstructions: editableGroupPrompt };
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      setSettings(data);
      setGroupPromptSaved(true);
      setTimeout(() => setGroupPromptSaved(false), 3000);
      alert('Global Custom Instructions updated & saved to Settings!');
    } catch (e) {
      alert('Failed to save updated instructions: ' + e.message);
    }
  };

  const handleInspectJobPrompt = async (jobId) => {
    if (!jobId) return;
    setInspectPromptLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/prompt-preview`);
      const data = await res.json();
      if (!data.success) {
        alert('Prompt Inspection Error: ' + (data.error || 'Failed to generate prompt preview'));
      } else {
        setPromptPreviewData(data);
        setActivePromptPreviewKey('cvTailoring');
      }
    } catch (e) {
      alert('Failed to inspect prompt: ' + e.message);
    } finally {
      setInspectPromptLoading(false);
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

  const handleExportCvToCsv = (job) => {
    if (!job || !job.tailoredCv) {
      alert('No tailored CV generated for this job yet.');
      return;
    }
    const cv = job.tailoredCv;
    const headers = ['Company', 'Job Title', 'CV Title', 'Summary', 'Core Skills', 'Role', 'Period', 'Location', 'Bullet Points'];
    const escapeCsv = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
    
    let rows = [];
    if (cv.experience && cv.experience.length > 0) {
      cv.experience.forEach((exp) => {
        const bullets = (exp.bullets || []).join(' | ');
        rows.push([
          escapeCsv(job.company),
          escapeCsv(job.title),
          escapeCsv(cv.title),
          escapeCsv(cv.summary),
          escapeCsv(cv.coreSkills),
          escapeCsv(exp.company + ' - ' + exp.role),
          escapeCsv(exp.period),
          escapeCsv(exp.location),
          escapeCsv(bullets)
        ].join(','));
      });
    } else {
      rows.push([
        escapeCsv(job.company),
        escapeCsv(job.title),
        escapeCsv(cv.title),
        escapeCsv(cv.summary),
        escapeCsv(cv.coreSkills),
        '""', '""', '""', '""'
      ].join(','));
    }
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    navigator.clipboard.writeText(csvContent);

    // Also offer direct file download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const safeCompany = (job.company || 'job').replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('download', `tailored_cv_${safeCompany}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('Tailored CV copied to clipboard & downloaded as CSV!');
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="logo-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="logo-glow" title="100x Job Pilot">
              <Globe size={20} />
            </div>
            <div className="logo-text">
              <h1>100x job</h1>
              <p>100x Job Pilot</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)} 
              className="btn btn-secondary" 
              style={{ padding: '6px', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(125, 125, 125, 0.1)', cursor: 'pointer' }}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight size={16} style={{ color: 'var(--text-main)' }} /> : <ChevronLeft size={16} style={{ color: 'var(--text-main)' }} />}
            </button>
            {!sidebarCollapsed && (
              <button 
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                className="btn btn-secondary" 
                style={{ padding: '6px', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(125, 125, 125, 0.1)', cursor: 'pointer' }}
                title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              >
                {theme === 'light' ? <Moon size={16} style={{ color: 'var(--text-main)' }} /> : <Sun size={16} style={{ color: 'var(--text-main)' }} />}
              </button>
            )}
          </div>
        </div>

        <div className="nav-links">
          <div 
            className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentTab('dashboard')}
            title="Dashboard"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setCurrentTab('jobs')}
            title="Job Pipeline"
            style={{ position: 'relative' }}
          >
            <Briefcase size={18} />
            <span>Job Pipeline</span>
            {outreachTasksCount > 0 && (
              <span className="nav-item-badge" style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: '700', padding: '1px 6px', borderRadius: '10px' }}>
                {outreachTasksCount}
              </span>
            )}
          </div>
          <div 
            className={`nav-item ${currentTab === 'profile' ? 'active' : ''}`}
            onClick={() => setCurrentTab('profile')}
            title="Base Profile"
          >
            <User size={18} />
            <span>Base Profile</span>
          </div>
          <div 
            className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`}
            onClick={() => setCurrentTab('settings')}
            title="Settings"
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </div>

          <a 
            href="/api/extension/download" 
            download="100x-job-copilot-extension.zip"
            className="nav-item" 
            style={{ textDecoration: 'none', color: 'inherit', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '12px' }}
            title="Download packaged Chrome Extension (.zip)"
          >
            <FileDown size={18} style={{ color: '#6366f1' }} />
            <span>Extension Package (.zip)</span>
          </a>
        </div>


      </div>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        
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
              <div className="glass-card" style={{ borderLeft: '3px solid var(--accent-purple)', background: 'var(--bg-tertiary)', marginBottom: '24px', padding: '18px 24px' }}>
                <a href="?status=To%20Process" className="process-link" style={{ textDecoration: 'none', color: 'inherit' }} onClick={(e) => { e.preventDefault(); setCurrentTab('jobs'); setStatusFilter('To Process'); }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>You have {stats.toProcess} roles to process today</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                      Tailor your CV and Cover Letter for these new roles to stand out to hiring managers.
                    </p>
                  </div>
                </a>
              </div>
            ) : (
              <div className="glass-card" style={{ borderLeft: '3px solid var(--accent-green)', background: 'var(--bg-tertiary)', marginBottom: '24px', padding: '18px 24px' }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: '600' }}>All caught up</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                    No roles pending review. Trigger the Sourcing Engine below to find new opportunities.
                  </p>
                </div>
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
                <p>Manage, tailor, auto-apply, and track your applications.</p>
              </div>
            </div>

            {/* Filter controls */}
            <div className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {['All', 'To Process', 'Applied', 'Silence', 'Invited', 'Dismissed'].map(status => (
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

            {/* Dismissed Filter Cohort Banner */}
            {statusFilter === 'Dismissed' && (
              <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '16px', background: 'rgba(255, 59, 48, 0.06)', border: '1px solid rgba(255, 59, 48, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255, 59, 48, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-red)' }}>
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Dismissed Applications Intelligence
                      {savedAnalysisTimestamp && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          (Saved analysis from {new Date(savedAnalysisTimestamp).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Diagnose failure patterns, run A/B prompt simulations, and track token impact before applying custom rules.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {savedAnalysisData && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={handleOpenSavedAnalysis}
                      title="Re-open your previously generated analysis without using any API tokens"
                    >
                      <FileText size={14} />
                      View Saved Analysis (0 Tokens)
                    </button>
                  )}
                  {filteredJobs.length > 0 && (
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleAnalyzeGroupDismissals(filteredJobs.map(j => j.id))}
                      disabled={groupAnalysisLoading}
                    >
                      <Sparkles size={14} />
                      {groupAnalysisLoading ? <span className="loading-dots">Analyzing All</span> : `Run New Cohort Analysis`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Action Toolbar */}
            {selectedJobIds.length > 0 ? (
              <div className="glass-card" style={{ padding: '10px 16px', marginBottom: '16px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{selectedJobIds.length} jobs selected</strong>
                  <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => setSelectedJobIds([])}>Deselect All</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {savedAnalysisData && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }} 
                      onClick={handleOpenSavedAnalysis}
                      title="Re-open previously saved analysis (Free)"
                    >
                      <FileText size={14} />
                      View Saved Analysis
                    </button>
                  )}
                  <button 
                    className="btn" 
                    style={{ padding: '5px 12px', fontSize: '0.78rem', backgroundColor: 'rgba(255, 59, 48, 0.15)', color: 'var(--accent-red)', border: '1px solid rgba(255, 59, 48, 0.3)', display: 'flex', alignItems: 'center', gap: '5px' }} 
                    onClick={() => handleAnalyzeGroupDismissals(selectedJobIds)}
                    disabled={groupAnalysisLoading}
                  >
                    <Sparkles size={14} />
                    {groupAnalysisLoading ? <span className="loading-dots">Analyzing</span> : `Analyze Rejections (${selectedJobIds.length})`}
                  </button>
                  <button className="btn btn-cyan" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => handleBulkUpdateStatus('Applied')}>Mark as Applied</button>
                  <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => handleBulkUpdateStatus('To Process')}>Mark as To Process</button>
                  <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => handleBulkUpdateStatus('Dismissed')}>Mark as Dismissed</button>
                  <button className="btn" style={{ padding: '5px 12px', fontSize: '0.78rem', backgroundColor: '#ef4444', color: '#ffffff', border: 'none' }} onClick={handleBulkDelete}>Delete Selected</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={handleSelectAllToday} title="Select all jobs saved or updated today">
                  Select All Saved Today
                </button>
              </div>
            )}

            {/* Pipeline Table */}
            <div className="glass-card" style={{ padding: '0px', overflowX: 'auto' }}>
              {filteredJobs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <AlertCircle style={{ display: 'block', margin: '0 auto 12px auto' }} />
                  No jobs found matching the active filter.
                </div>
              ) : (
                <table className="pipeline-table" style={{ minWidth: '1100px' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.includes(j.id))}
                          onChange={handleToggleSelectAllVisible}
                          style={{ cursor: 'pointer' }}
                          title="Select / Deselect all visible jobs"
                        />
                      </th>
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
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedJobIds.includes(job.id)}
                            onChange={() => handleToggleSelectJob(job.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
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
                            {['To Process', 'Applied', 'Silence', 'Invited', 'Dismissed', 'Saved'].map(s => (
                              <option key={s} value={s} style={{ background: 'var(--bg-primary)', color: 'var(--text-main)', textTransform: 'none' }}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <button 
                                className="btn btn-cyan" 
                                style={{ padding: '2px 8px', fontSize: '0.65rem' }} 
                                onClick={() => handleCopyQuickMsgForJob(job)}
                                title="Copy tailored HM outreach message"
                              >
                                Copy Msg
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '2px 8px', fontSize: '0.65rem' }}
                                onClick={() => {
                                  const updated = window.prompt(`Application note for ${job.company}:`, job.notes || '');
                                  if (updated !== null) {
                                    handleUpdateJobNotes(job.id, updated.trim());
                                  }
                                }}
                                title="Add/Edit application note"
                              >
                                {job.notes ? 'Edit Note' : '+ Note'}
                              </button>
                            </div>
                            {job.notes && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.notes}>
                                {job.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              className="btn btn-cyan"
                              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTailorJob(job.id);
                              }}
                              disabled={tailoringJobId === job.id}
                              title="Regenerate tailored CV & cover letter with latest prompt rules"
                            >
                              {tailoringJobId === job.id ? 'Tailoring...' : (job.tailoredCv ? 'Regenerate' : 'Tailor CV')}
                            </button>
                            {job.tailoredCv && (
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportCvToCsv(job);
                                }}
                                title="Export tailored CV to CSV"
                              >
                                Export CSV
                              </button>
                            )}
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
                      
                      {/* Post-Apply & Outreach Hub */}
                      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(56, 189, 248, 0.08) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCheck size={16} />
                            Post-Apply & HM Outreach
                          </h4>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {['Applied', 'Silence', 'Invited', 'Dismissed'].map(status => (
                              <button
                                key={status}
                                className={`btn ${selectedJob.status === status ? 'btn-cyan' : 'btn-secondary'}`}
                                style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                                onClick={() => handleUpdateJobStatus(selectedJob.id, status)}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '10px', borderRadius: '8px', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Hiring Manager: </span>
                            <strong>{selectedJob.hiringManager || 'Not specified'}</strong>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <a
                              href={selectedJob.hiringManager?.startsWith('http') ? selectedJob.hiringManager : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`hiring manager ${selectedJob.company || ''}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <ExternalLink size={12} />
                              Search HM
                            </a>
                            <button
                              className="btn btn-cyan"
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                              onClick={() => handleCopyQuickMsgForJob(selectedJob)}
                            >
                              Copy Msg
                            </button>
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                            Application Notes & HM Contact History:
                          </label>
                          <textarea
                            rows={3}
                            className="form-input"
                            style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', background: 'var(--bg-tertiary)' }}
                            placeholder="e.g. Sent LinkedIn connection request to HM on Aug 12. Follow-up scheduled for Aug 19."
                            value={selectedJob.notes || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedJob({ ...selectedJob, notes: val });
                            }}
                            onBlur={() => {
                              handleUpdateJobNotes(selectedJob.id, selectedJob.notes || '');
                            }}
                          />
                        </div>
                      </div>

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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', margin: 0 }}>Tailored Artifacts</h4>
                          {selectedJob.tailoredCv && (
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                              onClick={() => handleTailorJob(selectedJob.id)}
                              disabled={tailoringJobId === selectedJob.id}
                              title="Regenerate CV & cover letter"
                            >
                              {tailoringJobId === selectedJob.id ? <span className="loading-dots">Regenerating</span> : 'Regenerate'}
                            </button>
                          )}
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-blue)', borderColor: 'rgba(0, 122, 255, 0.3)' }}
                            onClick={() => handleInspectJobPrompt(selectedJob.id)}
                            disabled={inspectPromptLoading}
                            title="Inspect verbatim prompt sent to LLM & token count breakdown"
                          >
                            <FileText size={12} />
                            {inspectPromptLoading ? <span className="loading-dots">Loading</span> : 'Inspect Prompt & Tokens'}
                          </button>
                        </div>
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
                                      Proposed Prompt Revision
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

                                <button
                                  className="btn btn-secondary"
                                  onClick={() => handleExportCvToCsv(selectedJob)}
                                  title="Export tailored CV summary and bullets to CSV"
                                >
                                  <FileDown size={14} /> Export CSV
                                </button>
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
                    placeholder="e.g. Melbourne, VIC Australia"
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
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Auxiliary Projects & Ventures Bank ({(localProfile.auxiliaryProjects || []).length})</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Personal mobile apps, open source tools, or AI experiments. Injected selectively when a JD specifically requires hands-on builder proof.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    const updated = [...(localProfile.auxiliaryProjects || [])];
                    updated.push({ title: '', role: 'Creator / Builder', period: '2024 – Present', description: '' });
                    setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                  }}
                >
                  <Plus size={14} /> Add Auxiliary Project
                </button>
              </div>

              {(localProfile.auxiliaryProjects || []).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No auxiliary projects added yet. Click &quot;Add Auxiliary Project&quot; to bank your side projects, mobile apps, or AI experiments.
                </div>
              ) : (
                (localProfile.auxiliaryProjects || []).map((proj, pIdx) => (
                  <div key={pIdx} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Project / App Name</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Consumer iOS App"
                          value={proj.title || ''}
                          onChange={(e) => {
                            const updated = [...localProfile.auxiliaryProjects];
                            updated[pIdx].title = e.target.value;
                            setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Role / Venture Type</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Solo Developer & Designer"
                          value={proj.role || ''}
                          onChange={(e) => {
                            const updated = [...localProfile.auxiliaryProjects];
                            updated[pIdx].role = e.target.value;
                            setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                          }}
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Timeline / Period</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. 2024"
                          value={proj.period || ''}
                          onChange={(e) => {
                            const updated = [...localProfile.auxiliaryProjects];
                            updated[pIdx].period = e.target.value;
                            setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '8px 12px' }}
                          onClick={() => {
                            const updated = [...localProfile.auxiliaryProjects];
                            updated.splice(pIdx, 1);
                            setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Impact & Description</label>
                      <textarea
                        className="form-input"
                        style={{ height: '60px' }}
                        placeholder="e.g. Built and scaled native Flutter/React Native application with 10k downloads..."
                        value={proj.description || ''}
                        onChange={(e) => {
                          const updated = [...localProfile.auxiliaryProjects];
                          updated[pIdx].description = e.target.value;
                          setLocalProfile({ ...localProfile, auxiliaryProjects: updated });
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Education & Qualifications ({(localProfile.education || []).length})</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    Degrees, universities, or professional accreditations.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  onClick={() => {
                    const updated = [...(localProfile.education || [])];
                    updated.push({ degree: '', school: '', period: '' });
                    setLocalProfile({ ...localProfile, education: updated });
                  }}
                >
                  <Plus size={14} /> Add Education
                </button>
              </div>

              {(localProfile.education || []).length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No education records added yet. Click &quot;Add Education&quot; to add your academic degrees.
                </div>
              ) : (
                (localProfile.education || []).map((edu, eduIdx) => (
                  <div key={eduIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '12px', marginBottom: '12px', alignItems: 'flex-end' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Degree / Qualification</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Master of Business Administration"
                        value={edu.degree || ''}
                        onChange={(e) => {
                          const updated = [...localProfile.education];
                          updated[eduIdx].degree = e.target.value;
                          setLocalProfile({ ...localProfile, education: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>School / University</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. University of Melbourne"
                        value={edu.school || ''}
                        onChange={(e) => {
                          const updated = [...localProfile.education];
                          updated[eduIdx].school = e.target.value;
                          setLocalProfile({ ...localProfile, education: updated });
                        }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Years / Period</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. 2016 – 2018"
                        value={edu.period || ''}
                        onChange={(e) => {
                          const updated = [...localProfile.education];
                          updated[eduIdx].period = e.target.value;
                          setLocalProfile({ ...localProfile, education: updated });
                        }}
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '8px 12px' }}
                        onClick={() => {
                          const updated = [...localProfile.education];
                          updated.splice(eduIdx, 1);
                          setLocalProfile({ ...localProfile, education: updated });
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}

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
                    placeholder="e.g. MYOB, Atlassian"
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      These instructions will be appended to the AI prompt when tailoring your CV and Cover Letter.
                    </p>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--accent-blue)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      ~{Math.ceil((settings.customInstructions || '').length / 4)} tokens ({(settings.customInstructions || '').length} chars)
                    </span>
                  </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Define the core prompt instructions for CV tailoring. Supported placeholders: 
                      <code>{"{{name}}"}</code>, <code>{"{{title}}"}</code>, <code>{"{{summary}}"}</code>, 
                      <code>{"{{visa}}"}</code>, <code>{"{{address}}"}</code>, <code>{"{{experience}}"}</code>, 
                      <code>{"{{jobTitle}}"}</code>, <code>{"{{companyName}}"}</code>, <code>{"{{jobDescription}}"}</code>, 
                      <code>{"{{detectedDomain}}"}</code>, <code>{"{{customInstructions}}"}</code>.
                    </p>
                    <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--accent-green)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>
                      ~{Math.ceil((settings.cvSystemPrompt || '').length / 4)} tokens ({(settings.cvSystemPrompt || '').length} chars)
                    </span>
                  </div>
                </div>

                <button type="submit" className="btn btn-primary">
                  <Save size={16} /> Save Configuration
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* GROUP DISMISSAL ANALYSIS MODAL */}
      {groupAnalysisResult && (() => {
        const curChars = (settings.customInstructions || '').length;
        const curTokens = Math.ceil(curChars / 4);
        const propChars = editableGroupPrompt.length;
        const propTokens = Math.ceil(propChars / 4);
        const tokenDelta = propTokens - curTokens;
        const tokenDeltaPct = curTokens > 0 ? Math.round((tokenDelta / curTokens) * 100) : (propTokens > 0 ? 100 : 0);
        const baseSysPromptTokens = Math.ceil((settings.cvSystemPrompt || '').length / 4);
        const totalEstTokens = baseSysPromptTokens + propTokens + 800;
        const estCostFlash = ((totalEstTokens / 1000000) * 0.075).toFixed(6);
        const estCostDeepSeek = ((totalEstTokens / 1000000) * 0.14).toFixed(6);

        return (
          <div 
            className="slide-panel-backdrop" 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1100 }}
            onClick={() => setGroupAnalysisResult(null)}
          >
            <div 
              className="glass-card" 
              style={{ 
                width: '100%', 
                maxWidth: '920px', 
                maxHeight: '92vh', 
                overflowY: 'auto', 
                padding: '28px', 
                borderRadius: '18px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      Rejection Intelligence & Cohort Analysis
                    </h3>
                    <span className="badge badge-dismissed" style={{ fontSize: '0.7rem' }}>
                      {groupAnalysisResult.analyzedCount || 'Cohort'} Roles Analyzed
                    </span>
                    {savedAnalysisTimestamp && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '4px' }}>
                        Saved {new Date(savedAnalysisTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Diagnose failure patterns, A/B test proposed prompt rules, and track token impact before updating settings.
                  </p>
                </div>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '6px', borderRadius: '8px' }} 
                  onClick={() => setGroupAnalysisResult(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sub-Navigation Tabs inside Modal */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
                <button 
                  className={`btn ${activeAnalysisModalTab === 'insights' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setActiveAnalysisModalTab('insights')}
                >
                  <AlertCircle size={14} /> 1. Rejection Insights & Patterns
                </button>
                <button 
                  className={`btn ${activeAnalysisModalTab === 'ab_test' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setActiveAnalysisModalTab('ab_test')}
                >
                  <Sparkles size={14} /> 2. A/B Simulation Test
                </button>
                <button 
                  className={`btn ${activeAnalysisModalTab === 'prompt' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setActiveAnalysisModalTab('prompt')}
                >
                  <FileText size={14} /> 3. Prompt Rules & Token Cost
                </button>
              </div>

              {/* TAB 1: INSIGHTS & PATTERNS */}
              {activeAnalysisModalTab === 'insights' && (
                <div>
                  {/* Executive Summary Callout */}
                  <div style={{ background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertCircle size={15} /> Executive Diagnosis
                    </h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {groupAnalysisResult.executiveSummary}
                    </p>
                  </div>

                  {/* Common Themes & Friction Points */}
                  {groupAnalysisResult.commonThemes && groupAnalysisResult.commonThemes.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={16} style={{ color: 'var(--accent-orange)' }} /> Recurring Failure Themes & Patterns
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                        {groupAnalysisResult.commonThemes.map((themeItem, idx) => (
                          <div key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '0.84rem', color: 'var(--text-main)' }}>{themeItem.theme}</strong>
                              {themeItem.severity && (
                                <span style={{ 
                                  fontSize: '0.65rem', 
                                  fontWeight: '700', 
                                  padding: '2px 6px', 
                                  borderRadius: '4px',
                                  background: themeItem.severity === 'High' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 149, 0, 0.15)',
                                  color: themeItem.severity === 'High' ? 'var(--accent-red)' : 'var(--accent-orange)'
                                }}>
                                  {themeItem.severity}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              {themeItem.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Gaps vs Positive Signals */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    {/* Profile / Tailoring Gaps */}
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-red)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                        Identified Gaps & Weaknesses
                      </h5>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(groupAnalysisResult.profileGaps || []).map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Positive Signals & Strengths */}
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                        Strengths & Working Signals
                      </h5>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(groupAnalysisResult.positiveSignals || []).map((pos, i) => (
                          <li key={i}>{pos}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Strategy Adjustments */}
                  {groupAnalysisResult.recommendedStrategy && (
                    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                      <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
                        Recommended Strategy Adjustments
                      </h5>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {(groupAnalysisResult.recommendedStrategy || []).map((strat, i) => (
                          <li key={i}>{strat}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                      onClick={() => setGroupAnalysisResult(null)}
                    >
                      Close
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.82rem', padding: '8px 18px', background: 'var(--accent-blue)', color: '#FFFFFF', fontWeight: '600' }}
                      onClick={() => setActiveAnalysisModalTab('ab_test')}
                    >
                      Next: Run A/B Simulation →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: A/B SIMULATION TEST */}
              {activeAnalysisModalTab === 'ab_test' && (
                <div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} style={{ color: 'var(--accent-blue)' }} /> A/B Simulation: Test Current Rules vs. Proposed Fixes
                    </h4>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                      Test the proposed prompt changes on a real job to verify how the tailored Title, Summary, and Key Bullets transform before applying rules globally.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1', minWidth: '240px' }}>
                        <label className="form-label" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>Choose Target Job:</label>
                        <select 
                          className="status-select"
                          style={{ width: '100%', padding: '8px 30px 8px 12px', fontSize: '0.85rem' }}
                          value={abSimulatingJobId}
                          onChange={(e) => setAbSimulatingJobId(e.target.value)}
                        >
                          {jobs.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.company} — {j.title} ({j.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div style={{ alignSelf: 'flex-end' }}>
                        <button 
                          className="btn btn-primary"
                          style={{ fontSize: '0.82rem', padding: '8px 18px', background: 'var(--accent-blue)', color: '#FFFFFF', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleRunAbSimulation}
                          disabled={abSimulationLoading}
                        >
                          <Sparkles size={14} />
                          {abSimulationLoading ? <span className="loading-dots">Running Simulation</span> : 'Simulate A/B Test'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {abSimulationResult && (
                    <div style={{ marginBottom: '20px' }}>
                      {/* Differences Note */}
                      <div style={{ background: 'rgba(0, 122, 255, 0.08)', border: '1px solid rgba(0, 122, 255, 0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                        <strong style={{ fontSize: '0.82rem', color: 'var(--accent-blue)' }}>A/B Comparison Takeaway:</strong>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                          {abSimulationResult.simulation.keyDifferences}
                        </p>
                      </div>

                      {/* Side by Side cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                        {/* Version A */}
                        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span className="badge" style={{ background: 'rgba(142, 142, 147, 0.15)', color: 'var(--text-muted)' }}>
                              Version A (Current Rules)
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              ~{abSimulationResult.tokenMetrics.currentTokens} tokens
                            </span>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Generated Title:</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-main)' }}>{abSimulationResult.simulation.versionA.title}</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Generated Summary:</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                              {abSimulationResult.simulation.versionA.summary}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>STAR Highlights:</div>
                            <ul style={{ fontSize: '0.78rem', color: 'var(--text-main)', paddingLeft: '16px', lineHeight: '1.4' }}>
                              {(abSimulationResult.simulation.versionA.leadHighlights || []).map((h, idx) => (
                                <li key={idx}>{h}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Version B */}
                        <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--accent-blue)', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span className="badge badge-applied" style={{ background: 'rgba(0, 122, 255, 0.15)', color: 'var(--accent-blue)' }}>
                              Version B (Proposed Rules)
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', fontWeight: '600' }}>
                              ~{abSimulationResult.tokenMetrics.proposedTokens} tokens ({abSimulationResult.tokenMetrics.deltaTokens > 0 ? `+${abSimulationResult.tokenMetrics.deltaTokens}` : abSimulationResult.tokenMetrics.deltaTokens})
                            </span>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Generated Title:</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-blue)' }}>{abSimulationResult.simulation.versionB.title}</div>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Generated Summary:</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4', background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: '6px', border: '1px solid rgba(0, 122, 255, 0.3)' }}>
                              {abSimulationResult.simulation.versionB.summary}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>STAR Highlights:</div>
                            <ul style={{ fontSize: '0.78rem', color: 'var(--text-main)', paddingLeft: '16px', lineHeight: '1.4' }}>
                              {(abSimulationResult.simulation.versionB.leadHighlights || []).map((h, idx) => (
                                <li key={idx}>{h}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                      onClick={() => setActiveAnalysisModalTab('insights')}
                    >
                      ← Back to Insights
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.82rem', padding: '8px 18px', background: 'var(--accent-blue)', color: '#FFFFFF', fontWeight: '600' }}
                      onClick={() => setActiveAnalysisModalTab('prompt')}
                    >
                      Next: Review Token Cost & Apply →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: PROMPT & TOKEN COST */}
              {activeAnalysisModalTab === 'prompt' && (
                <div>
                  {/* Token & Cost Metrics Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '18px' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Current Instructions</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                        ~{curTokens} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>tokens</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{curChars} characters</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Proposed Instructions</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--accent-blue)', marginTop: '2px' }}>
                        ~{propTokens} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>tokens</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{propChars} characters</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Token Impact / Delta</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '700', color: tokenDelta > 0 ? 'var(--accent-orange)' : 'var(--accent-green)', marginTop: '2px' }}>
                        {tokenDelta > 0 ? `+${tokenDelta}` : tokenDelta} <span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>({tokenDeltaPct > 0 ? `+${tokenDeltaPct}%` : `${tokenDeltaPct}%`})</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>per CV tailoring call</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Estimated Cost / CV</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--accent-green)', marginTop: '2px' }}>
                        ${estCostFlash}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gemini Flash (~${estCostDeepSeek} DeepSeek)</div>
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-indigo)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} /> Global Custom Instructions Editor
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Review, trim, or refine the proposed rules below. The token metrics above will update live as you edit.
                  </p>

                  {groupAnalysisResult.actionablePromptChanges && (
                    <div style={{ fontSize: '0.78rem', background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '12px', whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                      <strong>Synthesized Rule Additions:</strong><br />
                      {groupAnalysisResult.actionablePromptChanges}
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label className="form-label" style={{ fontSize: '0.72rem', marginBottom: '6px' }}>
                      Proposed Global Custom Instructions (Editable):
                    </label>
                    <textarea
                      className="form-input"
                      style={{ height: '150px', fontSize: '0.8rem', fontFamily: 'monospace', lineHeight: '1.4' }}
                      value={editableGroupPrompt}
                      onChange={(e) => setEditableGroupPrompt(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      💡 <em>Tip: You can re-open this analysis anytime for free via "View Saved Analysis".</em>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {groupPromptSaved && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: '600' }}>
                          ✓ Saved to Settings!
                        </span>
                      )}
                      <button 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                        onClick={() => setGroupAnalysisResult(null)}
                      >
                        Close & Keep Thinking
                      </button>
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.82rem', padding: '8px 18px', background: 'var(--accent-blue)', color: '#FFFFFF', fontWeight: '600' }}
                        onClick={handleApplyGroupPromptRevision}
                      >
                        Accept & Save to Global Settings
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PROMPT & TOKEN INSPECTOR MODAL */}
      {promptPreviewData && (
        <div 
          className="slide-panel-backdrop" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1200 }}
          onClick={() => setPromptPreviewData(null)}
        >
          <div 
            className="glass-card" 
            style={{ 
              width: '100%', 
              maxWidth: '960px', 
              maxHeight: '92vh', 
              overflowY: 'auto', 
              padding: '28px', 
              borderRadius: '18px', 
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    LLM Prompt & Token Inspector
                  </h3>
                  <span className="badge badge-applied" style={{ fontSize: '0.7rem' }}>
                    Domain: {promptPreviewData.detectedDomain || 'General'}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Verbatim prompt sent to Gemini / DeepSeek for <strong>{promptPreviewData.job.title}</strong> at <strong>{promptPreviewData.job.company}</strong>.
                </p>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px', borderRadius: '8px' }} 
                onClick={() => setPromptPreviewData(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              {Object.entries(promptPreviewData.prompts).map(([key, pData]) => (
                <button
                  key={key}
                  className={`btn ${activePromptPreviewKey === key ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
                  onClick={() => setActivePromptPreviewKey(key)}
                >
                  {pData.name} (~{pData.metrics.tokens} tokens)
                </button>
              ))}
            </div>

            {/* Selected Prompt Inspector Body */}
            {(() => {
              const currentPromptObj = promptPreviewData.prompts[activePromptPreviewKey] || promptPreviewData.prompts.cvTailoring;
              const metrics = currentPromptObj.metrics;

              return (
                <div>
                  {/* Stat Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Total Input Size</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-blue)', marginTop: '2px' }}>
                        ~{metrics.tokens} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>tokens</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{metrics.chars.toLocaleString()} chars · {metrics.words.toLocaleString()} words</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Est. Cost per Call</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-green)', marginTop: '2px' }}>
                        {metrics.estCostFlash}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gemini Flash ({metrics.estCostDeepSeek} DeepSeek)</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Profile & JD Tokens</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>
                        ~{promptPreviewData.components.candidateProfileTokens + promptPreviewData.components.jobDescriptionTokens} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>tokens</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Profile: ~{promptPreviewData.components.candidateProfileTokens} | JD: ~{promptPreviewData.components.jobDescriptionTokens}</div>
                    </div>

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Rules & Template Tokens</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--accent-orange)', marginTop: '2px' }}>
                        ~{promptPreviewData.components.systemTemplateTokens + promptPreviewData.components.customInstructionsTokens} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>tokens</span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rules: ~{promptPreviewData.components.customInstructionsTokens} | Template: ~{promptPreviewData.components.systemTemplateTokens}</div>
                    </div>
                  </div>

                  {/* Verbatim Prompt Viewer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      Verbatim Prompt String:
                    </label>
                    <button 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => {
                        navigator.clipboard.writeText(currentPromptObj.prompt);
                        setCopiedPromptToast(true);
                        setTimeout(() => setCopiedPromptToast(false), 2500);
                      }}
                    >
                      {copiedPromptToast ? '✓ Copied to Clipboard!' : 'Copy Full Prompt'}
                    </button>
                  </div>

                  <pre style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '16px',
                    fontSize: '0.78rem',
                    fontFamily: 'SF Mono, Menlo, Monaco, Consolas, Courier New, monospace',
                    color: 'var(--text-main)',
                    maxHeight: '440px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: '1.5'
                  }}>
                    {currentPromptObj.prompt}
                  </pre>
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.82rem', padding: '8px 18px' }}
                onClick={() => setPromptPreviewData(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
