# Learning Management & Content Sharing Platform

# Project Overview

This platform is designed to manage organizations, users, learning content, meetings, and recorded sessions through a centralized web application.

The system consists of 3 roles:

1. Super Admin
2. Organization Admin
3. User

Current structure:
- One organization contains:
  - One admin
  - One user

This structure is currently limited intentionally for MVP development and can be expanded later based on requirements.

---

# Tech Stack

## Frontend
- React.js

## Backend
- FastAPI

## Database
- Neon PostgreSQL

## Storage
- Cloud Storage (AWS S3 or equivalent)

## Integrations
- Google Calendar API
- Google Meet Integration

---

# Platform Roles

---

# 1. Super Admin

The Super Admin controls the entire platform.

## Responsibilities

### Organization Management
- Create organization
- Bulk upload organizations
- Edit organization details

### Admin Management
- Create one admin per organization

### Content Library Management
- Upload documents for all organizations
- Bulk upload documents
- Create categories
- Manage categories
- Filter documents by:
  - Date
  - Category
  - File Type

### Supported File Types
- PDF
- PPT
- DOCX
- XLSX
- Videos

### Masterclass Management
- Add upcoming sessions
- Upload recorded sessions
- Add Google Meet/Zoom links

### Tools Management
- Add calculator tools
- Manage tool visibility

### Meeting Management
- Receive meeting requests
- Accept/reject meetings
- Generate Google Meet links
- Add MOM/Meeting Notes
- View meeting history

---

# Super Admin Flow

## Step 1 — Login
Super Admin logs into platform.

## Step 2 — Dashboard
Dashboard displays:
- Total Organizations
- Total Users
- Uploaded Documents
- Upcoming Meetings

## Step 3 — Organization Creation
Super Admin:
- Creates organization manually
- Bulk uploads organizations

## Step 4 — Admin Creation
Super Admin assigns one admin to organization.

## Step 5 — Content Upload
Super Admin uploads:
- PDFs
- PPTs
- DOCX
- XLSX
- Videos

Uploaded content becomes visible to ALL users.

## Step 6 — Category Management
Super Admin:
- Creates categories
- Edits categories
- Deletes categories

## Step 7 — Meeting Management
Super Admin:
- Accepts meetings
- Generates Google Meet links
- Adds MOM notes

---

# 2. Organization Admin

Each organization has one admin.

## Responsibilities

### User Management
- Approve one user
- Accept/reject registration

### Meeting Management
- View meeting details

---

# Organization Admin Flow

## Step 1 — Login
Admin logs into platform.

## Step 2 — Dashboard
Dashboard displays:
- User Request Status
- Meetings
- Shared Content

## Step 3 — User Approval
Admin:
- Accepts user request
- Rejects user request

---

# 3. User

The user accesses learning content and meetings.

## Responsibilities

### Profile Management
User fills:
- Organization Name
- Number of Employees
- Employee Name
- Department
- Years of Experience
- Number of Clients
- AUM
- Products being dealt with

### Content Access
User can:
- View PDFs
- View PPTs
- View DOCX
- View Excel files
- Watch videos

### Filtering
User can filter content by:
- Category
- Upload Date
- File Type

### Masterclass Access
User can:
- View upcoming sessions
- Join sessions
- Watch recordings

### Tools Access
User can access calculator tools.

### Meeting Scheduling
User can:
- Request meetings
- View meeting history
- View MOM notes

---

# Modules

---

# Authentication Module

## Features
- Login
- Registration
- Role-based access

Roles:
- Super Admin
- Admin
- User

---

# Organization Module

## Features
- Single organization creation
- Bulk organization upload

---

# User Approval Module

## Features
- User registration
- User approval
- One user per organization

---

# Content Library Module

## Features
- Bulk upload
- Category management
- Date filtering
- File type filtering

---

# Masterclass Module

## Features
- Upcoming sessions
- Recorded sessions
- Meeting links

---

# Tools Module

## Features
- Calculator-based tools
- Dynamic tool addition later

---

# Meeting Module

## Features
- Meeting scheduling
- Google Meet generation
- Meeting notes
- Meeting history

---

# High-Level Architecture

```text
React Frontend
        ↓
FastAPI Backend
        ↓
Neon PostgreSQL
        ↓
Cloud File Storage
        ↓
Google Calendar & Google Meet
```

---

# Database Tables

## Organizations
- organization_id
- organization_name
- employee_count

## Admins
- admin_id
- organization_id
- name
- email

## Users
- user_id
- organization_id
- department
- experience
- clients
- AUM
- products

## Categories
- category_id
- category_name

## Content
- content_id
- title
- file_type
- category_id
- upload_date
- file_url

## Meetings
- meeting_id
- user_id
- meet_link
- notes
- status

## Tools
- tool_id
- tool_name
- tool_type

---

# Objective

The platform is being designed to:
- Centralize learning content
- Simplify organization management
- Manage meetings efficiently
- Provide easy access to recordings and documents
- Validate workflows before full development
