# 🛡️ Safe QR Scanner

> A fast, secure, and privacy-first QR code scanner that checks extracted URLs against the VirusTotal database to protect users from phishing and malware. 
> 
> *Built as part of my "12 Projects in 12 Months" challenge.*

## ✨ Features

* **📸 Live Camera Scanning:** Instantly scan QR codes using your device's camera (optimized for mobile rear cameras).
* **🖼️ Drag & Drop / Paste:** Easily drag an image, click to upload, or simply press `Ctrl+V` to scan a QR code from anywhere.
* **🦠 Real-time Malware Check:** Integrates with the VirusTotal API to verify if the decoded URL is malicious, phishing, or safe.
* **🔒 Privacy First:** Images are processed 100% locally in your browser. We never upload your photos to any server.
* **🌐 Bilingual:** Seamlessly switch between English and Spanish.

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router), React, Tailwind CSS, TypeScript
* **QR Engine:** `html5-qrcode` and `qr-scanner`
* **Backend (API Route):** Next.js Serverless Functions
* **Security:** VirusTotal API v3
* **QA / Testing:** Playwright

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites
* Node.js installed (v18 or higher recommended)
* A free API Key from [VirusTotal](https://www.virustotal.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/YOUR_USERNAME/safe-qr-scanner.git](https://github.com/YOUR_USERNAME/safe-qr-scanner.git)
   cd safe-qr-scanner
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env.local` file in the root directory and add your VirusTotal API key:

   ```bash
   VIRUSTOTAL_API_KEY=your_virustotal_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 with your browser to see the app.

##  🧪 Automated Testing (QA)
This project uses Playwright for End-to-End (E2E) testing to ensure the QR scanner and the security UI behave correctly under different scenarios.

### The Dataset
To test the application's robustness, I used the "Benign and Malicious QR codes" dataset from Kaggle, which contains 200,000 real-world QR codes (100k safe, 100k malicious).

⚠️ Why isn't the dataset in this repository?
The dataset contains actual malicious QR codes pointing to real phishing and malware sites. To comply with GitHub's Terms of Service and prevent the repository from being flagged as a security threat, the dataset is intentionally .gitignored.

How the tests work
Instead of running 200k images and depleting the VirusTotal API quota, the testing suite uses a smart sampling and mocking approach:

Random Sampling: The script dynamically picks a random subset of images (e.g., 5 benign and 5 malicious) from a local dataset folder (e2e/test-dataset).

API Mocking: Playwright intercepts the /api/check-url network requests. Based on the file name, it mocks VirusTotal's response to simulate either a safe (safe) or dangerous (danger) environment without making actual API calls.

UI Assertion: It automatically uploads the images via a hidden input and asserts that the UI correctly displays the Green (Safe) or Red (Danger) states.

### Running the tests locally
(Note: You must download the Kaggle dataset locally and place it in e2e/test-dataset/QRcodes/ to run these tests).

```bash
# Run the automated tests
npx playwright test

# View the detailed HTML report
npx playwright show-report
````

## 📄 License
This project is open-source and available under the MIT License.
Disclaimer: This tool is for informational purposes. The creator is not liable for any damage caused by accessing malicious links.