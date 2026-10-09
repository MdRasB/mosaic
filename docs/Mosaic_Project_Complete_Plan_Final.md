# Mosaic — Complete Project Design & Development Plan

> **Project name:** Mosaic  
> **Tagline:** *Your interests. Your collection. Your world.*  
> **Type:** Media discovery, personal collection, profile, and social platform  
> **Course:** Web Programming Laboratory  
> **Team:** 5 students  
> **Initial submission target:** stable working Version 1 in ~25 days  
> **Budget:** $0

---

# 1. Executive Summary

**Mosaic** is a web application where users can discover, organize, rate, review, and eventually share their interests across multiple kinds of media.

The long-term system supports:

- Movies
- TV shows
- Anime
- Manga
- Books
- Games
- Songs/music
- Photos
- Friends
- Public profiles
- Reviews
- Ratings
- Favorites
- Watchlists
- Status tracking
- Interest comparison
- Shared discovery
- Recommendations

The system intentionally has two major experiences:

```text
                    MOSAIC
                       |
          +------------+------------+
          |                         |
      PUBLIC MODE               USER MODE
       /explore                 /dashboard
          |                         |
   Discover/search            Personal world
   Trending/popular           Collection
   Media details              Favorites
   Provider links             Watchlist
                              Ratings
                              Reviews
                              Profile
                              Social
```

The project is built incrementally. The 25-day university submission targets a complete **Release 1**, while the architecture supports later releases without requiring a rewrite.

---

# 2. Project Vision

The complete Mosaic concept is:

> **A personal world of media and interests, with discovery on the outside and personal/social organization on the inside.**

The product is built around five ideas:

```text
Discover → Collect → Express → Connect → Explore Together
```

### Discover

Search and browse media from external APIs.

### Collect

Save media into a personal library.

### Express

Favorite, rate, review, organize, and tag.

### Connect

Profiles, friends, activity, and shared interests.

### Explore Together

Compare collections and find things to watch, read, or play together.

---

# 3. Project Name

## Mosaic

### Tagline

**Your interests. Your collection. Your world.**

The name is media-neutral. A user's personal world is made of many pieces:

```text
Movies + TV + Anime + Manga + Books + Games + Songs + Photos
                              |
                              v
                           MOSAIC
```

This makes the name suitable for the full project rather than only the initial movie/TV release.

---

# 4. Architecture Decisions and Corrections

The earlier drafts made the backend responsible for every external API call. That is unnecessary for Mosaic's initial scope and would make a university project harder to build and maintain.

The corrected principle is:

> **Use the simplest layer that safely solves the problem.**

Therefore Mosaic has a **frontend-first V1**, while keeping a clean Go backend ready for features that genuinely need server-side logic.

## 4.1 Canonical public URL

Use:

```text
/explore
```

as the public discovery page.

Optional redirects:

```text
/      → /explore
/home  → /explore
```

## 4.2 Authenticated home

After successful login:

```text
/login → /dashboard
```

`/dashboard` is the user's primary application home.

A logged-in user can still visit `/explore`.

## 4.3 TMDB can be called directly from frontend JavaScript in V1

For public media discovery, there is no technical requirement to route every request through Go.

V1 can use:

```text
Browser
   |
   | fetch()
   v
TMDB API
   |
   v
JSON
   |
   v
Vanilla JavaScript
   |
   v
DOM / media cards
```

This is intentionally simple and directly demonstrates the Web Programming Laboratory requirement to understand JavaScript, REST APIs, JSON, `fetch()`, asynchronous code, and DOM rendering.

TMDB's application API supports API-key authentication through the `api_key` parameter or an API Read Access Token sent as a Bearer token. If a credential is placed in browser code, it must be treated as **publicly observable**, not as a secret. citeturn676921view0

For the zero-cost university deployment, start with the simplest TMDB client-side approach permitted by TMDB's current terms. If the final deployment requires the credential to remain private, move those provider requests behind the Go backend without changing the rest of the application design.

## 4.4 Supabase can also be used directly from the frontend

For user authentication and database operations, the frontend can use the Supabase JavaScript client directly with a **publishable key + Row Level Security (RLS)**.

Supabase explicitly documents publishable keys as safe to expose in browser applications when RLS is correctly configured. Secret keys bypass RLS and must never be shipped to the browser. citeturn676921search0turn676921search1

Therefore V1 can use:

```text
Browser
   |
   +---- Supabase Auth
   |
   +---- Supabase Data API / PostgreSQL through supabase-js
```

No Go API is required merely to save a favorite, update a watchlist, or load a user's collection if the RLS policies correctly enforce ownership.

## 4.5 Go is the planned server-side backend, not a mandatory V1 proxy

Go remains the preferred backend language for Mosaic because it matches the team's backend/platform-engineering goals.

However, **Go should be introduced when Mosaic actually needs server-side capabilities**.

Good reasons to move a feature behind Go include:

- Protecting a secret external-provider credential.
- Aggregating multiple external APIs.
- Complex recommendation logic.
- Social/business rules that should not be trusted to the browser.
- Notifications and background jobs.
- Advanced moderation.
- Server-side media processing.
- Complex queries or transactional workflows.
- Rate limiting and caching controlled by Mosaic.

This produces a staged architecture:

```text
Release 1
Browser → TMDB
Browser → Supabase

Later releases
Browser → Go → PostgreSQL / external APIs
```

The frontend architecture should not depend on Go being present in Release 1.

## 4.6 Preferred JavaScript runtime for backend-side work

If a specific backend task genuinely benefits from the JavaScript ecosystem, use:

```text
TypeScript + Node.js
```

not plain JavaScript.

TypeScript provides static typing while remaining compatible with the JavaScript ecosystem. Node.js is a natural runtime for TypeScript-based scripts or small auxiliary services.

However:

> **Do not run two full backend stacks.**

Go is the primary backend language. TypeScript/Node.js is an optional companion for isolated jobs, migration/import scripts, SDK-specific integrations, or tooling where the JS ecosystem provides a concrete advantage.

Communication between Go and a TypeScript service, if one is ever needed, should be through an explicit boundary such as HTTP/JSON. There is no need for special language-level coupling.

## 4.7 Use a router/application shell

Because Mosaic has routes such as:

```text
/explore
/dashboard
/media/movie/157336
/profile/username
/compare/username
```

use Vite + vanilla JavaScript with a small client-side router.

Vite is only the build/development tool. The actual frontend remains HTML, CSS, and Vanilla JavaScript.

## 4.8 Provider/watch links are not guaranteed direct streaming links

Do not promise a direct Netflix/Prime/Disney+/etc. deep link for every media item.

TMDB's provider data is region-dependent and uses JustWatch data. The implementation should display provider availability only when the source supplies it and should follow the source's attribution/link requirements.

Model this as:

```text
provider
region
availability_type
provider_url
```

rather than assuming every title has a guaranteed direct streaming URL.

## 4.9 Deployment strategy follows the same principle

Release 1 can avoid running a custom Go server in production.

```text
Cloudflare Pages
    ↓
Vanilla JS frontend

Supabase
    ↓
Auth + PostgreSQL + Storage

TMDB
    ↓
Public media API
```

When a feature genuinely needs Go:

