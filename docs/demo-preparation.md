# Jioplix Clinic OS — Demo Preparation Guide

Reference document for live demos, stakeholder walkthroughs, and investor presentations.
Keep this updated before every demo session.

---

## 1. Demo Environment Access

| Item | Value |
|---|---|
| Web App URL | `http://localhost:5173` (dev) or deployed URL |
| API Base URL | `http://localhost:3000/api/v1` (dev) |
| Platform Admin | `/admin` |
| Registration Page | `/register` |
| API Health Check | `GET /healthz` |
| API Ready Check | `GET /readyz` |

---

## 2. Pre-seeded Demo Tenants (Ready to Use)

All tenants are seeded via `npm run db -- seed-demo`. Use these for instant demos.

### 2a. Nova Children's Clinic (Pediatric) — PRIMARY DEMO

Best for general demos — most complete data set.

| Field | Value |
|---|---|
| Clinic Name | Nova Children's Clinic |
| Slug (Clinic ID) | `nova` |
| Clinic Type | Pediatric |
| Plan | Professional |
| Admin/Doctor | Dr. Priya Sharma |
| Phone | `9800000101` |
| Email | `admin@novaclinic.com` |
| Password | `demo1234` |
| Login URL | `http://localhost:5173/login` |

**What to show:**
- Dashboard with live metrics (patients, revenue, queue)
- Patient list with search
- Appointments with Day/Week calendar
- Clinical EMR (SOAP tabs, vitals charts, prescriptions)
- Pharmacy dispense queue
- Lab orders and sample pipeline
- Billing with GST invoices
- AI Scribe (Draft with AI)
- Onboarding wizard

---

### 2b. Sunrise Dental (Dental)

Good for specialty-themed demos.

| Field | Value |
|---|---|
| Clinic Name | Sunrise Dental |
| Slug (Clinic ID) | `sunrise` |
| Clinic Type | Dental |
| Plan | Starter |
| Admin/Doctor | Dr. Meera |
| Phone | `9800000101` |
| Email | `admin@sunrisedental.com` |
| Password | `demo1234` |
| Login URL | `http://localhost:5173/login` |

**What to show:**
- Dental specialty theming (blue sidebar accent)
- Starter plan limitations (no pharmacy/lab)
- Basic EMR workflow

---

### 2c. Apex Skin & Aesthetics (Dermatology)

Good for showing add-on modules and advanced billing.

| Field | Value |
|---|---|
| Clinic Name | Apex Skin & Aesthetics |
| Slug (Clinic ID) | `apex` |
| Clinic Type | Dermatology |
| Plan | Clinic |
| Admin/Doctor | Dr. Arjun |
| Phone | `9800000101` |
| Email | `admin@apexskin.com` |
| Password | `demo1234` |
| Login URL | `http://localhost:5173/login` |

**What to show:**
- Dermatology specialty theming (rose accents)
- Clinic plan with procedures module
- Multi-add-on modules active (pharmacy + lab + inventory + procedures)
- Advanced billing with GST

---

### 2d. MediCore General Hospital (Enterprise)

Good for showing enterprise features and multi-branch readiness.

| Field | Value |
|---|---|
| Clinic Name | MediCore General Hospital |
| Slug (Clinic ID) | `medicore` |
| Clinic Type | General |
| Plan | Enterprise |
| Admin/Doctor | Dr. Vikram |
| Phone | `9800000101` |
| Email | `admin@medicore.com` |
| Password | `demo1234` |
| Login URL | `http://localhost:5173/login` |

**What to show:**
- Full module set (all add-ons enabled)
- Largest patient/appointment dataset
- Analytics with rich charts
- Inventory with multiple categories
- Campaign builder and engagement tools

---

## 3. Sample New Tenant — Registration Demo

Use these details when demonstrating the self-registration flow live.

### Option A: General Practice (Quick Demo)

