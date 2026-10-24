# Postify — Gemini Visual Reference Screenshots Index

This directory contains verified, high-fidelity reference screenshots captured from the live, running **Postify** application. These authentic captures serve as visual grounding and reference assets for Google Gemini video and media generation, ensuring generated materials represent Postify's true editorial aesthetics, UI components, typography, and dark-mode color scheme.

---

## Technical Environment & Capture Specifications

- **Application Stack**: React 19, Vite, Tailwind CSS v4, Express 4, Node.js, MongoDB (`miniproject`).
- **Viewport Resolution**: 1440 × 1000 pixels (Desktop High-DPI).
- **Theme**: Dark Mode (`data-theme="dark"` / twilight atmospheric gradient `#0a0b10`).
- **Data Integrity**: Captured exclusively from real existing development database entities without destructive operations, artificial seeding, or mock generation.
- **Security & Privacy**: No passwords, private tokens, or authentication secrets are exposed.

---

## Screenshot Catalog

| # | Filename | Application Route | Status | Key Feature Demonstrated |
|---|---|---|:---:|---|
| **01** | `01-home-feed.png` | `/feed` | ✅ Captured | Main developer community feed, editorial cards, author avatars, and engagement metrics |
| **02** | `02-developer-profile.png` | `/user/:id` | ✅ Captured | Developer profile header, bio, tech stack pills, selected projects, and pinned work |
| **03** | `03-create-post.png` | `/feed` (authenticated) | ✅ Captured | Post composer interface with Markdown formatting toolbar, live preview tab, and counter |
| **04** | `04-post-discussion.png` | `/post/:postId` | ✅ Captured | Long-form story detail with syntax-highlighted code block, reaction bar, and threaded replies |
| **05** | `05-project-showcase.png` | `/projects` | ✅ Captured | Engineering projects ecosystem directory, status badges, tech stack tags, and search bar |
| **06** | `06-build-journal.png` | `/projects/:user/:slug` | ✅ Captured | Project overview with chronological Build Logs & Journals timeline and milestone updates |
| **07** | `07-discovery-search.png` | `/search?q=microservices` | ✅ Captured | Full-text discovery engine with active search query, category tabs, and matched results |
| **08** | `08-bookmarks-collections.png` | `/saved` | ✅ Captured | Private Saved Stories library, collection management controls, and search interface |
| **09** | `09-notifications.png` | `/notifications` | ✅ Captured | Notification center with live unread count badges, follow alerts, and post reaction events |
| **10** | `10-weekly-digest.png` | `/digest` | ✅ Captured | Weekly Developer Digest edition (`2026-W43`), executive summary, and curated platform highlights |

---

## Detailed Screenshot Specifications

### 01. Main Social Feed (`01-home-feed.png`)
- **Route**: `http://localhost:5173/feed`
- **Feature Demonstrated**: Chronological technical publication feed displaying real developer stories, author metadata (Kai Takahashi), publication dates, hashtags (`#golang`, `#performance`), like and repost counters, and the right sidebar featuring "Featured Thinkers", "Daily Prompt", and "Trending Themes".
- **What Gemini Should Learn**:
  - The floating navigation capsule (`.nav-capsule`) with the colorful Postify logo badge and navigation links.
  - The glassmorphic card design (`.portal-card`) with subtle rounded borders, glowing rings, and readable sans/serif typography.
  - The curated sidebar widgets emphasizing community engagement and editorial prompts.
- **Limitations / Notes**: Feed is rendered with public view state highlighting discovery streams and sidebar recommendations.

---

### 02. Developer Profile (`02-developer-profile.png`)
- **Route**: `http://localhost:5173/user/6ad5f166e559ce879af444bd`
- **Feature Demonstrated**: Public profile for developer **Elena Rostova** (`@elena_1792405858846`), displaying custom banner overlay, profile avatar, follower counts, bio, technology stack badges (`React`, `Go`, `Docker`, `Kubernetes`), social link chips (GitHub, LinkedIn, Website), "Engineering Projects & Journals" showcase card (*Consensus-Raft Distributed Store*), and "Pinned Publications".
- **What Gemini Should Learn**:
  - Clean profile hierarchy separating identity, technical competencies, projects, and publications.
  - Consistent twilight background gradient with high-contrast, accessible typography.
- **Limitations / Notes**: Captured in public visitor perspective showing the blue "+ Follow" action button.

---

### 03. Post Composer Interface (`03-create-post.png`)
- **Route**: `http://localhost:5173/feed` (Authenticated as `@postify`)
- **Feature Demonstrated**: Interactive post creator card ("Share a Reflection") showing the author avatar, Markdown toolbar controls (**Bold**, *Italic*, Heading, `Code`, Snippet, Bullet List, Link), "Write" vs. "Preview" toggle, live textarea input with tags, remaining character countdown (`2342 chars remaining`), and the primary "Publish Story" action button.
- **What Gemini Should Learn**:
  - Postify's developer-first composition experience with direct Markdown support.
  - Compact, focused layout encouraging thoughtful micro-essays and architecture notes.
- **Limitations / Notes**: Text was typed into the composer to illustrate active state without committing dummy data to the permanent database.

---

