Product Requirements Document (PRD)
Jioplix — AI-Powered Clinic Operating System

Document Version: 4.0
Target Release: Q4 2026
Product Type: Multi-Tenant SaaS
Primary Market: India
Target Customers: Solo Doctors, Clinics, Specialty Clinics, Multi-Doctor Clinics and Clinic Chains
Product Status: Product Definition / Engineering Baseline

1. Executive Summary

Jioplix Clinic OS is a cloud-native, AI-powered operating system designed specifically for outpatient clinics and ambulatory healthcare practices.

Jioplix is being repositioned from a broad Hospital Management System into a clinic-first platform that simplifies the complete patient journey:

Book → Register → Check-In → Consult → Prescribe → Diagnose → Bill → Pay → Follow-Up

Unlike traditional HMS platforms that expose complex hospital workflows, Jioplix will provide a focused workspace for doctors, receptionists, clinic administrators and support staff.

The platform will combine:

Patient Management
Appointments & Queue
Clinical EMR
Digital Prescription
Billing & Payments
Patient CRM
WhatsApp / Communication
AI Clinical Copilot
ABDM / ABHA integration
Pharmacy
Laboratory
Inventory
Procedures
Specialty EMR
Analytics
Multi-location Management

Pharmacy, Laboratory, Inventory and Procedures will be optional add-ons, allowing a clinic to start with a simple core product and expand as its operational needs grow.

2. Product Vision

Make Jioplix the intelligent operating system for modern clinics in India.

Product Promise

Simple enough for a solo doctor.
Powerful enough for a growing clinic.
Intelligent enough to reduce administrative work.

Jioplix should allow a doctor to focus on patients while the platform manages the operational workflow around them.

3. Product Positioning

Jioplix should not primarily be positioned as:

Hospital Management Software
Generic EMR Software
Billing Software
Pharmacy Software

Instead:

Jioplix — AI-Powered Clinic Operating System
Supporting proposition

Run your entire clinic — patients, appointments, EMR, prescriptions, billing, pharmacy, laboratory, communication and follow-ups — from one intelligent platform.

4. Target Customer Segments
4.1 Solo Doctor

Typical characteristics:

1 doctor
1 clinic
Receptionist or assistant
Optional in-house pharmacy
Optional lab
Low operational complexity

Primary requirements:

Patient records
Appointment
Queue
EMR
Prescription
Billing
WhatsApp
Follow-up
4.2 Small / Growing Clinic

Typical characteristics:

2–10 doctors
Multiple reception users
Pharmacy and/or laboratory
Multiple consultation rooms

Requirements:

Multi-doctor management
Queue
EMR
Billing
Pharmacy
Laboratory
Inventory
Analytics
Role-based access
4.3 Specialty Clinic

Examples:

Dental
Pediatrics
Dermatology
Gynecology
General Medicine
Orthopedics
ENT
Ophthalmology
Physiotherapy
Cardiology
4.4 Multi-Branch Clinic

Requirements:

Multiple locations
Central administration
Branch-level operations
Central patient identity
Consolidated reporting
Doctor allocation
Central inventory
Cross-branch patient history
5. Product Principles
P1 — Doctor First

Minimize clinical documentation and administrative effort.

P2 — Patient Journey First

Organize the system around workflows rather than traditional HMS modules.

P3 — Modular

Clinics should only see and pay for capabilities they use.

P4 — AI as Copilot

AI assists doctors and staff but does not independently make clinical decisions.

P5 — India First

Support:

ABDM
ABHA
UPI
GST
WhatsApp
Indian healthcare workflows
P6 — Scalable

The same platform should support:

1 Doctor → 10 Doctors → 100+ Doctor Clinic Network

6. Product Architecture
                         JIOPLIX CLINIC OS
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
       CARE                  ENGAGEMENT                OPERATIONS
        │                         │                         │
   Patient EMR              WhatsApp                   Billing
   Consultation             Notifications              Payments
   Prescription              Patient CRM               Inventory
   Specialty EMR             Follow-up                 Pharmacy *
   AI Copilot                Patient Portal            Laboratory *
        │                         │                     Procedures *
        │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                           JIOPLIX AI LAYER
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
              AI Scribe       AI Summary       AI Insights
                 │                │                │
                 └────────────────┼────────────────┘
                                  │
                       PLATFORM SERVICES
                                  │
       ┌──────────┬─────────┬─────────┬─────────┬──────────┐
       │          │         │         │         │          │
    Tenant      RBAC      Audit     ABDM    Payments   Documents

