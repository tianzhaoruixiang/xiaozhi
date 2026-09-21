<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="gate xiaozhi-scope">
    <main class="panel">
      <header class="gate-head">
        <div class="brand">
          <span class="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <div>
            <p class="kicker">XIAOZHI · INTELLIGENT COMMAND</p>
            <strong>小智政务协同平台</strong>
          </div>
        </div>
        <span class="system-state"><i />系统在线</span>
      </header>

      <section class="gate-title">
        <span class="section-index">01</span>
        <div>
          <h1>选择工作台</h1>
          <p class="hint">根据当前职责进入对应工作界面</p>
        </div>
      </section>

      <div class="desks">
        <RouterLink class="desk leader" to="/leader">
          <span class="desk-accent" aria-hidden="true" />
          <span class="role"><i />决策与调度</span>
          <strong>领导工作台</strong>
          <em>语音助手、今日政务与专家调度</em>
          <span class="enter">进入工作台 <b>→</b></span>
        </RouterLink>
        <RouterLink class="desk personal" to="/personal">
          <span class="desk-accent" aria-hidden="true" />
          <span class="role"><i />执行与协同</span>
          <strong>个人工作台</strong>
          <em>专项任务、人选经营与工作组协同</em>
          <span class="enter">进入工作台 <b>→</b></span>
        </RouterLink>
      </div>

      <footer class="gate-foot">
        <span>政务协同中枢</span>
        <span>SECURE ACCESS · V2.0</span>
      </footer>
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
  padding: 40px 24px;
  background:
    linear-gradient(90deg, oklch(0.58 0.12 222 / 0.035) 1px, transparent 1px),
    linear-gradient(oklch(0.58 0.12 222 / 0.035) 1px, transparent 1px),
    radial-gradient(circle at 68% 14%, oklch(0.5 0.16 240 / 0.2), transparent 32%),
    radial-gradient(circle at 8% 70%, oklch(0.42 0.15 254 / 0.16), transparent 34%),
    linear-gradient(145deg, oklch(0.125 0.068 254), var(--color-mist) 48%, oklch(0.15 0.08 244));
  background-size: 52px 52px, 52px 52px, auto, auto, auto;
}

.panel {
  position: relative;
  z-index: 1;
  width: min(900px, 100%);
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(145deg, oklch(0.22 0.075 247 / 0.94), oklch(0.15 0.052 252 / 0.96));
  box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 0.3), inset 0 1px 0 oklch(0.84 0.145 207 / 0.05);
}

.panel::before {
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  content: '';
  background: linear-gradient(90deg, var(--color-cyan), oklch(0.62 0.21 254 / 0.35) 58%, transparent 88%);
}

.gate-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  min-height: 82px;
  padding: 18px 28px;
  border-bottom: 1px solid var(--color-line);
  background: linear-gradient(180deg, oklch(0.25 0.075 245 / 0.52), transparent);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-mark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  width: 36px;
  height: 36px;
  padding: 8px;
  border: 1px solid var(--color-line-bright);
  border-radius: 7px;
  background: oklch(0.16 0.06 251 / 0.88);
}

.brand-mark i {
  width: 4px;
  border-radius: 1px;
  background: var(--color-cyan);
}

.brand-mark i:nth-child(1) { height: 9px; opacity: 0.65; }
.brand-mark i:nth-child(2) { height: 18px; }
.brand-mark i:nth-child(3) { height: 13px; background: var(--color-warn); }

.kicker {
  margin: 0 0 3px;
  color: var(--color-cyan);
  font-family: var(--font-mono);
  font-size: 0.66rem;
  letter-spacing: 0.12em;
}

.brand strong {
  color: var(--color-ink);
  font-size: 1rem;
  letter-spacing: 0.08em;
}

.system-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-ink-muted);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
}

.system-state i,
.role i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 10px oklch(0.79 0.17 162 / 0.55);
}

.gate-title {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 34px 32px 12px;
}

.section-index {
  align-self: stretch;
  display: grid;
  place-items: center;
  width: 48px;
  border-right: 1px solid var(--color-line);
  color: var(--color-cyan);
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
}

h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.7rem, 4vw, 2.25rem);
  font-weight: 800;
  color: var(--color-ink);
  letter-spacing: 0.08em;
}

.hint {
  margin: 7px 0 0;
  color: var(--color-ink-muted);
  font-size: 0.86rem;
  letter-spacing: 0.04em;
}

.desks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 32px 34px;
}

.desk {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 10px;
  min-height: 210px;
  padding: 24px;
  border: 1px solid var(--color-line);
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-ink);
  background: linear-gradient(150deg, oklch(0.22 0.072 248 / 0.82), oklch(0.16 0.052 251 / 0.92));
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast), background var(--dur-fast);
}

.desk:hover {
  z-index: 1;
  border-color: var(--color-line-bright);
  background: linear-gradient(150deg, oklch(0.25 0.085 243 / 0.92), oklch(0.17 0.058 251 / 0.98));
  transform: translateY(-2px);
}

.desk-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--color-cyan), transparent 75%);
}

.personal .desk-accent {
  background: linear-gradient(180deg, var(--color-warn), transparent 75%);
}

.role {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-cyan);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
}

.personal .role { color: var(--color-warn); }
.personal .role i { background: var(--color-warn); box-shadow: 0 0 10px oklch(0.82 0.16 83 / 0.48); }

.desk::after {
  position: absolute;
  right: -42px;
  bottom: -64px;
  width: 180px;
  height: 180px;
  border: 1px solid oklch(0.84 0.145 207 / 0.08);
  border-radius: 50%;
  content: '';
}

.desk strong {
  font-family: var(--font-display-sub);
  font-size: 1.42rem;
  letter-spacing: 0.06em;
}

.desk em {
  font-style: normal;
  font-size: 0.84rem;
  line-height: 1.65;
  color: var(--color-ink-muted);
}

.enter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 9px;
  padding-top: 14px;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.enter b {
  position: relative;
  z-index: 1;
  color: var(--color-cyan);
  font-family: var(--font-mono);
  font-size: 1.2rem;
}

.personal .enter b { color: var(--color-warn); }

.gate-foot {
  display: flex;
  justify-content: space-between;
  padding: 13px 28px;
  border-top: 1px solid var(--color-line);
  color: var(--color-ink-muted);
  background: oklch(0.13 0.045 252 / 0.5);
  font-family: var(--font-mono);
  font-size: 0.64rem;
  letter-spacing: 0.1em;
}

@media (max-width: 680px) {
  .gate { padding: 18px 14px; }
  .gate-head,
  .gate-title,
  .desks { padding-left: 20px; padding-right: 20px; }
  .kicker,
  .system-state { display: none; }
  .desks {
    grid-template-columns: 1fr;
  }
  .desk { min-height: 184px; }
  .gate-foot { display: none; }
}
</style>
