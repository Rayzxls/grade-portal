# 🔄 Handoff — สำหรับ session ใหม่

> **อ่านไฟล์นี้ก่อนเริ่มงาน** เพื่อรู้สถานะปัจจุบันและทำต่อได้ทันที

---

## 📦 ระบบที่กำลังพัฒนา

**Student Grade Portal** — ระบบตรวจผลการเรียนสำหรับโรงเรียน (K-12) ที่กำลังจะให้พ่อของ user (KENKEN2517) ใช้เป็นครูจริง

**Stack:** NestJS API + Next.js 14 Web + Prisma + PostgreSQL (Neon)
**Monorepo:** pnpm workspaces (apps/api, apps/web, packages/database, packages/shared)

อ่าน [`AGENT.md`](AGENT.md) สำหรับ architecture, coding standards, design system

---

## 🌐 Production URLs (Live แล้ว)

| Component | URL | Service |
|-----------|-----|---------|
| **Web** | <https://grade-portal-api.vercel.app> | Vercel |
| **API** | <https://grade-portal-ee00.onrender.com/api/v1> | Render (Docker) |
| **DB** | (Neon Postgres — Singapore) | Neon |
| **GitHub** | <https://github.com/Rayzxls/grade-portal> | Rayzxls |

### Health check
```
GET https://grade-portal-ee00.onrender.com/api/v1/health
```

---

## 🔑 บัญชีผู้ใช้บน Production (Neon DB)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@school.ac.th` | `password123` ⚠️ ต้องเปลี่ยน |
| Teacher (demo) | `teacher@school.ac.th` | `password123` ⚠️ ต้องเปลี่ยน |
| **Teacher (พ่อ user)** | `KENKEN2517@hotmail.com` | `25172517` |
| Student (demo) | `student@school.ac.th` | `password123` ⚠️ ต้องเปลี่ยน |

Reset password ทำได้ด้วย: `packages/database/reset-admin-password.mjs`

---

## 🔐 Production Env Vars

### Render (API service `grade-portal`)
```
DATABASE_URL=postgresql://neondb_owner:npg_N3xE0ZFPcSQL@ep-empty-field-aojt1dtr.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_ACCESS_SECRET=a7f3e9d2c4b8a1f6e5d0c3b9a2f7e4d8c1b6a5f9e2d3c7b4a8f1e6d5c9b3a2f7
JWT_REFRESH_SECRET=b8e4f1a3d7c5b9a2f8e6d1c4b7a5f3e9d2c8b6a4f1e7d3c5b9a8f2e6d4c1b7a3
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
WEB_ORIGIN=https://placeholder.vercel.app   ← ไม่จำเป็นแล้ว เพราะ CORS รับ *.vercel.app
NODE_ENV=production
PORT=4000
```

### Vercel (web project `grade-portal-api`)
```
NEXT_PUBLIC_API_URL=https://grade-portal-ee00.onrender.com
```

### Vercel project settings
- Root Directory: `apps/web` (Include files outside enabled)
- Framework: Next.js
- Build/Install/Output overrides: OFF (ใช้ vercel.json)

---

## ✅ สิ่งที่ทำเสร็จแล้ว (Phase 1-3)

### Phase 1: Foundation
- Monorepo + Clean Architecture (Domain/App/Infra/Presentation)
- Auth: JWT + RBAC (Admin/Teacher/Student)
- Admin module + Teacher module + Student dashboard + Transcript PDF
- Tests: 18 unit tests passing

### Phase 2: Classroom redesign for K-12 context
- `Classroom` entity (gradeLevel + section + academicYear + homeroomTeacher)
- ลบ `faculty/major` (เปลี่ยนจาก university → school)
- Teacher self-service: สร้างห้อง/วิชา/นักเรียนได้เอง (มีสิทธิ์เฉพาะของตัวเอง)
- Bulk import students CSV
- Classroom-centric workspace UI with tabs

### Phase 2.5: Traceable Gradebook
- ScoreSheet + ScoreColumn + StudentScore models
- ครูตั้ง column ได้เอง (กลางภาค/ปลายภาค/งาน...)
- Live preview เกรด + finalize → ออก Grade record
- Lock/unlock sheet

### Phase 3: Setup Wizard + CRUD complete + Deploy
- `/teacher/classrooms/new` — สร้างห้อง + วิชา + นักเรียน ในหน้าเดียว
- CRUD ครบ (Create/Read/Update/Delete) ทุก entity
- Production deploy: Neon + Render + Vercel — **ใช้งานได้แล้ว**

