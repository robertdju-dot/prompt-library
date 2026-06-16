# PRD.md

# Prompt Library - Product Requirements Document

## Overview

Prompt Library is a SaaS web application that allows users to discover, manage, organize, and reuse AI prompts. Users can store their own prompts, access curated prompt collections, and utilize dynamic variables using the `##VariableName##` format.

---

# Goals

* Centralized prompt management
* Personal prompt storage
* Dynamic variable replacement
* Subscription monetization
* Curated prompt collections
* Fast search and filtering

---

# User Roles

## Free User

* Up to 10 prompts
* Access Basic Prompt Collection
* Search prompts
* Export prompts

## Tier 1 User

* Up to 100 prompts
* Access Basic Collection
* Access Premium Collection
* Search prompts
* Export prompts

## Tier 2 User

* Up to 1000 prompts
* Access Basic Collection
* Access Premium Collection
* Search prompts
* Export prompts

## Admin

* Manage users
* Manage all prompts
* Manage prompt visibility
* View analytics

---

# Prompt Fields

## User Visible

| Field        | Type      |
| ------------ | --------- |
| Title        | String    |
| Description  | Text      |
| Category     | String    |
| Tags         | Array     |
| Content      | Text      |
| Created Date | Timestamp |

## Admin Only

| Field  | Type                     |
| ------ | ------------------------ |
| Owner  | User Reference           |
| Status | Basic / Premium / Hidden |

---

# Dynamic Variables

Example:

Create a marketing strategy for ##BusinessName## targeting ##Audience##.

The system automatically detects variables and allows users to fill them before copying.

---

# Subscription Plans

## Free

* $0/month
* 10 prompts

## Pro

* $7/month
* 100 prompts
* Premium Collection

## Power User

* $15/month
* 1000 prompts
* Premium Collection
* Priority Support

---

# Core Features

* Authentication
* Prompt CRUD
* Prompt Collections
* Dynamic Variables
* Tags
* Search
* Export TXT
* Subscription Billing
* Admin Dashboard

---

# MVP Scope

* Google Login
* Email Login
* Prompt CRUD
* Dynamic Variables
* Tags
* Search
* Export TXT
* Admin Dashboard
* Stripe Billing

---

# Future Features

* Public Marketplace
* Prompt Sharing
* Teams
* API Access
* Mobile App
* AI Prompt Generator
* Version History