```text
Cloudflare Pages
    ↓
Vanilla JS
    ↓
Go API
    ↓
Supabase / external APIs
```

A free Render Web Service is a suitable zero-cost deployment option for the Go API when that phase is reached; Render documents Go web-service deployment and currently provides a Free plan, with the important limitation that Free web services spin down after 15 minutes of inactivity. citeturn169894search0turn169894search1

# 5. User Types

## 5.1 Guest / Visitor

No account required.

Can:

- Open `/explore`
- Browse trending/popular media
- Search
- Filter
- Open media details
- View public metadata
- View provider availability when available
- Open allowed provider links

Cannot:

- Save favorites
- Save watchlist
- Rate
- Review
- Create a collection
- Use private/social features

When a guest attempts a private action:

```text
Login required.

[Login] [Register]
```

## 5.2 Authenticated User

Can:

- Use `/dashboard`
- Manage collections
- Favorite
- Watchlist
- Track status
- Rate
- Review
- Manage profile
- Set privacy
- Add friends
- Compare interests
- Upload photos
- Use future social features

## 5.3 Administrator / Moderator

Part of the complete architecture, but not required for Release 1.

Can later:

- Review reports
- Moderate public content
- Remove abusive content
- Manage reported users
- Suspend/restore accounts
- Inspect basic system information

---

# 6. Route Specification

## Public routes

```text
/
/explore
/search
/media/:type/:id
/login
/register
/about
/privacy
/terms
```

Recommended redirects:

```text
/       → /explore
/home   → /explore
```

## Authenticated routes

```text
/dashboard
/explore
/movies
/tv
/anime
/manga
/books
/games
/songs
/collection
/collection/:type
/favorites
/favorites/:type
/watchlist
/watchlist/:type
/profile
/profile/edit
/settings
/friends
/friends/requests
/activity
/notifications
/compare/:username
```

## Photo routes

```text
/photos
/albums
/albums/:id
/photos/:id
```

## Admin routes

```text
/admin
/admin/reports
/admin/users
/admin/content
/admin/settings
```

---

# 7. Authentication Redirect Rules

```text
Guest opens /
       ↓
/explore

Guest opens /home
       ↓
/explore

Guest opens /dashboard
       ↓
/login?redirect=/dashboard

Successful login
       ↓
/dashboard
```

For protected routes, preserve the requested destination where useful.

Example:

```text
Guest → /collection
      → /login?redirect=/collection
      → successful login
      → /collection
```

Registration should preferably create a session and redirect directly to `/dashboard`.

---

# 8. Public Top Bar

The public page follows the supplied design reference concept.

```text
┌──────────────────────────────────────────────────────────────┐
│ MOSAIC       [       Global Search       ]    ☼  Login       │
│                                               Register       │
└──────────────────────────────────────────────────────────────┘
```

## Left

- Mosaic logo/name

## Center

Global search bar:

```text
Search movies, TV shows, anime, manga...
```

Additional search controls may include:

```text
[Search] [Filter] [Media Type]
```

There is **no GPT/AI search button** in the current scope.

## Right

- Theme/background toggle
- Login
- Register

---

# 9. Logged-In Top Bar

The authenticated top bar follows the second supplied reference concept.

```text
┌────────────────────────────────────────────────────────────────────┐
│ ☰ MOSAIC      [       Global Search       ] [⌕] [Option]  ☼  👤   │
└────────────────────────────────────────────────────────────────────┘
```

## Left

```text
[☰] MOSAIC
```

The hamburger button toggles the sidebar.

## Center

The same global search component is available throughout the application.

## Right

- Theme/background toggle
- Notifications when implemented
- Avatar
- Account menu

Account menu:

```text
Profile
Settings
Logout
```

---

# 10. Sidebar

Authenticated users receive the main application sidebar.

```text
MOSAIC

MAIN
├── Dashboard
└── Explore

MEDIA
├── Movies
├── TV Shows
├── Anime
├── Manga
├── Books
├── Games
└── Songs

MY LIBRARY
├── All Collection
├── Favorites
├── Watchlist
└── History

SOCIAL
├── Friends
├── Activity
├── Notifications
└── Compare

PHOTOS
├── Photos
└── Albums

ACCOUNT
├── Profile
└── Settings
```

Only completed modules should appear as active navigation items. Future modules can be introduced later without changing the overall structure.

---

# 11. Public `/explore` Page

The public Explore page is the first thing a visitor should see.

## 11.1 Hero

```text
┌──────────────────────────────────────────────────────────┐
│                    LARGE BACKDROP                        │
│                                                          │
│  Featured Title                                          │
│  Short overview...                                       │
│                                                          │
│  [More Details] [Provider / Watch]                       │
└──────────────────────────────────────────────────────────┘
```

## 11.2 Poster sections

```text
Trending Now
[poster] [poster] [poster] [poster] [poster] ...

Popular Movies
[poster] [poster] [poster] [poster] [poster] ...

Popular TV Shows
[poster] [poster] [poster] [poster] [poster] ...

Top Rated
[poster] [poster] [poster] [poster] [poster] ...

Upcoming
[poster] [poster] [poster] [poster] [poster] ...
```

Later:

```text
Popular Anime
Popular Manga
Popular Books
Popular Games
Popular Songs
```

Every media card has a poster.

---

# 12. Reusable Media Card

Build the media card once and reuse it everywhere.

```text
┌──────────────────────┐
│                      │
│       POSTER         │
│                      │
│                  ♡   │
├──────────────────────┤
│ Interstellar         │
│ 2014                 │
│ ★ 8.7                │
└──────────────────────┘
```

The component must support later media types without redesigning its core API.

---

# 13. Global Search Architecture

Search lives in the top bar, not only on `/explore`.

```text
User input
   ↓
debounce
   ↓
search service
   ↓
provider adapter
   ↓
normalized media
   ↓
result cards
   ↓
media details
```

Possible search filters:

```text
Media Type
Genre
Year
Rating
Language
Region/provider
```

Not every provider must support every filter.

---

# 14. Media Abstraction Layer

This is a major architectural requirement.

External APIs return different schemas. Pages should not directly depend on those schemas.

Use one internal model:

```javascript
{
  id,
  type,
  title,
  description,
  posterUrl,
  backdropUrl,
  releaseDate,
  rating,
  genres,
  language,
  externalIds,
  source
}
```

Flow:

```text
TMDB JSON
    ↓
TMDB adapter
    ↓
Mosaic Media Object
    ↓
Media Card / Details / Collection
```

Later:

```text
AniList / Open Library / game provider / music provider
    ↓
provider adapter
    ↓
Mosaic Media Object
```

This is what keeps the architecture extensible.

---

# 15. Media Details

Route:

```text
/media/:type/:id
```

Example:

```text
/media/movie/157336
```

## Public content

- Poster
- Backdrop
- Title
- Alternative title where useful
- Release date
- Genres
- Description
- Public rating
- Runtime/duration
- Seasons/episodes where applicable
- Cast/creator information
- Related media
- Provider availability when available

## Logged-in actions

```text
[Add to Collection]
[Favorite]
[Watchlist]
[Status]
[Rate]
[Review]
```

---

# 16. Provider / Watch Links

Display availability conservatively:

