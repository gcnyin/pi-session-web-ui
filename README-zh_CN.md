# Pi Web UI

pi 扩展插件 —— 输入 `/web`，在浏览器中实时聊天。

## 功能

- **实时流式** — 消息、工具调用、思考过程通过 SSE 实时推送
- **双向交互** — 在浏览器中向 pi 发送消息
- **会话侧边栏** — 浏览、切换、新建会话（`Ctrl+B`）
- **模型切换** — 在 UI 中即时切换模型
- **中断 / 停止** — 随时停止 agent
- **Markdown** — 完整 GFM 支持，代码块语法高亮
- **暖色主题** — 暗色/亮色自动检测，选择持久化到 `localStorage`

## 安装

```bash
# 复制到 pi 的扩展目录
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# 然后重启 pi 或执行 /reload
```

## 使用

1. 正常启动 pi
2. 输入 `/web`（或 `/web-ui`）
3. 浏览器自动打开第一个可用地址

## 配置

可通过环境变量配置服务器：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PI_WEB_PORT` | `9876` | 监听端口。设置为 `0` 可使用随机端口。 |
| `PI_WEB_HOST` | `0.0.0.0` | 绑定地址。默认监听所有接口。设置为 `127.0.0.1` 可限制仅本地访问。 |

当监听所有接口（`0.0.0.0`）时，服务器会在通知中列出所有可用地址，方便从网络中的其他设备访问。

## 快捷键

| 按键 | 功能 |
|------|------|
| `/` | 聚焦输入框 |
| `Ctrl+B` | 切换侧边栏 |
| `Enter` | 发送 / 中断 |
| `Shift+Enter` | 换行 |

## 原理

```
Pi (agent)  ──SSE──►  浏览器
            ◄─POST──
```

扩展监听 pi 的生命周期事件（`message_start`、`tool_execution_*` 等），通过 SSE 广播给浏览器。

## 安全

- **默认**：绑定到 `0.0.0.0` —— 可从网络访问
- 无认证 —— **请勿暴露到不可信网络**
- 设置 `PI_WEB_HOST=127.0.0.1` 可限制仅本地访问
- 只有输入 `/web` 后才会启动

## 开发

```bash
pi -e ./extensions/session-web-ui/index.ts
# 修改后在 pi 中执行 /reload
```
