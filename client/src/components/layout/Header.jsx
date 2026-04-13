import { AppBar, Toolbar, Typography, Box, Button, IconButton, Tooltip } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'

const Header = ({ onTokenManagerClick, theme, onToggleTheme }) => {
  const isDark = theme === 'dark'

  return (
    <AppBar position="static" elevation={0} sx={{ backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)', width: '100%', padding: 0, boxShadow: 'none' }}>
      <Toolbar sx={{ width: '100%', minHeight: '56px' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)', fontWeight: 'bold' }}>
          🌳 TreeFlow
        </Typography>
        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* 主题切换按钮 */}
          <Tooltip title={isDark ? '切换到浅色主题' : '切换到深色主题'}>
            <IconButton
              onClick={onToggleTheme}
              sx={{
                color: 'var(--text-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '8px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: 'var(--primary-color)',
                  backgroundColor: 'var(--hover-bg)',
                }
              }}
            >
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            color="primary"
            onClick={onTokenManagerClick}
            startIcon={<SettingsIcon />}
            sx={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)', '&:hover': { borderColor: 'var(--primary-hover)', backgroundColor: 'rgba(59, 130, 246, 0.1)' } }}
          >
            AI服务管理
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header