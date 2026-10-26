# SaaS 认证与租户隔离

## Supabase dev 配置

1. 在 Supabase dev 项目中执行 `supabase/migrations/authIsolation.sql`。
2. 执行 `supabase/migrations/creditLedger.sql`。该迁移创建积分钱包、AI 用量、积分流水及服务端 RPC；只允许用户读取自己的数据，写入由受控函数完成。
3. 执行 `supabase/migrations/durableMediaTasks.sql`。该迁移增加视频远端任务恢复字段和服务端 Worker RPC。
4. 在 Authentication 的 URL Configuration 中：
   - Site URL 配置为 Web 服务地址，例如本地 Docker 的 `http://127.0.0.1:3000/`
   - Redirect URL 配置为 `http://127.0.0.1:3000/api/auth/callback`
5. 在 Authentication 的 Providers 中启用要使用的 OAuth Provider，并填写对应平台的 Client ID 与 Secret。
6. 将 `.env.example` 复制为 `.env`，填写 dev project 的 URL、anon key、service role key 和已启用的 Provider。

`SUPABASE_URL`、`SUPABASE_ANON_KEY` 只由 Express 使用。OAuth PKCE 交换、token 刷新和 Supabase 请求都在服务端完成，浏览器只保存 `/api` 路径下的 HttpOnly 会话 Cookie，不接触 Supabase key 或用户 token。

`SUPABASE_SERVICE_ROLE_KEY` 仅用于服务端视频任务恢复和 Stripe Webhook 积分入账。它拥有绕过 RLS 的权限，必须只放在服务端环境变量中，不能进入前端、日志或镜像。

## Provider 密钥

Provider API Key 只在服务端环境中配置：

```env
DEEPSEEK_API_KEY=
OPENROUTER_API_KEY=
```

也可以使用 `TOONFLOW_PROVIDER_CONFIGS` 按 Provider ID 覆盖配置。`/api/settings/get` 会对所有密钥字段脱敏；设置保存时会保留服务端已有的秘密字段。

普通用户角色默认为 `user`。平台管理员可在 Supabase SQL Editor 中执行：

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'admin@example.com'
);
```

也可以通过 `TOONFLOW_ADMIN_EMAILS` 配置管理员邮箱，多个邮箱使用逗号分隔。

## 数据路径

- 项目元数据：Supabase `public.projects`
- 用户资料：Supabase `public.profiles`
- 用户个人设置：Supabase `public.user_settings`
- AI 用量：Supabase `public.ai_usage`
- 积分余额与流水：Supabase `public.credit_wallets`、`public.credit_ledger`
- 用户素材：`/app/data/accounts/{userId}/assets`
- 用户项目：`/app/data/accounts/{userId}/projects/{projectId}`
- 平台 Provider、API Key、插件与模型文件：继续保存在 `/app/data/settings.json` 及平台插件目录，仅管理员可修改

客户端传入的项目绝对目录只作为定位线索。服务端必须先从 Supabase 回查该用户的 `projects` 记录，再使用服务端计算出的目录。

## AI 积分

积分计费默认关闭。执行 `creditLedger.sql` 后，在 `.env` 中设置：

```env
TOONFLOW_CREDITS_ENABLED=true
TOONFLOW_CREDIT_USD=0.001
TOONFLOW_CREDIT_MARKUP_RATE=1.3
```

当前仅对 `openrouterMedia` 的图片、视频生成启用。提交任务时按 OpenRouter 公共模型价格预扣积分，完成时使用响应中的 `usage.cost` 结算，失败时释放预扣。`1 积分`按 `TOONFLOW_CREDIT_USD` 对应的美元上游成本计价，`TOONFLOW_CREDIT_MARKUP_RATE` 只在上游成本换算成积分时应用一次。

每笔任务按换算结果四舍五入为整积分。例如 `59.0` 保留为 `59`，`59.8` 计为 `60`。

Stripe 支付使用 Hosted Checkout，按 `$1 = 1000 credits` 提供固定套餐。浏览器只提交套餐 ID，积分由已验证的 Stripe Webhook 通过专用服务端 RPC 入账。需要配置：

```env
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Webhook 地址为 `/api/credits/webhook`，监听 `checkout.session.completed` 和 `checkout.session.async_payment_succeeded`。

复用现有 `SUPABASE_SERVICE_ROLE_KEY`，不新增数据库角色。购买入账 RPC 只授权给现有 `service_role`，并在函数内再次校验调用角色；该密钥仍具有绕过 RLS 的全局权限，因此只能留在服务端环境变量中。

管理员仍可通过 `POST /api/credits/grant` 发放积分：

```json
{
  "ownerId": "目标用户 UUID",
  "credits": 1000,
  "note": "首轮内测额度"
}
```

普通用户通过 `GET /api/credits/get` 读取余额，通过 `GET /api/credits/usage/list` 读取最近用量。`credit_ledger` 是只追加账本，不能直接修改或删除历史流水来修正余额。