```text
Where to watch

Netflix
Prime Video
Disney+
...

[Open provider]
```

Availability depends on region and provider data.

TMDB's movie/TV Watch Provider endpoints provide region-sensitive streaming/rental/purchase information. TMDB documents JustWatch attribution requirements and notes that the available link may not be a direct deep link to the service. 

Therefore Mosaic should treat provider information as **availability metadata**, not as a guaranteed direct streaming link.

---

# 17. Authentication Module

## Required

- Register
- Login
- Logout
- Session restore
- Protected routes
- Password recovery

## Optional later

- OAuth providers
- MFA

Recommended first implementation:

```text
Supabase Auth
Email + Password
```

---

# 18. Profile Module

Each account has:

```text
username
Display name
Avatar
Bio
Joined date
```

Later:

```text
Favorite media
Public statistics
Social links
```

Avoid collecting unnecessary personal information.

---

# 19. Privacy Model

User-generated information should have explicit visibility.

Recommended values:

```text
public
friends
private
```

Examples:

```text
Collection item → public
Review           → friends
Photo album      → private
```

Default personal content should be conservative rather than automatically public.

---

# 20. Personal Collection Module

This is the central logged-in feature.

## General state model

```text
watchlist
watching
completed
dropped
paused
wishlist
```

Not every media type needs every state.

Examples:

### Movie

```text
watchlist
completed
dropped
```

### TV

```text
watchlist
watching
completed
dropped
paused
```

### Book

```text
want_to_read
reading
completed
dropped
```

### Game

```text
wishlist
playing
completed
dropped
```

The UI can translate general internal states into media-specific labels.

---

# 21. Favorites

Favorites are a state on a user-media relationship:

```text
user_media.is_favorite
```

Do not create separate tables such as:

```text
favorite_movies
favorite_books
favorite_games
```

---

# 22. Watchlist

Features:

- Add
- Remove
- Filter
- Sort
- Open details
- Change status

Filters:

```text
All
Movies
TV
Anime
Manga
Books
Games
Songs
```

---

# 23. Ratings

Use one global personal-rating scale.

Recommended:

```text
0.5 – 5.0
```

Keep the user's personal score separate from the external/public score.

Example:

```text
TMDB rating: 8.7/10
Your rating: 4.5/5
```

---

# 24. Reviews

A user can:

- Create review
- Edit review
- Delete review
- Set visibility
- Mark as spoiler

Review data:

```text
user
media
rating
review_text
visibility
spoiler
created_at
updated_at
```

Later:

- Likes
- Comments

---

# 25. Dashboard

Route:

```text
/dashboard
```

This is the user's personal home after login.

## Main layout

```text
┌────────────────────────────────────────────────────────────┐
│ TOP BAR                                                    │
├───────────────┬────────────────────────────────────────────┤
│ SIDEBAR       │ Good evening, Rasek                        │
│               │                                            │
│ Dashboard     │ Continue Watching                          │
│ Explore       │ [card] [card] [card]                       │
│ Movies        │                                            │
│ TV Shows      │ Collection                                 │
│ Favorites     │ [card] [card] [card] [card]                │
│ Watchlist     │                                            │
│ Profile       │ Watchlist                                  │
│ Settings      │ [card] [card] [card]                       │
└───────────────┴────────────────────────────────────────────┘
```

## Dashboard data

- Greeting
- Statistics
- Continue watching
- Recently added
- Favorites
- Watchlist
- Recently rated
- Completed
- Recent reviews

All numbers and lists must be database-driven.

---

# 26. Social Architecture

Social features come after the personal collection system is reliable.

Core relationship:

```text
USER ↔ USER
```

## Friend relationship

```text
sender_id
receiver_id
status
created_at
updated_at
```

Statuses:

```text
pending
accepted
rejected
blocked
```

The database must prevent duplicate relationships.

---

# 27. Friends Module

Features:

- Search users
- Send request
- Accept
- Reject
- Remove
- Block

Views:

```text
Friends
Requests
Blocked
```

---

# 28. Public Profiles

Route:

```text
/profile/:username
```

Possible public information:

```text
Avatar
Username
Bio
Statistics
Favorite media
Public collection
Recent public activity
```

Every item must obey its visibility rule.

---

# 29. Activity Feed

Record important events such as:

```text
Added Interstellar
Rated Dune 4.5
Completed Breaking Bad
Added Minecraft to wishlist
Uploaded an album
```

Every activity has a visibility value.

Never expose private activity through the public feed.

---

# 30. Notifications

Future notifications:

```text
Friend request
Friend request accepted
Review interaction
Photo interaction
System message
```

Each notification has:

```text
is_read
created_at
actor
recipient
```

---

# 31. Interest Comparison

Route:

```text
/compare/:username
```

Example:

```text
You + Alex

Movies in common: 12
TV shows in common: 8
Games in common: 4

Common favorites:
• Interstellar
• Dune
• Minecraft
```

Simple implementation:

```text
Set(A) ∩ Set(B)
```

No machine learning is required.

---

# 32. Shared Discovery

Goal:

> Find something that both people may want to watch/play/read.

Initial algorithm:

```text
common interests
      +
related media
      -
already collected
      -
blocked/private items
      ↓
ranked candidates
```

Later this can become a more sophisticated recommendation engine.

---

# 33. Multi-Media Expansion

## Movies

Primary initial provider:

```text
TMDB
```

## TV

Primary initial provider:

```text
TMDB
```

## Anime

Candidate:

```text
AniList
```

## Manga

Candidate:

```text
AniList
```

## Books

Candidate:

```text
Open Library
```

## Games

Candidate:

```text
RAWG or another suitable current provider
```

## Music

Candidate:

```text
MusicBrainz
```

The actual provider for each later module should be checked again at implementation time for current API limits, authentication requirements, licensing, attribution, and free availability.

---

# 34. Photo System

Photos are user-generated content and should use object storage rather than PostgreSQL blobs.

## Features

- Upload
- Delete
- Albums
- Captions
- Tags
- Favorites
- Privacy
- Gallery

---

# 35. Albums

Album fields:

```text
id
user_id
name
description
cover_photo_id
visibility
created_at
updated_at
```

Examples:

```text
Travel
University
Friends
Projects
Personal
```

---

# 36. Photos

Photo metadata:

```text
id
album_id
user_id
storage_path
caption
visibility
created_at
updated_at
```

Tags:

```text
photo_id
tag
```

Actual image files live in storage.

Supabase currently lists 1 GB of file storage on its Free plan and a 50 MB maximum global file-size limit for Free projects. Therefore a student implementation should resize/compress uploads and avoid large video files. 

---

# 37. Moderation

Once public reviews, profiles, and photos exist, moderation becomes part of the complete product.

## User actions

- Report user
- Report review
- Report photo
- Report activity
- Block user

## Admin actions

- View reports
- Review content
- Dismiss report
- Remove content
- Suspend account

---

# 38. Settings

## Account

- Display name
- Username
- Password
- Email settings

## Appearance

- Theme
- Background
- Layout density

## Privacy

- Profile visibility
- Collection visibility
- Activity visibility
- Friend-request policy

## Notifications

- Friend requests
- Social activity
- System notifications

