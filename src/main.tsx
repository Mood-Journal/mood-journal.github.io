import '@mantine/core/styles.css'
import '@mantine/charts/styles.css'
import '@fontsource-variable/geist'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import App from './App'

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'Geist Variable, sans-serif',
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </StrictMode>
)
