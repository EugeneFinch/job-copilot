import fs from 'fs';

const settings = JSON.parse(fs.readFileSync('data/settings.json', 'utf8'));
const deepSeekApiKey = settings.deepSeekApiKey;

// Let's get the job description for the last job in jobs.json
const jobs = JSON.parse(fs.readFileSync('data/jobs.json', 'utf8'));
const targetJob = jobs.find(j => j.company.toLowerCase().includes('think & grow')) || jobs[jobs.length - 1];

console.log("Analyzing Job:", targetJob.title, "at", targetJob.company);

const cv = settings.profile || {};
const formattedExperience = (cv.experience || []).map(exp => {
  return `Company: ${exp.company}
Role: ${exp.role}
Period: ${exp.period}
Location: ${exp.location || 'Remote'}
Bullets:
${(exp.bullets || []).map(b => `- ${b}`).join('\n')}`;
}).join('\n\n');

const prompt = `You are an expert recruitment consultant, ATS optimization specialist, and career coach.
Analyze how the candidate's CV matches the target job description before they save it to their pipeline.
Assess the match suitability objectively and concisely based ONLY on the candidate's actual CV details. Do not make up any facts.

**Job Details:**
Company: ${targetJob.company}
Title: ${targetJob.title}
Job Description:
${targetJob.description || 'Not provided'}

**Candidate CV Details:**
Name: ${cv.name || 'Not set'}
Professional Title: ${cv.title || 'Not set'}
Summary: ${cv.summary || 'Not set'}
Work Experience:
${formattedExperience || 'No experience bullets set'}

**Instructions:**
1. Assess the match suitability objectively and concisely based ONLY on the candidate's actual CV details. Do not make up any facts.
2. Outline key alignments and gaps/mismatches in 2-3 short, direct bullet points (keep the total explanation under 100 words, no polite preambles or introductory phrases).
3. Assign a numeric relevance/suitability score between 1 and 10, using the full scale:
   - 10: Perfect match (perfect alignment on requirements, domain, and seniority).
   - 9: Excellent match (very minor gaps, extremely strong fit).
   - 7-8: Strong match (highly aligned on core skills, minor gaps in domain or secondary tools).
   - 5-6: Moderate match (some transferable PM skills, but significant domain/technical gaps or different industry focus).
   - 3-4: Low match (very few overlapping skills, major industry mismatch).
   - 1-2: Irrelevant (entirely unrelated field, e.g. medical, civil engineering, or hardware where the candidate lacks relevant background).

**Output Format:**
You must return a single JSON object matching this structure exactly:
{
  "score": 8, // Integer between 1 and 10
  "explanation": "String (the bulleted explanation)"
}
`;

async function testDeepSeek() {
  try {
    const url = 'https://api.deepseek.com/chat/completions';
    console.log("Calling DeepSeek API...");
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    console.log("DeepSeek Status:", res.status);
    const text = await res.text();
    console.log("Raw Response:");
    console.log(text);
  } catch (e) {
    console.error("DeepSeek API failed:", e.message);
  }
}

testDeepSeek();
