# Architecture Overview

## Layered (Clean Architecture)

ในแต่ละ module ของ API (`apps/api/src/modules/<feature>`) แบ่งเป็น 4 ชั้น:

```
presentation/    ← Controller รับ HTTP, validate ด้วย Zod
application/     ← Use Case (business orchestration)
domain/          ← Entity, Repository Interface, Business Rules
infrastructure/  ← Prisma Repository, External APIs
```

### Dependency Rule

```
presentation → application → domain ← infrastructure
```

- `domain` ไม่ import อะไรจากชั้นนอก
- `application` พึ่งเฉพาะ `domain` (ผ่าน interface)
- `infrastructure` implement interface จาก `domain`
- DI ทำการ wire ใน `*.module.ts`

## ตัวอย่าง: Grade Module

| Layer | File |
|-------|------|
| Domain | `domain/grade-repository.interface.ts` |
| Application | `application/get-my-grades.use-case.ts` |
| Application | `application/record-grade.use-case.ts` |
| Infrastructure | `infrastructure/grade.repository.ts` (Prisma impl) |
| Presentation | `presentation/grade.controller.ts` |
| Wiring | `grade.module.ts` |

## Data Flow: บันทึกเกรด

```
Teacher → POST /grades
  → GradeController (JWT + RolesGuard[TEACHER])
    → ZodValidationPipe (createGradeSchema)
      → RecordGradeUseCase.execute()
        ├─ ตรวจ enrollment exists
        ├─ scoreToLetter() (shared domain)
        ├─ Prisma $transaction
        │    ├─ insert Grade
        │    └─ insert AuditLog
        └─ return Grade
```

## เหตุผลที่เลือก Stack นี้

| ตัวเลือก | เหตุผล |
|---------|--------|
| NestJS | DI, Modular, Decorator-based — เหมาะกับ Clean Arch |
| Prisma | Type-safe, migration, parameterized queries กัน SQLi |
| Zod | Single source of truth สำหรับ validation ทั้ง FE/BE |
| Next.js App Router | RSC + Streaming, SEO-ready, รองรับ Transcript PDF |
| pnpm workspaces | เร็ว, disk-efficient, รองรับ monorepo |
