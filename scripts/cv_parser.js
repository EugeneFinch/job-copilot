import fs from 'fs';

/**
 * Parses a plain‑text CV that follows the markdown style used in the UI.
 * Supports sections like Summary, Experience (with **Role | Company** headings),
 * and bullet points prefixed with '- '. Returns an object compatible with the
 * existing cv_template.html population function.
 */
export function parsePlainCv(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim());
  const result = {
    name: '',
    title: '',
    email: '',
    phone: '',
    address: '',
    linkedin: '',
    summary: '',
    experience: [],
    skills: [],
    education: [],
    other: [],
    generatedAt: new Date().toISOString()
  };

  let currentSection = null;
  let expBuffer = null; // holds a partial experience entry while parsing

  const startNewExp = (roleCompanyLine) => {
    const match = roleCompanyLine.match(/^\*\*\s*(.*?)\s*\|\s*(.*?)\s*\*\*$/);
    if (!match) return null;
    const role = match[1].trim();
    const company = match[2].trim();
    return { role, company, period: '', location: '', bullets: [] };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Top‑level key/value pairs (Name, Title, Email, Phone, LinkedIn, Summary)
    const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (kvMatch && !currentSection) {
      const key = kvMatch[1].toLowerCase();
      const value = kvMatch[2];
      if (key === 'name') result.name = value;
      else if (key === 'title') result.title = value;
      else if (key === 'email') result.email = value;
      else if (key === 'phone') result.phone = value;
      else if (key === 'address' || key === 'location') result.address = value;
      else if (key === 'linkedin') result.linkedin = value;
      else if (key === 'summary') result.summary = value;
      continue;
    }

    // Detect section headings (e.g., 'Summary', 'Experience')
    const headingMatch = line.match(/^(\*\*|##)\s*([A-Za-z]+)\s*(\*\*|##)?$/);
    if (headingMatch) {
      const sec = headingMatch[2].toLowerCase();
      if (sec === 'experience') {
        currentSection = 'experience';
        continue;
      }
    }

    if (currentSection === 'experience') {
      // Look for a role|company header
      if (line.startsWith('**') && line.includes('|')) {
        // finish previous buffer if any
        if (expBuffer) result.experience.push(expBuffer);
        expBuffer = startNewExp(line);
        continue;
      }

      // Period and location line (e.g., 'Mar 2024 – Present | Remote')
      if (expBuffer && !expBuffer.period && line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        expBuffer.period = parts[0];
        expBuffer.location = parts[1] || '';
        continue;
      }

      // Bullet points
      if (expBuffer && line.startsWith('-')) {
        const bullet = line.replace(/^\-\s*/, '');
        expBuffer.bullets.push(bullet);
        continue;
      }
    }
  }

  // push last experience
  if (expBuffer) result.experience.push(expBuffer);
  return result;
}
