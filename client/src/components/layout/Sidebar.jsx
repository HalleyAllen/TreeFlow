import { useState } from 'react'
import { Paper, Box, Typography, IconButton, List, ListItem, ListItemButton, ListItemText, Drawer, Tooltip, useMediaQuery } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TopicIcon from '@mui/icons-material/Topic'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import TopicActions from './TopicActions'
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
  const [actionTarget, setActionTarget] = useState(null)

  const content = (
    <Paper sx={{ 
      width: '240px', 
      bgcolor: 'var(--sidebar-bg)', 
      borderRight: '1px solid var(--border-color)', 
      p: 2,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0,
      borderRadius: 0,
      boxShadow: 'none'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        pb: 2, 
        borderBottom: '1px solid var(--border-color)', 
        mb: 1.5,
        flexShrink: 0
      }}>
        <Typography variant="h6" component="h2" sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          color: 'var(--text-color)'
        }}>
          <TopicIcon sx={{ color: 'var(--primary-color)' }} /> 话题
        </Typography>
        <IconButton onClick={handleCreateTopic} disabled={creatingTopic} sx={{ color: 'var(--primary-color)', bgcolor: 'var(--hover-bg)', borderRadius: '10px', width: 32, height: 32, '&:hover': { bgcolor: 'var(--hover-bg)', outline: '1px solid var(--primary-color)' } }} title="创建话题">
          <AddIcon />
        </IconButton>
      </Box>

      <List disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {topics.map(topic => (
          <ListItem key={topic.id} disablePadding data-topic-id={topic.id}
            sx={{ flexShrink: 0, position: 'relative', '& .topic-more': { opacity: compact || currentTopic?.id === topic.id ? 1 : 0 }, '&:hover .topic-more, &:focus-within .topic-more': { opacity: 1 }, '@media (hover: none)': { '& .topic-more': { opacity: 1 } } }}>
            <ListItemButton
              selected={currentTopic?.id === topic.id}
              onClick={() => { handleSwitchTopic(topic.id); setSidebarOpen(false) }}
              sx={{ 
                minHeight: 48,
                borderRadius: '10px',
                pl: 1.25,
                pr: 4.5,
                py: 1,
                gap: 1,
                border: '1px solid transparent',
                borderLeft: '3px solid transparent',
                transition: 'background-color 150ms ease, border-color 150ms ease',
                color: 'var(--text-color)',
                '&.Mui-selected': { 
                  backgroundColor: 'var(--hover-bg)',
                  borderLeft: '3px solid var(--primary-color)',
                  '& .topic-icon': { color: 'var(--primary-color)' }
                },
                '&:hover, &.Mui-selected:hover': { backgroundColor: 'var(--hover-bg)' }
              }}
            >
              <ChatBubbleOutlineIcon className="topic-icon" sx={{ fontSize: 17, flexShrink: 0, color: 'var(--text-secondary)' }} />
              <ListItemText 
                primary={topic.name} 
                slotProps={{ primary: { noWrap: true, title: topic.name } }}
                sx={{ 
                  minWidth: 0,
                  m: 0,
                  color: 'var(--text-color)',
                  '& .MuiListItemText-primary': { color: 'var(--text-color)', fontSize: 13, fontWeight: currentTopic?.id === topic.id ? 600 : 400 }
                }} 
              />
            </ListItemButton>
            <Tooltip title="话题操作" placement="right">
              <IconButton className="topic-more" size="small" aria-label={`话题操作：${topic.name}`} aria-haspopup="menu"
                aria-expanded={actionTarget?.topic.id === topic.id ? 'true' : undefined} aria-controls={actionTarget?.topic.id === topic.id ? 'topic-actions-menu' : undefined}
                onClick={event => setActionTarget({ topic, anchor: event.currentTarget })}
                sx={{ position: 'absolute', right: 5, width: 28, height: 28, borderRadius: '7px', color: 'var(--text-secondary)', transition: 'opacity 150ms ease', '&:hover': { color: 'var(--primary-color)', bgcolor: 'var(--hover-bg)' } }}>
                <MoreHorizIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>
    </Paper>
  )

  return (
    <>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, width: 240, flexShrink: 0 }}>{content}</Box>
      <Drawer open={compact && sidebarOpen} onClose={() => setSidebarOpen(false)} slotProps={{ paper: { sx: { width: 240, bgcolor: 'var(--sidebar-bg)', '& > .MuiPaper-root': { height: '100%' } } } }}>
        {content}
      </Drawer>
      <TopicActions target={actionTarget} onClose={() => setActionTarget(null)} />
    </>
  )
}

export default Sidebar
