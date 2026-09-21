<script setup lang="ts">
// 知识体系档案馆：整页由 /library.html 提供（3D 档案架 + 文件盒 + 文档摊开 + 档案助手问答）
// 程序保存在 frontend/public/library.html，与 writing.html 同级
</script>

<template>
  <div class="library-workbench">
    <iframe class="library-frame" src="/library.html" title="知识体系档案馆" />
  </div>
</template>

<style scoped>
.library-workbench {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #0b1723;
}

.library-frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
