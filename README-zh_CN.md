# Pi Session Web UI

pi 扩展插件 —— 将会话对话在浏览器中展示。服务端随 session 自动启动，通过 `/web` 命令获取访问地址。

## 功能

- **自动启动** — pi session 启动时自动启动服务端
- **会话隔离** — 每个 session 绑定独立的随机端口
- **实时流式** — 消息、工具调用、思考过程通过 SSE 实时推送
- **双向交互** — 在浏览器中向 pi 发送消息；agent 活跃时支持 steer 消息
- **模型切换** — 浏览可用模型并在 UI 中即时切换
- **中断 / 停止** — 随时中止 agent
- **用量统计** — 实时 token 用量（输入、输出、缓存读写、推理 token）
- **上下文窗口** — 监控上下文窗口使用情况和最大 token 限制
- **Markdown** — 完整 GFM 支持，代码块语法高亮（JetBrains Mono）
- **暖色主题** — 暗色/亮色自动检测，选择持久化到 `localStorage`
- **局域网访问** — 默认监听所有接口，局域网内其他人可直接访问
- **SSE 事件回放** — 后连接的客户端会收到排队的事件，不会丢失消息

## 安装

```bash
# 复制到 pi 的扩展目录
mkdir -p ~/.pi/agent/extensions/session-web-ui
cp -r extensions/session-web-ui/* ~/.pi/agent/extensions/session-web-ui/

# 然后重启 pi 或执行 /reload
```

## 使用

1. 正常启动 pi —— web 服务端自动启动，URL widget 自动显示在编辑器上方
2. 在浏览器中打开该 URL 查看和交互对话
3. 随时输入 `/web` 可重新显示 URL

## 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PI_WEB_HOST` | `0.0.0.0` | 绑定地址。设置为 `127.0.0.1` 可限制仅本地访问。 |

每个 session 自动绑定随机端口。默认监听所有接口，局域网内其他设备可直接访问。

## 原理

```
Session A ──:12345──► 浏览器 A
Session B ──:23456──► 浏览器 B
```

每个 session 创建独立的服务端，绑定随机端口。Session A 和 B 互相隔离。如果没有浏览器客户端连接，SSE 事件会被排队，等客户端连接后回放。

## 快捷键

| 按键 | 功能 |
|------|------|
| `/` | 聚焦输入框 |
| `Enter` | 发送 / 中断 |
| `Shift+Enter` | 换行 |

## 安全

- **默认**：绑定到 `0.0.0.0` —— 可从网络访问
- 无认证 —— **请勿暴露到不可信网络**
- 设置 `PI_WEB_HOST=127.0.0.1` 可限制仅本地访问
- 每次 session 启动时自动运行

## 开发

```bash
pi -e ./extensions/session-web-ui/index.ts
# 修改后在 pi 中执行 /reload
```