* Optional Add-on

7. Product Packaging

Jioplix will use a Core + Add-on model.

7.1 Core Platform

Every Jioplix Clinic subscription includes:

Patient Management
Appointments
Queue
EMR
Consultation
Prescription
Billing
Payments
Basic Patient CRM
Notifications
Basic Analytics
AI capabilities based on plan
ABDM capabilities based on eligibility/integration
Security & Audit
7.2 Optional Add-ons
Clinical / Operational
Pharmacy
Laboratory
Inventory
Procedures
Advanced Billing
Advanced Analytics
Multi-Branch
Specialty
Dental
Pediatrics
Dermatology
Gynecology
Other configurable specialties
Intelligence
AI Scribe
AI Clinical Copilot
AI Patient Assistant
AI Receptionist
AI Analytics
8. Epic 1 — Clinic Command Center
Objective

Provide a single operational dashboard.

FR-1.1 Today's Metrics

Display:

Appointments
Checked-In
Waiting
In Consultation
Completed
Cancelled
Today's Revenue
Outstanding Payments
FR-1.2 Live Queue

Example:

Token   Patient          Time       Status


12      Ananya Sharma    11:00      Waiting
13      Rajesh Kumar     11:15      Consulting
14      Vikram Singh     11:30      Pharmacy
FR-1.3 Quick Actions
New Patient
Appointment
Start Consultation
New Bill
Payment
Lab Order
Pharmacy Sale

Available actions should be configurable based on enabled modules.

9. Epic 2 — Patient Management
Objective

Create a unified longitudinal patient record.

Requirements
Patient registration
Unique Patient ID
ABHA ID
Demographics
Contact information
Emergency contact
Allergies
Medical history
Family history
Previous consultations
Prescriptions
Lab reports
Documents
Images
Billing history
Follow-up history
Patient Timeline
20-Aug-2026
Consultation
Hypertension follow-up


18-Aug-2026
Laboratory
Lipid Profile


18-Aug-2026
Prescription
Medication issued


20-Jul-2026
Consultation
General Medicine

The patient timeline should be one of Jioplix's primary UX components.

10. Epic 3 — Appointment & Queue
Requirements
Doctor calendar
Availability
Appointment slots
Walk-ins
Token generation
Queue management
Check-in
Rescheduling
Cancellation
No-show
Waiting-time tracking
Doctor-wise queue
Room allocation
Future
Online booking
Website booking widget
WhatsApp booking
QR booking
Online prepayment
11. Epic 4 — Clinical EMR
Standard Consultation
Chief Complaint
HPI
Vitals
Examination
Diagnosis
Assessment
Treatment
Medication
Investigation
Clinical notes
Follow-up
Attachments
Consultation Workflow
Patient
   ↓
History
   ↓
Vitals
   ↓
AI Summary
   ↓
Consultation
   ↓
Diagnosis
   ↓
Prescription
   ↓
Lab / Pharmacy / Procedure
   ↓
Billing
   ↓
Follow-up
12. Epic 5 — AI Clinical Copilot

AI is a major differentiator for Jioplix.

FR-5.1 Pre-Consultation Summary

Example:

52F | Hypertension | Last visit 28 days ago | Previous BP elevated | Lipid profile pending

FR-5.2 AI Scribe

Optional audio/dictation capability.

AI converts consultation conversation into:

Chief Complaint
HPI
Examination
Assessment
Plan
Follow-up
Mandatory Safety Workflow
AI Draft
   ↓
Doctor Review
   ↓
Doctor Edit
   ↓
Doctor Approval
   ↓
Permanent Clinical Record

AI-generated information must never silently become a final clinical record.

FR-5.3 Patient-Friendly Summary

After doctor approval:

"You visited the clinic today for..."

Support multiple Indian languages.

FR-5.4 AI Operational Insights

Examples:

"18 patients are due for follow-up this week."

