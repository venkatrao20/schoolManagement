# SchoolConnect — Admissions, Student & Fee Management System

SchoolConnect is a full-stack, production-quality web application built for school administrators, finance officers, and staff to manage student lifecycles, parent/guardian directories, admissions workflows, and comprehensive **Fee Structures, Payment Frequencies & Discount Management** under robust Role-Based Access Control (RBAC).

---

## 1. System Overview & Fee Module Architecture

The **Fee Management Module** enables authorized Finance and SuperAdmin users to define baseline fee structures, configure flexible payment frequencies (Quarterly splits vs Full-Year upfront), set dynamic discount and concession rules, approve student discount requests, and calculate/persist auditable fee assignment snapshots.

### Core RBAC Matrix (AC1, AC2, AC10, AC11)

| Role | Students & Admissions | Fee Structures & Discounts (Config & Write) | Fee Summaries & History (Read) | User Management |
|---|---|---|---|---|
| **SuperAdmin** | Full CRUD | Full CRUD | Full Access | Full CRUD |
| **Finance** | Read-Only | Full CRUD (`POST`, `PATCH`, `DELETE` on `/api/fees/*` & student fee assignments) | Full Access | No Access |
| **Admin** | Full CRUD | No Mutations (Blocked with `403 Forbidden`) | View-Only Access | No Access |
| **Staff** | Read-Only | Hidden in UI & Blocked with `403 Forbidden` | Hidden / Blocked | No Access |

- Write endpoints (`POST`/`PATCH`/`DELETE` under `/api/fees/*` and `/api/students/:id/fee-assignments`) are guarded by `roleGuard(['SUPER_ADMIN', 'FINANCE'])` — **AC11**.
- Read endpoints allow `SUPER_ADMIN`, `FINANCE`, and `ADMIN`.
- Unauthenticated requests return `401 Unauthorized`.
- All fee mutations log audit records (`createdBy`, `updatedBy`, `approvedBy`).

---

## 2. Calculation Logic & Persistence (AC4, AC5, AC6, AC8, AC14)

1. **Deterministic Calculation Engine (`calculateFeeAssignment`)**:
   - Loads base `FeeStructure.amount` (e.g. ₹72,000).
   - Loads all **APPROVED** `StudentDiscountAssignment` records applicable to the specific fee category and within date validity.
   - Calculates discount per rule:
     - **Percentage**: `(originalAmount * rule.value) / 100`
     - **Flat Amount**: `min(rule.value, originalAmount)`
   - Stacks multiple approved discounts additively, capping total discount at `originalAmount` (final amount never drops below 0).
   - Derives `finalPayableAmount = Math.max(originalAmount - discountApplied, 0)`.
   - **Payment Plans & Installment Proportions (AC4, AC5, AC6)**:
     - **Full-Year**: Single installment equal to `finalPayableAmount` (AC5).
     - **Quarterly**: 4 installments derived proportionally from the plan split against `finalPayableAmount`, with rounding adjustment applied to the final installment to eliminate penny drift.
2. **Persistent Snapshots (AC14)**:
   - When Finance saves a calculation, a `FeeAssignment` record is written to the database storing the original amount, discount applied, final payable amount, and full installment schedule.
   - Reloading or refreshing the student's detail page loads the persisted snapshot identically, preserving what was agreed even if baseline fee structures change in the future.

---

## 3. Important Process & Configurability Statement (AC15)

> [!NOTE]
> **Story Refinement Note (AC15):** In accordance with Acceptance Criterion 15, all fee categories, amounts, discount rules, discount percentages/flat values, eligibility conditions, and installment counts are **fully dynamic and configurable via the Admin/Finance UI and API**. No rates, rule names, or fee values are hardcoded. The seeded values (e.g. "Sibling Concession 15%", "Tuition Fee ₹72,000", 4 quarterly splits) serve as sample/demo data pending final Finance policy refinement.

---

## 4. Acceptance Criteria Compliance Mapping

