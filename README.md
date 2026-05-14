# 🎓 Grade Portal — ระบบตรวจผลการเรียน

ระบบตรวจผลการเรียนของนักเรียน ระดับ Production พร้อม Clean Architecture, RBAC, Audit Log และ PDPA compliance

## 📐 สถาปัตยกรรม

```
┌─────────────────────────────────────────────────┐
│  Next.js Web  ──→  NestJS API  ──→  PostgreSQL  │
│                         │                       │
│                         └──→  Redis (cache)     │
└─────────────────────────────────────────────────┘
```

ดูรายละเอียดเพิ่มเติมใน [AGENT.md](AGENT.md)

## 🗂️ โครงสร้าง Monorepo

```
.
├── apps/
│   ├── api/           # NestJS — Clean Architecture
│   │   └── src/modules/<feature>/{domain,application,infrastructure,presentation}
│   └── web/           # Next.js 14 App Router
├── packages/
│   ├── database/      # Prisma schema + seed
│   └── shared/        # Zod schemas, GPA logic, types
├── docker-compose.yml
├── AGENT.md           # กฎและมาตรฐานสำหรับ AI/Engineer
└── Skill.md           # Skill registry
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9
- Docker Desktop

### 2. Setup

```bash
# คัดลอก env
cp .env.example .env

# ติดตั้ง dependencies
pnpm install

# รัน database & redis
docker compose up -d

# generate Prisma client + migrate + seed
pnpm --filter @grade/database generate
pnpm db:migrate
pnpm db:seed
```

### 3. รัน Dev

```bash
pnpm dev
```

- API: <http://localhost:4000/api/v1>
- Web: <http://localhost:3000>

### 4. บัญชีทดสอบ (จาก seed)

| Role    | Email                   | Password    |
|---------|-------------------------|-------------|
| Admin   | admin@school.ac.th      | password123 |
| Teacher | teacher@school.ac.th    | password123 |
| Student | student@school.ac.th    | password123 |

## 🔌 API Endpoints (v1)

| Method | Path              | Auth    | คำอธิบาย              |
|--------|-------------------|---------|------------------------|
| POST   | `/auth/login`     | -       | เข้าสู่ระบบ            |
| GET    | `/auth/me`        | JWT     | ดูข้อมูลผู้ใช้ปัจจุบัน  |
| GET    | `/grades/me`      | STUDENT | ผลการเรียนของฉัน + GPA |
| POST   | `/grades`         | TEACHER | บันทึกเกรด             |

## 🧪 Testing

```bash
pnpm test                       # unit tests ทุก package
pnpm --filter @grade/shared test
```

## 🛠️ คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|--------|--------|
| `pnpm dev` | รัน api + web พร้อมกัน |
| `pnpm db:migrate` | สร้าง migration ใหม่ |
| `pnpm db:studio` | เปิด Prisma Studio (GUI) |
| `pnpm lint` | ESLint ทุก workspace |
| `pnpm typecheck` | TypeScript check |
| `docker compose up -d` | รัน Postgres + Redis |
| `docker compose down` | หยุด containers |

## 🔐 Security Checklist

- ✅ JWT auth + RBAC (Student/Teacher/Admin)
- ✅ bcrypt password hashing (rounds = 12)
- ✅ Rate limiting `/auth/login` (5 req/min)
- ✅ Zod validation ทุก endpoint
- ✅ Audit log ทุกการแก้เกรด
- ✅ CORS strict origin
- ✅ Parameterized query (Prisma)

## 📚 Documentation

- [AGENT.md](AGENT.md) — กฎการทำงาน, architecture, coding standards
- [Skill.md](Skill.md) — Claude Code skills registry

## 📝 License

Private — Internal Use Only