| Field | Value |
|---|---|
| Clinic Name | HealthFirst Clinic |
| Clinic ID (slug) | `healthfirst` |
| Clinic Type | General Practice |
| Plan | Professional |
| Admin Name | Dr. Rahul Verma |
| Phone | `+91 98765 43210` |
| Email | `rahul@healthfirst.in` |
| Password | `Secure@123` |

### Option B: Dental Clinic (Specialty Demo)

| Field | Value |
|---|---|
| Clinic Name | BrightSmile Dental Care |
| Clinic ID (slug) | `brightsmile` |
| Clinic Type | Dental |
| Plan | Starter |
| Admin Name | Dr. Ananya Iyer |
| Phone | `+91 87654 32109` |
| Email | `ananya@brightsmile.in` |
| Password | `Demo@2026` |

### Option C: Pediatric Clinic (Growing Practice)

| Field | Value |
|---|---|
| Clinic Name | Little Stars Pediatrics |
| Clinic ID (slug) | `littlestars` |
| Clinic Type | Pediatrics |
| Plan | Clinic |
| Admin Name | Dr. Sneha Reddy |
| Phone | `+91 76543 21098` |
| Email | `sneha@littlestars.in` |
| Password | `Kids@2026` |

### Option D: Dermatology Clinic (Premium)

| Field | Value |
|---|---|
| Clinic Name | Glow Dermatology |
| Clinic ID (slug) | `glowderma` |
| Clinic Type | Dermatology |
| Plan | Professional |
| Admin Name | Dr. Karthik Menon |
| Phone | `+91 65432 10987` |
| Email | `karthik@glowderma.in` |
| Password | `Glow@2026` |

---

## 4. Demo Flow — Step-by-Step Script

### Flow A: Quick Tour (10 minutes)

1. **Login** as `nova` / `9800000101` / `demo1234`
2. **Dashboard** — show live metrics, queue, financial summary, AI insights
3. **Patients** — search patients, open a profile, show vitals trend chart
4. **Appointments** — show Day view calendar, doctor filter pills
5. **Consultation** — open an encounter, show SOAP tabs, vitals, AI Pre-Consult Summary
6. **Pharmacy** — show dispense queue, drug master autocomplete
7. **Lab** — show order pipeline, result entry with H/L flags
8. **Billing** — create invoice, show GST breakdown
9. **Analytics** — show revenue charts, period selector
10. **Logout**

### Flow B: Registration + Onboarding (15 minutes)

1. Go to `/register`
2. Fill **Clinic Details** (use Option A from Section 3)
3. Fill **Admin Account**
4. Select **Professional Plan** — click "Start free trial"
5. Show the **success screen** with credentials
6. Click "Go to login" → log in with new credentials
7. Walk through the **Onboarding Wizard** (6 steps)
8. Show the **Dashboard** — empty state with getting-started prompts

### Flow C: Platform Admin (10 minutes)

1. Go to `/admin`
2. Login: `admin@jioplix.com` / `admin1234`
3. Show **Dashboard stats** (total clinics, active, suspended, revenue)
4. Show **Tenant Table** with plan, subscription status, actions
5. Demo **Suspend** → confirm status changes to "suspended"
6. Demo **Reactivate** → confirm status restores to "active"
7. Show **Pay Link** button for suspended tenants

### Flow D: Specialty Themes (5 minutes each)

1. Login as `sunrise` → show Dental blue theme
2. Login as `nova` → show Pediatric green theme
3. Login as `apex` → show Dermatology rose theme
4. Login as `medicore` → show General with all modules

---

## 5. Demo Data Seeded Per Tenant

Each tenant schema gets the following data via `seed-demo`:

### Users
- 1 Admin/Doctor (login user)
- 2 additional doctors
- 1 receptionist
- 1 pharmacist
- 1 lab technician

### Patients
- 15–20 patients with realistic Indian names
- Mix of genders, age groups, blood groups
- ABHA numbers for some patients

