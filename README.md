# 试金石小助手 — AI Chat

在线 AI 角色扮演对话应用，全栈自研。支持 SSE 流式对话、中间件可扩展 AI SDK、多轮会话管理、用户认证、主题切换、移动端适配。

## 技术栈

| 层          | 技术                                |
| ----------- | ----------------------------------- |
| 前端框架    | Vue 3 + TypeScript                  |
| UI 组件库   | Element Plus                        |
| 状态管理    | Pinia + pinia-plugin-persistedstate |
| 路由        | Vue Router 4                        |
| HTTP 客户端 | Axios                               |
| 构建工具    | Vite                                |
| 后端框架    | Express                             |
| 数据库      | SQLite + Prisma ORM                 |
| 认证        | JWT + bcryptjs                      |
| AI 接口     | DeepSeek（OpenAI 兼容）             |
| 测试        | Vitest + happy-dom                  |

## 功能特性

### AI 对话引擎

- **流式对话** — SSE（Server-Sent Events）+ requestAnimationFrame 打字机效果
- **AI SDK 抽象层** — AIClient 核心客户端 + 中间件洋葱管道 + ChatAdapter 接口解耦 Pinia
- **中间件可插拔** — 指数退避重试（可配置次数/倍率）、请求日志管线（分级输出），按注册顺序执行
- **Markdown 渲染** — 代码块语法高亮（14 种语言按需加载）、XSS 防护（DOMPurify）、一键复制
- **用户中断/恢复** — 中止生成时自动保存部分内容，意外断开时降级为错误提示

### 会话管理

- 创建/切换/重命名/置顶/删除对话，按 pin + 更新时间排序
- 对话列表分组显示（置顶 / 最近），30 秒同步缓存
- 消息按需懒加载，消息体不写入 localStorage
- 重新生成 AI 回复

### 用户系统

- 手机号注册/登录，JWT 7 天有效期
- BCrypt 密码哈希，服务端速率限制（每 IP 每分钟最多 10 次认证请求）
- 对话数据用户隔离
- 头像裁剪上传（Canvas 拖拽/缩放/圆形裁剪）、用户名修改

### 工程化

- **中间件洋葱模型** — `(ctx, next) => Promise<void>` 签名，请求前 / 出错后两阶段执行，`ctx.retry` 由中间件决定
- **SSE 流解析器** — 纯函数 `parseSSEStream`，`Promise.race` 竞速 AbortSignal，跨 chunk 拼接、心跳过滤、JSON 容错
- **ChatAdapter 适配器模式** — Pinia / 内存双实现，`useChat` 可独立于 Pinia 单测
- **测试** — Vitest 6 文件 32 单测，覆盖 SSE 解析、重试中间件、useChat 核心路径
- **类型检查** — TypeScript strict 模式，`vue-tsc --build` 零错误
- **错误处理** — ErrorBoundary 降级 UI（最多 3 次重试）、全局未捕获错误面板、流中断时部分内容提交

### 体验优化

- 浅色/深色主题切换，持久化存储，挂载前应用避免闪烁
- 三档响应式断点（768px / 540px / 480px），侧边栏抽屉 + 滑入动画
- 前端 bind 0.0.0.0，同局域网其他设备可直接访问
- IME 组合输入防误触、500ms 发送节流、流式期间跳过 Markdown 解析

## 架构亮点

```
ChatView (UI 层)
  │
  └── useChat (composable) ─── ChatAdapter ─── Pinia Store (数据层)
         │                        │
         │                    Memory 实现（测试用）
         │
         └── AIClient (请求层)
               │
               ├── runPipeline()     洋葱中间件管道
               │    ├─ logging  请求日志
               │    └─ retry    指数退避重试
               │
               ├── fetchSSE()        HTTP + ReadableStream
               │
               └── parseSSEStream()  纯函数 SSE 解析
                     └─ Promise.race(reader.read(), abort)
```

