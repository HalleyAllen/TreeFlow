import { useState, useEffect } from 'react'
import {
  Box, TextField, Button, IconButton, Typography, Paper, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Alert, Tooltip, List, ListItem,
  ListItemText, ListItemSecondaryAction, Chip, CircularProgress
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import ScienceIcon from '@mui/icons-material/Science'
import { getProviders, saveProvider, deleteProvider, testProvider } from '../../services/api'

const defaultProviderTemplate = {
  apiUrl: 'https://api.example.com/v1/chat/completions',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{token}}' },
  requestBody: {
    model: '{{model}}',
    messages: [{ role: 'user', content: '{{question}}' }],
    stream: false
  },
  responsePath: 'choices.0.message.content'
}

const CustomProviderManager = () => {
  const [providers, setProviders] = useState({})
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [isEdit, setIsEdit] = useState(false)
  const [form, setForm] = useState({ ...defaultProviderTemplate })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    setLoading(true)
    try {
      const data = await getProviders()
      if (data.providers) {
        setProviders(data.providers)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenNew = () => {
    setEditingName('')
    setIsEdit(false)
    setForm({ ...defaultProviderTemplate })
    setTestResult(null)
    setEditOpen(true)
  }

  const handleOpenEdit = (name) => {
    const config = providers[name]
    if (!config) return
    setEditingName(name)
    setIsEdit(true)
    setForm({
      apiUrl: config.apiUrl || '',
      method: config.method || 'POST',
      headers: config.headers || {},
      requestBody: config.requestBody || {},
      responsePath: config.responsePath || ''
    })
    setTestResult(null)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editingName.trim()) {
      setSnackbar({ open: true, message: '请输入提供商名称', severity: 'warning' })
      return
    }
    const data = await saveProvider(editingName.trim(), form)
    if (data.result) {
      setSnackbar({ open: true, message: data.result, severity: 'success' })
      setEditOpen(false)
      loadProviders()
    } else {
      setSnackbar({ open: true, message: data.error || '保存失败', severity: 'error' })
    }
  }

  const handleDelete = async (name) => {
    if (!confirm(`确认删除提供商 "${name}" ？`)) return
    const data = await deleteProvider(name)
    if (data.result) {
      setSnackbar({ open: true, message: data.result, severity: 'success' })
      loadProviders()
    } else {
      setSnackbar({ open: true, message: data.error || '删除失败', severity: 'error' })
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const data = await testProvider(form, '', 'test-model')
    setTestResult(data)
    setTesting(false)
  }

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateHeader = (key, value) => {
    setForm(prev => ({ ...prev, headers: { ...prev.headers, [key]: value } }))
  }

  const removeHeader = (key) => {
    const newHeaders = { ...form.headers }
    delete newHeaders[key]
    setForm(prev => ({ ...prev, headers: newHeaders }))
  }

  const customProviders = Object.entries(providers).filter(([name]) => name !== 'default')

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScienceIcon sx={{ color: 'var(--primary-color)', fontSize: 20 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--text-color)' }}>自定义提供商</Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenNew}
          sx={{
            fontSize: 12, color: 'var(--primary-color)', bgcolor: 'var(--hover-bg)',
            '&:hover': { bgcolor: 'var(--hover-bg)', opacity: 0.8 }
          }}
        >
          添加
        </Button>
      </Box>

      {customProviders.length === 0 && (
        <Paper sx={{
          p: 2, textAlign: 'center', borderRadius: 1.5,
          backgroundColor: 'var(--card-background)',
          border: '1px dashed var(--border-color)'
        }}>
          <Typography sx={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            暂无自定义提供商，点击上方"添加"按钮配置
          </Typography>
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: 'var(--primary-color)' }} />
          <Typography sx={{ ml: 1.5, fontSize: 13, color: 'var(--text-secondary)' }}>加载中...</Typography>
        </Box>
      ) : (
        <List dense disablePadding>
          {customProviders.map(([name, config]) => (
            <ListItem key={name} sx={{
              px: 1.5, py: 0.8, borderRadius: 1,
              bgcolor: 'var(--card-background)', mb: 0.5,
              border: '1px solid var(--border-color)',
              '&:hover': { border: '1px solid var(--primary-color)' }
            }}>
              <ListItemText
                primary={
                  <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'var(--text-color)' }}>{name}</Typography>
                }
                secondary={
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                    {config.apiUrl || '未配置URL'}
                  </Typography>
                }
              />
              <ListItemSecondaryAction>
                <Tooltip title="编辑">
                  <IconButton size="small" onClick={() => handleOpenEdit(name)} sx={{ color: 'var(--text-secondary)' }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除">
                  <IconButton size="small" onClick={() => handleDelete(name)} sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--error-color)' } }}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* 编辑对话框 */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: 'var(--card-background)', border: '1px solid var(--border-color)', borderRadius: 2 } }}>
        <DialogTitle sx={{ color: 'var(--text-color)', fontSize: 16, pb: 1 }}>
          {isEdit ? `编辑提供商: ${editingName}` : '添加自定义提供商'}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          {!isEdit && (
            <TextField
              fullWidth size="small" label="提供商名称" value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
                '& input': { color: 'var(--text-color)', '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } }
              }}
            />
          )}
          <TextField
            fullWidth size="small" label="API URL" value={form.apiUrl}
            onChange={(e) => updateForm('apiUrl', e.target.value)}
            helperText="支持占位符: {{token}}, {{model}}, {{question}}"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
              },
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
              '& input': { color: 'var(--text-color)', '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } },
              '& .MuiFormHelperText-root': { color: 'var(--text-secondary)', fontSize: 11 }
            }}
          />
          <TextField
            fullWidth size="small" label="HTTP 方法" value={form.method}
            onChange={(e) => updateForm('method', e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
              },
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
              '& input': { color: 'var(--text-color)', '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } }
            }}
          />
          <TextField
            fullWidth size="small" label="响应提取路径 (JSONPath)" value={form.responsePath}
            onChange={(e) => updateForm('responsePath', e.target.value)}
            helperText="例如: choices.0.message.content"
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
              },
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
              '& input': { color: 'var(--text-color)', '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } },
              '& .MuiFormHelperText-root': { color: 'var(--text-secondary)', fontSize: 11 }
            }}
          />

          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', mb: 1 }}>请求头</Typography>
          <Box sx={{ mb: 2 }}>
            {Object.entries(form.headers).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', gap: 0.5, mb: 0.5, alignItems: 'center' }}>
                <TextField size="small" value={key} disabled
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'var(--border-color)' },
                      '&.Mui-disabled': { '& fieldset': { borderColor: 'var(--border-color)' } }
                    },
                    '& input': { color: 'var(--text-secondary)', fontSize: 12 },
                    '& .Mui-disabled': { color: 'var(--text-secondary)' }
                  }} />
                <TextField size="small" value={value}
                  onChange={(e) => updateHeader(key, e.target.value)}
                  sx={{
                    flex: 2,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'var(--border-color)' },
                      '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                    },
                    '& input': { color: 'var(--text-color)', fontSize: 12, '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } }
                  }} />
                <IconButton size="small" onClick={() => removeHeader(key)} sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--error-color)' } }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => updateHeader('X-New-Header', '')}
              sx={{ mt: 0.5, fontSize: 11, color: 'var(--primary-color)' }}>
              添加请求头
            </Button>
          </Box>

          <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--text-color)', mb: 1 }}>请求体 (JSON)</Typography>
          <TextField
            fullWidth multiline rows={5} value={JSON.stringify(form.requestBody, null, 2)}
            onChange={(e) => {
              try {
                updateForm('requestBody', JSON.parse(e.target.value))
              } catch { /* ignore parse error while typing */ }
            }}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
              },
              '& textarea': { color: 'var(--text-color)', fontSize: 12, fontFamily: 'monospace', '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 } }
            }}
          />

          {testResult && (
            <Paper sx={{
              p: 1.5, mb: 2,
              backgroundColor: testResult.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${testResult.success ? 'var(--success-color)' : 'var(--error-color)'}`
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                {testResult.success ? <CheckCircleIcon sx={{ fontSize: 16, color: 'var(--success-color)' }} /> : <ErrorIcon sx={{ fontSize: 16, color: 'var(--error-color)' }} />}
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: testResult.success ? 'var(--success-color)' : 'var(--error-color)' }}>
                  {testResult.success ? '连接成功' : '连接失败'}
                </Typography>
                {testResult.status && <Chip label={testResult.status} size="small" sx={{ fontSize: 10, height: 18 }} />}
              </Box>
              {testResult.body && (
                <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                  {testResult.body.substring(0, 300)}
                </Typography>
              )}
              {testResult.error && (
                <Typography sx={{ fontSize: 11, color: 'var(--error-color)' }}>{testResult.error}</Typography>
              )}
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleTest} disabled={testing} startIcon={testing ? <CircularProgress size={14} sx={{ color: 'var(--text-secondary)' }} /> : <ScienceIcon />}
            sx={{
              color: 'var(--warning-color)',
              '&:hover': { bgcolor: 'var(--hover-bg)' },
              '&.Mui-disabled': {
                color: 'var(--text-secondary)'
              }
            }}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setEditOpen(false)} sx={{ color: 'var(--text-secondary)' }}>取消</Button>
          <Button onClick={handleSave} variant="contained"
            sx={{ bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--primary-hover)' }, fontSize: 13 }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          variant="filled" sx={{ fontSize: 13 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default CustomProviderManager
