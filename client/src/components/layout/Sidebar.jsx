import { Paper, Box, Typography, IconButton, List, ListItem, ListItemButton, ListItemText, Drawer, useMediaQuery } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TopicIcon from '@mui/icons-material/Topic'
import { useAppContext } from '../../contexts/AppContext'

const Sidebar = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    topics,
    currentTopic,
    creatingTopic,
    handleCreateTopic,
    handleSwitchTopic
  } = useAppContext()

  const compact = useMediaQuery('(max-width:899.95px)')

  const content = (
    <Paper sx={{ 
      width: '240px', 
      bgcolor: 'var(--sidebar-bg)', 
      borderRight: '1px solid var(--border-color)', 
      p: 2, 
      overflowY: 'auto',
      borderRadius: 0
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        pb: 2, 
        borderBottom: '1px solid var(--border-color)', 
        mb: 3 
      }}>
        <Typography variant="h6" component="h2" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: 'var(--text-color)'
        }}>
          <TopicIcon sx={{ color: 'var(--primary-color)' }} /> 话题
        </Typography>
        <IconButton onClick={handleCreateTopic} disabled={creatingTopic} sx={{ color: 'var(--primary-color)' }} title="创建话题">
          <AddIcon />
        </IconButton>
      </Box>

      <List>
        {topics.map(topic => (
          <ListItem key={topic.id} disablePadding>
            <ListItemButton
              selected={currentTopic?.id === topic.id}
              onClick={() => { handleSwitchTopic(topic.id); setSidebarOpen(false) }}
              sx={{ 
                borderRadius: 1,
                color: 'var(--text-color)',
                '&.Mui-selected': { 
                  backgroundColor: 'var(--hover-bg)',
                  borderLeft: '3px solid var(--primary-color)'
                },
                '&:hover': { backgroundColor: 'var(--hover-bg)' }
              }}
            >
              <ListItemText 
                primary={topic.name} 
                slotProps={{ primary: { noWrap: true, title: topic.name } }}
                sx={{ 
                  color: 'var(--text-color)',
                  '& .MuiListItemText-primary': { color: 'var(--text-color)' }
                }} 
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  )

  return (
    <>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, width: 240, flexShrink: 0 }}>{content}</Box>
      <Drawer open={compact && sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 240, bgcolor: 'var(--sidebar-bg)' } } }}>
        {content}
      </Drawer>
    </>
  )
}

export default Sidebar