"Five appointments tomorrow have not been confirmed."

"Average waiting time increased 15% this month."

13. Epic 6 — Patient Engagement Hub

WhatsApp should be treated as a communication channel, not as the application's architecture.

Patient Journey
Appointment
     ↓
Confirmation
     ↓
Registration
     ↓
Check-In
     ↓
Consultation
     ↓
Prescription
     ↓
Payment
     ↓
Follow-up
Requirements
Appointment confirmation
Appointment reminder
Registration link
Queue notification
Prescription delivery
Invoice
Payment link
Lab notification
Follow-up reminder
Medication reminder
Feedback
14. Epic 7 — Billing & Payments
Requirements
Consultation billing
Service billing
GST invoice
Discounts
Refunds
Payment tracking
Cash
UPI
Card
Online payment
Outstanding balance
Daily collection
Doctor-wise revenue
Branch-wise revenue
Future
Membership
Health packages
Subscription plans
Insurance/TPA support where applicable
15. Epic 8 — Pharmacy Add-on
Objective

Enable clinics with an in-house pharmacy/dispensing counter to manage medicines directly from Jioplix.

Core Workflow
Doctor Consultation
       ↓
Prescription
       ↓
Pharmacy Queue
       ↓
Verify Prescription
       ↓
Dispense
       ↓
Stock Deduction
       ↓
Billing / Payment
       ↓
Receipt
Functional Requirements
Drug master
Brand / Generic
Strength
Dosage form
Batch
Expiry
Purchase price
Selling price
Supplier
Stock
Prescription-based dispensing
Partial dispensing
Returns
Stock adjustments
Low-stock alerts
Expiry alerts
Purchase entry
Pharmacy billing
Daily pharmacy sales
Important

Pharmacy must automatically consume inventory from the shared Inventory engine.

16. Epic 9 — Laboratory Add-on

Jioplix must support two laboratory models.

Model A — In-House Laboratory
Doctor
 ↓
Lab Order
 ↓
Sample Collection
 ↓
Processing
 ↓
Result Entry
 ↓
Doctor Review
 ↓
Patient Notification
Model B — External Laboratory
Doctor
 ↓
Lab Order
 ↓
External Laboratory
 ↓
Report Received
 ↓
PDF / Result Upload
 ↓
Patient Record
Requirements
Investigation Master
Investigation
Category
Sample Type
Units
Reference Range
Gender Range
Age Range
Price
Lab Order
Patient
Doctor
Investigation
Priority
Sample
Status
Sample Tracking
Ordered
 ↓
Sample Collected
 ↓
Processing
 ↓
Completed
 ↓
Reviewed
Result Management
Numeric results
Text results
Positive / Negative
Reference range
Abnormal flags
Report PDF
Doctor review
Patient notification
17. Epic 10 — Inventory Add-on

Inventory should be a shared platform service, not something embedded exclusively inside Pharmacy.

Inventory Categories
Medicines
Consumables
Lab reagents
Dental materials
Clinic supplies
Medical equipment
Requirements
Item master
Supplier
Purchase
Stock
Batch
Expiry
Stock adjustment
Stock transfer
Reorder level
Low-stock alerts
Consumption tracking

Architecture:

                     INVENTORY ENGINE
                           │
             ┌─────────────┼──────────────┐
             │             │              │
          Pharmacy        Lab           Clinic
           Drugs        Reagents      Consumables
18. Epic 11 — Procedures Add-on

Many outpatient clinics perform procedures.

Examples
Dressing
Injection
Nebulization
Vaccination
Minor procedures
Physiotherapy
Dental procedures
Health packages
Workflow
Doctor Orders Procedure
        ↓
Procedure Recorded
        ↓
Inventory Consumed
        ↓
Billing
        ↓
Payment
        ↓
Follow-up

This creates a powerful connection between Clinical → Operations → Inventory → Billing.

19. Epic 12 — Specialty EMR Engine

Instead of hard-coding every specialty into the platform, Jioplix will implement a configurable Specialty Engine.

Initial Specialty Templates
Dental
FDI tooth chart
Treatment plan
Procedures
X-ray
Dental history
Pediatrics
Growth charts
Vaccination
Development milestones
Pediatric history
Dermatology
Clinical images
Lesion tracking
Before/after
Treatment timeline
Gynecology
Menstrual history
Pregnancy
EDD
ANC
Obstetric history
Future

