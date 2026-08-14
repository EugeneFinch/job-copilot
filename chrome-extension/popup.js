document.addEventListener('DOMContentLoaded', () => {
  const connStatus = document.getElementById('conn-status');
  const settingsCard = document.getElementById('settings-card');
  const jobsCard = document.getElementById('jobs-card');
  const profileName = document.getElementById('profile-name');
  const keywordsList = document.getElementById('keywords-list');
  const jobsList = document.getElementById('jobs-list');

  // Fetch settings from local server
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    if (response && response.success) {
      const settings = response.data;
      connStatus.innerText = 'Connected';
      connStatus.className = 'status-badge connected';
      settingsCard.style.display = 'block';

      profileName.innerText = `Profile: ${settings.profile?.name || 'Not Configured'}`;

      // Render keywords
      keywordsList.innerHTML = '';
      if (settings.targetKeywords) {
        settings.targetKeywords.forEach(kw => {
          const tag = document.createElement('span');
          tag.className = 'meta-tag';
          tag.innerText = kw;
          keywordsList.appendChild(tag);
        });
      }

      // Fetch recent jobs
      chrome.runtime.sendMessage({ action: 'getJobs' }, (jobsResponse) => {
        if (jobsResponse && jobsResponse.success) {
          const jobs = jobsResponse.data;
          if (jobs && jobs.length > 0) {
            jobsCard.style.display = 'block';
            jobsList.innerHTML = '';
            
            // Show top 5 recent jobs
            jobs.slice(-5).reverse().forEach(job => {
              const item = document.createElement('a');
              item.className = 'job-item';
              item.href = job.url || '#';
              item.target = '_blank';
              item.style.textDecoration = 'none';
              item.style.display = 'flex';
              item.innerHTML = `
                <div>
                  <div class="job-title">${job.title}</div>
                  <div class="job-company">${job.company}</div>
                </div>
                <div>
                  <span style="font-size: 10px; opacity: 0.7; color: #6366f1; font-weight: 600;">${job.status}</span>
                </div>
              `;
              
              // Explicitly open in a new tab using the Chrome API to bypass popup navigation blocks
              item.addEventListener('click', (e) => {
                e.preventDefault();
                if (job.url && job.url !== '#') {
                  chrome.tabs.create({ url: job.url });
                }
              });
              
              jobsList.appendChild(item);
            });
          }
        }
      });

    } else {
      connStatus.innerText = 'Offline';
      connStatus.className = 'status-badge';
      profileName.innerText = 'Local backend server not running.';
    }
  });
});
