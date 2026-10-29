# 智账家庭记账本

智账是一个移动优先的家庭记账 PWA，面向同一家庭的两位成员，支持收入、支出、共享账目、隐私消费、预算和消费分析。

## 已实现

- 仅使用一次的初始化流程，创建第一位成员和家庭账本。
- 用户名 + 密码登录，Argon2id 规划替换点当前使用 Node `scrypt`，HttpOnly 会话 Cookie。
- 一次性家庭邀请码，7 天有效，家庭人数上限 2 人。
- 首页收支结余、月预算、自动月度小结、最近账目。
- 记一笔支持自然语言识别、浏览器语音转文字、人民币默认金额、外币当日汇率折算、共同/个人和隐私消费。
- 明细筛选、账目编辑、软删除、CSV 导出。
- 分析月报：六个月趋势、分类占比、成员贡献、预算进度和账本问答。
- 设置：邀请成员、总预算与分类预算、自定义分类、隐私说明、退出登录。
- 猫猫图标来自项目根目录的 `图标.png`，已生成 PWA 图标和 favicon。
- Docker Compose + Caddy HTTPS + SQLite WAL + 定时备份脚本。

## 本地运行

需要 Node 24、pnpm 11。当前环境已验证：

```powershell
pnpm install
pnpm dev
```

打开 `http://localhost:3000/setup`，使用 `.env.local` 中的 `SETUP_TOKEN` 初始化第一位成员。

默认 `.env.local` 只适合本机开发。生产环境请复制 `.env.example`，使用新的随机令牌，不要提交密钥。

## 检查

```powershell
pnpm typecheck
pnpm build
pnpm test
```

已执行过的端到端冒烟流程包括：初始化、自然语言解析、保存账目、分析页、生成邀请码、第二位成员加入以及共享账目可见性。

## 生产部署

1. 准备 Ubuntu 服务器、域名和 DNS。
2. 安装 Docker 与 Docker Compose。
3. 复制 `.env.example` 为 `.env`，设置 `DOMAIN`、`SETUP_TOKEN` 和可选的 `DEEPSEEK_API_KEY`。
4. 启动：

```bash
docker compose up -d --build
```

5. 访问域名完成初始化，生成邀请码并让第二位成员加入。
6. 验证健康检查：`https://你的域名/api/health`。

Caddy 会自动处理 HTTPS。SQLite 数据卷位于 `zhizhang-data`，备份位于 `zhizhang-backups`，默认保留 14 天。

## 目录说明

- `app/`：Next.js 页面、布局和 Route Handlers。
- `components/`：客户端表单、导航和交互组件。
- `lib/db/`：SQLite + Drizzle schema 与数据库连接。
- `lib/server/`：认证、家庭、账目、汇率、解析、统计和报告逻辑。
- `drizzle/`：数据库迁移。
- `public/`：PWA manifest、Service Worker 和应用图标。
- `scripts/`：备份、密码重置和端到端冒烟脚本。
- `docs/screenshots/`：本次开发后的页面截图。
- `previews/`：开发前确认过的高保真预览稿。
