<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="gate xiaozhi-scope">
    <div class="atmosphere" aria-hidden="true">
      <div class="mesh" />
      <div class="orb orb-a" />
      <div class="orb orb-b" />
    </div>

    <main class="panel">
      <p class="kicker">小智</p>
      <h1>选择工作台</h1>
      <p class="hint">领导和执行人员使用不同的台面，互不混用。</p>

      <div class="desks">
        <RouterLink class="desk leader" to="/leader">
          <span class="role">领导</span>
          <strong>领导工作台</strong>
          <em>语音助手 · 今日政务 · 调度专家团</em>
        </RouterLink>
        <RouterLink class="desk command" to="/command">
          <span class="role">高总</span>
          <strong>高总工作台</strong>
          <em>专项任务 · 当前组任务与成员进度</em>
        </RouterLink>
        <RouterLink class="desk team" to="/team">
          <span class="role">王处</span>
          <strong>王处工作台</strong>
          <em>专项任务 · 各组任务进展</em>
        </RouterLink>
        <RouterLink class="desk personal" to="/personal">
          <span class="role">个人</span>
          <strong>个人工作台</strong>
          <em>专项任务 · 人选经营 · 进入工作组</em>
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.gate {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background:
    radial-gradient(1000px 520px at 12% -8%, rgba(46, 196, 214, 0.22), transparent 58%),
    radial-gradient(820px 480px at 94% 8%, rgba(201, 168, 108, 0.16), transparent 52%),
    linear-gradient(168deg, #c5d8e6 0%, #e7f0f6 48%, #eef4f8 100%);
}

.atmosphere {
  pointer-events: none;
  position: absolute;
  inset: 0;
}

.mesh {
  position: absolute;
  inset: -12%;
  background:
    conic-gradient(from 210deg at 28% 18%, rgba(46, 196, 214, 0.1), transparent 42%),
    conic-gradient(from 40deg at 76% 20%, rgba(201, 168, 108, 0.08), transparent 36%);
  filter: blur(10px);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
}

.orb-a {
  width: 280px;
  height: 280px;
  top: 8%;
  left: 6%;
  background: radial-gradient(circle, rgba(46, 196, 214, 0.34), transparent 70%);
}

.orb-b {
  width: 240px;
  height: 240px;
  right: 8%;
  bottom: 12%;
  background: radial-gradient(circle, rgba(201, 168, 108, 0.28), transparent 70%);
}

.panel {
  position: relative;
  z-index: 1;
  width: min(760px, 100%);
  padding: 36px 32px 32px;
  border-radius: 24px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.82), rgba(240, 248, 252, 0.58)),
    rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.76);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(18px) saturate(1.15);
}

.kicker {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 0.18em;
  color: var(--color-accent);
}

h1 {
  margin: 8px 0 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 5vw, 2.7rem);
  color: var(--color-ink);
  letter-spacing: 0.04em;
}

.hint {
  margin: 10px 0 0;
  color: var(--color-ink-muted);
  line-height: 1.6;
}

.desks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 28px;
}

.desk {
  display: grid;
  gap: 8px;
  min-height: 168px;
  padding: 22px 20px;
  border-radius: 18px;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(20, 40, 58, 0.1);
  transition: transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out);
}

.desk:hover {
  transform: translateY(-3px);
  box-shadow: 0 16px 32px rgba(6, 20, 31, 0.12);
}

.desk.leader {
  background: linear-gradient(155deg, #0f2a3d, #16485c);
  color: #e7f0f6;
  border-color: rgba(46, 196, 214, 0.28);
}

/* 高总：统筹与督办，沿用领导台的深色系但偏钢蓝 */
.desk.command {
  background: linear-gradient(155deg, #102f45, #1a5c78);
  color: #e7f0f6;
  border-color: rgba(46, 196, 214, 0.28);
}

/* 王处：组织与执行，浅色卡 + 绿色调 */
.desk.team {
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(226, 242, 235, 0.86));
  border-color: rgba(47, 125, 90, 0.22);
}

.desk.personal {
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.92), rgba(231, 240, 246, 0.86));
}

.role {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  opacity: 0.72;
}

.desk.command .role {
  color: #9adce8;
  opacity: 1;
}

.desk.team .role {
  color: var(--color-success);
  opacity: 1;
}

.desk strong {
  font-size: 1.35rem;
  letter-spacing: 0.06em;
}

.desk em {
  font-style: normal;
  font-size: 0.9rem;
  line-height: 1.55;
  opacity: 0.78;
}

@media (max-width: 680px) {
  .desks {
    grid-template-columns: 1fr;
  }
}
</style>
