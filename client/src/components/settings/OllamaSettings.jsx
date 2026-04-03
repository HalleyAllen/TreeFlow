import React, { useState } from 'react'
import { Box, Button, TextField, Typography } from '@mui/material'
import { getOllamaUrl, setOllamaUrl } from '../../services/api'
import logger from '../../services/logger'

const OllamaSettings = ({ ollamaUrl, onOllamaUrlChange }) => {
  const [ollamaUrlInput, setOllamaUrlInput] = useState(ollamaUrl)
  const [showOllamaSettings, setShowOllamaSettings] = useState(false)

  // 保存ollama URL
  const handleSaveOllamaUrl = async () => {
    if (!ollamaUrlInput.trim()) return

    try {
      const data = await setOllamaUrl(ollamaUrlInput)
      if (data.result) {
        setShowOllamaSettings(false)
        if (onOllamaUrlChange) {
          onOllamaUrlChange(ollamaUrlInput)
        }
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`保存Ollama URL失败: ${data.error}`)
      }
    } catch (error) {
      logger.error('OllamaSettings', '保存Ollama URL失败:', { error: error.message })
      alert('保存Ollama URL失败')
    }
  }

  return (
    <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid var(--border-color)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">本地Ollama设置</Typography>
        <Button
          variant="outlined"
          onClick={() => setShowOllamaSettings(!showOllamaSettings)}
          sx={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
        >
          {showOllamaSettings ? '收起' : '编辑'}
        </Button>
      </Box>
      {showOllamaSettings ? (
        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            value={ollamaUrlInput}
            onChange={(e) => setOllamaUrlInput(e.target.value)}
            placeholder="输入Ollama基础URL (默认: http://localhost:11434)"
            sx={{ mb: 2, input: { color: 'var(--text-color)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--border-color)' }, '&:hover fieldset': { borderColor: 'var(--primary-color)' }, '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' } } }}
          />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => {
              setShowOllamaSettings(false)
              setOllamaUrlInput(ollamaUrl)
            }} sx={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
              取消
            </Button>
            <Button variant="contained" onClick={handleSaveOllamaUrl} sx={{ bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}>
              保存
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography sx={{ color: 'var(--text-secondary)' }}>当前Ollama URL: {ollamaUrl}</Typography>
      )}
    </Box>
  )
}

export default OllamaSettings