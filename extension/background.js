// Background script for Job Tracker extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Tracker extension installed');
  
  // Create context menu for saving jobs
  chrome.contextMenus.create({
    id: 'save-job',
    title: 'Save Job to Tracker',
    contexts: ['page'],
    documentUrlPatterns: [
      'https://www.linkedin.com/jobs/*',
      'https://www.naukri.com/*',
      'https://indeed.com/*',
      'https://*.indeed.com/*'
    ]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-job') {
    // Send message to content script to save job
    chrome.tabs.sendMessage(tab.id, { action: 'saveJob' });
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openDashboard') {
    // Open dashboard in new tab (if we had a separate dashboard page)
    chrome.tabs.create({ url: 'dashboard.html' });
  }
});

// Badge management
chrome.storage.local.get(['savedJobsCount'], (result) => {
  const count = result.savedJobsCount || 0;
  updateBadge(count);
});

function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}