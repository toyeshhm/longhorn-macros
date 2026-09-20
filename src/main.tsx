import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './ui/App'
import './ui/styles.css'
import './ui/screens.css'

const root = document.getElementById('app')
if (!root) throw new Error('#app missing from index.html')
render(<App />, root)
registerSW({ immediate: true })
