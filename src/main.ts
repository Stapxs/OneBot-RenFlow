import App from './App.vue'

import { createApp } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'

import './assets/css/style.css'

const app = createApp(App)

library.add(fas)
app.component('FontAwesomeIcon', FontAwesomeIcon)

app.mount('#app')

export default app
