# Task Core Service (NestJS)

Core service kiểu Jira-like cho:
- users
- projects
- tasks
- workload
- AI assignment proxy

## Cài thư viện

```bash
npm install
```

## Chạy local

```bash
cp .env.example .env
npm run start:dev
```

## Khoi tao tai khoan Admin

He thong khong mo API dang ky cong khai. Sau khi chay migration, tao tai khoan Admin dau tien bang bien moi truong trong `.env`:

```bash
npm run migration:run
npm run seed:admin
```

Seed co the chay lai: neu dung cung `ADMIN_EMAIL` va `ADMIN_USERNAME`, tai khoan Admin se duoc cap nhat va mo khoa.

## Seed role, permission va tai khoan demo

```bash
npm run seed
```

Lenh nay seed ma tran permission, project `DEMO` va cac tai khoan:

- `system.admin@example.com`: system role `ADMIN`
- `project.admin@example.com`: project role `admin`
- `manager@example.com`: project role `manager`
- `member@example.com`: project role `member`
- `viewer@example.com`: project role `viewer`

Mat khau chung lay tu `SEED_DEFAULT_PASSWORD`. Seed co the chay lai ma khong tao trung du lieu.

## Thư viện chính đang dùng

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `@nestjs/config`
- `@nestjs/axios`
- `class-validator`
- `class-transformer`
- `rxjs`

## Các thư viện nên cài thêm khi lên phase tiếp theo

```bash
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/microservices amqplib amqp-connection-manager
```

## API base

- `GET /api/v1/health`
- `GET /api/v1/users`
- `GET /api/v1/projects`
- `GET /api/v1/tasks`
- `POST /api/v1/ai-assignment/recommend`

## Swagger

- UI: `http://localhost:3000/api/v1/docs`
- JSON: `http://localhost:3000/api/v1/docs-json`