### Theme
- Premium minimal: IBM Plex Sans Thai + gold accent + shimmer buttons + animations
- Design system documented ใน AGENT.md §10

---

## 🐛 Bug ที่เพิ่งแก้ (commit ล่าสุด `0fe1012`)

1. Grade.student FK ขาด `onDelete: Cascade` → ลบนักเรียนที่มีเกรดไม่ได้ (500) — แก้แล้ว
2. CORS exact-match ไม่รับ Vercel preview URL — เปลี่ยนเป็น regex `*.vercel.app`
3. Dockerfile ใช้ Alpine ทำให้ Prisma หา OpenSSL ไม่เจอ — เปลี่ยนเป็น `node:20-slim`
4. pnpm symlinks ขาดใน runtime stage — copy whole /app instead

---

## 📋 Git history (5 ล่าสุด)

```
0fe1012 feat(api): CORS allow any *.vercel.app subdomain
2cf821e chore: trigger Vercel redeploy with fixed settings
83b85db fix(deploy): vercel paths relative to apps/web root directory
16548b7 fix(deploy): root build script for Vercel (web-only)
bd917ca fix(deploy): make Vercel build web-only, not entire monorepo
```

---

## 🎯 สิ่งที่ยังต้องทำ (Backlog)

### Priority High
- [ ] **เปลี่ยนรหัสบัญชี default** (admin/teacher/student ที่เป็น password123) ก่อนส่งให้พ่อใช้
- [ ] ทดสอบ login เป็น KENKEN2517 บน Production แล้วลอง flow ทั้งหมด (สร้างห้อง → เพิ่มนักเรียน → กรอกคะแนน → ปิดเล่ม)

### Priority Medium
- [ ] หน้าเปลี่ยนรหัสผ่านใน UI (ตอนนี้ทำได้แค่ผ่าน script)
- [ ] ตารางเรียน (Schedule) — กริด วัน × คาบ
- [ ] Report dashboard ครู — สถิติเกรดต่อห้อง/วิชา
- [ ] Refresh token + auto re-login

### Priority Low
- [ ] เปลี่ยนชื่อ Vercel project จาก `grade-portal-api` เป็น `grade-portal-web` (สับสน)
- [ ] Custom domain (เช่น `grade.something.com`)
- [ ] Modal สวย ๆ แทน `prompt()`/`confirm()`

---

## 🛠️ Dev Setup (เครื่อง user)

- Windows 10, PowerShell
- Node 22, pnpm 9
- Docker Desktop (สำหรับ Postgres+Redis ตอน dev)
- GitHub CLI ติดตั้งแล้ว (login เป็น `Rayzxls`)

### รัน local
```powershell
docker compose up -d
pnpm install
pnpm --filter @grade/database exec prisma generate
pnpm db:migrate
pnpm db:seed
pnpm dev   # หรือแยก api/web
```

### โครงสร้างไฟล์สำคัญ
- `apps/api/src/main.ts` — bootstrap + CORS
- `apps/api/src/modules/teacher/` — Clean Arch ของฝั่งครู
- `apps/api/src/modules/admin/` — Admin API
- `apps/web/app/teacher/classrooms/` — Workspace UI
- `apps/web/app/teacher/classrooms/new/page.tsx` — Setup wizard
- `packages/database/prisma/schema.prisma` — Schema (9+ models)
- `packages/shared/src/schemas/admin.schema.ts` — Zod schemas
- `vercel.json` — Vercel build config
- `apps/api/Dockerfile` — Render deploy config
- `DEPLOY.md` — Step-by-step deploy guide

---

## 💬 รูปแบบที่ user ชอบ

- ตอบเป็น **ภาษาไทย** ปนเทคนิคศัพท์อังกฤษ
- กระชับ ไม่ verbose
- ใช้ตาราง/list มากกว่า paragraph
- มี emoji เป็นจุดสังเกต (ไม่เยอะเกิน)
- user ให้สิทธิ์ทำได้โดยไม่ต้องถาม (commit, schema change, etc.)
- เมื่อมี error → debug ทันที, ไม่ขอ permission

---

## 🚦 สถานะปัจจุบัน

- ✅ Deploy เสร็จ ใช้งานได้บน <https://grade-portal-api.vercel.app>
- ⏳ user รอ Render rebuild หลัง CORS fix (commit `0fe1012`) — น่าจะเสร็จแล้ว
- 🎯 ขั้นถัดไป: ทดสอบ login พ่อ + เปลี่ยนรหัสบัญชี default

---

**เริ่ม session ใหม่ทำได้เลย — บอก Claude ใหม่ว่า "อ่าน HANDOFF.md แล้วทำต่อ"**
