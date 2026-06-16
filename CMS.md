# Content Management System (CMS) Specification

## Project

Online Prompt Library CMS

Website:
[https://www.onlinepromptlibrary.com](https://www.onlinepromptlibrary.com)

---

# Overview

The Content Management System (CMS) enables administrators and content writers to create, edit, publish, and manage SEO-optimized blog posts focused on Prompt Engineering, Artificial Intelligence, Generative AI, LLMs, AI Agents, Automation, and related topics.

The CMS should be easy to use, highly optimized for search engines, and designed to drive organic traffic that converts visitors into Prompt Library subscribers.

---

# Objectives

* Increase organic search traffic.
* Build authority in the Prompt Engineering niche.
* Publish educational articles.
* Improve search engine rankings.
* Generate leads and paid subscribers.
* Allow multiple authors.
* Support AI-assisted writing.
* Fully optimize every article for SEO.

---

# User Roles

## Admin

Can:

* Manage all articles
* Manage categories
* Manage tags
* Manage authors
* Publish articles
* Delete articles
* Schedule articles
* Manage SEO settings
* Upload media
* Manage redirects

---

## Editor

Can:

* Edit any article
* Publish drafts
* Review submissions
* Manage categories
* Manage tags

---

## Author

Can:

* Create articles
* Edit own articles
* Save drafts
* Submit for review

Cannot:

* Publish directly

---

# Dashboard

Display:

* Total Articles
* Published Articles
* Drafts
* Scheduled Posts
* Total Categories
* Total Tags
* Total Views
* Most Viewed Articles
* Recently Published
* SEO Score Average

Quick Actions:

* New Article
* Upload Image
* Manage Categories
* Manage Tags
* Generate AI Draft

---

# Blog Management

Each article contains:

## Basic Information

* Title
* Subtitle
* URL Slug
* Summary
* Featured Image
* Thumbnail
* Author
* Publish Date
* Status

Status:

* Draft
* Review
* Scheduled
* Published
* Archived

---

## Content Editor

Rich editor supporting:

* Markdown
* Rich Text
* HTML blocks
* Tables
* Code blocks
* Images
* Videos
* Quotes
* Lists
* Callout boxes
* Buttons
* Internal links
* External links

Support drag-and-drop editing.

Auto-save every 30 seconds.

Revision history included.

---

# AI Writing Assistant

Built-in AI tools:

* Generate article outline
* Expand paragraphs
* Rewrite content
* Improve readability
* Fix grammar
* Summarize content
* Create FAQ section
* Generate introduction
* Generate conclusion
* Suggest headings
* Suggest internal links
* Generate meta description
* Generate title variations
* Suggest keywords
* Generate image prompts
* Improve SEO score

---

# SEO Optimization

Each article supports:

## SEO Title

Maximum:

60 characters

---

## Meta Description

Maximum:

160 characters

---

## Focus Keyword

Primary keyword

Examples:

* Prompt Engineering
* AI Prompt
* ChatGPT Prompt
* Claude Prompt
* Gemini Prompt

---

## Secondary Keywords

Unlimited

---

## Canonical URL

Optional

---

## Robots

Options:

* Index
* No Index
* Follow
* No Follow

---

## Open Graph

Fields:

* OG Title
* OG Description
* OG Image

---

## Twitter Card

Fields:

* Title
* Description
* Image

---

## Schema.org

Support:

* BlogPosting
* Article
* FAQ
* Breadcrumb
* Organization
* Website

Automatically generate JSON-LD.

---

# SEO Analyzer

Display score:

0–100

Check:

* Focus keyword in title
* Focus keyword in first paragraph
* Focus keyword in URL
* Keyword density
* Meta description exists
* Title length
* Meta description length
* Heading structure
* Image ALT text
* Internal links
* External links
* Readability
* Passive voice
* Sentence length
* Mobile friendliness
* Duplicate title detection

Suggestions shown in real time.

---

# Categories

Examples:

* Prompt Engineering
* ChatGPT
* Claude
* Gemini
* AI Agents
* MCP
* AI Automation
* Midjourney
* Stable Diffusion
* Business
* Productivity
* Marketing
* Coding
* Image Generation
* Video Generation
* Tutorials
* News

Each category includes:

* Name
* Slug
* Description
* SEO metadata

---

# Tags

Unlimited tags.

Examples:

* Prompt
* AI
* GPT
* LLM
* Automation
* Productivity
* Marketing
* Coding

---

# Featured Image

Support:

* Upload
* Crop
* Resize
* Compression
* ALT text
* Caption

Automatically generate:

* WebP
* Thumbnail
* Medium
* Large

---

# Internal Linking

Suggest related articles automatically.

Display:

Suggested Internal Links

Example:

Related:

* Best ChatGPT Prompts
* Prompt Engineering Guide
* AI Agent Tutorial

---

# Content Scheduling

Publish:

Immediately

or

Schedule future publication.

Automatically publish at selected time.

---

# Article Revisions

Maintain complete version history.

Features:

* Compare revisions
* Restore revision
* View editor history

---

# Search

Admin search supports:

* Title
* Keyword
* Category
* Author
* Tag
* Status

---

# Comments

Optional.

Settings:

* Enable comments
* Disable comments
* Moderate comments
* Spam filtering

---

# Media Library

Store:

* Images
* PDFs
* Videos
* SVG
* Icons

Features:

* Folder organization
* Search
* Compression
* Duplicate detection

---

# Analytics

Per article:

* Views
* Visitors
* Average reading time
* Bounce rate
* Shares
* Click-through rate
* Organic traffic
* Ranking keyword
* Conversion rate

---

# Blog Homepage

Display:

* Hero article
* Featured articles
* Latest articles
* Popular articles
* Categories
* Search
* Newsletter signup

---

# Newsletter Integration

CTA at end of every article.

Example:

"Discover thousands of premium AI prompts. Join Online Prompt Library today."

Collect:

* Email
* Name

---

# Related Articles

Automatically recommend:

3–6 articles.

Based on:

* Category
* Tags
* Keywords

---

# Reading Experience

Features:

* Reading progress bar
* Estimated reading time
* Table of contents
* Copy code button
* Dark mode
* Responsive layout
* Sticky share buttons

---

# URL Structure

Examples:

```
/blog/prompt-engineering-guide

/blog/chatgpt-best-prompts

/blog/how-to-build-ai-agent
```

Clean SEO-friendly URLs.

---

# Sitemap

Automatically update:

* sitemap.xml
* image sitemap
* news sitemap

Notify search engines after publishing.

---

# Robots.txt

Automatically configurable.

---

# Redirect Manager

Support:

301 Redirect

302 Redirect

Prevent broken links.

---

# RSS Feed

Generate:

```
/rss.xml
```

---

# Search Function

Search by:

* Title
* Content
* Category
* Tags

Support instant search.

---

# API Endpoints

## Articles

```
GET /api/blog

GET /api/blog/{slug}

POST /api/blog

PUT /api/blog/{id}

DELETE /api/blog/{id}
```

---

## Categories

```
GET /api/categories

POST /api/categories
```

---

## Tags

```
GET /api/tags

POST /api/tags
```

---

## SEO

```
GET /api/blog/{id}/seo

PUT /api/blog/{id}/seo
```

---

# Database Tables

## blog_posts

* id
* title
* slug
* summary
* content
* featured_image
* author_id
* category_id
* status
* seo_title
* meta_description
* canonical_url
* published_at
* created_at
* updated_at

---

## blog_categories

* id
* name
* slug
* description

---

## blog_tags

* id
* name
* slug

---

## blog_post_tags

* blog_post_id
* tag_id

---

## blog_revisions

* id
* post_id
* content
* editor_id
* created_at

---

## media_library

* id
* filename
* url
* alt_text
* type
* size
* created_at

---

# Future Enhancements

* AI-generated featured images
* AI-generated SEO score improvements
* Keyword research integration
* Google Search Console integration
* Google Analytics integration
* AI content gap analysis
* Automatic internal link suggestions
* Multi-language articles
* AI translation
* Author profile pages
* Topic clusters
* Pillar page generation
* Content calendar
* Trending keyword recommendations
* FAQ generator
* AI-powered article updates
* Broken link checker

---

# Success Metrics

Track:

* Published articles
* Organic traffic
* Search impressions
* Click-through rate
* Average ranking position
* Average SEO score
* Keyword rankings
* Newsletter signups
* Subscriber conversions
* Time on page
* Bounce rate
* Returning visitors
* Revenue generated from blog traffic

---

# Recommended Tech Stack

Frontend:

* Next.js
* React
* Tailwind CSS
* TipTap Editor

Backend:

* Node.js
* Next.js API Routes
* PostgreSQL
* Prisma ORM

Storage:

* Cloudflare R2 or AWS S3

Search:

* Meilisearch or Algolia

SEO:

* Dynamic Metadata API
* Schema.org JSON-LD
* XML Sitemap Generator
* Robots.txt Generator

Analytics:

* Google Analytics 4
* Google Search Console
* Microsoft Clarity

---

# Content Strategy

Primary Topics:

* Prompt Engineering
* AI Prompt Templates
* ChatGPT Tutorials
* Claude Best Practices
* Gemini Guides
* AI Agents
* MCP (Model Context Protocol)
* Workflow Automation
* AI for Business
* AI Coding Assistants
* AI Image Generation
* AI Video Generation
* Productivity with AI
* AI News & Trends

Each article should naturally promote the Online Prompt Library through relevant internal links and clear calls-to-action, helping readers discover premium prompts and convert into paid subscribers without disrupting the educational value of the content.
