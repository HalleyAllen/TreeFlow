import React from 'react'
import { Box, Typography, Paper, TextField, Button } from '@mui/material'

const ChatContainer = ({ 
  currentTopic, 
  messages, 
  input, 
  isLoading, 
  models, 
  selectedModel, 
  showModelDropdown, 
  onInputChange, 
  onKeyPress, 
  onSend, 
  onToggleModelDropdown, 
  onSelectModel
}) => {
  return (
    <Box sx={{ flex: 1, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" component="h2" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: '8px' }}>
        💬 {currentTopic?.name || '默认话题'}
      </Typography>

      <Box sx={{ flex: 1, overflowY: 'auto', mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {messages.map((msg, index) => (
          <Paper 
            key={index} 
            sx={{
              maxWidth: '75%',
              p: 2,
              borderRadius: 2,
              alignSelf: msg.type === 'user' ? 'flex-end' : 'flex-start',
              bgcolor: msg.type === 'user' ? 'var(--user-message-bg)' : 'var(--ai-message-bg)',
              color: msg.type === 'user' ? 'white' : 'var(--text-color)',
              border: msg.type === 'ai' ? '1px solid var(--border-color)' : 'none',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            {msg.content}
          </Paper>
        ))}
        {isLoading && (
          <Paper sx={{ maxWidth: '75%', p: 2, borderRadius: 2, alignSelf: 'flex-start', bgcolor: 'var(--ai-message-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }}>
            AI正在思考...
          </Paper>
        )}
      </Box>

      <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid var(--border-color)', bgcolor: 'var(--card-background)' }}>
        <TextField
          fullWidth
          variant="outlined"
          value={input}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          placeholder="发消息或输入'/'选择技能"
          disabled={isLoading}
          sx={{ mb: 2, input: { color: 'var(--text-color)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--border-color)' }, '&:hover fieldset': { borderColor: 'var(--primary-color)' }, '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' } } }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="outlined"
              onClick={onToggleModelDropdown}
              sx={{ borderColor: 'var(--border-color)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              🤖 {models.find(m => m.id === selectedModel)?.name}
            </Button>
            {showModelDropdown && (
              <Paper sx={{ position: 'absolute', top: '100%', left: 0, mt: 1, minWidth: '200px', zIndex: 100, border: '1px solid var(--border-color)', bgcolor: 'var(--card-background)' }}>
                {models.map(model => (
                  <Box
                    key={model.id}
                    sx={{
                      p: 1.5,
                      borderBottom: '1px solid var(--border-color)',
                      cursor: model.available ? 'pointer' : 'not-allowed',
                      opacity: model.available ? 1 : 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      '&:hover': model.available ? { backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {}
                    }}
                    onClick={() => onSelectModel(model)}
                  >
                    <Typography sx={{ color: 'var(--text-color)' }}>{model.name}</Typography>
                    <Box sx={{ 
                      px: 1, 
                      py: 0.25, 
                      borderRadius: 1, 
                      bgcolor: model.available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: model.available ? 'var(--success-color)' : 'var(--error-color)',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      {model.available ? '可用' : '不可用'}
                    </Box>
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
          <Button 
            variant="contained" 
            onClick={onSend} 
            disabled={isLoading}
            sx={{ 
              bgcolor: 'var(--primary-color)', 
              '&:hover': { bgcolor: 'var(--primary-hover)' },
              '&.Mui-disabled': { bgcolor: 'var(--secondary-color)' }
            }}
          >
            →
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default ChatContainer