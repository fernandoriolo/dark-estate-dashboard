import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import type {} from '@mui/x-charts/themeAugmentation'
import { ptBR } from '@mui/x-charts/locales'

const theme = createTheme({
  palette: { mode: 'dark' },
}, ptBR);

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
