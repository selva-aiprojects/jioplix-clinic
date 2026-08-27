# Receptionist's Guide — Jioplix Clinic OS

You run the front desk: patients register, appointment, check-in, get a token, and reach the right doctor. You also capture vitals for each consultation.

Quick facts:

- **Login**: https://jioplix-clinic.vercel.app — pick your clinic, enter your mobile number and password.
- **Your permissions**: manage appointments (book, check-in, complete, no-show, cancel), view patients, add a patient if needed, and **record vitals**. You do **not** edit clinical notes or prescriptions.
- **Critical rule**: for the doctor to see a patient, you must **Check In** the appointment (issues the token) and then the doctor clicks **Start Consultation** — or you hand it over from your screen.

---

## 1. Registering / finding a patient

Open **Patients** (`/patients`):

- Search by name/phone using the search box.
- If the patient doesn't exist, click **Add Patient** and fill name, phone, sex, and DOB.
- **ABDM/ABHA**: if the patient has an ABHA number, attach it from the **ABDM / ABHA** screen (optional, helps with digital records).

---

## 2. Booking an appointment

Open **Appointments** (`/appointments`):

1. Click **New Appointment**.
2. Select **Patient** (or create on the fly), the **Doctor**, **date & time**, visit type/source, and duration.
3. Save. The appointment appears as **Scheduled**.

Changing it: use **Reschedule** or **Cancel** actions on the appointment row.

---

## 3. Patient walk-in → token

The daily flow:

1. Patient arrives → find or add the patient.
2. Their appointment is **Scheduled** → press **Check In**. This sets **Checked In** and issues their **token number** (shown on the row).
3. Hand over the token verbally / via the queue screen. The doctor sees the patient in **Consultation**.

No appointment? Still create the appointment (walk-in source) and check them in — the system handles it.

> If a scheduled patient doesn't arrive, mark **No Show** at end of day so the doctor's list is accurate.

---

## 4. Vitals before the doctor

Once the consultation has started, the appointment row shows a **Record Vitals / Open Chart** button (it appears after the consultation is opened).

1. Click **Record Vitals** (or open the chart → Vitals tab).
2. Enter **BP, pulse, temperature, SpO₂, weight, height**.
3. Save — BMI is computed automatically and the values appear on the doctor's chart.

You can record vitals **once** per consultation; the doctor sees them as read-only.

---

## 5. Completing the visit

After the doctor signs the consultation:

1. In **Appointments**, press **Complete** on the visit.
2. Handle **Billing** (`/billing`) if your clinic collects payments at the desk.
3. If the doctor prescribed medicines, direct the patient to the **Pharmacy** with their prescription; for lab tests, direct to **Laboratory**.

---

## 6. Daily wrap-up

- Check **Appointments** for any remaining **Checked In** patients who haven't started/been complete — confirm with staff or mark appropriately.
- Mark **No Show** for missed appointments.
- Keep patient phone numbers correct; they're used for follow-up reminders and campaigns.

---

## 7. Common questions

| Question | Answer |
| --- | --- |
| Why can't I see the doctor's notes? | Clinical content is restricted to clinical roles. You see the visit status and vitals. |
| Why is "Record Vitals" only sometimes visible? | It appears after the consultation has started for that appointment (checked-in/chart-open state). |
| Patient called to book but doesn't know their number | Search the full name in **Patients** first. |
| A doctor is stuck on a patient | Check the patient is **Checked In** and the consultation was **started**; else the doctor may need to start it from **Appointments**. |

Still stuck? Use **Support** in the sidebar to file a ticket.