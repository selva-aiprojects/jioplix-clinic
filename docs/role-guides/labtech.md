# Lab Technician's Guide — Jioplix Clinic OS

You run samples from order to reviewed results. The laboratory screen tracks every order so nothing is lost between the doctor's request, sample collection, processing, and result review.

Quick facts:

- **Login**: https://jioplix-clinic.vercel.app — pick your clinic, enter your mobile number and password.
- **Permissions**: view and update lab orders, record sample progress, enter results, and (where enabled) review.
- **Critical rule**: an order moves through fixed states — **Ordered → Collected → Processing → Completed → Reviewed**. Pressing the right button at the right step keeps the doctor's screen accurate.

---

## 1. Opening the lab

From the sidebar open **Laboratory** (`/laboratory`). The top shows live counters:

**Orders Today · Samples Pending · Processing · Awaiting Review · Reviewed Today · Open Queue**

---

## 2. Order states and your actions

| State | Meaning | Your action |
| --- | --- | --- |
| **Ordered** | Doctor requested the test | Press **Collect Sample** once the sample is drawn. |
| **Collected** | Sample taken | Press **Start Processing** to begin the machine/bench work. |
| **Processing** | Work in progress | Record test values; press **Enter Results** when done. |
| **Completed** | Results entered, awaiting review | Press **View Results** then approve/review to close. |
| **Reviewed** | Results final | Visible to the doctor; no further action. |
| **Cancelled** | Test voided | No action taken. |

Work the **Open Queue** first: it's orders not yet collected.

---

## 3. Entering results

1. On a **Processing** order, choose **Enter Results**.
2. Enter each analyte/parameter and save.
3. The order moves to **Completed** and is flagged **Awaiting Review**.

If your clinic has a reviewer step, the person reviewing presses **Review** after checking the values; the doctor then sees the result as final.

---

## 4. Day-to-day hygiene

- Enter results promptly — doctors rely on the **Awaiting Review** list for decisions.
- Search/filter by patient, date, or test name to find an order quickly.
- Don't leave orders in **Collected/Processing** past the shift; reconcile your bench work with the open list before you leave.

---

## 5. Common questions

| Question | Answer |
| --- | --- |
| No lab tests for a patient? | The doctor must create a lab order from the consultation. Orders appear in your **Open Queue** automatically. |
| I entered a wrong value | Only the reviewer/clinician can edit final results. Enter the correct value during the **Processing** step before marking complete. |
| Order should never have been created | Mark **Cancel** on the order (or ask the doctor to cancel it). |
| Where do results appear for the doctor? | On the patient's chart / consultation page once **Reviewed**. |

Still stuck? Use **Support** in the sidebar to file a ticket.