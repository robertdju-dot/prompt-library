# UI/UX Wireframe: Blog CMS

This document outlines the layout mockups and spacing rules for the Blog CMS interface, matching the **Neutral-Plus** visual theme of the SaaS application.

---

## 1. Admin Dashboard: Blog CMS Tab Layout
Visible to admins under the tab selector.

```
+-------------------------------------------------------------------------+
|  [Sidebar]    [Header: Search prompts...]                     [Avatar]  |
|  - Dashboard  ========================================================  |
|  - Library    [Blog CMS Workspace]                     [+ Create Post]  |
|  - Collec.    --------------------------------------------------------  |
|  - Billing    [Search post...] [Filter: All / Draft / Published]        |
|  - Settings                                                             |
|  - Admin      +------------------------------------------------------+  |
|  - Blog CMS   | Cover   | Title          | Status    | Date  | Action|  |
|               | [Image] | Guide to GPT-4 | Published | 10/24 | [Edit]|  |
|               | [Image] | Prompt Struct. | Draft     | 10/22 | [Edit]|  |
|               +------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Modal Popup: Create/Edit Post
Modal triggered by clicking `+ Create Post` or `[Edit]`.

```
+---------------------------------------------------------------+
| Create New Blog Post                                      [X] |
| ------------------------------------------------------------- |
| Title:        [ Unlocking GPT-4 Reasonings                  ] |
| Subtitle:     [ Advanced prompt structures for developers    ] |
| Slug:         [ unlocking-gpt-4-reasonings                  ] |
| Cover Image:  [ https://images.unsplash.com/photo-...       ] |
|               Preset choices: [Tech 1]  [Tech 2]  [Tech 3]    |
| Tags:         [ Prompting, GPT-4, Engineering               ] |
| Status:       (o) Draft    ( ) Published                      |
| Content (Markdown):                                           |
| +-----------------------------------------------------------+ |
| | # Introduction                                            | |
| | Try this structure...                                     | |
| +-----------------------------------------------------------+ |
|                                             [Cancel] [Save]   |
+---------------------------------------------------------------+
```

---

## 3. Public Feed Layout (`/blog`)
Accessible by everyone at the `/blog` URL.

```
+-------------------------------------------------------------------------+
| [Online Prompt Library Logo]           [Collections] [Pricing] [Log In] |
| ======================================================================= |
|                          THE PROMPT LAB BLOG                            |
|             Guides, tutorials, and tips from the experts.               |
|                                                                         |
|  [ Search articles... ]    Tags: [All] [Prompting] [GPT-4] [API]        |
|                                                                         |
|  +------------------+  +------------------+  +------------------+       |
|  |   [Cover Img]    |  |   [Cover Img]    |  |   [Cover Img]    |       |
|  |  Prompting Guide |  |  DeepSeek guide  |  |  SaaS Billing    |       |
|  |  Subt: struct... |  |  Subt: chain...  |  |  Subt: keys...   |       |
|  |  [Tag1] [Tag2]   |  |  [Tag1]          |  |  [Tag3]          |       |
|  |  By Alex | 10/24 |  |  By Alex | 10/22 |  |  By Admin | 10/19|       |
|  +------------------+  +------------------+  +------------------+       |
+-------------------------------------------------------------------------+
```

---

## 4. Single Article Details Layout (`/blog/[slug]`)
Visual breakdown of the article reading page.

```
+-------------------------------------------------------------------------+
| [Logo]                                              [Dashboard] [Login] |
| ======================================================================= |
|   <- Back to Blog                                                       |
|                                                                         |
|   [Cover Image Banner - Wide & Centered]                                |
|                                                                         |
|   TAGS: #PROMPTING #AI                                                  |
|   TITLE: Unlocking Advanced Reasonings in DeepSeek models               |
|   SUBTITLE: How to structure prompting architectures to elicit CoT...   |
|   BY: Alex Rivera [Avatar] | Published: Oct 24, 2026                    |
|   -------------------------------------------------------------------   |
|   Introduction (Markdown rendered)                                     |
|   This is body text using Inter. Let's see some code:                   |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |  You are an expert copywriter. Write a...                       |   |
|   +-----------------------------------------------------------------+   |
|                                                                         |
+-------------------------------------------------------------------------+
```