Specialty templates should be configurable without modifying the core platform.

20. Epic 13 — ABDM / ABHA
Requirements
ABHA linking
ABHA creation where supported
Consent management
Health record discovery
Health record sharing
ABDM-compatible records
Audit trail

All ABDM functionality must comply with the current applicable ABDM/NHA specifications, certification and consent requirements at implementation time.

ABDM workflows should remain as invisible as possible to the doctor.

21. Epic 14 — Multi-Tenant Architecture
                    JIOPLIX PLATFORM
                           │
        ┌──────────────────┼───────────────────┐
        │                  │                   │
      Tenant A           Tenant B           Tenant C
        │                  │                   │
    Clinic 1           Clinic 1             Branch 1
    Clinic 2                              Branch 2
Tenant Isolation

Strict isolation is required for:

Patients
Clinical records
Users
Billing
Pharmacy
Laboratory
Inventory
Documents
Analytics
Roles
Platform Admin
Tenant Admin
Clinic Admin
Doctor
Receptionist
Nurse / Assistant
Pharmacist
Lab Technician
Accountant
22. Epic 15 — Security & Privacy
Requirements
Encryption in transit
Encryption at rest
RBAC
Tenant isolation
Audit logs
Consent management
MFA/2FA
Secure document storage
Backup
Disaster recovery
Session management
Data retention
Administrative activity logging
Clinical Audit

Every modification to a clinical record should capture:

User
Timestamp
Action
Previous Value
New Value
Reason where applicable
23. Epic 16 — Analytics
Clinic Dashboard
Daily revenue
Monthly revenue
New patients
Returning patients
Appointments
No-show rate
Waiting time
Consultations
Doctor utilization
Revenue per doctor
Pharmacy sales
Lab revenue
Procedure revenue
AI Insights — Phase 2

Examples:

"Patient follow-ups decreased 12% this month."

"Dr. Kumar's average waiting time increased 18%."

"32 patients are due for follow-up."

24. Subscription & Commercial Model

Jioplix should use Core + Add-on + Usage pricing.

Plan	Indicative Price	Target
Starter	₹699/month	Solo Doctor
Professional	₹1,999/month	Small Clinic
Clinic	₹3,999/month	Multi-Doctor
Enterprise	Custom	Clinic Chains
Optional Add-ons
Add-on	Pricing Model
Pharmacy	Monthly
Laboratory	Monthly
Inventory	Monthly
Procedures	Monthly
Specialty	Monthly
Multi-Branch	Monthly
AI	Included quota / usage
WhatsApp	Usage-based
Storage	Usage-based
Additional Doctor	Per user

Final pricing should be validated through customer interviews and pilot clinics before commercial launch.

25. MVP Definition

The biggest risk is trying to launch everything simultaneously.

Release 1 — Clinic Core
Must Have
Multi-tenancy
Authentication
RBAC
Patient
Patient Timeline
Appointment
Queue
Doctor Workspace
EMR
Prescription
Billing
Payments
Basic Analytics
WhatsApp notifications
Audit
Backup
Basic ABDM integration
AI
Pre-consultation summary
AI clinical note draft
Initial Specialty

General Medicine

26. Release 1.1 — Revenue Add-ons

Immediately after Core stabilization:

Pharmacy
Laboratory
Inventory
Procedures

These are important because they increase ARPU and customer stickiness.

27. Release 2 — Specialty Expansion
Dental
Pediatrics
Dermatology
Gynecology
Additional specialty templates
Patient portal
Online booking
Advanced WhatsApp
Multi-location
Advanced analytics
28. Release 3 — Jioplix Intelligence

The long-term differentiation should be:

AI Receptionist

Handles:

Appointment requests
Rescheduling
FAQs
Reminders
AI Clinical Copilot
Pre-consultation summary
AI Scribe
Patient summary
Documentation assistance
AI Follow-up Assistant
Follow-up reminders
Medication reminders
Chronic care workflows
AI Business Assistant

"What happened in my clinic this week?"

The system responds with:

