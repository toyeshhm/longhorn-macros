import { render } from 'preact'
import { App } from './ui/App'
import './ui/styles.css'

const root = document.getElementById('app')
if (!root) throw new Error('#app missing from index.html')
render(<App />, root)
