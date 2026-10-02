/**
 * PDF Upload Page Script
 * Implements Drag & Drop, File Validation, Progress Simulation, and Redirection.
 */

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('pdfFileInput');
  const browseBtn = document.getElementById('browseBtn');
  const progressCard = document.getElementById('progressCard');
  const progressBarFill = document.getElementById('progressBarFill');
  const progressPercentText = document.getElementById('progressPercentText');
  const progressStatusText = document.getElementById('progressStatusText');
  const fileNameText = document.getElementById('fileNameText');
  const fileSizeDisplay = document.getElementById('fileSizeDisplay');
  const errorBanner = document.getElementById('errorBanner');
  const errorText = document.getElementById('errorText');
  const themeToggle = document.getElementById('themeToggle');

  let uploadInterval = null;
  let activeXhr = null;

  // ==========================================
  // Theme Switching Event Listener
  // ==========================================
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark-mode');
      if (isDark) {
        document.documentElement.classList.remove('dark-mode');
        document.documentElement.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
      }
    });
  }

  // ==========================================
  // Event Listeners for Browsing
  // ==========================================

  if (dropZone && fileInput) {
    // Click on dropzone or browse button opens file dialog
    dropZone.addEventListener('click', (e) => {
      // Avoid double triggering if the click is on the browse button itself
      if (e.target !== fileInput) {
        fileInput.click();
      }
    });

    // Handle keyboard accessibility (Enter / Space keys)
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        fileInput.click();
      }
    });

    // Add focus styles for keyboard navigation
    dropZone.addEventListener('focus', () => {
      dropZone.classList.add('focus');
    });

    dropZone.addEventListener('blur', () => {
      dropZone.classList.remove('focus');
    });
  }

  if (fileInput) {
    // Handle file input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelection(fileInput.files[0]);
      }
    });
  }

  // ==========================================
  // Drag & Drop Event Listeners
  // ==========================================
  
  if (dropZone && fileInput) {
    // Prevent defaults for all drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Toggle active styling when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('dragover');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('dragover');
      }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      
      if (files.length > 0) {
        // Set to input files and trigger upload handler
        fileInput.files = files;
        handleFileSelection(files[0]);
      }
    });
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // ==========================================
  // File Validation & Upload Simulation
  // ==========================================

  /**
   * Validates and displays info for the selected PDF file
   * @param {File} file 
   */
  function handleFileSelection(file) {
    // Clear any active uploads & error messages
    if (activeXhr) {
      activeXhr.abort();
    }
    hideError();

    // 1. Validation: File extension or type must be PDF
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      showError('Please upload a valid PDF document (.pdf file only).');
      hideProgress();
      return;
    }

    // 2. Validation: Maximum file size 100MB (100 * 1024 * 1024 bytes)
    const maxSizeBytes = 100 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      showError('File exceeds the 100 MB limit. Please select a smaller PDF.');
      hideProgress();
      return;
    }

    // Display File Details in Progress Box
    if (fileNameText) {
      fileNameText.textContent = file.name;
    }
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    if (fileNameDisplay) {
      fileNameDisplay.title = file.name; // Full name tooltip
    }
    if (fileSizeDisplay) {
      fileSizeDisplay.textContent = formatBytes(file.size);
    }

    // Start upload to Flask backend
    uploadPDFFile(file);
  }

  /**
   * Uploads the PDF file to the Flask backend and handles progress & state updates
   * @param {File} file 
   */
  function uploadPDFFile(file) {
    showProgress();
    
    if (progressBarFill) {
      progressBarFill.style.width = '0%';
      progressBarFill.classList.remove('complete');
      progressBarFill.setAttribute('aria-valuenow', '0');
    }
    if (progressStatusText) {
      progressStatusText.classList.remove('complete');
      progressStatusText.textContent = 'Uploading...';
    }
    if (progressPercentText) {
      progressPercentText.textContent = '0%';
    }

    const formData = new FormData();
    formData.append('file', file);

    activeXhr = new XMLHttpRequest();

    // Track upload progress in real-time
    activeXhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        
        if (progressBarFill) {
          progressBarFill.style.width = `${Math.round(percent)}%`;
          progressBarFill.setAttribute('aria-valuenow', Math.round(percent));
        }
        if (progressPercentText) {
          progressPercentText.textContent = `${Math.round(percent)}%`;
        }
      }
    });

    // Handle load/complete event
    activeXhr.addEventListener('load', () => {
      let response = {};
      try {
        response = JSON.parse(activeXhr.responseText);
      } catch (err) {
        response = { success: false, message: 'Server returned an invalid response.' };
      }

      if (activeXhr.status === 200 && response.success) {
        // Save upload metadata for use on welcome.html
        localStorage.setItem('uploaded_pdf_metadata', JSON.stringify(response.data));
        handleUploadSuccess();
      } else {
        const errorMsg = response.message || 'An error occurred during upload.';
        showError(errorMsg);
        hideProgress();
      }
      activeXhr = null;
    });

    // Handle upload connection error
    activeXhr.addEventListener('error', () => {
      showError('Connection to the upload server failed.');
      hideProgress();
      activeXhr = null;
    });

    // Handle upload abort event
    activeXhr.addEventListener('abort', () => {
      activeXhr = null;
    });

    // Send request to local Flask backend
    activeXhr.open('POST', 'http://127.0.0.1:5000/api/upload');
    activeXhr.send(formData);
  }

  /**
   * Triggers success UI states and initiates redirection page transition
   */
  function handleUploadSuccess() {
    if (progressStatusText) {
      progressStatusText.textContent = 'Upload Complete';
      progressStatusText.classList.add('complete');
    }
    if (progressBarFill) {
      progressBarFill.classList.add('complete');
    }

    // Wait 1 second before automatic redirection
    setTimeout(() => {
      // Relative path navigation so it runs smoothly from local file systems
      window.location.href = 'welcome.html';
    }, 1000);
  }

  // ==========================================
  // Helper Utilities
  // ==========================================

  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function showError(msg) {
    if (errorText) {
      errorText.textContent = msg;
    }
    if (errorBanner) {
      errorBanner.classList.add('active');
    }
  }

  function hideError() {
    if (errorBanner) {
      errorBanner.classList.remove('active');
    }
  }

  function showProgress() {
    if (progressCard) {
      progressCard.classList.add('active');
    }
  }

  function hideProgress() {
    if (progressCard) {
      progressCard.classList.remove('active');
    }
  }
});