Revenue
Patient growth
No-shows
Doctor utilization
Follow-up gaps
Pharmacy
Lab
Operational issues
29. Non-Functional Requirements
Area	Target
Login	<2 sec
Patient Search	<1 sec
Patient Profile	<2 sec
Dashboard	<2 sec
Consultation	<2 sec
Standard API p95	<500 ms
AI response	<10 sec target
Availability	99.9%
Backup	Automated
Audit	Mandatory
Tenant isolation	Mandatory

AI latency should be treated separately from normal application performance because model/API latency is variable.

30. Data Migration Strategy

Existing Jioplix HMS capabilities should not be immediately deleted.

Phase 1

Hide/deactivate hospital-specific UI.

Phase 2

Identify reusable platform services.

Phase 3

Separate legacy HMS workflows.

Phase 4

Archive unused hospital data where appropriate.

Phase 5

Remove obsolete tables/services only after:

Dependency analysis
Backup validation
Migration validation
Production verification

This allows Jioplix to preserve valuable existing technology investment.

31. Success Metrics
Activation

Clinic completes onboarding within:

30 minutes

Time to First Value

First patient registered within:

10 minutes

Doctor Efficiency

Target:

40% reduction in documentation effort

Administrative Efficiency

Target:

30% reduction in manual front-desk work

Patient Engagement

Target:

>80% appointment confirmation

Retention

Target:

>95% monthly clinic retention after product stabilization

Commercial

Track:

MRR
ARPU
CAC
Churn
Add-on adoption
AI usage
Pharmacy adoption
Lab adoption
Multi-branch conversion
32. Product Differentiation

Jioplix should compete on workflow, not number of modules.

1. Clinic-first UX

No unnecessary hospital complexity.

2. AI-native

AI embedded into clinical and operational workflows.

3. Modular

Start small and add Pharmacy, Lab, Inventory and other capabilities.

4. India-native

ABDM + ABHA + UPI + GST + WhatsApp.

5. Specialty-ready

Specialty workflows without rebuilding the platform.

6. Patient engagement

The relationship continues beyond the consultation.

7. Integrated Operations

Clinical → Pharmacy → Lab → Inventory → Billing → Payment.

33. Core Patient Journey

This should be the central design principle for the entire application.

                    PATIENT
                       │
                       ▼
                  Appointment
                       │
                       ▼
                  Registration
                       │
                       ▼
                    Check-In
                       │
                       ▼
                 Doctor Queue
                       │
                       ▼
                 Consultation
                       │
              ┌────────┼─────────┐
              │        │         │
              ▼        ▼         ▼
          Prescription Lab     Procedure
              │        │         │
              ▼        ▼         ▼
          Pharmacy   Results   Inventory
              │        │         │
              └────────┼─────────┘
                       ▼
                    Billing
                       │
                       ▼
                    Payment
                       │
                       ▼
                  Follow-Up
                       │
                       ▼
               Patient Engagement
34. Final Product Definition

The ultimate Jioplix architecture should be:

                         JIOPLIX
                            │
                AI-POWERED CLINIC OS
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
       CARE              ENGAGE               OPERATE
        │                   │                    │
       EMR              WhatsApp              Billing
   Consultation          Patient CRM          Payments
  Prescription           Follow-up            Pharmacy*
  Specialty              Portal               Laboratory*
  AI Copilot                                  Inventory*
                                              Procedures*
        │                   │                    │
        └───────────────────┼────────────────────┘
                            │
                     INTELLIGENCE
                            │
                 AI Scribe / Copilot
                 AI Receptionist
                 AI Follow-up
                 AI Analytics
Product tagline

Jioplix — The Intelligent Operating System for Modern Clinics.

Product philosophy

Start simple. Add what you need. Grow without changing your platform.

My recommendation for the actual build

I would not make the entire PRD the Q4 2026 release scope. Treat this as the master product PRD, then create a separate engineering release plan.

The most commercially sensible sequence is:

Phase 1: Core Clinic OS
Phase 2: Pharmacy + Lab + Inventory + Procedures
Phase 3: Dental + Pediatrics + Dermatology + Gynecology
Phase 4: AI Receptionist + AI Scribe + AI Follow-up + AI Business Intelligence