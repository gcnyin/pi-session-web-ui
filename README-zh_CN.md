# Pi Web Assistant

pi 扩展插件。通过 `/web` 命令启动本地 Web 服务器，在浏览器中实时查看和交互 pi 对话。

设计灵感来自 `frontend-design` skill —— 大胆的美学方向、独特的字体排版、统一的主题系统。

## 功能

- **实时聊天界面** — 通过 Server-Sent Events (SSE) 将消息、轮次、工具调用实时推送到浏览器
- **双向交互** — 在浏览器中输入消息，通过 `POST /message` 发送给 pi
- **工具调用可视化** — 可折叠卡片展示工具名称、参数和结果，带运行状态指示
- **流式支持** — 助手消息实时流式渲染，伴随弹跳动画指示器
- **会话历史** — 执行 `/web` 时，已有对话历史立即展示在浏览器中
- **零外部依赖** — 仅使用 Node.js 内置模块（`http`、`fs`、`child_process`）

## 主题

UI 内置**两套完整主题**，遵循 `frontend-design` 美学指南：

| 主题 | 名称 | 氛围 | 色板 |
|------|------|------|------|
| 🌙 | **Dusk**（暗色） | 温暖炭灰，琥珀金强调，微发光深邃感 | `#0f0f14` 背景，`#d4a053` 强调色 |
| ☀️ | **Dawn**（亮色） | 暖白奶油，墨褐强调，通透轻盈 | `#f7f4ef` 背景，`#8b5a2b` 强调色 |

### 主题切换

- **自动**（默认） — 跟随系统设置 `prefers-color-scheme`
- **手动切换** — 点击顶栏 Theme 按钮循环：`System → Dusk → Dawn`
- **持久化** — 选择结果保存在 `localStorage` 中

### 字体排版

| 角色 | 字体 |
|------|------|
| 标题 / 展示 | **DM Serif Display** — 优雅衬线体 |
| 正文 / UI | **DM Sans** — 温暖几何无衬线体 |
| 代码 | **JetBrains Mono** — 开发者友好的等宽字体 |

## 安装

### 快速开始（自动发现）

```bash
# 将扩展复制到 pi 的自动发现目录
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# 重启 pi 或执行 /reload
```

### 作为 pi 包安装（git）

```bash
pi install git:github.com/your-username/pi-session-web-ui
```

## 使用方法

1. 正常启动 pi
2. 在编辑器中输入 `/web` 并回车
3. 浏览器自动打开 `http://127.0.0.1:<port>`
4. Web 界面实时展示所有对话内容
5. 在浏览器底部输入框发送消息，远程与 pi 交互

## 工作原理

```
┌─────────┐     SSE (事件流)    ┌──────────┐
│   Pi    │ ──────────────────►  │ 浏览器  │
│ (代理)  │                     │  (聊天)  │
│         │ ◄────────────────── │          │
└─────────┘   POST /message     └──────────┘
```

扩展监听 pi 的生命周期事件，并广播给所有连接的浏览器：

| 事件 | 说明 |
|------|------|
| `session_start` | 新会话开始 |
| `agent_start` / `agent_end` | 代理生命周期 |
| `turn_start` / `turn_end` | 轮次边界 |
| `message_start` / `message_update` / `message_end` | 消息生命周期（含流式 token） |
| `tool_execution_start` / `tool_execution_update` / `tool_execution_end` | 工具执行过程（含参数和结果） |

## 安全性

- 服务器仅绑定 `127.0.0.1`（本地回环），不对外暴露
- 无身份认证 —— 仅本机进程可访问
- 仅在你明确输入 `/web` 后才会启动

## 项目结构

```
pi-session-web-ui/
├── package.json                          # pi 包清单
├── README.md
├── README-zh_CN.md                       # 中文说明
└── extensions/
    └── session-web-ui/
        ├── index.ts                      # 扩展入口（命令注册 + 事件监听）
        ├── server.ts                     # HTTP + SSE 服务器实现
        └── index.html                    # 浏览器 UI（双主题、响应式、动效）
```

## 开发

```bash
# 加载扩展进行测试
pi -e ./extensions/session-web-ui/index.ts

# 修改后，在 pi 中执行 /reload 热重载
```
