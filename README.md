# 试金石小助手 — AI Chat

在线 AI 对话应用，支持流式对话、多轮会话管理、用户认证、主题切换、移动端适配、多设备局域网访问。

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
| 测试        | Vitest                              |

## 功能特性

- **流式对话** — SSE（Server-Sent Events）+ 打字机效果，实时呈现 AI 回复
- **多轮会话** — 创建/切换/重命名/置顶/删除对话，按 pin + 时间排序
- **Markdown 渲染** — AI 回复支持代码高亮、XSS 防护（DOMPurify）
- **用户系统** — 手机号注册/登录，JWT 鉴权，对话数据用户隔离
- **主题切换** — 浅色/深色主题，持久化存储
- **移动端适配** — 三档断点（768px / 540px / 480px），侧边栏抽屉覆盖 + 滑入动画，设置面板自适应全屏，代码块自动折行
- **多设备访问** — 前端 bind 0.0.0.0 + Vite 代理，同一局域网其他设备可直接访问
- **个人设置** — 头像裁剪上传、用户名修改
- **错误处理** — 全局错误捕获、ErrorBoundary 降级 UI
- **性能优化** — 消息按需懒加载、流式期间跳过 markdown 解析、消息体不写入 localStorage、highlight.js 按语言导入

## 项目结构

```
├── src/                    # 前端源码
│   ├── api/                # API 请求层（Axios 封装、token 缓存、超时）
│   ├── assets/             # 图片、全局样式（global.css）
│   ├── components/         # 组件
│   │   ├── chat/           # 聊天相关（ChatMessage/ChatInput/ConversationList/ConversationItem）
│   │   ├── common/         # 通用组件（ErrorBoundary/AvatarCropper/PanelDialog/EmptyState）
│   │   └── settings/       # 设置面板
│   ├── composables/        # 组合式函数（useChatStream/useMarkdown/useBreakpoint/useAutoScroll…）
│   ├── mobile/             # 移动端适配（responsive.css + useSidebarDrawer）
│   ├── layout/             # 布局组件（AppLayout/Sidebar）
│   ├── router/             # 路由配置 + 导航守卫
│   ├── stores/             # Pinia Store（chat/user/theme/settings）
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数（id/storage/logger/format/validation/dialog）
│   └── views/              # 页面（ChatView/LoginView/SettingsView）
├── server/                 # 后端源码
│   ├── src/
│   │   ├── auth.ts         # 认证路由（注册/登录/更新资料）
│   │   ├── chat.ts         # 对话路由（CRUD + SSE 流式）
│   │   ├── middleware.ts   # JWT 鉴权中间件
│   │   └── index.ts        # Express 入口
│   ├── prisma/schema.prisma   # 数据模型
│   └── .env.example         # 环境变量模板
└── public/
```

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm

### 1. 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd server && pnpm install && cd ..
```

### 2. 配置环境变量

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`，填入以下必填项：

- `JWT_SECRET` — 随机字符串
- `DEEPSEEK_API_KEY` — DeepSeek API Key（从 https://platform.deepseek.com 获取）

### 3. 初始化数据库

```bash
cd server
npx prisma db push
cd ..
```

### 4. 启动开发环境

```bash
# 启动后端（端口 3000）
cd server && pnpm dev

# 新终端启动前端（端口 5173）
pnpm dev
```

访问 http://localhost:5173 即可使用。

### 5. 局域网多设备访问

前端已配置 `host: 0.0.0.0` 和 `/api` 代理，同一网络下的其他设备可直接访问：

1. 本机执行 `ipconfig`，找到 WLAN 适配器的 IPv4 地址（如 `192.168.x.x`）
2. 其他设备浏览器访问 `http://<本机IP>:5173`
3. 如无法访问，以管理员身份运行：
   ```cmd
   netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow protocol=TCP localport=5173
   ```

### 6. 运行测试

```bash
pnpm test
```
