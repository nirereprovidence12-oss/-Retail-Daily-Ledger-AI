# 🛒 Retail Daily Ledger AI
> **Intelligent POS, FIFO Spoilage Guard & AI Expense Engine for Micro-Retailers**

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline%20First-00875a.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#)
[![Built for Lusaka](https://img.shields.io/badge/Target-Micro--Retail%20%7C%20Zambia-orange.svg)](#)

---

## 📌 Problem Overview
In informal markets across Zambia (such as Kamwala and Soweto in Lusaka), micro-retailers face three critical financial leaks:
1. **Unseen Spoilage Losses:** Perishable items expire on shelves because stock rotation is managed manually or ignored.
2. **Tedious Bookkeeping:** Expense tracking requires tedious manual entry from physical paper receipts, leading to lost receipts and missing numbers.
3. **Connectivity Drops:** Cloud-only apps fail frequently during market network outages or power cuts.

---

## 💡 The Solution
**Retail Daily Ledger AI** is a mobile-first, offline-first Progressive Web App (PWA) built specifically for local market vendors and shop owners. It acts as an automated co-pilot that bridges AI-driven document scanning with strict **First-In, First-Out (FIFO)** inventory management.

---

## ✨ Key Features

* 📄 **AI Dual-Scan Engine:** Powered by the **Gemini 1.5 Flash API** (with resilient local offline fallback), vendors can scan supplier receipts or daily POS Z-Reports. The AI automatically parses totals, logs expenses, and **populates the FIFO inventory queue**.
* 🛡️ **FIFO Spoilage Guard:** Oldest stock batches are automatically prioritized for sale. Near-expiry warning banners notify vendors when to apply early clearance discounts to recover wholesale capital.
* ⚡ **Instant Counter POS Deductions:** Single-tap stock deductions (-1, -5) directly at the market counter.
* 🇿MW **Zambian Kwacha Quick-Ledger:** +50 ZMW, +100 ZMW, +500 ZMW, and +1000 ZMW entry buttons alongside **Voice Input Recognition** for fast daily sales logging.
* 🔒 **100% Offline-First Architecture:** Operates entirely using browser `localStorage` and client-side web APIs—ensuring zero downtime during connectivity drops.
* 📊 **Vault, CSV Export & WhatsApp Reporting:** Instant daily net profit calculations ($\text{Revenue} - \text{Expenses}$) with one-tap summary exports to WhatsApp or downloadable CSV reports.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
| :--- | :--- |
| **Frontend UI** | HTML5, CSS3, `Plus Jakarta Sans`, Lucide Icons |
| **PWA & Offline** | Web Application Manifest, Service Worker ready, `localStorage` state persistence |
| **AI Processing** | Gemini 1.5 Flash API (Multimodal Receipt & Z-Report OCR Parsing) |
| **Auth / Cloud** | Firebase Auth (Compat SDK with Guest Fallback) |
| **Reporting** | Web Speech API, Blob CSV Exporter, WhatsApp URI Bridge |

---

## 🚀 Quick Start & Installation

Because this project is built as a single-file zero-dependency PWA, setting it up takes seconds:

1. **Clone the Repository:**
   ```bash
   git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
   cd YOUR_REPO_NAME