## Danger zone

- Export data
- Delete account

---

# 39. Database Design Principles

The database must separate **external media facts** from **user-specific relationships**.

Do not store a user's favorite/watch status directly inside a global media row.

The central relationship is:

```text
USER ↔ MEDIA
```

This is the foundation of the collection system.

---

# 40. Core Database Tables

## profiles

```text
id PK
username UNIQUE
display_name
avatar_url
bio
created_at
updated_at
```

## user_settings

```text
user_id PK/FK
theme
profile_visibility
collection_visibility
activity_visibility
created_at
updated_at
```

## media_items

```text
id PK
media_type
title
description
poster_url
backdrop_url
release_date
duration
public_rating
language
created_at
updated_at
```

Use a stable core `media_type` rather than treating every user-facing category as a fundamentally different kind of media. Recommended core values:

```text
movie
tv
manga
book
game
song
```

Use a separate category/tag relationship for cross-cutting labels such as `anime`. This matters because anime can be a movie or a TV/series item; treating `anime` as a completely separate database type would create avoidable duplication and awkward filtering later. The sidebar can still expose `Anime` as a filtered view.

## media_external_refs

```text
id PK
media_id FK
provider
external_id
provider_url
metadata_json
UNIQUE(provider, external_id)
```

Examples:

```text
TMDB + 157336
AniList + 12345
OpenLibrary + OL...
```

## genres

```text
id PK
name UNIQUE
```

## media_genres

```text
media_id FK
genre_id FK
PRIMARY KEY(media_id, genre_id)
```

---

# 41. Collection Tables

## user_media

```text
id PK
user_id FK
media_id FK
status
is_favorite
personal_rating
visibility
created_at
updated_at

UNIQUE(user_id, media_id)
```

That unique constraint prevents duplicate collection entries for the same user and media.

## reviews

```text
id PK
user_id FK
media_id FK
rating
review_text
visibility
spoiler
created_at
updated_at
```

If Mosaic allows only one current review per user/media item:

```text
UNIQUE(user_id, media_id)
```

---

# 42. Social Tables

## friendships

Use a canonical pair so the database cannot contain both `A → B` and `B → A` as separate accepted friendships.

Conceptually:

```text
id PK
user_low_id FK
user_high_id FK
requester_id FK
status
created_at
updated_at

UNIQUE(user_low_id, user_high_id)
```

`user_low_id` and `user_high_id` contain the ordered lower/higher user IDs (or an equivalent canonical representation). `requester_id` records who initiated the request.

## blocks

```text
id PK
blocker_id FK
blocked_id FK
created_at
UNIQUE(blocker_id, blocked_id)
```

## activities

```text
id PK
user_id FK
activity_type
target_type
target_id
visibility
metadata_json
created_at
```

## notifications

```text
id PK
user_id FK
actor_id FK
type
target_type
target_id
is_read
created_at
```

---

# 43. Photo Tables

## albums

```text
id PK
user_id FK
name
description
cover_photo_id
visibility
created_at
updated_at
```

## photos

```text
id PK
album_id FK
user_id FK
storage_path
caption
visibility
created_at
updated_at
```

## photo_tags

```text
id PK
photo_id FK
tag
```

---

# 44. Moderation Tables

## reports

```text
id PK
reporter_id FK
target_type
target_id
reason
description
status
resolved_by
resolved_at
created_at
```

---

# 45. Database Relationship Overview

```text
auth.users
    |
    +---- profiles
    |
    +---- user_settings
    |
    +---- user_media ---- media_items ---- media_external_refs
    |         |
    |         +---------- reviews
    |
    +---- friendships
    +---- blocks
    +---- activities
    +---- notifications
    +---- albums ---- photos ---- photo_tags
    +---- reports
```

---

# 46. Row Level Security

RLS is a core security requirement.

Supabase recommends using the publishable key in frontend applications together with RLS and least-privilege grants. Secret/service-role keys bypass RLS and must remain server-side.

Rules should include:

### Profiles

Users can edit their own profile.

### Settings

Users can edit their own settings.

### User media

Users manage their own collection.

### Reviews

Users manage their own reviews.

### Photos

Users manage their own uploads.

### Public data

Only intentionally public information is visible to `anon`/guest users.

### Friends

Friends can read only data that is explicitly shared with friends.

### Admin

Admin privileges must be server-side or protected through strong database policies.

---

# 47. API and Data Access Architecture

Mosaic deliberately uses a **hybrid architecture** rather than forcing every request through Go.

## 47.1 Public media discovery — browser → TMDB

For V1 public discovery:

```text
Browser
   ↓ fetch()
TMDB API
   ↓ JSON
Vanilla JS
   ↓
DOM
```

Used for:

- Trending
- Popular
- Top rated
- Upcoming
- Search
- Public media details
- Provider availability metadata where supported

This is the simplest architecture and is appropriate for the Web Lab's API-integration requirement.

## 47.2 Authentication and user data — browser → Supabase

The browser uses Supabase Auth for:

- Register
- Login
- Logout
- Session persistence

The browser can also use the Supabase JavaScript client to perform permitted database operations.

RLS determines what the current user can read or write.

Example:

```text
Browser
   ↓ supabase-js
Supabase
   ├── Auth
   └── PostgreSQL / Data API
```

This avoids building unnecessary CRUD endpoints in Go for simple V1 operations.

## 47.3 When Go becomes involved

When a feature needs server-side logic:

```text
Browser
   ↓ HTTPS / JSON / Bearer JWT
Go API
   ├── business rules
   ├── validation
   ├── authorization
   ├── external API aggregation
   └── complex database operations
```

Examples:

- Friend recommendation calculation.
- Cross-provider media aggregation.
- Advanced interest comparison.
- Notification processing.
- Admin/moderation operations.
- Server-side API proxying when credentials must be private.

## 47.4 Go → PostgreSQL

When Go is used for a server-side feature, it may connect to Supabase PostgreSQL through a server-side PostgreSQL connection and `pgx`.

The database credentials are never exposed to the browser.

RLS remains enabled as a defense-in-depth measure. The Go service must perform explicit authorization checks based on the authenticated user's identity.

## 47.5 Go → external providers

Go may call:

- TMDB
- Anime provider
- Book provider
- Game provider
- Music provider

when a server-side proxy/aggregation path is justified.

Provider credentials belong only in the Go environment in that case.

## 47.6 Optional TypeScript/Node.js

Only add a TypeScript/Node.js runtime for a concrete isolated task, such as:

- data import/migration
- content-processing script
- provider SDK utility
- automation tooling

Do not duplicate the main application business logic in Node.js.

Overall:

```text
                    ┌───────────────┐
                    │    Browser    │
                    │ Vanilla JS    │
                    └───┬───────┬───┘
                        │       │
                  fetch()       │ supabase-js
                        │       │
                        v       v
                     TMDB    Supabase
                               │
                               ├── Auth
                               └── PostgreSQL

When server-side logic is required:

Browser → Go API → Supabase / external APIs

Optional:

Go ↔ TypeScript/Node.js
only through an explicit HTTP/JSON or job boundary.
```

# 48. Frontend / Backend / Database Separation

Keep the repository separated even though Release 1 does not need Go for every request.