核心设计思想：**UI 层 → useChat → AIClient 三层递进**。useChat 通过 ChatAdapter 接口读写消息（不 import Pinia），AIClient 通过中间件管道管理请求生命周期（重试/日志可插拔），StreamParser 作为纯函数独立于框架。

## 项目结构

```
├── src/
│   ├── ai/                          # AI SDK 层
│   │   ├── core/
│   │   │   ├── AIClient.ts          # 核心客户端（中间件管道 + 流式请求）
│   │   │   ├── StreamParser.ts      # SSE 流解析器（纯函数）
│   │   │   ├── types.ts             # SDK 类型定义
│   │   │   └── __tests__/           # StreamParser 单测
│   │   ├── composables/
│   │   │   ├── useChat.ts           # 主 composable（替代 useChatStream）
│   │   │   ├── useChatAdapter.ts    # Pinia / 内存 ChatAdapter 工厂
│   │   │   └── __tests__/           # useChat 单测
│   │   ├── middleware/
│   │   │   ├── retry.ts             # 指数退避重试中间件
│   │   │   ├── logging.ts           # 请求日志中间件
│   │   │   └── __tests__/           # retry 单测
│   │   └── index.ts                 # SDK 统一导出
│   │
│   ├── api/                         # HTTP 请求层
│   │   ├── client.ts                # Axios 实例、token 缓存、拦截器
│   │   ├── auth.ts                  # 认证 API
│   │   └── chat.ts                  # 对话 API（SSE 解析已迁移至 parseSSEStream）
│   │
│   ├── assets/                      # 图片、全局样式
│   ├── components/                  # UI 组件
│   │   ├── chat/                    # ChatMessage / ChatInput / ConversationList / ConversationItem
│   │   ├── common/                  # ErrorBoundary / AvatarCropper / PanelDialog / EmptyState
│   │   └── settings/                # 设置面板
│   ├── composables/                 # 组合式函数
│   │   ├── useChatStream.ts         # ⚠️ deprecated → 请使用 @/ai 中的 useChat
│   │   ├── useMarkdown.ts           # Markdown 渲染
│   │   ├── useAutoScroll.ts         # 消息自动滚动
│   │   └── ...
│   ├── layout/                    # 布局组件
│   ├── mobile/                    # 移动端适配
│   ├── router/                    # 路由 + 导航守卫
│   ├── stores/                    # Pinia Store
│   ├── types/                     # TypeScript 类型
│   ├── utils/                     # 工具函数
│   └── views/                     # 页面
│
├── server/                        # 后端
│   ├── src/
│   │   ├── index.ts                 # Express 入口
│   │   ├── auth.ts                  # 认证路由
│   │   ├── chat.ts                  # 对话路由（CRUD + SSE）
│   │   ├── middleware.ts            # JWT 鉴权
│   │   └── prompts/                 # AI 角色人设（character.md / system.md）
│   ├── prisma/schema.prisma
│   └── .env.example
│
└── public/
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm

### 1. 安装依赖

```bash
pnpm install
cd server && pnpm install && cd ..
```

### 2. 环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：

| 变量               | 说明                                              |
| ------------------ | ------------------------------------------------- |
| `JWT_SECRET`       | 随机字符串                                        |
| `DEEPSEEK_API_KEY` | DeepSeek API Key（https://platform.deepseek.com） |

### 3. 初始化数据库

```bash
cd server && npx prisma db push && cd ..
```

### 4. 启动

```bash
# 终端 1：后端（端口 3000）
cd server && pnpm dev

# 终端 2：前端（端口 5173）
pnpm dev
```

访问 http://localhost:5173

### 5. 测试

```bash
pnpm test           # 单次运行（32 tests）
pnpm run type-check # TypeScript 类型检查
pnpm run lint       # ESLint + oxlint
```

### 6. 局域网访问

前端已配置 `host: 0.0.0.0`，同一网络下其他设备访问 `http://<本机IP>:5173` 即可。

## 部署上线

### 架构

```
Vercel（前端静态资源）──► Render（后端 Express API）
                              │
                         SQLite（本地文件，免费层重启后数据丢失）
```
