import React from 'react'
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'

const Header = ({ onTokenManagerClick }) => {
  return (
    <AppBar position="static" sx={{ backgroundColor: 'var(--header-bg)', borderBottom: '1px solid var(--border-color)', width: '100%', padding: '8px' }}>
      <Toolbar sx={{ width: '100%' }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)', fontWeight: 'bold' }}>
          🌳 TreeFlow
        </Typography>
        <Box sx={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onTokenManagerClick}
            startIcon={<SettingsIcon />}
            sx={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)', '&:hover': { borderColor: 'var(--primary-hover)', backgroundColor: 'rgba(59, 130, 246, 0.1)' } }}
          >
            token管理
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header