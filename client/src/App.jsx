import { Box } from '@mui/material'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ChatContainer from './components/chat/ChatContainer'
import TokenManager from './components/settings/TokenManager'
import { AppProvider } from './contexts/AppContext'

/**
 * App 根组件
 * 使用 AppProvider 提供全局状态，消除 prop drilling
 */
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

/**
 * AppContent - 实际布局组件
 * 子组件通过 useAppContext 自行获取所需状态
 */
function AppContent() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <ChatContainer />
      </Box>
      <TokenManager />
    </Box>
  )
}

export default App
