# Web SaaS 最小部署

本项目只部署浏览器版 Web 服务端，不提供桌面端或移动端。Magic Link 也不做桌面协议唤起或跨端会话回传；登录链接必须在发起请求的同一浏览器中打开。订阅套餐和自动充值不在当前 MVP 范围内。

## 1. 准备外部服务

- 一个 Supabase 项目。
- 已启用的 Supabase Email Provider。开发或小规模使用可直接使用 Supabase 内置邮件服务。
- 可选：OAuth Provider，例如 GitHub 或 Google。
- 一个服务端持有的 OpenRouter API Key。
- 一个指向服务器的域名。生产环境必须使用 HTTPS。

## 2. 初始化 Supabase

在 Supabase SQL Editor 中按顺序执行：

1. `supabase/migrations/authIsolation.sql`
2. `supabase/migrations/creditLedger.sql`
3. `supabase/migrations/signupCredits.sql`
4. `supabase/migrations/durableMediaTasks.sql`
5. `supabase/migrations/stripeCredits.sql`

在 Supabase Authentication 的 URL Configuration 中设置：

```text
Site URL: https://your-domain.example
Redirect URL: https://your-domain.example/api/auth/callback
```

启用 Email Provider，并允许新用户注册以支持首次 Magic Link 自动建号；这不是站点注册表单。邮件模板保留 `{{ .ConfirmationURL }}` 以发送 Magic Link。无需额外配置 SMTP 即可先使用 Supabase 内置邮件服务；正式面向大量用户开放前，再配置自定义 SMTP，避免内置服务的发送频率限制和送达率问题。需要 OAuth 登录时再启用实际使用的 OAuth Provider，并填写平台的 Client ID 与 Secret。

## 3. 配置环境变量

从 `.env.example` 创建 `.env`，至少配置：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_OAUTH_PROVIDERS=github
TOONFLOW_ADMIN_EMAILS=you@example.com
TOONFLOW_PUBLIC_URL=https://your-domain.example
TOONFLOW_COOKIE_SECURE=true
OPENROUTER_API_KEY=your-openrouter-key
STRIPE_SECRET_KEY=sk_live_or_test
STRIPE_WEBHOOK_SECRET=whsec_xxx
TOONFLOW_CREDITS_ENABLED=true
TOONFLOW_CREDIT_USD=0.001
TOONFLOW_CREDIT_MARKUP_RATE=1.3
```

每笔任务的积分消耗四舍五入为整数，例如 `59.0` 消耗 `59` 积分，`59.8` 消耗 `60` 积分。

在 Stripe Dashboard 创建 Webhook，监听以下事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Webhook URL 为 `https://your-domain.example/api/credits/webhook`，将签名密钥填入 `STRIPE_WEBHOOK_SECRET`。积分套餐按严格 `$1 = 1,000 credits` 提供：

- `$10`：10,000 credits
- `$20`：20,000 credits
- `$50`：50,000 credits

当前 Checkout 使用服务端 `price_data` 动态创建一次性价格，不需要在 Stripe Dashboard 预先创建 Price。若以后改为引用固定 Price，可以创建一个 `$10 / 10,000 credits` 的 Price，并在 Checkout 中按数量 `1/2/5` 销售；若希望每个套餐在 Stripe 后台独立统计，则创建 3 个 Price。价格和积分仍只能由服务端套餐白名单决定。

购买按钮、套餐、支付状态和错误提示统一使用 `@toonflow/i18n`，新增或修改文案时必须同步翻译词典，不能在 credits 组件中直接写死展示文本。

Reverse Proxy 与容器在同一台机器时保持：

```env
TOONFLOW_BIND_ADDRESS=127.0.0.1
```

没有 Reverse Proxy、需要直接暴露 3000 端口时改为 `0.0.0.0`。生产环境不建议直接暴露 HTTP 端口。

## 4. 构建并启动

```bash
docker compose --env-file .env.prod up -d --build
docker compose --env-file .env.prod ps
curl http://127.0.0.1:3000/healthz
```

健康检查应返回：

```json
{"status":"ok"}
```

容器中的 `/app/data` 使用命名卷持久化，包含账号素材和项目目录。不要删除 `toonflowData` 卷。

## 5. 验证登录与管理员身份

使用任意邮箱发送 Magic Link，并在发起请求的同一浏览器中打开邮件链接。首次登录会由 Supabase 自动创建账号。使用 `TOONFLOW_ADMIN_EMAILS` 中配置的邮箱登录后，打开 `GET /api/auth/session` 确认响应中的 `isAdmin` 为 `true`，并记录 `data.user.id`。

新用户默认没有积分，因此不能发起 OpenRouter 生成。用户可通过 credits 面板进入 Stripe Checkout 购买积分；管理员仍可手动发放积分：

```js
await fetch("/api/credits/grant", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-toonflow-workspace": "1",
  },
  body: JSON.stringify({
    ownerId: "当前用户 UUID",
    credits: 1000,
    note: "MVP 初始额度",
  }),
});
```

积分发放后刷新页面，可从画布右上角查看余额和最近用量。

## 6. 最小验收

1. 完成 Magic Link 登录。
2. 创建项目并打开画布。
3. 添加一个图片生成节点，选择 OpenRouter Qwen Image 模型。
4. 输入提示词并生成，确认扣除积分且历史记录出现成功任务。
5. 添加视频生成节点，确认提交后没有停止按钮，完成后正常回填。
6. 将积分余额降到不足后重新生成，确认接口返回 `402` 且没有调用上游。

## 7. 已知边界

- 视频提交后不可取消，服务端最长等待 35 分钟。
- Magic Link 使用 PKCE，链接只能在发起登录的同一浏览器中完成；不支持桌面端、移动端或跨设备会话回传。
- 视频只有在 OpenRouter 返回并成功保存 `jobId` 后才能自动恢复；提交过程中进程退出仍可能丢失该次请求。
- 自动恢复需要 `durableMediaTasks.sql` 和 `SUPABASE_SERVICE_ROLE_KEY`。
- 尚未接入退款、订阅和每日免费额度。
- 平台使用同一个服务端 OpenRouter Key，因此计费按用户积分扣减；用户不会接触该 Key。
