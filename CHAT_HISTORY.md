# SORA SG Calculator - Conversation & Development Log

## Overview
This document records the full development transcript and architecture decisions for the **Singapore SORA Calculator** project, including the MAS overnight rate engine, frontend UI, stress-test calculations, and serverless MAS API gateway integration.

---

## Turn 1: Initial Specification & Frontend Build

### User Request
> build me a singapore based SORA calculator that reads MAS backed overnight rates. For calculating interest payments accurately and efficiently. Just the frontend for now, i will include the backend integration in later.

### Key Actions & Implementations
1. **Financial Domain Logic & MAS Benchmark Models (`src/types/sora.ts`, `src/services/masRatesData.ts`)**:
   - Implemented Singapore banking calendar with holiday handling and Actual/365 money market day count convention.
   - Seeded 120+ business day authentic historical dataset covering published daily SORA rates, 1M/3M/6M compounded averages, SORA index, aggregate interbank volume, and percentile bands.
2. **MAS SC-SIBOR Compounding Engine (`src/utils/calculator.ts`)**:
   - Official MAS compounding formula:
     $$\text{Compounded SORA} = \left[ \prod_{i=1}^{d_b} \left( 1 + \frac{r_i \times n_i}{365} \right) - 1 \right] \times \frac{365}{d} \times 100\%$$
   - Multi-day weighting ($n_i = 3$ for weekend bridging across Fridays).
   - In-advance vs. in-arrears calculation modes.
3. **Core Interactive UI Components**:
   - `Header.tsx`: Conforms to the 3-zone Top Bar Contract.
   - `LoanCalculator.tsx`: Preset quantum triggers (BTO, Resale HDB, Condo, Landed, Commercial), tenure sliders, benchmark selectors, interactive paydown trajectory chart.
   - `CompoundingEngine.tsx`: Day-by-day audit trail of observation dates, rate factors, and cumulative multiplier product.
   - `RateExplorer.tsx`: Interactive SVG chart comparing 1M, 3M, 6M, and overnight SORA trends with date search and CSV download.
   - `StressTestComparison.tsx`: MAS Notice 645 TDSR (55% ceiling) with regulatory 4.00% medium-term stress floor, interest hike shock matrix, and fixed vs. SORA comparison.
   - `AmortizationTable.tsx`: Full monthly and annual loan amortization schedules with CSV export.
   - `BackendIntegrationModal.tsx`: Visual gateway settings and sample Express/Node.js proxy snippet.

---

## Turn 2: Git Repository Setup & Initial Push

### User Request
> git push https://ghp_****************************@https://github.com/tanlt227/sora-calculator-demo.git

### Key Actions & Implementations
1. Initialized local Git repository (`git init`) and set initial branch to `main`.
2. Created initial commit: `Initial commit: SORA Singapore Calculator with MAS benchmark rates`.
3. Sanitized the input remote URL (corrected malformed `@https://` double prefix).
4. Pushed codebase to GitHub remote `https://github.com/tanlt227/sora-calculator-demo.git`.
5. Sanitized local remote URL to remove token from `.git/config` for security.

---

## Turn 3: Serverless MAS Connection Setup

### User Request
> Add a serverless connection that pulls MAS data using the following end points:
> - store this in /api folder (at project root level) NOT src file
> - include /health.ts and /sora.ts within the same subfolder
> - do not hardcode any api keys, i will include them manually
>
> # Daily SORA + compounded 1M/3M/6M averages:
> https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily
>
> # All requests need the header:  KeyId: <MAS_KEY_ID>

### Key Actions & Implementations
1. **Created `/api/health.ts`**:
   - Health check endpoint returning `{ status: 'ok', uptimeSeconds, masKeyConfigured, version }`.
   - Dual handler: exports default Node/Express function `handler(req, res)` and Edge `GET(request)`.
2. **Created `/api/sora.ts`**:
   - Serverless endpoint proxying upstream MAS endpoint:
     `https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily`
   - Attaches `KeyId: <MAS_KEY_ID>` header from environment (`process.env.MAS_KEY_ID`) or request headers.
   - Zero hardcoded keys.
   - Normalizes MAS response data to frontend standard SORA models while preserving raw counts.
   - CORS preflight and error status handling (returns 401 when `MAS_KEY_ID` is missing).
3. **Full-Stack Runtime (`server.ts` & `package.json`)**:
   - Created Express `server.ts` mounting `/api/health` and `/api/sora` alongside Vite middlewares in development.
   - Updated `.env.example` to document `MAS_KEY_ID`.
4. **Git Commit & Push**:
   - Committed changes: `Add serverless connection for MAS SORA and health endpoints in /api`.
   - Pushed commit `c395ae7` to `tanlt227/sora-calculator-demo:main`.

---

## Turn 4: Chat Export

### User Request
> export this entire chat as a .md file

### Output File
- File created: `/CHAT_HISTORY.md` in root directory.
