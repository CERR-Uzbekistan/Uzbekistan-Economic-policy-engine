import { RouterProvider } from 'react-router-dom'
import { appRouter } from './app/router'
import { LanguageProvider } from './state/language-provider'

function App() {
  return (
    <LanguageProvider>
      <RouterProvider router={appRouter} />
    </LanguageProvider>
  )
}

export default App