```text
frontend/
    Vanilla JS + HTML + CSS + Vite
    UI, routing, browser state, direct public API consumption

backend/
    Go
    Server-side APIs and business logic used by later releases

database/
    SQL schema, migrations, RLS policies, seeds
```

The optional TypeScript/Node.js layer is **not part of the default repository**. Add it only when a concrete task justifies it, preferably under a clearly named `tools/` or `scripts/` area rather than creating a second full backend.

This keeps the project easy to understand:

```text
V1:
frontend + Supabase + TMDB

Later:
frontend + Go + Supabase + external providers
```

# 49. Recommended Repository Structure

The repository should be organized for V1 simplicity while remaining ready for Go-based later releases.

```text
mosaic/
│
├── frontend/                         # HTML + CSS + Vanilla JS
│   ├── index.html
│   ├── public/
│   │   ├── favicon/
│   │   ├── icons/
│   │   └── images/
│   ├── src/
│   │   ├── styles/
│   │   │   ├── reset.css
│   │   │   ├── variables.css
│   │   │   ├── base.css
│   │   │   ├── layout.css
│   │   │   ├── components.css
│   │   │   ├── pages.css
│   │   │   └── responsive.css
│   │   ├── app/
│   │   │   ├── router.js
│   │   │   ├── state.js
│   │   │   └── guards.js
│   │   ├── api/
│   │   │   ├── tmdb.js
│   │   │   ├── supabase.js
│   │   │   └── go.js              # used when Go features are introduced
│   │   ├── components/
│   │   │   ├── navbar/
│   │   │   ├── sidebar/
│   │   │   ├── search/
│   │   │   ├── media-card/
│   │   │   ├── media-row/
│   │   │   ├── rating/
│   │   │   ├── review/
│   │   │   ├── modal/
│   │   │   ├── toast/
│   │   │   ├── loader/
│   │   │   └── empty-state/
│   │   ├── pages/
│   │   │   ├── explore/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── dashboard/
│   │   │   ├── media/
│   │   │   ├── collection/
│   │   │   ├── favorites/
│   │   │   ├── watchlist/
│   │   │   ├── profile/
│   │   │   ├── friends/
│   │   │   ├── compare/
│   │   │   ├── photos/
│   │   │   └── settings/
│   │   └── utils/
│   │       ├── debounce.js
│   │       ├── formatters.js
│   │       ├── storage.js
│   │       └── validation.js
│   ├── package.json
│   └── vite.config.js
│
├── backend/                           # Go; introduced when server-side needs justify it
│   ├── cmd/
│   │   └── api/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── http/
│   │   │   ├── handler/
│   │   │   ├── middleware/
│   │   │   └── response/
│   │   ├── auth/
│   │   ├── domain/
│   │   │   ├── media/
│   │   │   ├── user/
│   │   │   ├── collection/
│   │   │   ├── review/
│   │   │   ├── social/
│   │   │   └── photo/
│   │   ├── service/
│   │   ├── repository/
│   │   ├── provider/
│   │   │   ├── tmdb/
│   │   │   ├── anime/
│   │   │   ├── books/
│   │   │   ├── games/
│   │   │   └── music/
│   │   └── platform/
│   │       ├── database/
│   │       ├── logger/
│   │       └── cache/
│   ├── migrations/
│   ├── tests/
│   ├── go.mod
│   ├── go.sum
│   └── README.md
│
├── database/
│   ├── schema/
│   │   ├── 001_core.sql
│   │   ├── 002_collection.sql
│   │   ├── 003_reviews.sql
│   │   ├── 004_social.sql
│   │   ├── 005_photos.sql
│   │   └── 006_moderation.sql
│   ├── seeds/
│   ├── policies/
│   └── README.md
│
├── docs/
│   ├── project-design.md
│   ├── architecture.md
│   ├── database.md
│   ├── api.md
│   ├── routing.md
│   ├── security.md
│   ├── testing.md
│   ├── deployment.md
│   └── presentation.md
│
├── scripts/
│   ├── seed/
│   └── maintenance/
│
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

### Important structure rule

The `backend/` directory is the planned Go server. It should not become a blocker for V1.

The frontend may contain `go.js` from the beginning as a small API client abstraction, but it does not need to call a running Go server until a Go-backed feature is introduced.

# 50. Why Vite?

Vite is a development/build tool, not the application framework.

The frontend still directly demonstrates:

```text
HTML5
CSS3
Vanilla JavaScript ES6+
DOM
Fetch API
Browser APIs
```

The production backend is independent of Vite and is written in Go.

Vite provides:

- local development server
- module imports
- build process
- environment handling
- production bundling

---

# 51. Hosting Architecture — $0 Target

The project should use **different deployment shapes for different releases** rather than forcing the Go server into Release 1.

## Release 1 — simplest

```text
                  Internet
                     |
          ┌──────────┴──────────┐
          |                     |
          v                     v
   Cloudflare Pages          Supabase
      Frontend             Auth + PostgreSQL
   HTML/CSS/Vanilla JS        + Storage
          |
          v
        TMDB
```

Cloudflare Pages can serve a static HTML/CSS/JS application for free. Its current Free plan supports static site builds, with documented limits such as 500 builds/month and 20,000 files per site. Static asset requests are free. citeturn169894search6turn169894search7

This is the preferred deployment for the 25-day university submission because there is no custom server to maintain.

## Later releases — when Go is needed

```text
                  Internet
                     |
          ┌──────────┴──────────┐
          |                     |
          v                     v
   Cloudflare Pages         Render Free
      Frontend              Go Web API
                                |
                    ┌───────────┴───────────┐
                    |                       |
                    v                       v
                Supabase                External APIs
             PostgreSQL/Auth            TMDB/etc.
```

Render documents native Go web-service deployment and provides a Free web-service option. Free services spin down after 15 minutes of inactivity and take about a minute to wake, so this is appropriate for a student/demo backend but not an always-on production service. citeturn169894search0turn169894search1

## Deployment principle

Do not deploy a Go server merely because the repository contains Go code.

Deploy it when a feature actually depends on it.

# 52. Environment Variables

## Release 1 frontend

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_TMDB_API_KEY=...
```

### Important

Anything prefixed with `VITE_` is bundled for the browser and must be considered public.

Therefore:

```text
VITE_TMDB_API_KEY
```

is **not a secret** once used by the frontend. Never use a Supabase secret key here.

TMDB supports the API-key query-parameter method for application authentication. If the team later decides the TMDB credential must remain private, move TMDB calls to the Go backend and replace the direct frontend call with a Go API client. citeturn676921view0

## Go backend — later releases

```env
PORT=8080
DATABASE_URL=...
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
TMDB_READ_ACCESS_TOKEN=...
CORS_ALLOWED_ORIGINS=...
```

These values stay server-side.

## Optional TypeScript/Node.js tooling

Only when actually needed:

```env
API_BASE_URL=...
INTERNAL_API_TOKEN=...
```

Commit only:

```text
.env.example
```

Never commit real `.env` files or server secrets.

# 53. Free-Tier Feasibility

The plan was checked against current official documentation in September 2026.

Supabase Free currently lists, among other limits:

