
NFC DIGITAL BUSINESS CARD PLATFORM

Full Product Roadmap, User Flows & Backend Specification




This document defines the complete product vision across all versions, detailed user flows for each feature, the API contract the frontend will consume, database schema suggestions, and the coordination timeline between frontend and backend.

Frontend: React + Tailwind CSS v4 + Shadcn/UI + Radix UI + Lucide
Backend: TBD (you decide) — Frontend deployed as static build on cPanel

Table of contents

1. Product overview & core value loop
2. Version roadmap (V1 – V4)
3. User flows (every interaction, step by step)
4. API endpoints by version
5. Database schema
6. Questions for backend developer
7. Coordination milestones

1. Product overview
We are building a web-based NFC digital business card platform. When someone taps an NFC-enabled card against a phone, a public profile page loads showing the card owner’s details. The platform’s key differentiator is a two-way contact exchange: the person receiving the card can share their own details back instantly.
1.1 The core value loop
Everything in this product serves one loop. V1 ships only this loop. Every subsequent version enriches it.

Person A taps their NFC card on Person B’s phone
Person B’s phone opens a URL → the public card page loads
Person B sees A’s name, title, company, photo, and contact info
Person B taps “Save contact” → downloads A’s vCard instantly
Person B taps “Exchange” → fills a quick form with their own details
Person A receives an email notification with B’s details
Person A views all received contacts in a dashboard log
Person A taps “Save to contacts” on any exchange → downloads that person’s vCard

The vCard download exists at two touchpoints: on the public card page (Person B saves A’s info) and in the exchange log (Person A saves B’s info). Both are generated client-side from the data already loaded — no extra API call needed.

2. Version roadmap
The product is built in four phases. Each version is self-contained and shippable. Features are modular — later versions slot into the existing architecture without refactoring.
2.1 V1 — MVP (core exchange loop)
Ship the minimum product that delivers the core value: tap, see card, exchange contacts, log exchanges. Nothing else.
Feature
Frontend scope
Backend scope
Public card page
Mobile-first profile display from API data
GET /api/public/:id endpoint returning profile
Save contact (vCard)
Client-side vCard generation + download
No API needed (generated from profile data)
Contact exchange form
Modal form with validation, POST to API
POST /api/public/:id/exchange, store + email notify
Exchange log (dashboard)
Paginated list with vCard per row
GET /api/contacts (paginated, authenticated)
Authentication
Login/register forms, token storage
POST /api/auth/login, /register, /me
Profile editor (basic)
Form for name, title, company, email, phone
GET + PUT /api/profile (authenticated)
Direct call/email links
tel: and mailto: links on public card
No API needed (from profile data)


2.2 V2 — Enrich the card
Make the card more useful with social links, richer profiles, and customization.
Feature
Frontend scope
Backend scope
Social links
Dynamic link editor, icon display on card
JSON column on profile, returned in GET
Profile photo upload
Image picker, crop, upload component
POST /api/profile/photo, file storage
Custom URL slug
Slug editor with availability check
PUT /api/profile (unique_id field), validation
Profile themes/colors
Theme picker, CSS variable swapping
Theme field on profile table
Bio / about section
Textarea with character count
Bio field on profile table


