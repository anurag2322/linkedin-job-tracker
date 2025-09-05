# LinkedIn Job Tracker

A full-stack application to save and manage job applications from **LinkedIn**. The system consists of a **Chrome Extension** for seamless job capture and a **FastAPI + MongoDB backend** with a web dashboard for tracking and analyzing applications.

---

## ✨ Features

- 📌 **Chrome Extension** (Manifest V3) to capture job postings directly from LinkedIn.
- ⚡ **FastAPI backend** with **REST APIs** for storing, updating, and querying job applications.
- 🗄️ **MongoDB database** with async queries using Motor driver.
- 📊 **Web dashboard** to view, search, filter, and analyze saved applications.
- 🔄 **Real-time updates**: job deduplication, validation, and status management.
- ✅ Robust data extraction using **JSON-LD parsing** with DOM fallback.

---

## 🛠️ Tools & Technologies

- **Languages**: Python, JavaScript (ES6), HTML, CSS
- **Backend**: FastAPI, Pydantic, Uvicorn, Motor (MongoDB async driver)
- **Database**: MongoDB
- **Frontend/Dashboard**: HTML, CSS, JavaScript
- **Platform**: Chrome Extension (Manifest V3), Browser APIs

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/job-tracker.git
cd job-tracker
```

### 2. Backend Setup (FastAPI + MongoDB)
1. Start MongoDB locally:
   ```bash
   mongod --dbpath /usr/local/var/mongodb
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
4. Visit API docs at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Chrome Extension Setup
1. Open **Chrome → Extensions → Manage Extensions**.
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the `extension/` folder.
4. Pin the extension to the toolbar.

---

## 📂 Project Structure

```
job-tracker/
│── backend/
│   ├── main.py           # FastAPI app & routes
│   ├── requirements.txt  # Backend dependencies
│
│── extension/
│   ├── manifest.json     # Extension config
│   ├── background.js     # Service worker
│   ├── content-script.js # Job extraction logic
│   ├── popup.html        # Extension popup UI
│   ├── script.js         # Popup logic
│   ├── content-script.css
│
│── dashboard.html        # Web dashboard UI
│── README.md             # Project documentation
```

---

## 📊 Dashboard Preview

- Search and filter saved jobs
- Track application status
- View summary statistics (by status and platform)

---

## 🔮 Future Enhancements

- [ ] Support for **Naukri** and **Indeed** job postings
- [ ] Export saved jobs as CSV/Excel
- [ ] Deploy backend with **MongoDB Atlas** + cloud hosting
- [ ] Add authentication for secure job tracking

---

## 📜 License

This project is licensed under the MIT License.
