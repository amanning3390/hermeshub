# VoScript 配置指南

本文档说明如何为 VoScript 技能包配置服务地址与 API Key。

## 配置项概览

| 配置项              | 说明                       | 示例                       |
| ------------------- | -------------------------- | -------------------------- |
| `VOSCRIPT_URL`      | VoScript 服务的 HTTP 地址  | `http://localhost:7880`    |
| `VOSCRIPT_API_KEY`  | 鉴权密钥                   | `1sa1SA1sa+`               |

所有技能脚本都会按以下顺序解析配置：

1. 命令行参数 `--url` / `--api-key`（最高优先级）
2. 环境变量 `VOSCRIPT_URL` / `VOSCRIPT_API_KEY`
3. 无配置 → 脚本应报错，提示用户显式提供

## 获取服务地址

- **本机运行（Docker Compose 默认）**：`http://localhost:7880`
- **局域网部署**：形如 `http://<nas-ip>:7880` 或自定义域名
- **容器内服务名**：默认端口 `7880`，与 `docker-compose.yml` 保持一致

如不确定端口，检查 VoScript 部署端的 `docker-compose.yml` 中 `ports`
条目，以及 `app/main.py` 中 `uvicorn` 启动配置。

## 获取 / 配置 API Key

VoScript 使用静态 API Key 做鉴权，每次请求通过 Header 或查询参数传入。
API Key 在服务端配置文件中设置，部署方需要将其提供给调用端。

常见鉴权方式（由具体部署决定，技能脚本会按实际服务端要求封装）：

- Header：`Authorization: Bearer <API_KEY>`
- 或 Header：`X-API-Key: <API_KEY>`

## 环境变量配置

### Unix/macOS (bash/zsh)

```bash
export VOSCRIPT_URL="http://localhost:7880"
export VOSCRIPT_API_KEY="your_api_key_here"
```

将上述两行加入 `~/.zshrc` 或 `~/.bashrc` 可永久生效。

### Windows (PowerShell)

```powershell
$env:VOSCRIPT_URL = "http://localhost:7880"
$env:VOSCRIPT_API_KEY = "your_api_key_here"
```

## 命令行参数覆盖

所有 `scripts/` 下的脚本都接受 `--url` 与 `--api-key`：

```bash
python ${SKILL_PATH}/scripts/list_transcriptions.py \
  --url http://nas.example.com:7880 \
  --api-key your_api_key_here
```

适用于临时调用其他部署、或在没有环境变量的上下文中直接运行。

## 验证配置

最轻量的验证方式是调用转写列表接口：

```bash
python ${SKILL_PATH}/scripts/list_transcriptions.py
```

- 返回 `200` 和 JSON 数组 → 配置正确
- 返回 `401` → API Key 错误
- 连接超时 / `Connection refused` → URL 错误或服务未启动

## 常见问题

- **端口被防火墙阻断**：检查宿主机防火墙与云服务器安全组。
- **HTTPS 证书问题**：自签名证书时脚本可能拒绝连接，请联系部署方提供
  受信任证书或改用 HTTP。
- **API Key 泄露**：立刻在服务端更换，并同步更新所有调用端的环境变量。
