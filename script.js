class FileManager {
  constructor() {
    // Reference DOM elements for file upload
    this.uploadArea = document.getElementById("upload-area");
    this.fileInput = document.getElementById("file-input");
    this.progressContainer = document.getElementById("upload-progress");
    this.progressFill = document.querySelector(".progress-fill");
    this.progressText = document.querySelector(".progress-text");
    this.fileList = document.getElementById("file-list");

    this.files = []; // Store uploaded files
    this.initializeEventListeners(); // Set up event handlers
  }

  initializeEventListeners() {
    // Open file dialog when user clicks the upload area
    this.uploadArea.addEventListener("click", () => {
      this.fileInput.click();
    });

    // Handle file selection from the input
    this.fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });

    // Drag over the area – highlight the drop zone
    this.uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.uploadArea.classList.add("dragover");
    });

    // Remove highlight when dragging leaves
    this.uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove("dragover");
    });

    // Handle files dropped onto the area
    this.uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(fileList) {
    const validFiles = Array.from(fileList).filter((file) => {
      // Reject files larger than 100MB
      if (file.size > 100 * 1024 * 1024) {
        alert(`${file.name} is too large. Maximum size is 100MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      this.uploadFiles(validFiles);
    }
  }

  async uploadFiles(files) {
    this.showProgress();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.uploadSingleFile(file, i + 1, files.length);
    }

    this.hideProgress();
  }

  async uploadSingleFile(file, current, total) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          // Add file to list once upload is done
          this.addFileToList(file);
          resolve();
        }

        const overallProgress =
          ((current - 1) / total) * 100 + progress / total;
        this.updateProgress(
          overallProgress,
          `Uploading ${current} of ${total}...`
        );
      }, 200);
    });
  }

  addFileToList(file) {
    const fileCard = document.createElement("div");
    fileCard.className = "file-card";

    const fileIcon = this.getFileIcon(file.type);
    const fileSize = this.formatFileSize(file.size);

    fileCard.innerHTML = `
      <div class="file-info">
        <div class="file-icon">${fileIcon}</div>
        <h4>${file.name}</h4>
        <p>${fileSize} • ${new Date().toLocaleDateString()}</p>
      </div>
      <div class="file-actions">
        <button class="btn-delete" onclick="fileManager.deleteFile('${
          file.name
        }')">Delete</button>
      </div>
    `;

    this.fileList.appendChild(fileCard);
    this.files.push(file);
  }

  deleteFile(fileName) {
    this.files = this.files.filter((f) => f.name !== fileName);
    this.fileList.innerHTML = "";
    this.files.forEach((f) => this.addFileToList(f));
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
      return "📊";
    return "📁";
  }

  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  showProgress() {
    this.progressContainer.classList.remove("hidden");
  }

  hideProgress() {
    setTimeout(() => {
      this.progressContainer.classList.add("hidden");
      this.updateProgress(0, "Upload complete!");
    }, 1000);
  }

  updateProgress(percent, text) {
    this.progressFill.style.width = percent + "%";
    this.progressText.textContent = text;
  }
}

// Extend the basic FileManager class to add cloud storage functionality using Filestack
class EnhancedFileManager extends FileManager {
  constructor() {
    super(); // Call the parent class constructor
    this.client = filestack.init("YOUR_API_KEY"); // Initialize Filestack with your API key
    this.picker = null; // Placeholder for the Filestack picker instance
    this.implementSearch();
  }

  initializeEventListeners() {
    super.initializeEventListeners(); // Set up existing file selection and drag-drop listeners

    // Add a new button for accessing cloud storage through Filestack
    this.addFilestackButton();
  }

  addFilestackButton() {
    const button = document.createElement("button");
    button.textContent = "Browse Cloud Storage"; // Button label
    button.className = "filestack-btn"; // Apply styling

    // Open the Filestack picker when the button is clicked
    button.onclick = (e) => {
      e.stopPropagation(); // Prevent triggering other events
      this.openFilestack();
    };

    // Add the button to the upload area
    this.uploadArea.appendChild(button);
  }

  openFilestack() {
    const options = {
      accept: ["image/*", "video/*", "application/pdf", ".doc", ".docx"], // Allowed file types
      maxFiles: 10, // Limit number of files selectable at once
      uploadInBackground: false, // Upload immediately instead of in background
      onUploadDone: (result) => {
        // Add each uploaded file to the file list
        result.filesUploaded.forEach((file) => {
          this.addCloudFileToList(file);
        });
      },
    };

    // Open the Filestack file picker with the above options
    this.client.picker(options).open();
  }

  addCloudFileToList(file) {
    const fileCard = document.createElement("div");
    fileCard.className = "file-card cloud-file"; // Styling for cloud files
    const preview = this.generatePreview(file);

    fileCard.innerHTML = `
            <div class="file-info">
                <div class="file-icon">☁️</div>
                <h4>${file.filename}</h4>
                <p>${this.formatFileSize(file.size)} • Cloud Storage</p>
                ${preview}
            </div>
            <div class="file-actions">
                <button class="btn-view" onclick="window.open('${
                  file.url
                }', '_blank')">View</button>
                <button class="btn-share" onclick="navigator.clipboard.writeText('${
                  file.url
                }')">Copy Link</button>
            </div>
        `;

    this.fileList.appendChild(fileCard); // Add to the file list
  }

  async uploadSingleFile(file, current, total) {
    try {
      // Upload file using Filestack and track progress
      const fileHandle = await this.client.upload(file, {
        onProgress: (evt) => {
          const progress = (evt.loaded / evt.total) * 100;
          const overallProgress =
            ((current - 1) / total) * 100 + progress / total;
          this.updateProgress(
            overallProgress,
            `Uploading ${current} of ${total}...`
          );
        },
      });

      // Once uploaded, add the file to the list view
      this.addCloudFileToList({
        filename: file.name,
        size: file.size,
        url: fileHandle.url,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Failed to upload ${file.name}. Please try again.`);
    }
  }

  generatePreview(file) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      return `<img src="${file.url}" alt="Preview" 
              class="file-preview" 
              onclick="window.open('${file.url}', '_blank')" />`;
    } else if (file.mimetype === "application/pdf") {
      return `<iframe src="${file.url}" class="file-preview" height="150"></iframe>`;
    }
    return "";
  }

  implementSearch() {
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search files...";
    searchInput.className = "search-input";

    this.uploadArea.insertAdjacentElement("beforebegin", searchInput);

    searchInput.addEventListener("input", (e) => {
      this.filterFiles(e.target.value);
    });
  }

  filterFiles(query) {
    const fileCards = this.fileList.querySelectorAll(".file-card");
    fileCards.forEach((card) => {
      const fileName = card.querySelector("h4").textContent.toLowerCase();
      card.style.display = fileName.includes(query.toLowerCase())
        ? "flex"
        : "none";
    });
  }
}

// Instantiate the EnhancedFileManager to replace the default FileManager functionality
const fileManager = new EnhancedFileManager();