- $0/month
- 500 MB database size
- 1 GB file storage
- 5 GB egress
- 50,000 monthly active users
- 500,000 Edge Function invocations
- 2 active free projects

Free projects may be paused after inactivity.

Render currently documents a Free web-service plan with a 0.1 CPU / 512 MB instance, 750 free instance hours per month, and automatic spin-down after 15 minutes of inactivity. Render also explicitly documents Go web-service deployment. The free service's cold-start behavior is acceptable for a university demonstration but should not be presented as an always-on production backend.

Cloudflare Pages currently documents free static hosting, so it remains suitable for the vanilla-JS frontend.

These limits are sufficient for a small university project when usage is controlled, but the team should re-check provider terms immediately before deployment because free-tier limits can change.

---

# 54. Coding and Architecture Rules

1. Do not commit secrets.
2. Never place secret/service-role keys in frontend code.
3. Keep API/provider code outside page components.
4. Keep database code outside page rendering.
5. Do not let pages depend directly on external provider JSON schemas.
6. Use one normalized media model.
7. Reuse the media-card component.
8. Use DB constraints as well as frontend validation.
9. Use RLS for authorization at the data boundary.
10. Add future modules without redesigning core tables.
11. Do not build social features before the personal collection is reliable.
12. Do not implement all external providers simultaneously.

---

# 55. Error and Empty States

Every API-driven page must handle:

## Loading

```text
Skeleton / loading state
```

## No result

```text
No media found.
Try a different search.
```

## API failure

```text
We couldn't load this content right now.
[Retry]
```

## Database failure

```text
Your changes could not be saved.
[Retry]
```

## Empty collection

```text
Your collection is empty.
[Explore Media]
```

---

# 56. Search Performance

Use debouncing:

```text
keystrokes
    ↓
debounce
    ↓
API request
```

Do not send a provider request for every character typed.

Also:

- Cache recent search/detail data locally where sensible.
- Avoid duplicate requests.
- Paginate or load more.
- Show rate-limit errors clearly.

TMDB documents that some amount of API rate limiting is enforced, so request volume should be controlled.

---

# 57. Image Strategy

Do not permanently copy every external media poster into the database/storage.

For provider media:

```text
Store provider URL/path + external IDs
```

For user photos:

```text
Store actual files in object storage
Store only metadata/path in PostgreSQL
```

This keeps the database compact.

---

# 58. Testing Strategy

Testing should happen throughout development.

## Functional

- Register
- Login
- Logout
- Search
- Open details
- Add collection item
- Remove item
- Favorite
- Watchlist
- Status
- Rating
- Review
- Friend request
- Photo upload

## Security

- Guest cannot read private collection data.
- User A cannot modify User B's collection.
- User A cannot delete User B's photo.
- Private review is not exposed publicly.
- Service/secret keys are not shipped to browser.
- RLS rejects unauthorized operations.

## Responsive

```text
Mobile
Tablet
Laptop
Large desktop
```

---

# 59. Git Workflow

```text
main
  |
develop
  |
  +-- feature/explore
  +-- feature/search
  +-- feature/auth
  +-- feature/collection
  +-- feature/dashboard
  +-- feature/profile
  +-- feature/social
  +-- feature/photos
```

Workflow:

```text
Issue
 ↓
Feature branch
 ↓
Implement
 ↓
Local test
 ↓
Pull Request
 ↓
Review
 ↓
Merge to develop
 ↓
Release candidate
 ↓
main
```

---

# 60. Team Responsibility Model

There are five official members, but the project must remain viable with approximately three active developers.

## Member 1 — Frontend / UI

- HTML
- CSS
- components
- responsive design

## Member 2 — JavaScript / API

- JavaScript
- TMDB
- search
- provider adapters
- UI state

## Member 3 — Database / Auth / Future Go Backend

- Go REST API
- PostgreSQL
- pgx
- Supabase integration
- JWT verification
- RLS
- authentication
- backend deployment

## Member 4 — QA / Documentation

- testing
- diagrams
- documentation
- presentation

## Member 5 — Design / QA / Support

- visual assets
- testing
- demo data
- presentation

### Important

The implementation plan is **module-based, not person-based**. Everyone should understand the overall system sufficiently for the project viva.

---

# 60. Backend Strategy Decision

The backend decision is intentionally staged.

## Release 1 — no mandatory custom backend

Use:

```text
Frontend
├── Vanilla JavaScript
├── TMDB via fetch()
└── Supabase via supabase-js
```

This keeps the project small enough for the 25-day deadline and directly demonstrates the course topics.

## Release 2+ — Go backend where it adds value

Use:

```text
Go
├── net/http
├── chi
├── pgx
├── JWT verification
├── REST/JSON
└── business/domain services
```

Introduce Go for:

- server-side secrets
- provider aggregation
- complex social logic
- recommendations
- notifications/background jobs
- moderation
- caching/rate limiting
- transactional workflows

## TypeScript/Node.js — optional companion

If a small backend-side task is genuinely easier in the JavaScript ecosystem, the preferred choice is:

```text
TypeScript + Node.js
```

Use it for isolated:

- import/export scripts
- data transformations
- automation
- third-party SDK tooling

Do not create a second full application backend.

### Decision rule

```text
Can the browser safely and simply do it?
        |
       yes
        ↓
Frontend JS / Supabase / public API

       no
        ↓
Can Go handle it cleanly?
        |
       yes
        ↓
Go backend

Only when a concrete JS-specific advantage exists
        ↓
TypeScript/Node.js auxiliary tool/service
```

This is the project's core complexity-control rule.

# 61. Complete Module Map

```text
M00 Foundation
M01 Design System
M02 Public Explore
M03 Global Search
M04 Media Details
M05 Authentication
M06 Profile
M07 Collection
M08 Favorites
M09 Watchlist
M10 Status Tracking
M11 Ratings
M12 Reviews
M13 Dashboard
M14 Privacy / Settings
M15 Friends
M16 Activity
M17 Notifications
M18 Interest Comparison
M19 Shared Discovery
M20 Anime
M21 Manga
M22 Books
M23 Games
M24 Songs
M25 Photos
M26 Albums
M27 Moderation
M28 Recommendations
M29 Data Export / Account Delete
M30 Performance / Security
M31 Testing
M32 Deployment
M33 Final Polish
```

---

# 62. Module M00 — Foundation

### Goal

Make the project runnable and deployable.

### Tasks

- GitHub repository
- Vite frontend setup
- Go backend setup
- Go module initialization
- Supabase project
- TMDB access
- environment handling
- basic REST health endpoint
- CORS configuration
- base README
- base application shell

### Done when

Local app and a production preview both load successfully.

---

# 63. Module M01 — Design System

Define once:

- Typography
- Colors
- Light/dark themes
- Spacing
- Radius
- Shadows
- Buttons
- Inputs
- Cards
- Badges
- Modal
- Toast
- Loading states

---

# 64. Module M02 — Public Explore

Implement:

- `/explore`
- hero
- trending
- popular
- top-rated
- upcoming
- poster rows
- responsive media cards

Done when a guest sees real media with no login.

---

# 65. Module M03 — Global Search

Implement:

- top-bar search
- debounce
- query state
- filters
- results
- empty state
- errors
- media navigation

---

