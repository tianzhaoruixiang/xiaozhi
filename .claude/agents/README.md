# 专家 · 专家团 · 工作流配置

本目录遵循 [Claude Code 多智能体规范](https://code.claude.com/docs/en/sub-agents)：用 Markdown + YAML frontmatter 定义子智能体，再用团队与工作流编排协作。

## 目录结构

```
.claude/
  agents/           # 单个专家（Claude Code subagent）
    *.md
  teams/            # 专家团（成员名单）
    *.json
  workflows/        # 工作流（步骤 + dependsOn 并行）
    *.json
```

## 专家（agents/*.md）

```yaml
---
name: room-coordinator          # 必填，lowercase-hyphen，= subagent_type
displayName: 会议管理专家             # 前端展示名
role: 预定会议室并生成会议议程
description: Use when ...       # 英文，供编排器判断何时委派
capabilities: [rooms]           # knowledge | rooms | schedule | huixun
---

系统提示正文（Markdown）…
```

## 专家团（teams/*.json）

```json
{
  "name": "personnel-dispatch",
  "displayName": "人员调度会专家团",
  "description": "…",
  "agents": ["context-analyst", "room-coordinator"],
  "defaultWorkflow": "personnel-dispatch"
}
```

## 工作流（workflows/*.json）

```json
{
  "name": "personnel-dispatch",
  "displayName": "人员调度会标准流程",
  "goalTemplate": "围绕「{{shortMessage}}」完成准备",
  "steps": [
    { "agent": "context-analyst", "dependsOn": [] },
    { "agent": "room-coordinator", "dependsOn": ["context-analyst"] },
    { "agent": "director-scheduler", "dependsOn": ["context-analyst"] }
  ]
}
```

同波次、互不依赖的步骤会**并行**执行。模板变量：`{{message}}`、`{{shortMessage}}`。

## 编排模式

环境变量 `XIAOZHI_ORCHESTRATION`（也可在每次聊天请求里传 `mode`）：

| 模式 | 行为 |
|------|------|
| `config` | 只用配置的专家团 + 工作流 |
| `dynamic` | 小智每轮动态生成专家（旧行为） |
| `hybrid` | 先识别意图：普通问题由小智直接执行（Claude Code / 模型）；今日安排问询答复日程；办会任务用配置工作流（默认） |

意图分流：`现在几点了` → 小智直接答时间；`今天重点事项` → 答复日程；`准备会议并通知` → 人员调度会专家团；`找推荐领域专家` → 领域专家寻访专家团；`准备线上沟通` → 线上沟通专家团；`邀请线下沟通` → 线下沟通邀约专家团。专家团/工作流留空即为智能识别。

可选：`XIAOZHI_DEFAULT_TEAM`、`XIAOZHI_DEFAULT_WORKFLOW`、`AGENT_CONFIG_ROOT`。

## 可挂载能力

- knowledge：会议档案检索与背景汇编
- rooms：会议室查询与预定
- schedule：厅长日程安排
- huixun：汇讯通知投递

前端头像按专家 `name` 稳定映射豆包风 3D Q 版预设（如 `context-analyst`→青芽、`room-coordinator`→豆米）；也可在 frontmatter 写 `avatar: taoyao` 指定预设 id。

## 内置专家团

| 专家团 | 用途 |
|--------|------|
| `personnel-dispatch` | 人员调度会：情境、会议室、日程、安保管理、汇讯 |
| `domain-expert-sourcing` | 领域专家寻访：小红书 / 领英 / 脉脉并行挖人 → 综合短名单 |
| `online-communication` | 线上沟通：话术 + 会议安排 → 综合方案（可上报 HRBP） |
| `offline-meetup` | 线下沟通：邀约 + 接待协调 → 综合方案（可上报 HRBP） |
