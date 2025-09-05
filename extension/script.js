    class JobTrackerPopup {
      constructor() {
        this.currentJobData = null;
        this.apiBase = 'http://localhost:8000/api';
        this.init();
      }

      init() {
        this.setupTabs();
        this.setupEventListeners();
        this.loadCurrentJob();
        this.loadJobsList();
      }

      setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            this.switchTab(tabName);
          });
        });
      }

      switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Load data for dashboard tab
        if (tabName === 'dashboard') {
          this.loadJobsList();
        }
      }

      setupEventListeners() {
        document.getElementById('save-btn').addEventListener('click', () => {
          this.saveCurrentJob();
        });
      }

      async loadCurrentJob() {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          
          chrome.tabs.sendMessage(tab.id, { action: 'getJobData' }, (response) => {
            if (chrome.runtime.lastError || !response) {
              this.showJobInfo('No job detected on current page', true);
              return;
            }

            this.currentJobData = response;
            this.displayCurrentJob(response);
          });
        } catch (error) {
          this.showJobInfo('Error loading job data', true);
        }
      }

      displayCurrentJob(jobData) {
        const container = document.getElementById('current-job-info');
        
        if (!jobData || !jobData.title) {
          container.innerHTML = '<div class="error-message">No job detected on current page</div>';
          return;
        }

        container.innerHTML = `
          <div class="job-info">
            <div class="job-title">${jobData.title}</div>
            <div class="job-company">${jobData.company}</div>
            <span class="job-platform">${jobData.platform}</span>
          </div>
        `;
        
        document.getElementById('save-form').style.display = 'block';
      }

      showJobInfo(message, isError = false) {
        const container = document.getElementById('current-job-info');
        const className = isError ? 'error-message' : 'success-message';
        container.innerHTML = `<div class="${className}">${message}</div>`;
      }

      async saveCurrentJob() {
        if (!this.currentJobData) {
          this.showMessage('No job data to save', true);
          return;
        }

        const saveBtn = document.getElementById('save-btn');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
          const status = document.getElementById('status').value;
          const notes = document.getElementById('notes').value;

          const jobToSave = {
            ...this.currentJobData,
            status,
            notes,
            date_saved: new Date().toISOString()
          };

          const response = await fetch(`${this.apiBase}/jobs/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobToSave)
          });

          if (response.ok) {
            this.showMessage('Job saved successfully!');
            document.getElementById('notes').value = '';
            this.loadJobsList(); // Refresh jobs list
          } else {
            throw new Error('Failed to save job');
          }
        } catch (error) {
          this.showMessage('Error saving job. Check if backend is running.', true);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = originalText;
        }
      }

      async loadJobsList() {
        const container = document.getElementById('jobs-list');
        
        try {
          const response = await fetch(`${this.apiBase}/jobs/`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch jobs');
          }

          const jobs = await response.json();
          
          if (jobs.length === 0) {
            container.innerHTML = '<div class="empty-state">No saved jobs yet</div>';
            return;
          }

          container.innerHTML = `
            <div class="job-list">
              ${jobs.map(job => `
                <div class="job-item">
                  <div class="job-summary">
                    <div class="title">${job.title}</div>
                    <div class="company">${job.company} • ${job.platform}</div>
                  </div>
                  <span class="job-status status-${job.status}">${job.status}</span>
                </div>
              `).join('')}
            </div>
          `;
        } catch (error) {
          container.innerHTML = '<div class="error-message">Error loading jobs. Check if backend is running.</div>';
        }
      }

      showMessage(message, isError = false) {
        const messageArea = document.getElementById('message-area');
        const className = isError ? 'error-message' : 'success-message';
        
        messageArea.innerHTML = `<div class="${className}">${message}</div>`;
        
        setTimeout(() => {
          messageArea.innerHTML = '';
        }, 3000);
      }
    }

    // Initialize popup when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
      new JobTrackerPopup();
    });