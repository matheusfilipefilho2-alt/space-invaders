import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/style.css'
import './styles/design-system.css'
import './styles/wallet-ui.css'
import './styles/animations.css'
import './styles/components.css'
import './styles/pages/profile.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
