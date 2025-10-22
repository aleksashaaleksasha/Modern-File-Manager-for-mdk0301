 class FileManager {
  constructor() {
    // референсы DOM элементов для загрузки файлов
    this.uploadArea = document.getElementById("upload-area");
    this.fileInput = document.getElementById("file-input");
    this.progressContainer = document.getElementById("upload-progress");
    this.progressFill = document.querySelector(".progress-fill");
    this.progressText = document.querySelector(".progress-text");
    this.fileList = document.getElementById("file-list");

    this.files = []; // здесь хранятся файлы, которые пользователь загрузит
    this.initializeEventListeners(); // инициализирует обработчики событий
  }

  initializeEventListeners() {
    // открывает диалог с файлами когда пользователь нажимает на область загрузки
    this.uploadArea.addEventListener("click", () => {
      this.fileInput.click();
    });

    // обработка выбранных файлов, которые выбраны в диалоге с файлами
    this.fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });

    // если пользователь переносит файлы, то область загрузки подсвечивается
    this.uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.uploadArea.classList.add("dragover");
    });

    // убирает подсвечивание области загрзуки
    this.uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove("dragover");
    });

    // обработка выбранных файлов, но уже тех которые перенесли
    this.uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      this.uploadArea.classList.remove("dragover");
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(fileList) {
    const validFiles = Array.from(fileList).filter((file) => {
      // не принимает файлы больше чем 100 МБ
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

  // загружает файлы по очереди и показывает прогресс
  async uploadFiles(files) {

    // показ прогресса
    this.showProgress();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await this.uploadSingleFile(file, i + 1, files.length);
    }

    //скрыть прогресс
    this.hideProgress();
  }

  // загрузка отдельного файла
  async uploadSingleFile(file, current, total) {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          // добавляет DOM карточку файла в список и сохраняет в this.files
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

   // добавляет DOM карточку файла в список и сохраняет в this.files
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

   // удаляет файл из массива и обновляет интерфейс
  deleteFile(fileName) {
    this.files = this.files.filter((f) => f.name !== fileName);
    this.fileList.innerHTML = "";
    this.files.forEach((f) => this.addFileToList(f));
  }

  // возвращает икноку в зависимости от типа файла
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


   // преобразует байты в читаемый формат ["Bytes", "KB", "MB", "GB"]
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // показывает прогресс
  showProgress() {
    this.progressContainer.classList.remove("hidden");
  }

  //после задержки скрывает прогресс
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

// наследует класс FileManager и добавляет интеграцию в Filestack для облачного хранилища
class EnhancedFileManager extends FileManager {
  constructor() {
    super();
    this.client = filestack.init("YOUR_API_KEY"); // ключ API Filestack вставить нужно
    this.picker = null;
    this.implementSearch(); // добавляет поле поиска над зоной загрузки и фильтрует карточки
  }

  // инициализирует обработчики событий
  initializeEventListeners() {
    super.initializeEventListeners();

    // добавляется новая кнопка для получения доступа к облачному хранилищу Filestack
    this.addFilestackButton();
  }

  // создает кнопку для открытия Filestack
  addFilestackButton() {
    const button = document.createElement("button");
    button.textContent = "Browse Cloud Storage"; // название кнопки
    button.className = "filestack-btn"; // стиль для кнопки

    // открывает Filestack при нажатии на кнопку
    button.onclick = (e) => {
      e.stopPropagation(); // делает так, чтобы другие события не вызывались
      this.openFilestack();
    };

    // Add the button to the upload area
    this.uploadArea.appendChild(button);
  }

  //открывает Filestack
  openFilestack() {
    const options = {
      accept: ["image/*", "video/*", "application/pdf", ".doc", ".docx"], // допустимые типы файлов
      maxFiles: 10, // лимит файлов
      uploadInBackground: false, // загружает сразу
      onUploadDone: (result) => {
        // добавление файлов в лист после загрузки
        result.filesUploaded.forEach((file) => {
          this.addCloudFileToList(file);
        });
      },
    };

    // открывает Filestack picker с настройками выше
    this.client.picker(options).open();
  }

  addCloudFileToList(file) {
    const fileCard = document.createElement("div");
    fileCard.className = "file-card cloud-file"; // стиль
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

    this.fileList.appendChild(fileCard); // добавление файла в лист
  }

  async uploadSingleFile(file, current, total) {
    try {
      // загрузить файл используя Filestack и показывает прогресс
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

      // после загрузки добавляет в лист этот файл
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

  // генерирует превью если может
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

  //добавляет поле поиска над зоной загрузки и фильтрует карточки
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

// инициализация EnhancedFileManager для замены обычного Filemanager
const fileManager = new EnhancedFileManager();