### 04. Post Discussion & Threaded Replies (`04-post-discussion.png`)
- **Route**: `http://localhost:5173/post/6ad5e6cb743dde0ac2f654f0`
- **Feature Demonstrated**: Technical story detail titled *"Event-Driven Microservices in Production"* featuring an embedded JavaScript code snippet (`const outbox = await tx.insert(OutboxEvents)...`), engagement bar (likes, reposts, share, bookmark), and the "Discussion & Perspectives" threaded comments section showing authentic community responses from developer Sam Altam.
- **What Gemini Should Learn**:
  - The presentation of code snippets with syntax highlighting and instant "Copy" button.
  - The threaded reply structure with user avatars, timestamps, and contextual responses.
- **Limitations / Notes**: Focuses on the lower portion of the story to emphasize community interaction and threaded dialogue.

---

### 05. Project Showcase Directory (`05-project-showcase.png`)
- **Route**: `http://localhost:5173/projects`
- **Feature Demonstrated**: The "Engineering Projects & Build Journals" directory, featuring the section badge, descriptive header, "+ Create Project" button, "Public Projects" / "My Projects" filter tabs, search and status dropdown filters, and project cards (*FlatBuffers RPC Gateway*) showing tech stack tags (`Go`, `FlatBuffers`, `gRPC`), status badges (`In Progress`, `Public`, `1 logs`), author, and creation date.
- **What Gemini Should Learn**:
  - Grid presentation of open-source and internal developer projects.
  - Card anatomy displaying build log counts and architecture tags.
- **Limitations / Notes**: Displays the existing 4 development project entries in the database.

---

### 06. Project Build Journal (`06-build-journal.png`)
- **Route**: `http://localhost:5173/projects/kai_p10_1792417406716/flatbuffers-rpc-gateway`
- **Feature Demonstrated**: Project detail overview for *FlatBuffers RPC Gateway* featuring project status, description, author info, "Architecture & System Overview", and the chronological "Build Log & Journal" timeline with milestone entries (*FlatBuffers Schema Verification*).
- **What Gemini Should Learn**:
  - Postify's unique "Build Journal" concept where developers log incremental engineering progress alongside their codebase.
  - Timeline styling with milestone chips and chronological sorting.
- **Limitations / Notes**: Captured at root scroll position to display both project metadata and the initial journal entry.

---

### 07. Discovery & Search Portal (`07-discovery-search.png`)
- **Route**: `http://localhost:5173/search?q=microservices`
- **Feature Demonstrated**: Search engine interface with active search query input (`microservices`), category filter pills (**All Results**, **Projects**, **People**, **Posts (3)**, **Topics**), and matching story cards with highlighted snippets and author information.
- **What Gemini Should Learn**:
  - High-visibility search input bar with active focus ring.
  - Filter pills allowing filtering across distinct entity types (projects, writers, stories, tags).
- **Limitations / Notes**: Query targets existing database posts covering microservices architecture.

---

### 08. Bookmarks & Collections Library (`08-bookmarks-collections.png`)
- **Route**: `http://localhost:5173/saved` (Authenticated)
- **Feature Demonstrated**: The "Saved Library" private sanctuary showing the private collection header, "+ New Collection" action button, "All Bookmarks (0)" tab, and the curated empty state card with bookmark icon and descriptive onboarding copy.
- **What Gemini Should Learn**:
  - Clean personal library management layout for saving technical references and code snippets.
  - Consistent empty state design with icon and explanatory text.
- **Limitations / Notes**: The database currently has 0 saved bookmarks for this account; the UI accurately reflects this state without injecting fake bookmarks.

---

### 09. Notification Center (`09-notifications.png`)
- **Route**: `http://localhost:5173/notifications` (Authenticated as `@elena_1792405858846`)
- **Feature Demonstrated**: The real-time Notification Center displaying the unread badge counter (`2`) in the navbar, filter tabs (**All Activity**, **Unread (2)**, **Mentions (@)**), "Mark all as read" button, and authentic notification cards (follow events and post reaction events with quote previews and unread blue indicators).
- **What Gemini Should Learn**:
  - Notification card layout with distinct event icons (user follow, heart reaction).
  - Unread visual indicators (blue dot, red pill badge counter in navbar).
- **Limitations / Notes**: Captured using an account with real unread notification events.

---

### 10. Weekly Developer Digest (`10-weekly-digest.png`)
- **Route**: `http://localhost:5173/digest` (Authenticated as `@Hammad`)
- **Feature Demonstrated**: The "Weekly Developer Digest" publication for period **`2026-W43`**, featuring the "Weekly Engineering Radar" badge, "Refresh" and "Settings" buttons, header with date range (Oct 19 – 25, 2026), and "Platform Highlights & Public Journals" cards summarizing technical activity across the platform.
- **What Gemini Should Learn**:
  - The editorial magazine format of Postify's automated weekly engineering digest.
  - Clean card curation summarizing community build logs and technical breakthroughs.
- **Limitations / Notes**: Rendered from the real generated digest document stored in MongoDB.

---

## How to Access These Screenshots

All 10 images are stored locally at:
```
C:\Users\User\Projects\Postify\docs\gemini-reference-screenshots\
```

To quickly view the folder in Windows File Explorer, run:
```powershell
explorer.exe "C:\Users\User\Projects\Postify\docs\gemini-reference-screenshots"
```
