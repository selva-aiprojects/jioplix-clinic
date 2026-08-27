# Capture Guide — making screenshots & 2-minute training videos

Use this to produce the user-manual images/clips from the role guides in this folder. All capture is from the live web app.

---

## Tools

- **Windows**: `Win + Shift + S` — region screenshot; snip it straight into the guide. Or **Snipping Tool** for longer captures with timer.
- **Screen recording**: **Xbox Game Bar** (`Win + G`) or built-in **Snipping Tool → Record** mode for short clips.
- **Annotations**: draw arrows/numbers with Snip & Sketch or any image editor. Keep shapes simple and on-point.
- **Clips**: keep each between **45 and 120 seconds**. Record in **2x Real-time → slow in playback** if a flow is fast, then only the key seconds go into training.

---

## Login details (demo tenant `apex`)

| Role | Mobile | Password |
| --- | --- | --- |
| Doctor | +91 98000 00101 | demo1234 |
| Doctor (2nd) | +91 98000 00102 | demo1234 |
| Receptionist | +91 98000 00201 | demo1234 |
| Pharmacist | +91 98000 00202 | demo1234 |
| Lab Tech | +91 98000 00203 | demo1234 |
| Accountant | +91 98000 00204 | demo1234 |
| Patient | +91 98100 10001 (Ananya) | —(used as patient record only) |

Web app: https://jioplix-clinic.vercel.app
Login page asks for **Clinic** (enter `apex`), **Phone**, and **Password**.

> Block personal/real data in the shots you ship: use demo tenant `apex` only.

---

## Shot list (one flow per role guide)

### Receptionist — `receptionist.md`
1. **Appointments** list with a scheduled row.
2. **New Appointment** form filled.
3. Row after **Check In** — status `Checked In` + token number visible.
4. **Record Vitals** form with BP/pulse/temp filled.
5. Row after **Complete**.

### Doctor — `doctor.md`
1. **Consultation** picker — Today / Open / Signed tabs.
2. Open chart — **Progress tracker** (`Consultation → Vitals → Diagnosis → Prescription → Signed`).
3. **Record Vitals** (if empty).
4. SOAP fields filled (Chief Complaint, HPI, Examination, Clinical Notes) + **Save Draft**.
5. Diagnosis added (primary).
6. Prescription created + one drug row (use a **template** for speed).
7. **Issue Prescription** → badge shows `issued`.
8. **Sign & Close** → locked state shown.

### Pharmacist — `pharmacist.md`
1. **Pharmacy → Dispense Queue** with an issued prescription.
2. **Dispense All** pressed → status `Dispensed`, stock deducted (show Drug Master before/after).

### Lab Tech — `labtech.md`
1. **Laboratory** with a new order (status `ordered`).
2. Collect sample → `collected`; Start processing → `processing`.
3. **Enter Results** → `completed` → **Review** → `reviewed`.

### Clinic Admin — `admin.md`
1. **User Management** list + add-team-member dialog.
2. **Analytics** dashboard.
3. **Add-ons** screen.
4. **Support** ticket form.

---

## Recording tips

- **Close distracting tabs**: log out of personal email, mute notifications.
- **One action per clip**: a caption like "Check In" beats fifteen seconds of moving a mouse.
- **Use keyboard-first narration**: say what you're doing before you do it.
- **Highlight the click target**: circle or arrow the button you press during edits.
- **End each clip frozen** on the success state (badge, status chip) for 2 seconds.
- Prefer **web URL in the shot** (top-left) so trainees can follow along.

---

## Where the files live

- Keep raw clips and images in `docs/role-guides/assets/captures/` — nothing sensitive, demo data only.
- Reference them in the role guides as `assets/captures/<name>.png` (or `mp4`).
- Every capture must be taken before the machine goes into production with real patient data.