# 66. Module M04 — Media Details

Implement:

- dynamic route
- normalized media object
- poster/backdrop
- metadata
- providers
- related items
- public/private action states

---

# 67. Module M05 — Authentication

Implement:

- registration
- login
- logout
- session restoration
- protected routes
- password recovery

Done when:

```text
Guest → /explore
Logged in → /dashboard
```

---

# 68. Module M06 — Profile

Implement:

- profile creation
- avatar
- username
- display name
- bio
- editing
- public profile

---

# 69. Module M07 — Collection

Implement:

- add
- remove
- update
- status
- unique `(user_id, media_id)` constraint
- collection page

---

# 70. Module M08 — Favorites

Implement:

- favorite/unfavorite
- favorites page
- filters

---

# 71. Module M09 — Watchlist

Implement:

- add/remove
- filters
- sorting
- status transitions

---

# 72. Module M10 — Status Tracking

Implement a generalized status system rather than movie-only labels.

---

# 73. Module M11 — Ratings

Implement:

- personal rating
- edit rating
- remove rating
- display personal vs public score

---

# 74. Module M12 — Reviews

Implement:

- create
- edit
- delete
- privacy
- spoiler flag

Later:

- likes
- comments

---

# 75. Module M13 — Dashboard

Implement:

- greeting
- statistics
- continue watching
- recently added
- favorites
- watchlist
- recently rated
- completed
- reviews

Done when `/dashboard` is a dynamic personal home.

---

# 76. Module M14 — Privacy / Settings

Implement:

- theme
- account settings
- profile visibility
- collection visibility
- activity visibility
- notifications
- data export/delete entry points

---

# 77. Module M15 — Friends

Implement:

- user search
- request
- accept/reject
- remove
- block

---

# 78. Module M16 — Activity

Implement event records and a privacy-aware activity feed.

---

# 79. Module M17 — Notifications

Implement:

- friend requests
- accepted requests
- social interactions
- system notifications
- read/unread state

---

# 80. Module M18 — Interest Comparison

Implement set intersection for:

- favorites
- watchlist
- completed
- collected media

Display totals and common items.

---

# 81. Module M19 — Shared Discovery

Initial flow:

```text
user A interests
      +
user B interests
      ↓
common/related items
      -
already collected
      ↓
candidates
```

---

# 82. Modules M20–M24 — Additional Media Types

Add one provider/domain at a time:

```text
M20 Anime
M21 Manga
M22 Books
M23 Games
M24 Songs
```

Every module must reuse:

- the common media model
- provider adapter pattern
- collection relationship
- favorite/watchlist/status UI where relevant

Do not create a new database architecture for every category.

---

# 83. Modules M25–M26 — Photos and Albums

Implement:

- upload
- compression
- albums
- captions
- tags
- favorites
- visibility
- deletion
- gallery

Keep actual files in storage and metadata in PostgreSQL.

---

# 84. Module M27 — Moderation

Implement:

- reports
- blocking
- admin review
- content removal
- user moderation

---

# 85. Module M28 — Recommendations

Release progression:

```text
A: set intersection
B: shared favorites
C: genre/rating similarity
D: external related-media signals
```

No machine learning is required for the first implementation.

---

# 86. Module M29 — Data Management

Implement:

- export personal collection
- export profile data
- delete account
- delete photos/content
- clear activity where appropriate

---

# 87. Module M30 — Performance / Security

## Performance

- lazy-load images
- responsive images
- debounce search
- avoid duplicate requests
- cache public requests where appropriate
- paginate large collections
- skeleton loaders
- minimize DOM work

## Security

- RLS
- least privilege
- server-side secrets
- validation
- output escaping
- upload restrictions
- file size limits
- protected routes
- rate limiting where appropriate

---

# 88. Module M31 — Testing

Test continuously, then perform a full regression pass before release.

Test:

- authentication
- search
- media details
- CRUD
- favorites
- watchlist
- rating
- reviews
- friends
- privacy
- photos
- moderation
- responsive layout

---

# 89. Module M32 — Deployment

## Release 1

```text
GitHub
  └──→ Cloudflare Pages
          └── Vanilla JS frontend
                  ├──→ TMDB
                  └──→ Supabase

Supabase
  ├── Auth
  ├── PostgreSQL
  └── Storage
```

## Later releases

```text
GitHub
  ├──→ Cloudflare Pages
  │      └── frontend
  │
  └──→ Render Free
         └── Go API
                ├──→ Supabase
                └──→ external providers
```

Deployment must be reproducible from the repository.

### Deployment note

Render's Free Go service may sleep when idle. The frontend remains available, but a feature that depends on the Go service may experience a cold-start delay.

---

# 90. Module M33 — Final Polish

Final tasks:

- responsive cleanup
- accessibility basics
- loading/error/empty states
- typography
- spacing
- icons
- micro-animations
- favicon
- metadata
- README
- documentation
- demo content
- presentation screenshots

---

# 91. Release Roadmap

## Release 0 — Foundation

```text
M00–M01
```

## Release 1 — Core Discovery & Personal Collection

```text
M02–M14
```

Includes:

- public Explore
- global search
- media details
- authentication
- profile
- collection
- favorites
- watchlist
- status
- ratings
- reviews
- dashboard
- privacy/settings

**This is the 25-day university submission target.**

## Release 2 — Social

```text
M15–M19
```

Includes:

- friends
- activity
- notifications
- comparison
- shared discovery

## Release 3 — More Media

```text
M20–M24
```

Includes:

- anime
- manga
- books
- games
- songs

## Release 4 — Photos

```text
M25–M26
```

Includes:

- photos
- albums
- tags
- storage
- privacy

## Release 5 — Trust and Intelligence

```text
M27–M29
```

Includes:

- moderation
- recommendations
- data management

## Release 6 — Engineering and Polish

```text
M30–M33
```

Includes:

- performance
- security
- regression testing
- deployment hardening
- final polish

---

# 92. 25-Day University Schedule

The complete project is large, but the first release remains achievable.

## Days 1–2

Foundation, API access, database design, wireframes, Git setup.

## Days 3–4

Navbar, sidebar, search bar, theme, responsive shell.

## Days 5–7

Public Explore + TMDB.

## Days 8–9

Global search + media details.

## Days 10–11

Authentication and protected routing.

## Days 12–14

Database + personal collection.

## Day 15

**V1 core freeze.**

## Days 16–17

Dashboard refinement.

## Days 18–19

Profile + reviews.

## Days 20–21

Optional social foundation only if V1 is already stable.

## Day 22

UI polish.

## Day 23

Testing.

## Day 24

Deployment + documentation + presentation.

## Day 25

Buffer for bugs and deployment issues.

---

# 93. V1 Scope Freeze

Mandatory:

```text
✓ /explore public page
✓ Public top bar
✓ Centered global search
✓ Trending posters
✓ Popular posters
✓ Movies
✓ TV shows
✓ Media details
✓ Provider availability where available
✓ Register
✓ Login
✓ Logout
✓ Session handling
✓ /dashboard
✓ Personal collection
✓ Favorites
✓ Watchlist
✓ Status
✓ Personal rating
✓ Basic profile
✓ Database CRUD
✓ RLS
✓ Responsive design
✓ Loading states
✓ Error states
✓ Free deployment
```