### Appointments
- 8–12 appointments for today and recent days
- Mix of statuses: scheduled, checked_in, in_progress, completed, no_show

### Queue Tokens
- 4–6 tokens for today's queue
- Mix of waiting, with_doctor, completed

### Clinical Data
- 5–8 encounters with SOAP notes
- Vitals records (BP, pulse, temperature, weight)
- 3–4 diagnoses per encounter (ICD-10 codes)
- 5–8 prescriptions with medication items

### Billing
- 8–12 invoices with line items
- Mix of paid, pending, partial statuses
- GST breakdowns (CGST + SGST)

### Inventory (Clinic/Enterprise plans)
- 20–30 stock items across categories
- Mix of medicines, consumables, lab reagents
- Some items low-stock or expiring soon

### Lab Orders (Professional/Clinic plans)
- 5–8 lab orders
- Mix of statuses: ordered, collected, processing, completed, reviewed
- Some with results and H/L flags

---

## 6. Platform Admin Access

| Field | Value |
|---|---|
| URL | `/admin` |
| Email | `admin@jioplix.com` |
| Password | `admin1234` |

**Features to demonstrate:**
- Login with email/password (not clinic slug)
- Dashboard with cross-tenant stats
- Tenant table with plan, status, subscription info
- Suspend/Reactivate actions
- Pay Link button (opens Razorpay)

---

## 7. Razorpay Payment Link

| Field | Value |
|---|---|
| Payment URL | `https://razorpay.me/@balakrishnanselvakumar` |
| Accepts | Cards, UPI, Net Banking, Wallets |
| Currency | INR |

**Where it appears:**
- Suspended page — primary "Pay now" CTA
- Platform Admin — "Pay Link" button for suspended tenants
- Landing page plans section — "Pay now via Razorpay" button
- Registration success screen — "Pay now via Razorpay (after trial)"

---

## 8. Common Demo Scenarios

### Scenario A: "Doctor starts consultation"
Login as `nova` → Appointments → Click "Start Consultation" on a checked-in patient → Consultation page opens with SOAP tabs → Add vitals → Add diagnosis → AI Draft → Issue prescription

### Scenario B: "Front desk registers patient"
Login as `nova` → Patients → Click "Add Patient" → Fill form → Save → MRN generated → Book appointment → Token auto-created

### Scenario C: "Pharmacist dispenses medication"
Login as `nova` → Pharmacy → Dispense Queue → Verify prescription → Dispense → Bill generated → Patient pays

### Scenario D: "Lab processes sample"
Login as `nova` → Laboratory → Select ordered test → Collect sample → Enter results → Mark reviewed

### Scenario E: "Admin manages clinic"
Login as `nova` → Dashboard → Check revenue → Analytics → Filter by date → Check inventory → Low stock alerts

---

## 9. Pre-Demo Checklist

- [ ] API server running (`npm run dev:api` in `apps/api`)
- [ ] Web dev server running (`npm run dev` in `apps/web`)
- [ ] Database accessible and migrations applied
- [ ] Demo data seeded (`npm run db -- seed-demo`)
- [ ] Verify `nova` tenant loads correctly
- [ ] Verify login works with demo credentials
- [ ] Check all pages load without console errors
- [ ] Platform admin accessible at `/admin`
- [ ] Registration page accessible at `/register`
- [ ] Razorpay payment link opens correctly

---

## 10. Troubleshooting

| Issue | Fix |
|---|---|
| Login fails with "TENANT_NOT_FOUND" | Ensure slug matches exactly (lowercase, no spaces) |
| Pages show empty data | Run `npm run db -- seed-demo` to re-seed |
| API returns 500 | Check API server logs, ensure DB is running |
| Styling looks off | Clear browser cache, hard refresh |
| Platform admin login fails | Default credentials: `admin@jioplix.com` / `admin1234` |
| Registration fails | Check API is running, ensure slug is unique |

---

*Last updated: 2026-08-26*
