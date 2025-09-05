// Content script to detect job postings on various platforms
class JobExtractor {
  constructor() {
    this.platform = this.detectPlatform();
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('linkedin.com')) return 'linkedin';
    if (hostname.includes('naukri.com')) return 'naukri';
    if (hostname.includes('indeed.com')) return 'indeed';
    return 'unknown';
  }

  init() {
    this.addSaveButtons();
    this.setupMessageListener();

    // Listen for URL changes (SPAs)
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => this.addSaveButtons(), 1000);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  extractJobData() {
    // Try structured data first
    const structuredJob = this.extractFromJsonLd();
    if (structuredJob) return structuredJob;

    // Fallback to DOM
    switch (this.platform) {
      case 'linkedin':
        return this.extractLinkedInJob();
      case 'naukri':
        return this.extractNaukriJob();
      case 'indeed':
        return this.extractIndeedJob();
      default:
        return null;
    }
  }

  extractFromJsonLd() {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (let script of scripts) {
        let data = JSON.parse(script.textContent.trim());

        // Some sites wrap in array
        if (Array.isArray(data)) {
          data = data.find(item => item['@type'] === 'JobPosting') || null;
        }

        if (data && data['@type'] === 'JobPosting') {
          return {
            title: data.title || '',
            company: data.hiringOrganization?.name || '',
            location: data.jobLocation?.[0]?.address?.addressLocality || '',
            url: window.location.href,
            platform: this.platform.charAt(0).toUpperCase() + this.platform.slice(1),
            description: (data.description || '').replace(/<[^>]+>/g, '').substring(0, 500)
          };
        }
      }
    } catch (err) {
      console.warn('JSON-LD extraction failed:', err);
    }
    return null;
  }

  // Fallback DOM scrapers

  extractLinkedInJob() {
    try {
      const titleElement = document.querySelector('h1.t-24.t-bold.inline');
      const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
      const locationElement = document.querySelector('.jobs-unified-top-card__bullet');

      return {
        title: titleElement?.innerText.trim() || '',
        company: companyElement?.innerText.trim() || '',
        location: locationElement?.innerText.trim() || '',
        url: window.location.href,
        platform: 'LinkedIn',
        description: this.extractDescription('.jobs-description__content')
      };
    } catch (error) {
      console.error('LinkedIn extraction error:', error);
      return null;
    }
  }

  extractNaukriJob() {
    try {
      const titleElement = document.querySelector('.jd-header-title');
      const companyElement = document.querySelector('.jd-header-comp-name');
      const locationElement = document.querySelector('.jd-location');

      return {
        title: titleElement?.textContent.trim() || '',
        company: companyElement?.textContent.trim() || '',
        location: locationElement?.textContent.trim() || '',
        url: window.location.href,
        platform: 'Naukri',
        description: this.extractDescription('.job-description')
      };
    } catch (error) {
      console.error('Naukri extraction error:', error);
      return null;
    }
  }

  extractIndeedJob() {
    try {
      const titleElement = document.querySelector('.jobsearch-JobInfoHeader-title');
      const companyElement = document.querySelector('[data-testid="inlineHeader-companyName"]');
      const locationElement = document.querySelector('[data-testid="job-location"]');

      return {
        title: titleElement?.textContent.trim() || '',
        company: companyElement?.textContent.trim() || '',
        location: locationElement?.textContent.trim() || '',
        url: window.location.href,
        platform: 'Indeed',
        description: this.extractDescription('#jobDescriptionText')
      };
    } catch (error) {
      console.error('Indeed extraction error:', error);
      return null;
    }
  }

  extractDescription(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim().substring(0, 500) : '';
  }

  addSaveButtons() {
    // Remove existing buttons first
    document.querySelectorAll('.job-tracker-save-btn').forEach(btn => btn.remove());

    if (this.platform === 'unknown') return;

    const jobData = this.extractJobData();
    if (!jobData || !jobData.title) return;

    const saveButton = this.createSaveButton();
    this.insertSaveButton(saveButton);
  }

  createSaveButton() {
    const button = document.createElement('button');
    button.className = 'job-tracker-save-btn';
    button.innerHTML = '💾 Save Job';
    button.title = 'Save this job to your tracker';

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.saveJob();
    });

    return button;
  }

  insertSaveButton(button) {
    let targetElement;

    switch (this.platform) {
      case 'linkedin':
        targetElement = document.querySelector('.top-card-layout__entity-info');
        break;
      case 'naukri':
        targetElement = document.querySelector('.jd-header');
        break;
      case 'indeed':
        targetElement = document.querySelector('.jobsearch-JobInfoHeader-subtitle');
        break;
    }

    if (targetElement) {
      targetElement.appendChild(button);
    }
  }

  async saveJob() {
    const jobData = this.extractJobData();
    if (!jobData) {
      this.showNotification('Could not extract job data', 'error');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/jobs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobData,
          status: 'saved',
          notes: '',
          date_saved: new Date().toISOString()
        })
      });

      if (response.ok) {
        this.showNotification('Job saved successfully!', 'success');
        this.updateSaveButton(true);
      } else {
        throw new Error('Failed to save job');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      this.showNotification('Error saving job. Check if backend is running.', 'error');
    }
  }

  updateSaveButton(saved) {
    const button = document.querySelector('.job-tracker-save-btn');
    if (button) {
      button.innerHTML = saved ? '✅ Saved' : '💾 Save Job';
      button.disabled = saved;
    }
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `job-tracker-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getJobData') {
        sendResponse(this.extractJobData());
      }
    });
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new JobExtractor());
} else {
  new JobExtractor();
}
