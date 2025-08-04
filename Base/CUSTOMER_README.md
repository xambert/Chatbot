# Customer Chatbot Integration Guide

This guide explains how to embed and use the AI Chatbot on your website using the provided test page.

---

## 1. Prerequisites
- You must have received the chatbot test page (`customer-test.html`) and the chatbot backend URL (e.g., `http://localhost:3001/` or your production URL).
- No installation required; everything runs in your browser.

---

## 2. Steps to Use the Chatbot

### Step 1: Open the Test Page
- Double-click or open `customer-test.html` in your browser.
- You will see a demo page with a form to enter your name and email.

### Step 2: Enter Your Details
- Fill in your name and email address.
- Click **Start Chat**.
- The chat icon will appear at the bottom right of the page.

### Step 3: Start a Chat Session
- Click the chat icon (💬) to open the chatbot popup.
- The chatbot will load and you can start chatting.
- You can close the chatbot popup by clicking the **×** button or clicking outside the popup.

---

## 3. Customization & Embedding
- To embed the chatbot on your own website, copy the iframe code below and update the `src` URL to your chatbot backend:

```html
<iframe src="http://YOUR_CHATBOT_URL/" width="400" height="600" style="border:0;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.10);"></iframe>
```
- You can style the chat icon and popup as needed.
- For advanced integration (passing user details, customizing UI), contact your chatbot provider.

---

## 4. Troubleshooting
- If the chatbot does not load, ensure your backend URL is correct and accessible.
- For local testing, make sure the backend server is running.
- If you see errors, refresh the page or contact support.

---

## 5. Support
- For help or custom integration, contact your chatbot provider or support team.