2.3 V3 — Analytics & insights
Give the card owner data about their networking activity and card usage.
Feature
Frontend scope
Backend scope
Tap event logging
Silent POST on public page load
POST /api/taps, store device/location/time
Analytics dashboard
Charts (taps over time, devices, locations)
GET /api/analytics/* aggregation endpoints
Device breakdown
Pie/bar chart of OS, browser
GET /api/analytics/devices
Location breakdown
Top cities/countries list
GET /api/analytics/locations (from IP)
Contact export
Download CSV/vCard batch button
GET /api/contacts/export/csv, /vcards
Date range filters
Date picker for analytics queries
Query params: ?from=&to=


2.4 V4 — Scale & manage
Multi-tag support, team features, and advanced management for power users.
Feature
Frontend scope
Backend scope
NFC tag management
Tag list, link/unlink, nickname editor
CRUD /api/tags endpoints
Multiple cards per user
Card switcher, separate profiles
Multiple profile records per user
Admin dashboard
User management, bulk operations
Admin role, admin-only endpoints
Account settings
Password change, email change, delete
PUT /api/settings/* endpoints
Tag ordering/provisioning
Order flow UI, serial number entry
Tag provisioning + inventory system
Transfer tag
Transfer flow with confirmation
PUT /api/tags/:id/transfer


3. User flows
Every interaction the user can take, broken into exact steps. These define what the frontend builds and what API calls it makes. Organized by version.
3.1 NFC tap → public card view (V1)
The entry point for every interaction. Person B taps Person A’s NFC card.
#
Action
What happens
API call
1
NFC tap
Person B’s phone reads the NFC tag URL
—
2
Browser opens
Phone opens app.domain.com/c/abc123
—
3
Load profile
Frontend fetches profile data by unique_id
GET /api/public/:unique_id
4
Display card
Name, title, company, photo, contact info rendered
—
5
Show actions
Save Contact, Exchange, Call, Email buttons appear
—


3.2 Save contact — vCard download (V1)
Person B saves Person A’s details directly to their phone contacts.
#
Action
What happens
API call
1
Tap “Save contact”
Button on public card page
—
2
Generate vCard
Frontend creates .vcf file from profile data already in memory
— (client-side only)
3
Download triggers
Browser downloads the .vcf file
—
4
Phone prompts
OS prompts to add contact to phone address book
—

This flow is entirely client-side. No API call is made. The profile data fetched in Flow 3.1 contains all fields needed for vCard generation.

3.3 Two-way contact exchange (V1)
The key differentiator. Person B shares their own details back to Person A.
#
Action
What happens
API call
1
Tap “Exchange”
Button on public card page opens modal
—
2
Fill form
Name*, Email*, Phone, Company, Note
—
3
Submit
Frontend validates, sends data to API
POST /api/public/:unique_id/exchange
4
Backend stores
Exchange record created in DB
— (server-side)
5
Email sent
Person A receives email with B’s details
— (server-side)
6
Success screen
Modal shows confirmation: “Contact shared!”
—

The exchange form requires only Name and Email. Phone, Company, and Note are optional to reduce friction.

3.4 View exchange log — received contacts (V1)
Person A views everyone who exchanged details with them.
#
Action
What happens
API call
1
Login
Person A logs in to dashboard
POST /api/auth/login
2
Navigate
Open Contacts section in dashboard
—
3
Load contacts
Paginated list of exchanges fetched
GET /api/contacts?page=1&per_page=20
4
View details
Each row shows name, email, phone, company, note, date
—
5
Save vCard
Person A taps “Save to contacts” on any row
— (client-side vCard)
6
Delete
Person A removes an exchange entry
DELETE /api/contacts/:id

The “Save to contacts” button on each exchange row generates a vCard client-side from the exchange data — same utility as the public card, different data source.

3.5 Registration & login (V1)
Card owners need an account to manage their card and view exchanges.
#
Action
What happens
API call
1
Open login page
Person navigates to /login
—
2
Choose register
Switches to register tab/form
—
3
Fill details
First name, last name, email, password
—
4
Submit
Frontend validates, sends to API
POST /api/auth/register
5
Token received
Backend returns JWT + user object
— (response)
6
Token stored
Frontend stores token in localStorage
—
7
Redirect
User sent to dashboard
—
8
Profile created
Backend auto-creates empty profile with unique_id
— (server-side)


3.6 Edit profile (V1)
Card owner customizes the information displayed on their public card.
#
Action
What happens
API call
1
Open editor
Navigate to profile editor in dashboard
GET /api/profile
2
See current data
Form pre-filled with existing profile fields
—
3
Edit fields
First name, last name, job title, company, public email, phone
—
4
Save
Frontend validates, sends update
PUT /api/profile
5
Preview card
See how the public card looks with new data
— (local preview)


3.7 Add social links (V2)
#
Action
What happens
API call
1
Open link editor
Section in profile editor
GET /api/profile (links in JSON)
2
Add link
Select platform (LinkedIn, Twitter, etc.) + enter URL
—
3
Reorder
Drag to reorder link display priority
—
4
Save
All links saved as JSON array on profile
PUT /api/profile
5
Display on card
Public card shows platform icons with links
—


3.8 Upload profile photo (V2)
#
Action
What happens
API call
1
Click upload
Photo upload area in profile editor
—
2
Select image
File picker opens, user selects image
—
3
Client resize
Frontend compresses/crops to max 500x500
—
4
Upload
Send as multipart/form-data
POST /api/profile/photo
5
URL returned
Backend returns stored image URL
— (response)
6
Card updates
Public card now shows the photo
—


3.9 Tap logging & analytics (V3)
#
Action
What happens
API call
1
Page loads
Public card page loads after NFC tap
—
2
Silent log
Frontend sends tap data in background
POST /api/taps
3
Data captured
User-agent, referrer, timestamp sent; IP captured server-side
—
4
View analytics
Card owner opens analytics dashboard
GET /api/analytics/summary
5
Drill down
View device breakdown, locations, timeline
GET /api/analytics/devices, /locations, /timeline
6
Filter by date
Select date range to filter all charts
?from=2026-01-01&to=2026-03-24


3.10 NFC tag management (V4)
#
Action
What happens
API call
1
Open tag manager
Navigate to NFC section in dashboard
GET /api/tags
2
Link new tag
Enter tag serial number or scan to register
POST /api/tags
3
Label tag
Give the tag a nickname (e.g. “Black metal card”)
PUT /api/tags/:id
4
View linked tags
See all tags pointing to this profile
—
5
Deactivate tag
Disable a lost/stolen tag
DELETE /api/tags/:id


4. API endpoints by version
Organized by version so the backend developer knows what to build and when. Each version’s endpoints are additive — previous versions’ endpoints remain active.
4.1 V1 endpoints (MVP)
The minimum API surface to ship the core loop.
Authentication
Method
Endpoint
Description
Auth?
POST
/api/auth/register
Register new user (email + password + name)
No
POST
/api/auth/login
Login, return JWT token + user
No
POST
/api/auth/logout
Invalidate token
Yes
GET
/api/auth/me
Get current user from token
Yes


Profile
Method
Endpoint
Description
Auth?
GET
/api/profile
Get own profile (for editor)
Yes
PUT
/api/profile
Update profile fields
Yes


Public (no auth)
Method
Endpoint
Description
Auth?
GET
/api/public/:unique_id
Fetch public profile for display
No
POST
/api/public/:unique_id/exchange
Visitor submits contact exchange
No


Contacts (exchange log)
Method
Endpoint
Description
Auth?
GET
/api/contacts
List received exchanges (paginated)
Yes
DELETE
/api/contacts/:id
Delete an exchange entry
Yes


4.2 V2 endpoints (enrich the card)
Method
Endpoint
Description
Auth?
POST
/api/profile/photo
Upload profile photo (multipart)
Yes
DELETE
/api/profile/photo
Remove profile photo
Yes

Social links, bio, theme, and custom slug are all fields on the existing PUT /api/profile endpoint — no new endpoints needed, just expanded payload.

4.3 V3 endpoints (analytics)
Method
Endpoint
Description
Auth?
POST
/api/taps
Log a tap event (from public page)
No
GET
/api/analytics/summary
Total taps, unique visitors, top stats
Yes
GET
/api/analytics/timeline
Taps over time (daily/weekly/monthly)
Yes
GET
/api/analytics/devices
Device/OS/browser breakdown
Yes
GET
/api/analytics/locations
City/country breakdown
Yes
GET
/api/contacts/export/csv
Export contacts as CSV download
Yes
GET
/api/contacts/export/vcards
Export all contacts as vCard batch
Yes


4.4 V4 endpoints (scale & manage)
Method
Endpoint
Description
Auth?
GET
/api/tags
List all NFC tags for user
Yes
POST
/api/tags
Register/link a new tag
Yes
PUT
/api/tags/:id
Update tag label
Yes
DELETE
/api/tags/:id
Deactivate/unlink tag
Yes
PUT
/api/settings/password
Change password
Yes
PUT
/api/settings/email
Change email (with verification)
Yes
PUT
/api/settings/notifications
Toggle notification preferences
Yes
DELETE
/api/settings/account
Delete account and all data
Yes


5. Database schema
Suggested schema for alignment. Adjust as needed — the key requirement is that API responses match what the frontend expects. Tables are introduced by version.
5.1 V1 tables
users
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key, auto-generated
email
VARCHAR(255)
No
Unique, used for login
password_hash
VARCHAR(255)
No
Bcrypt or similar
first_name
VARCHAR(100)
No
For registration
last_name
VARCHAR(100)
No
For registration
email_verified_at
TIMESTAMP
Yes
Null until verified
created_at
TIMESTAMP
No
Auto-set
updated_at
TIMESTAMP
No
Auto-set


profiles
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key
user_id
FK → users.id
No
One profile per user (V1)
unique_id
VARCHAR(50)
No
URL slug, unique, auto-generated
first_name
VARCHAR(100)
No
Displayed on public card
last_name
VARCHAR(100)
No
Displayed on public card
job_title
VARCHAR(150)
Yes
Displayed on public card
company
VARCHAR(150)
Yes
Displayed on public card
email_public
VARCHAR(255)
Yes
Public contact email
phone
VARCHAR(50)
Yes
Public phone number
bio
TEXT
Yes
V2: about section
profile_photo_url
VARCHAR(500)
Yes
V2: stored photo URL
social_links
JSON / TEXT
Yes
V2: [{type, url, label}]
theme
VARCHAR(50)
Yes
V2: card color theme
is_active
BOOLEAN
No
Default true
created_at
TIMESTAMP
No
Auto-set
updated_at
TIMESTAMP
No
Auto-set


exchanges
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key
profile_id
FK → profiles.id
No
Which card was tapped
visitor_name
VARCHAR(200)
No
Required field
visitor_email
VARCHAR(255)
No
Required field
visitor_phone
VARCHAR(50)
Yes
Optional
visitor_company
VARCHAR(150)
Yes
Optional
visitor_note
TEXT
Yes
Optional: “Nice meeting you at...”
created_at
TIMESTAMP
No
When the exchange happened

5.2 V3 tables
taps
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key
profile_id
FK → profiles.id
No
Which card was tapped
tag_id
FK → nfc_tags.id
Yes
V4: which specific tag
user_agent
TEXT
Yes
Browser user-agent string
ip_address
VARCHAR(45)
Yes
For geo lookup
city
VARCHAR(100)
Yes
Derived from IP server-side
country
VARCHAR(100)
Yes
Derived from IP server-side
device_type
VARCHAR(50)
Yes
mobile / desktop / tablet
os
VARCHAR(50)
Yes
iOS, Android, Windows, etc.
browser
VARCHAR(50)
Yes
Chrome, Safari, etc.
referrer
VARCHAR(500)
Yes
HTTP referrer
tapped_at
TIMESTAMP
No
When the tap occurred

5.3 V4 tables
nfc_tags
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key
user_id
FK → users.id
No
Tag owner
profile_id
FK → profiles.id
No
Which profile this tag opens
serial_number
VARCHAR(100)
Yes
Physical tag ID
label
VARCHAR(100)
Yes
Nickname: “Black metal card”
is_active
BOOLEAN
No
Can be deactivated if lost
linked_at
TIMESTAMP
No
When tag was linked
created_at
TIMESTAMP
No
Auto-set


settings
Column
Type
Nullable
Notes
id
UUID / INT (PK)
No
Primary key
user_id
FK → users.id
No
One row per user
notify_on_exchange
BOOLEAN
No
Default true
notify_on_tap
BOOLEAN
No
Default false (V3)
updated_at
TIMESTAMP
No
Auto-set


6. Questions for backend developer
These questions directly affect how the frontend is built. Grouped by priority — V1 questions block development and must be answered first.
6.1 V1 — Must answer before frontend development starts
Authentication
Question
Why it matters
JWT tokens or server-side sessions (cookies)?
Determines how frontend stores auth state and what headers every API call sends.
Where does the token go? Authorization: Bearer header or httpOnly cookie?
Affects axios/fetch interceptor configuration.
How does token refresh work? Silent refresh endpoint or re-login?
Frontend needs to handle 401 responses — either refresh silently or redirect.
Is there email verification after registration?
Frontend needs a “verification pending” screen and callback route.
Does registration auto-create a profile with a unique_id?
Frontend redirects to profile editor after register — needs a profile to exist.


API response format
Question
Why it matters
Standard success shape? e.g. { success: true, data: {...} }
Frontend needs a consistent wrapper to parse every response the same way.
Standard error shape? e.g. { success: false, message, errors: {} }
Determines if frontend shows inline field errors or a single toast.
Do validation errors include field names? e.g. errors.email = “Already exists”
Frontend maps field errors to form inputs for inline validation display.


Contact exchange
Question
Why it matters
Is there spam protection on the exchange endpoint? (reCAPTCHA, rate limit, honeypot?)
Endpoint is public — bots could flood it. Frontend may need to integrate reCAPTCHA.
Does the card owner get an email notification on new exchange?
If yes, frontend doesn’t need real-time notifications for V1.
What exactly is in the notification email?
Determines if we need to build an email template or if a simple text email suffices.


CORS & deployment
Question
Why it matters
What domain will the API be hosted on?
Frontend needs to configure the base URL for all API calls.
Will frontend and API be on the same domain or different?
Same domain avoids CORS entirely. Different domains need CORS headers.
Is there a staging environment I can develop against?
Cannot build frontend without a working API to test against.

6.2 V2+ — Answer before each version starts
Question
Why it matters
How is the profile photo uploaded? Multipart form-data or base64?
Affects upload component and file size handling.
Max photo file size and accepted formats?
Frontend validates before upload.
Where are files stored? (server filesystem, S3, CDN?)
Affects how frontend constructs image URLs.
Are image URLs returned as full URLs or relative paths?
Frontend needs to know whether to prepend a base URL.
Is geolocation (for tap analytics) derived from IP server-side?
If not, frontend must request browser GPS permission (hurts conversion).
What analytics aggregations will the API return?
Determines which chart types frontend can build.
How does a tag get linked? Scan, serial number entry, or pre-assigned?
Defines the UX flow for tag management page.


7. Coordination milestones
Milestones to keep frontend and backend in sync. Frontend cannot start building a version until the backend has the relevant API endpoints available on staging.
V1 — MVP
Backend answers all V1 questions from Section 6.1
Backend sets up staging environment with CORS configured
Backend delivers auth endpoints (register, login, logout, me)
Frontend builds auth flow + dashboard shell against real API
Backend delivers profile CRUD + public profile + exchange endpoint
Frontend builds public card page, exchange form, profile editor
Backend delivers contacts list endpoint + email notifications
Frontend builds exchange log with vCard download per row
Integration testing, bug fixes, deploy to production

V2 — Enrich the card
Backend delivers photo upload endpoint + expanded profile fields
Frontend builds social links editor, photo upload, theme picker
Integration testing + deploy

V3 — Analytics
Backend delivers tap logging + all analytics aggregation endpoints + export
Frontend builds analytics dashboard with charts + contact export
Integration testing + deploy

V4 — Scale & manage
Backend delivers tag management + account settings endpoints
Frontend builds tag manager, settings page, admin features
Integration testing + deploy



Please review each section and respond with your decisions on the questions in Section 6. Once V1 questions are answered and a staging API is available, frontend development begins immediately.