| AC # | Acceptance Criterion Description | Implementation & Verification Reference |
|---|---|---|
| **AC1** | Authorized user can create/manage fee structures | `FeeStructures.tsx`, `FeeStructureModal.tsx`, `POST /api/fees/structures`, `tests/fees.test.ts` |
| **AC2** | Fee structures associated with classes/grades | Grade selection, `FeeStructure.gradeOrClass`, `tests/fees.test.ts` |
| **AC3** | Different fee categories (Tuition, Transport, Lab) supported | `FeeCategory` entity, `FeeCategories.tsx`, `GET/POST /api/fees/categories`, `tests/fees.test.ts` |
| **AC4** | Quarterly payment frequency with installment amounts/dates | `PaymentPlan` (`QUARTERLY`), `PaymentPlanModal.tsx`, proportional quarterly calculation, `tests/feeCalculations.test.ts` |
| **AC5** | Full-year payment frequency with single installment | `PaymentPlan` (`FULL_YEAR`), `calculateFeeAssignment()`, `tests/feeCalculations.test.ts` |
| **AC6** | System calculates correct amount based on selected frequency & discount | `calculateFeeAssignment()`, `StudentFeeTab.tsx`, `POST /api/fees/calculate`, `tests/feeCalculations.test.ts` |
| **AC7** | Discount rules configuration (Percentage & Flat Amount) | `DiscountRule` entity, `DiscountRules.tsx`, `DiscountRuleModal.tsx`, `POST /api/fees/discount-rules` |
| **AC8** | Fee summary clearly displays original, discount, and final payable amount | Prominently emphasized in `StudentFeeTab.tsx` banner and summary cards, `FeeAssignment` snapshot model |
| **AC9** | Discounts applied according to approved Finance policy | `StudentDiscountAssignment.status` (`APPROVED`/`PENDING`/`REJECTED`), approval workflow in `StudentFeeTab.tsx`, `tests/fees.test.ts` |
| **AC10** | Finance & Admin roles can view fee structures; permissions restricted | `Sidebar.tsx`, `roleGuard.ts`, `FeeModuleRoute`, `tests/rbac.test.ts` & `tests/fees.test.ts` |
| **AC11** | Write endpoints protected by roleGuard(`FINANCE`, `SUPER_ADMIN`); 401/403 errors | `fee.routes.ts`, `roleGuard.ts`, `tests/fees.test.ts` |
| **AC12** | Unique composite constraint on (academicYear, gradeOrClass, feeCategoryId) | `schema.prisma`, `createFeeStructure` in `fee.controller.ts`, `tests/fees.test.ts` |
| **AC13** | Server-side validation with Zod (mandatory fields, 0-100% bounds, positive amounts) | `fee.schemas.ts`, `validate.ts`, `tests/fees.test.ts` |
| **AC14** | Saved fee assignment remains available after save and page refresh | `FeeAssignment` persistence, `StudentFeeTab.tsx` active snapshot display, `tests/fees.test.ts` |
| **AC15** | Dynamic configurability confirmed during Story Refinement (Process Requirement) | System fully dynamic (no hardcoding); sample data seeded; flagged for refinement sign-off |

---

## 5. Tech Stack

- **Frontend**: React 18, TypeScript, Vite, React Router v7, TanStack Query, Tailwind CSS, React Hook Form + Zod, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, JWT authentication (Access + Refresh tokens), bcryptjs password hashing.
- **Database**: SQLite (`prisma/dev.db`) with full decimal precision support (`Prisma.Decimal`).
- **Testing**: Vitest & Supertest (58 passing tests across 8 test suites).

---

## 6. Getting Started & Running Locally

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Setup

1. **Install Backend Dependencies & Initialize Database**:
   ```bash
   cd backend
   npm install
   npm run prisma:push
   npm run prisma:seed
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

### Start Servers

1. **Start Backend API**:
   ```bash
   cd backend
   npm run dev
   ```
   *Runs at `http://localhost:5000` (Health check: `http://localhost:5000/api/health`)*

2. **Start Frontend Web App**:
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs at `http://localhost:5173`*

---

## 7. Demo Accounts & Credentials

The database seed initializes the following pre-configured accounts (also available via 1-click quick-fill buttons on the Login page):

| Role | Email | Password | Scope & Fee Permissions |
|---|---|---|---|
| **Finance** | `finance@schoolconnect.edu` | `Finance@123` | **Full Fee Configuration & Approvals** (Categories, Structures, Payment Plans, Discounts, Student Fee Assignment) |
| **SuperAdmin** | `superadmin@schoolconnect.edu` | `Admin@123` | **Full System Access** (All Modules + Staff Management + Fee Management) |
| **Admin** | `admin@schoolconnect.edu` | `Admin@123` | **Admissions & Student Management**, View-Only for Fee Structures |
| **Staff** | `staff@schoolconnect.edu` | `Staff@123` | **Read-Only Inspection** (Fee Module Hidden & Blocked) |

---

## 8. Running Automated Tests

Run the complete backend unit and integration test suite:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
- **`tests/feeCalculations.test.ts`**: Pure calculation logic, percentage vs flat discounts, additive stacking, capping at 100%, quarterly proportional distributions, penny remainder handling, unapproved discount exclusion, category scoping.
- **`tests/fees.test.ts`**: Category CRUD & uniqueness, structure CRUD & composite uniqueness, payment plans, discount bounds validation (0-100%, >0), student discount approval workflow, snapshot persistence/reload (AC14), and RBAC role enforcement (AC11).
- **`tests/rbac.test.ts`, `tests/auth.test.ts`, `tests/students.test.ts`, `tests/admissions.test.ts`, `tests/parents.test.ts`, `tests/studentParentLinks.test.ts`**: Complete student lifecycle, parent linkages, and multi-year admissions history.
