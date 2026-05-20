# 🚀 Deployment Guide

Deploy: **Vercel** (Web) + **Railway** (API) + **Neon** (PostgreSQL)
Cost: **ฟรี** ทั้งหมดที่ tier เริ่มต้น

---

## 📋 ก่อนเริ่ม

1. มีบัญชี GitHub พร้อม push repo นี้ขึ้นไป
2. มีบัญชี: [Vercel](https://vercel.com) / [Railway](https://railway.app) / [Neon](https://neon.tech) (สมัครด้วย GitHub ได้หมด)

---

## 1️⃣ Neon — Database (5 นาที)

1. ไปที่ <https://neon.tech> → New Project
2. ชื่อ: `grade-portal` · Region: Singapore (ใกล้ไทยสุด)
3. Copy **`DATABASE_URL`** จากหน้า Dashboard
   - ตัวอย่าง: `postgres://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
4. **Save ไว้ใช้ต่อ**

> ไม่ต้องรัน migration ตอนนี้ — Railway จะรันให้อัตโนมัติตอน deploy

---

## 2️⃣ Railway — API (10 นาที)

1. ไปที่ <https://railway.app> → New Project → **Deploy from GitHub**
2. เลือก repo นี้
3. หลัง project ขึ้น → คลิก service → **Settings → Source**
   - **Root Directory:** `/` (root ของ monorepo)
   - **Dockerfile path:** `apps/api/Dockerfile`
4. ไปแท็บ **Variables** → ใส่:

   ```
   DATABASE_URL=<paste จาก Neon>
   JWT_ACCESS_SECRET=<openssl rand -hex 32>
   JWT_REFRESH_SECRET=<openssl rand -hex 32>
   JWT_ACCESS_TTL=15m
   JWT_REFRESH_TTL=7d
   WEB_ORIGIN=https://placeholder.vercel.app
   NODE_ENV=production
   ```

   > `WEB_ORIGIN` ใส่ placeholder ก่อน เดี๋ยวค่อยกลับมาแก้หลัง deploy Vercel

5. **Generate Domain** ที่แท็บ Settings → จะได้ URL เช่น `https://grade-api-production.up.railway.app`
6. **Save URL ไว้** เพื่อใส่ใน Vercel

### ทดสอบ API ขึ้นมั้ย

```
https://YOUR-RAILWAY-URL/api/v1/health
```
ต้องเห็น `{"status":"ok","timestamp":"..."}`

### Seed data (สร้างบัญชี admin/teacher/พ่อ)

ไปแท็บ **Settings → Build** ของ service:
- เพิ่ม **One-off command** หรือ Deploy Hook
- หรือใช้วิธีง่ายสุด: รันบนเครื่อง local แต่ชี้ไป Neon

```powershell
# บนเครื่อง local
$env:DATABASE_URL = "<URL จาก Neon>"
pnpm --filter @grade/database seed
```

จะได้ 4 บัญชี:
- `admin@school.ac.th` / `password123` (admin)
- `teacher@school.ac.th` / `password123` (teacher ตัวอย่าง)
- `student@school.ac.th` / `password123` (student)
- **`KENKEN2517@hotmail.com` / `25172517`** ⭐ (พ่อ — TEACHER)

> ⚠️ **เปลี่ยนรหัสผ่าน admin/student ก่อนเปิดให้คนอื่นใช้!**

---

## 3️⃣ Vercel — Web (5 นาที)

1. ไปที่ <https://vercel.com/new> → Import Git Repository → เลือก repo นี้
2. ตั้งค่าโปรเจกต์:
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm --filter @grade/shared build && pnpm --filter @grade/web build`
   - **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
   - **Output Directory:** `.next` (default)
3. เพิ่ม **Environment Variable**:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-URL
   ```
4. Deploy
5. หลัง deploy เสร็จ → คัดลอก URL ของ Vercel (เช่น `https://grade-portal-xxx.vercel.app`)

---

## 4️⃣ กลับไปอัปเดต CORS ที่ Railway

1. Railway → Variables → แก้:
   ```
   WEB_ORIGIN=https://YOUR-VERCEL-URL
   ```
   หรือใส่หลาย origin: `https://prod.vercel.app,https://preview.vercel.app`
2. Service จะ restart อัตโนมัติ

---

## 5️⃣ ทดสอบบนเว็บจริง

1. เปิด URL ของ Vercel ในมือถือ/desktop
2. Login เป็นพ่อ:
   - Email: `KENKEN2517@hotmail.com`
   - Password: `25172517`
3. ลองสร้างห้องเรียน → เพิ่มนักเรียน → กรอกคะแนน

---

## 🔒 Security Checklist หลัง Deploy

- [ ] เปลี่ยนรหัสพ่อ จาก `25172517` เป็นรหัสที่จำง่ายแต่ปลอดภัยกว่า
- [ ] ลบ/เปลี่ยนรหัส `admin@school.ac.th` (default `password123`)
- [ ] JWT secrets ต้องเป็น random 32+ chars
- [ ] CORS `WEB_ORIGIN` ตรงกับ Vercel URL ไม่ใช่ `*`
- [ ] Neon: เปิด Point-in-time recovery (ฟรี 7 วัน)

---

## 💰 ค่าใช้จ่ายแต่ละเดือน

| Service | Free tier | ใช้จริงสำหรับโรงเรียน |
|---------|-----------|------------------------|
| **Vercel** | unlimited deploy | $0 |
| **Railway** | $5 credit + sleep หลัง 30 นาที | $0 ถ้าใช้ไม่เยอะ / $5/เดือนถ้าต้องการ always-on |
| **Neon** | 0.5GB storage + 5 compute hr/วัน | $0 |
| **Domain** (optional) | - | ~฿350/ปี |

รวม: **ฟรี** หรือสูงสุด **฿200/เดือน** ถ้าต้องการ Railway always-on

---

## 🆘 Troubleshooting

### Vercel build fail: "Cannot find module @grade/shared"
- ตรวจ Install Command มี `cd ../.. && pnpm install`
- ตรวจ Build Command build shared ก่อน

### API 502 บน Railway
- ดู Logs ใน Railway → มักเป็น `DATABASE_URL` ผิด
- ลอง `sslmode=require` ใน connection string

### Login ใช้ไม่ได้ "Failed to fetch"
- เปิด DevTools → Network → ดู CORS error
- ตรวจ `WEB_ORIGIN` ของ Railway ตรงกับ URL ของ Vercel ไหม

### Migration ไม่รัน
- ตรวจ Dockerfile CMD มี `prisma migrate deploy`
- ดู Logs ตอน deploy