Optional only after all mandatory items work:

```text
Reviews
Public profile sharing
Friends
Comparison
```

---

# 94. Feature Dependency Graph

```text
Foundation
   |
   +--> Public Explore
   |      |
   |      +--> Search
   |      +--> Media Details
   |
   +--> Authentication
          |
          +--> Profile
          |
          +--> Collection
                 |
                 +--> Favorites
                 +--> Watchlist
                 +--> Status
                 +--> Rating
                 +--> Reviews
                 |
                 +--> Dashboard
                        |
                        +--> Activity
                        +--> Social
                               |
                               +--> Friends
                               +--> Compare
                               +--> Shared Discovery
```

Photos can begin after authentication/storage foundations are stable, but do not allow them to delay V1.

---

# 95. Definition of Done — Release 1

A guest can:

```text
Open /explore
  ↓
See hero + trending + popular posters
  ↓
Search from the centered top-bar search
  ↓
Open media details
  ↓
See provider availability when available
```

Then:

```text
Login/Register
  ↓
/dashboard
  ↓
Add media
  ↓
Favorite
  ↓
Watchlist
  ↓
Set status
  ↓
Rate
  ↓
Refresh
  ↓
Data persists
  ↓
Logout
  ↓
/explore
```

If this flow works reliably, Release 1 is a valid Web Programming Laboratory submission.

---

# 96. Final Architecture

## Release 1 — simple and direct

```text
                           MOSAIC V1
                              |
             ┌────────────────┼────────────────┐
             |                |                |
             v                v                v
        FRONTEND           SUPABASE          TMDB
     HTML/CSS/JS         Auth + DB +      Media API
        + Vite             Storage
             |                |
             |                |
             +----- fetch()---+
                  /supabase-js
```

Public media discovery:

```text
Browser → TMDB
```

User/account data:

```text
Browser → Supabase
```

## Later releases — add Go where needed

```text
Browser
   |
   +---- TMDB / Supabase directly for simple operations
   |
   +---- Go API for server-side features
             |
             +---- PostgreSQL
             +---- TMDB / other providers
             +---- recommendation logic
             +---- social logic
             +---- notifications
```

## Optional TypeScript/Node.js

```text
TypeScript/Node.js
        |
        +---- isolated scripts/jobs/integrations
        |
        +---- HTTP/JSON boundary to Go if ever needed
```

The key architectural idea is **not** "everything must go through Go".

It is:

> **Use the browser and managed services for simple work; use Go when server-side control, security, aggregation, or complex business logic provides a real benefit.**

# 97. Final Technology Stack

## Frontend

```text
HTML5
CSS3
Vanilla JavaScript ES6+
Vite
```

## Release 1 data services

```text
Supabase
├── Authentication
├── PostgreSQL
├── Row Level Security
└── Storage

TMDB
└── Public media discovery API
```

## Later backend

```text
Go
├── net/http
├── chi
├── pgx
└── REST/JSON
```

## Optional backend-side JavaScript

```text
TypeScript
Node.js
```

Only for isolated auxiliary work where it provides a concrete advantage.

## Hosting

```text
Cloudflare Pages → frontend
Supabase         → database/auth/storage
Render Free      → Go backend when required
```

### Important

Release 1 does **not** require the Go service to be deployed. The Go backend is an extension point, not an artificial middle layer.

# 98. Go API Surface — Later Release

Go endpoints are introduced only when a feature needs server-side logic.

Initial planned surface:

```text
/api/v1/health

/api/v1/recommendations
/api/v1/compare/:username
/api/v1/friends
/api/v1/notifications
/api/v1/moderation/*
```

If later features move collection/review operations behind Go, additional routes may be introduced:

```text
/api/v1/me
/api/v1/me/collection
/api/v1/me/favorites
/api/v1/me/watchlist
/api/v1/me/reviews
```

### Important

Do not build every endpoint on Day 1.

Start with only the endpoints required by an actual server-side feature.

This keeps the Go backend small and understandable.

# 99. Final Product Model

The complete application can be reduced to four central relationships:

```text
USER
  |
  +---- MEDIA
  |
  +---- USER ↔ MEDIA
  |
  +---- USER ↔ USER
```

Everything else grows from those relationships.

### USER

Identity, profile, settings, privacy.

### MEDIA

External/global media entities.

### USER ↔ MEDIA

Collection, favorite, watchlist, status, rating, review.

### USER ↔ USER

Friends, activity, comparison, social discovery.

Photos extend the user side through storage and albums.

---

# 100. Project Success Criteria

## Functional

- Public discovery works without login.
- Authenticated users get `/dashboard`.
- Global search works.
- Media details work.
- Collection CRUD works.
- Favorites work.
- Watchlist works.
- Status works.
- Ratings work.
- Dashboard is data-driven.

## Technical

- Semantic HTML
- Modular CSS
- Modular JavaScript
- Provider abstraction
- Database abstraction
- Proper relationships
- RLS
- Responsive UI
- Error handling
- Loading states
- Reproducible deployment

## Maintainability

A future developer should be able to add:

```text
Anime
Manga
Books
Games
Songs
Photos
Friends
Comparison
Recommendations
```

without replacing the foundation.

---

# 101. Final Recommendation

Mosaic should not use Go as a compulsory proxy between the browser and every service.

Use this rule:

```text
Simple public media request?
    → Vanilla JS → TMDB

Simple authenticated CRUD?
    → Vanilla JS → Supabase with RLS

Needs server-side control/business logic?
    → Vanilla JS → Go API

Needs a genuinely JS-specific backend tool?
    → TypeScript + Node.js, isolated
```

This gives the project three benefits at the same time:

1. **Low complexity for the 25-day lab deadline.**
2. **Real Go backend experience when the project becomes complex enough to justify it.**
3. **A clean architecture that can grow without rewriting the frontend or database.**

The team should therefore build Release 1 without making the Go service a blocker, while keeping the Go codebase ready for the later social, recommendation, notification, moderation, and aggregation modules.

---

# 102. Official Reference Documentation

Use official documentation when implementing or re-checking platform terms. Free tiers and APIs can change, so verify these pages again immediately before deployment.

## Go

- https://go.dev/doc/

## Node.js / TypeScript (optional backend layer)

- https://nodejs.org/docs/latest/api/typescript.html
- https://www.typescriptlang.org/docs/handbook/

## TMDB

- https://developer.themoviedb.org/docs/getting-started
- https://developer.themoviedb.org/docs/authentication-application
- https://developer.themoviedb.org/reference/movie-watch-providers

## Supabase

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/database/secure-data
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/auth/jwts
- https://supabase.com/pricing

## Render — Go backend hosting

- https://render.com/docs/deploy-go-nethttp
- https://render.com/docs/free
- https://render.com/docs/web-services

## Cloudflare Pages — frontend hosting

- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

---

# 103. Final One-Sentence Project Definition

> **Mosaic is a free media discovery, personal collection, and social platform where visitors can browse and search media through a public `/explore` page, while authenticated users receive a personalized `/dashboard` for organizing, rating, reviewing, and managing their collections, with social, multi-media, photo, comparison, and recommendation features designed as modular future releases.**
