import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/base.css'
import './xiaozhi/styles/tokens.css'
import AppRoot from './AppRoot.vue'
import router from './router'

createApp(AppRoot).use(ElementPlus).use(router).mount('#app')
