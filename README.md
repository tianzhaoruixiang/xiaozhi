# 小智 · 领导助手 · 政府人员调度会

Vue 3 工作台 + Node/Hono 后端（多智能体协作）+ Docker Compose 一键部署。

小智作为领导助手，按需动态调度专家，协助组织**人员调度会**（材料检索、汇讯通知、口述汇报）。

默认对接 **OpenAI 兼容接口**（Ollama / vLLM / LM Studio 等本地模型）；也可切换 Claude Agent SDK。

## 本地开发

```bash
cp .env.example .env
# 编辑 .env：OPENAI_BASE_URL / OPENAI_MODEL / OPENAI_API_KEY
npm install
npm run build -w backend
npm run start -w backend   # :3000
npm run dev -w frontend    # :5173
```

- 工作台：http://127.0.0.1:5173
- API：http://127.0.0.1:3000

### `.env` 关键项

```env
LLM_PROVIDER=openai
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen2.5:7b
```

切换 Claude：

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

## Docker

```bash
cp .env.example .env
# 容器访问宿主机模型时，将 OPENAI_BASE_URL 设为：
# OPENAI_BASE_URL=http://host.docker.internal:11434/v1

# 预下载语音模型到 data/models（首次）
bash tts/download_model.sh
bash tts/download_asr_model.sh

docker compose up --build -d
```

运行时数据与模型统一在项目根目录 `data/`（见 `data/README.md`），compose 挂载为容器内 `/data`。

浏览器：http://localhost:8080

## 功能

- 领导助手工作台与今日政务安排
- 右下角「小智」虚拟形象，语音唤醒（默认「你好，小智」）
  - 平时处于待机，麦克风只做本地 VAD 与唤醒词判定；闲聊、电视、噪声都不会误唤醒
  - 听到「你好，小智」后应答「我在，请讲」，随即开始收领导这一整段话
  - 领导停嘴约 0.7s 自动把识别文本作为指令发出，无需点按发送
  - 唤醒后 12s 无人说话自动回到待机；一句话说成「你好小智，明天几点开会」则直接执行，不播应答
- 小智按需动态生成专家团队并展示协作流程
- 知识能力检索历年调度会档案并汇编背景；汇讯能力通知相关部门并分发资料
- 任务完成后小智向领导口述汇报（时间地点参会人、资料已发送、外出代参会等）
