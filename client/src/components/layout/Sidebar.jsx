import { Paper, Box, Typography, IconButton, TextField, Button, List, ListItem, ListItemButton, ListItemText } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import TopicIcon from '@mui/icons-material/Topic'

const Sidebar = ({ 
  topics, 
  currentTopic, 
  showCreateTopicModal, 
  topicNameInput, 
  onShowCreateTopicModal, 
  onTopicNameChange, 
  onCreateTopic, 
  onSwitchTopic,
  onCancelCreateTopic
}) => {
  return (
    <Paper sx={{ 
      width: '280px', 
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
        <IconButton onClick={onShowCreateTopicModal} sx={{ color: 'var(--primary-color)' }} title="创建话题">
          <AddIcon />
        </IconButton>
      </Box>

      {showCreateTopicModal && (
        <Paper sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: 'var(--card-background)', 
          borderRadius: 1, 
          border: '1px solid var(--border-color)' 
        }}>
          <TextField
            fullWidth
            variant="outlined"
            value={topicNameInput}
            onChange={onTopicNameChange}
            placeholder="输入话题名称"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                onCreateTopic();
              } else if (e.key === 'Escape') {
                onCancelCreateTopic();
              }
            }}
            sx={{ 
              mb: 2, 
              input: { color: 'var(--text-color)' }, 
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: 'var(--border-color)' }, 
                '&:hover fieldset': { borderColor: 'var(--primary-color)' }, 
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' } 
              } 
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onCancelCreateTopic} sx={{ 
              borderColor: 'var(--border-color)', 
              color: 'var(--text-color)',
              '&:hover': { borderColor: 'var(--primary-color)', bgcolor: 'var(--hover-bg)' }
            }}>
              取消
            </Button>
            <Button variant="contained" onClick={onCreateTopic} sx={{ 
              bgcolor: 'var(--primary-color)', 
              '&:hover': { bgcolor: 'var(--primary-hover)' } 
            }}>
              创建
            </Button>
          </Box>
        </Paper>
      )}

      <List>
        {topics.map(topic => (
          <ListItem key={topic.id} disablePadding>
            <ListItemButton
              selected={currentTopic?.id === topic.id}
              onClick={() => onSwitchTopic(topic.id)}
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
}

export default Sidebar