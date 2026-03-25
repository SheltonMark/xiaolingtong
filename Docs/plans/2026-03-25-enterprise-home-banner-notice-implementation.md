# Enterprise Home Banner Notice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let enterprise home banners rotate active ads, active notices, and the existing fallback cards together, while keeping the message-page notice list unchanged.

**Architecture:** Add a backend banner aggregation endpoint in the promotion module so the server owns ordering and card typing. Keep the miniprogram home page as a thin renderer that consumes mixed banner items and still falls back to local defaults if the request fails. Update admin notice copy so the publishing hint matches the new multi-surface behavior.

**Tech Stack:** NestJS, TypeORM, Jest, WeChat miniprogram JS/WXML/WXSS, admin static HTML

---

### Task 1: Add backend tests for mixed home banners

**Files:**
- Modify: `server/src/modules/promotion/promotion.integration.spec.ts`
- Modify: `server/src/modules/notification/notification.controller.spec.ts`

- [ ] **Step 1: Write the failing service/controller tests**
- [ ] **Step 2: Run the targeted Jest commands and verify the new assertions fail for the expected missing behavior**
- [ ] **Step 3: Cover ad/notice interleaving, fallback insertion, and public endpoint shape**

### Task 2: Implement backend banner aggregation

**Files:**
- Modify: `server/src/modules/promotion/promotion.module.ts`
- Modify: `server/src/modules/promotion/promotion.service.ts`
- Modify: `server/src/modules/promotion/promotion.controller.ts`
- Modify: `server/src/entities/notice.entity.ts` only if strictly required

- [ ] **Step 1: Inject notice access into the promotion module**
- [ ] **Step 2: Add an aggregation method that returns `ad`, `notice`, and `default` banner items**
- [ ] **Step 3: Expose a public endpoint for enterprise home banners**
- [ ] **Step 4: Re-run the targeted backend tests and make them pass**

### Task 3: Render mixed banner items on the miniprogram home page

**Files:**
- Modify: `pages/index/index.js`
- Modify: `pages/index/index.wxml`
- Modify: `pages/index/index.wxss`

- [ ] **Step 1: Switch the enterprise home page to the backend aggregate endpoint**
- [ ] **Step 2: Preserve local default banners as network-failure fallback**
- [ ] **Step 3: Render non-clickable notice cards with the approved warm style**
- [ ] **Step 4: Keep ad click behavior only for ad items**

### Task 4: Update admin notice publishing copy

**Files:**
- Modify: `server/public/admin.html`

- [ ] **Step 1: Replace the outdated publish hint so it reflects message page + enterprise home banner usage**
- [ ] **Step 2: Keep notice creation behavior unchanged**

### Task 5: Verify the full change set

**Files:**
- Modify: `Docs/plans/2026-03-25-enterprise-home-banner-notice-implementation.md`

- [ ] **Step 1: Run targeted backend Jest verification**
- [ ] **Step 2: Run a frontend syntax check if available**
- [ ] **Step 3: Re-read the implemented behavior against the approved rules**
