# Doctor's Guide — Jioplix Clinic OS

Welcome. You record the clinical story of each patient: history, examination, diagnosis, prescription, and sign-off. Everything you enter stays in the patient's chart and is locked once you sign the consultation.

Quick facts:

- **Login**: https://jioplix-clinic.vercel.app — pick your clinic, enter your mobile number and password.
- **Your permissions**: you can view patients, appointments, and today's consultation queue; record full SOAP notes; add vitals if not already recorded; add diagnoses; create and issue prescriptions; run the AI scribe; and sign (lock) consultations.
- **Critical rule**: once you press **Sign & Close**, the encounter is locked for edits. Add everything you need first.

---

## 1. Where to find your patients

Two places:

1. **Dashboard** (`/dashboard`) — today's numbers: consultations, appointments, revenue, follow-ups due.
2. **Consultation** (`/consultation`) — the day's encounter picker. Sort by **Today / Open / Signed** tabs. Open encounters are the ones waiting for your clinical entry. Click a row to open the chart.

You can also reach an open chart from **Appointments → Start Consultation**, or after the receptionist checks a patient in.

---

## 2. Recording the consultation (SOAP)

Open the encounter chart (`/encounters/:id`). You'll see a progress tracker:

`Consultation → Vitals → Diagnosis → Prescription → Signed`

### Steps

1. **Chief Complaint** — the reason for visit in the patient's words.
2. **History of Present Illness (HPI)** — onset, duration, aggravating/relieving factors.
3. **Examination Findings** — your physical exam notes.
4. **Clinical Notes** — provisional assessment, plan.
5. **Follow-Up** — set a review date and note if needed.

> Use **Save Draft** as you go. Nothing is submitted to the record permanently until you sign — but drafts are saved so you (or a nurse/doctor on the same case) can continue later.

### Speedy entry

- **Historical record OCR** — upload a photo/PDF of an old prescription or record; the AI extracts text that you can review and paste.
- **AI Scribe (Copilot)** — generate a draft SOAP from the chief complaint with AI. Review before saving.

---

## 3. Vitals

If the receptionist/nurse hasn't recorded vitals, the **Vitals** tab has a **Record Vitals** form: BP (systolic/diastolic), pulse, temperature, SpO₂, weight, height. BMI is computed for you. Once recorded, vitals show as read-only values — you don't re-enter them.

---

## 4. Diagnosis

In the **Diagnosis** tab:

1. Pick the type — **Primary** (main reason), **Secondary**, or **Differential**.
2. Enter an ICD-10 **Code** and the **Name** (e.g. `J02.9` — Acute pharyngitis).
3. **Add**. The diagnosis appears on the chart immediately.

You can add more than one. Primary diagnosis is used in reports and billing.

---

## 5. Prescription

In the **Prescription** tab:

1. **Create** a new prescription (a draft is created for the patient).
2. **Add each drug**:
   - Drug name, generic, strength, form, dosage, frequency, duration, instructions.
   - Or tap a **template** at the top of the form — the common meds list (paracetamol, amlodipine, metformin, etc.) pre-fills for you. Start typing the complaint keyword and the suggested drugs appear.
3. The draft stays editable until you **Issue** it.
4. **Issue Prescription** — makes it active so the pharmacy counter can dispense it. The prescription is also **printable** (Hindi/English).
5. When the pharmacist dispenses, the status updates to **Dispensed** automatically on this page.

> The status of the current prescription shows as a badge: `draft → issued → dispensed`.

---

## 6. Signing (completing) a consultation

When the consultation is complete:

- Press **Sign & Close**.
- This **locks the encounter**: no further SOAP edits, vitals, diagnoses, or prescription changes are possible.
- A signed encounter is reflected on the picker under **Signed** and in the patient's history.

> After signing you or the pharmacy can still **dispense** an already-issued prescription (that's a pharmacy action, not an edit to the clinical record).

---

## 7. Suggested flow for a busy OPD

1. Check the **Consultation** page → **Open** tab.
2. Open the next patient.
3. Vitals (if empty) → record them.
4. Write SOAP → Save Draft.
5. Add diagnosis.
6. Create prescription → add drugs → Issue.
7. **Sign & Close**.

Total per patient: ~2–3 minutes with the AI scribe and templates.

---

## 8. Where your data goes

- **Patient history**: every signed consultation is in the patient's profile (`/patients/:id`) — diagnoses, prescriptions, vitals, past notes.
- **Audit**: each note/vitals/diagnosis records who entered it and when (shown in timestamps / lock info).
- **Analytics** (`/analytics`): revenue and consultation trends use your signed encounters.

---

## 9. Troubleshooting

| Symptom | What to do |
| --- | --- |
| Fields greyed out | The encounter is already **signed** (locked) — it can't be edited. Open a new consultation for the next visit. |
| "Save Draft" not available | Only someone with clinical edit rights can edit SOAP. If you cannot, your role may be a viewer (contact admin). |
| Can't add vitals/diagnosis after signing | Expected — the record is locked. |
| Patient not in the picker | Verify they were checked in by reception and that **Start Consultation** was clicked. |
| Forgot password | Use **Forgot Password** on the login page (link sent to your registered email). |

Still stuck? Open **Support** from the sidebar and file a ticket — it reaches the platform team.