import React, { useState, useEffect } from 'react'
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Autocomplete,
  Snackbar, Alert, Switch, Chip, IconButton, CircularProgress, Tabs, Tab, Paper,
  Card, CardContent, CardActions, Tooltip, Slider, Divider, Badge, InputAdornment
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import SettingsIcon from '@mui/icons-material/Settings'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import ComputerIcon from '@mui/icons-material/Computer'
import KeyIcon from '@mui/icons-material/Key'
import StorageIcon from '@mui/icons-material/Storage'
import EditIcon from '@mui/icons-material/Edit'
import ScienceIcon from '@mui/icons-material/Science'
import LinkIcon from '@mui/icons-material/Link'
import MemoryIcon from '@mui/icons-material/Memory'
import ThermostatIcon from '@mui/icons-material/Thermostat'
import MessageIcon from '@mui/icons-material/Message'
import {
  addToken, removeToken, updateTokenInfo, checkTokenHealth,
  getOllamaUrl, setOllamaUrl, setOllamaEnabled, checkOllamaStatus, getOllamaModels,
  pullOllamaModel, deleteOllamaModel
} from '../../services/api'
import logger from '../../services/logger'
import { identifyModelFromToken } from '../../utils/tokenUtils'
import tokenData from '../../utils/tokenUtils.json'
import CustomProviderManager from './CustomProviderManager'

const { providerOptions, modelOptions } = tokenData;

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '-';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// TabPanel组件
function TabPanel({ children, value, index, ...other }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`ai-service-tabpanel-${index}`}
      aria-labelledby={`ai-service-tab-${index}`}
      sx={{ pt: 2 }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

const TokenManager = ({ open, onClose, tokenStats, onTokensUpdated, ollamaEnabled, onOllamaEnabledChange }) => {
  // 标签页状态
  const [activeTab, setActiveTab] = useState(0)

  // Token相关状态
  const [tokenInput, setTokenInput] = useState('')
  const [addProvider, setAddProvider] = useState('')
  const [addModel, setAddModel] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [showEditTokenModal, setShowEditTokenModal] = useState(false)
  const [editingToken, setEditingToken] = useState(null)
  const [newToken, setNewToken] = useState('')
  const [editProvider, setEditProvider] = useState('')
  const [editModel, setEditModel] = useState('')
  const [tokenToDelete, setTokenToDelete] = useState(null)

  // Ollama相关状态
  const [localOllamaUrl, setLocalOllamaUrl] = useState('http://localhost:11434')
  const [ollamaUrlInput, setOllamaUrlInput] = useState('http://localhost:11434')
  const [ollamaConnectionStatus, setOllamaConnectionStatus] = useState({
    checking: false, connected: false, message: ''
  })
  const [ollamaModels, setOllamaModels] = useState([])
  const [ollamaModelsLoading, setOllamaModelsLoading] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [pullingModel, setPullingModel] = useState(false)
  const [deletingModel, setDeletingModel] = useState(null)
  const [ollamaParams, setOllamaParams] = useState({
    temperature: 0.7, num_ctx: 4096, systemPrompt: ''
  })
  const [showOllamaParams, setShowOllamaParams] = useState(false)

  // Snackbar状态
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  // 初始化
  useEffect(() => {
    if (open) {
      loadOllamaSettings()
      if (ollamaEnabled) {
        checkConnectionStatus()
        loadOllamaModelsList()
      }
    }
  }, [open])

  const loadOllamaSettings = async () => {
    try {
      const data = await getOllamaUrl()
      if (data.url) {
        setLocalOllamaUrl(data.url)
        setOllamaUrlInput(data.url)
      }
    } catch (error) {
      logger.error('TokenManager', '获取Ollama设置失败:', { error: error.message })
    }
  }

  // ========== Token相关函数 ==========
  const handleTokenInputChange = (e) => {
    const token = e.target.value
    setTokenInput(token)
    if (token) {
      const modelInfo = identifyModelFromToken(token)
      setAddProvider(modelInfo.provider)
      setAddModel(modelInfo.model)
    } else {
      setAddProvider('')
      setAddModel('')
    }
  }

  const handleAddToken = async () => {
    if (!tokenInput.trim()) return
    setTokenLoading(true)
    try {
      const data = await addToken(tokenInput, addProvider, addModel)
      if (data.result) {
        setTokenInput('')
        setAddProvider('')
        setAddModel('')
        onTokensUpdated?.()
        showSnackbar(data.result, 'success')
      } else if (data.error) {
        showSnackbar(`添加失败: ${data.error}`, 'error')
      }
    } catch (error) {
      showSnackbar('添加token失败', 'error')
    } finally {
      setTokenLoading(false)
    }
  }

  const handleDeleteToken = (token) => {
    setTokenToDelete(token)
  }

  const confirmDeleteToken = async () => {
    if (!tokenToDelete) return
    try {
      const data = await removeToken(tokenToDelete)
      if (data.result) {
        onTokensUpdated?.()
        showSnackbar(data.result, 'success')
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch (error) {
      showSnackbar('删除失败', 'error')
    } finally {
      setTokenToDelete(null)
    }
  }

  const handleOpenEditToken = (token) => {
    setEditingToken(token.token)
    setNewToken(token.token)
    setEditProvider(token.provider)
    setEditModel(token.model)
    setShowEditTokenModal(true)
  }

  const handleUpdateTokenInfo = async () => {
    if (!editingToken || !editProvider || !editModel) return
    try {
      const data = await updateTokenInfo(editingToken, newToken, editProvider, editModel)
      if (data.result) {
        onTokensUpdated?.()
        setShowEditTokenModal(false)
        showSnackbar(data.result, 'success')
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch (error) {
      showSnackbar('更新失败', 'error')
    }
  }

  const handleCheckTokenHealth = async (token) => {
    try {
      const data = await checkTokenHealth(token)
      if (data.result) {
        onTokensUpdated?.()
        showSnackbar(`Token健康状态: ${data.result.message}`, 'info')
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch (error) {
      showSnackbar('检测失败', 'error')
    }
  }

  // ========== Ollama相关函数 ==========
  const checkConnectionStatus = async () => {
    setOllamaConnectionStatus({ checking: true, connected: false, message: '检测中...' })
    try {
      const status = await checkOllamaStatus()
      setOllamaConnectionStatus({
        checking: false, connected: status.connected, message: status.message
      })
    } catch {
      setOllamaConnectionStatus({ checking: false, connected: false, message: '检测失败' })
    }
  }

  const loadOllamaModelsList = async () => {
    if (!ollamaEnabled) return
    setOllamaModelsLoading(true)
    try {
      const data = await getOllamaModels()
      if (data.models) setOllamaModels(data.models)
    } catch (error) {
      logger.error('TokenManager', '加载Ollama模型失败:', { error: error.message })
    } finally {
      setOllamaModelsLoading(false)
    }
  }

  const handlePullModel = async () => {
    if (!newModelName.trim()) {
      showSnackbar('请输入模型名称', 'warning')
      return
    }
    setPullingModel(true)
    try {
      const data = await pullOllamaModel(newModelName.trim())
      if (data.result) {
        showSnackbar(data.result, 'success')
        setNewModelName('')
        loadOllamaModelsList()
        onTokensUpdated?.()
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch {
      showSnackbar('拉取失败', 'error')
    } finally {
      setPullingModel(false)
    }
  }

  const handleDeleteOllamaModel = async (modelName) => {
    if (!confirm(`确定删除 "${modelName}"?`)) return
    setDeletingModel(modelName)
    try {
      const data = await deleteOllamaModel(modelName)
      if (data.result) {
        showSnackbar(data.result, 'success')
        loadOllamaModelsList()
        onTokensUpdated?.()
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch {
      showSnackbar('删除失败', 'error')
    } finally {
      setDeletingModel(null)
    }
  }

  const handleSaveOllamaUrl = async () => {
    if (!ollamaUrlInput.trim()) return
    try {
      const data = await setOllamaUrl(ollamaUrlInput)
      if (data.result) {
        setLocalOllamaUrl(ollamaUrlInput)
        showSnackbar(data.result, 'success')
      } else if (data.error) {
        showSnackbar(data.error, 'error')
      }
    } catch {
      showSnackbar('保存失败', 'error')
    }
  }

  const handleOllamaToggle = async (enabled) => {
    onOllamaEnabledChange?.(enabled)
    try {
      const data = await setOllamaEnabled(enabled)
      if (data.result) {
        showSnackbar(data.result, 'success')
        if (enabled) {
          checkConnectionStatus()
          loadOllamaModelsList()
        }
      }
    } catch {
      showSnackbar('设置失败', 'error')
    }
  }

  // ========== 工具函数 ==========
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  // ========== 渲染辅助函数 ==========
  const renderStatusChip = (connected, checking) => {
    if (checking) {
      return <Chip size="small" icon={<CircularProgress size={12} />} label="检测中" sx={{ bgcolor: 'var(--hover-bg)', color: 'var(--text-secondary)', fontSize: '0.75rem' }} />
    }
    return connected ? (
      <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14, color: 'var(--success-color)' }} />} label="已连接" sx={{ bgcolor: 'rgba(76, 175, 80, 0.15)', color: 'var(--success-color)', fontSize: '0.75rem', fontWeight: 500 }} />
    ) : (
      <Chip size="small" icon={<ErrorIcon sx={{ fontSize: 14, color: 'var(--error-color)' }} />} label="未连接" sx={{ bgcolor: 'rgba(244, 67, 54, 0.15)', color: 'var(--error-color)', fontSize: '0.75rem', fontWeight: 500 }} />
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'var(--card-background)',
          color: 'var(--text-color)',
          borderRadius: 3,
          minHeight: '600px',
          maxHeight: '85vh'
        }
      }}
    >
      {/* 标题栏 */}
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        pb: 1,
        bgcolor: 'var(--card-background)',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon sx={{ color: 'var(--primary-color)', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '1.1rem' }}>
            AI 服务管理
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--text-color)' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* 标签页 */}
      <Box sx={{ borderBottom: 1, borderColor: 'var(--border-color)', bgcolor: 'var(--card-background)' }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          textColor="primary"
          indicatorColor="var(--primary-color)"
          sx={{
            '& .MuiTabs-flexContainer': { px: 2 },
            '& .MuiTab-root': {
              color: 'var(--text-secondary)',
              textTransform: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              minHeight: '48px',
              '&.Mui-selected': { color: 'var(--primary-color)' }
            }
          }}
        >
          <Tab icon={<KeyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`API密钥 (${tokenStats.length})`} />
          <Tab
            icon={<ComputerIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                Ollama本地模型
                {ollamaEnabled && (
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: ollamaConnectionStatus.connected ? 'var(--success-color)' : 'var(--error-color)'
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab icon={<StorageIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="自定义提供商" />
        </Tabs>
      </Box>

      <DialogContent sx={{ bgcolor: 'var(--card-background)', p: 0, overflow: 'auto' }}>
        {/* ========== Token管理标签页 ========== */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: 3, pb: 3, height: '100%', overflow: 'auto' }}>
            {/* 添加Token卡片 */}
            <Card sx={{
              mb: 3,
              bgcolor: 'var(--hover-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 2,
              boxShadow: 'none'
            }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', mb: 2, fontSize: '0.95rem' }}>
                  添加新的 API Key
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="粘贴 API Key 到此处"
                  value={tokenInput}
                  onChange={handleTokenInputChange}
                  disabled={tokenLoading}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'var(--card-background)',
                      '& fieldset': { borderColor: 'var(--border-color)' },
                      '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                      '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                    },
                    '& input': {
                      color: 'var(--text-color)',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                    }
                  }}
                />

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Autocomplete
                    size="small"
                    options={providerOptions}
                    value={providerOptions.find(o => o.value === addProvider) || addProvider || null}
                    onChange={(e, v) => {
                      if (typeof v === 'string') {
                        setAddProvider(v)
                      } else if (v && typeof v === 'object') {
                        setAddProvider(v.value || '')
                        if (v.value && modelOptions[v.value]) {
                          setAddModel(modelOptions[v.value][0])
                        }
                      } else {
                        setAddProvider('')
                      }
                    }}
                    onInputChange={(e, v) => {
                      // 处理自由输入的情况
                      if (v && typeof v === 'string') {
                        setAddProvider(v)
                      }
                    }}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option
                      return option?.label || option?.value || ''
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (typeof option === 'string' && typeof value === 'string') return option === value
                      return option?.value === value?.value || option?.value === value
                    }}
                    renderInput={(params) => <TextField {...params} label="服务商" placeholder="选择或输入" sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--card-background)',
                        '& fieldset': { borderColor: 'var(--border-color)' },
                        '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
                      '& input': {
                        color: 'var(--text-color)',
                        '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                      }
                    }} />}
                    freeSolo
                    sx={{
                      flex: 1,
                      '& .MuiAutocomplete-paper': {
                        bgcolor: 'var(--card-background)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)'
                      },
                      '& .MuiAutocomplete-listbox': {
                        bgcolor: 'var(--card-background)',
                        color: 'var(--text-color)'
                      },
                      '& .MuiAutocomplete-option': {
                        color: 'var(--text-color)',
                        '&:hover': { bgcolor: 'var(--hover-bg)' },
                        '&.Mui-focused': { bgcolor: 'var(--hover-bg)' }
                      },
                      '& .MuiAutocomplete-clearIndicator': {
                        color: 'var(--text-secondary)',
                        '&:hover': { color: 'var(--text-color)' }
                      }
                    }}
                  />
                  <Autocomplete
                    size="small"
                    options={addProvider ? modelOptions[addProvider] || [] : []}
                    value={addModel}
                    onChange={(e, v) => setAddModel(typeof v === 'string' ? v : (v || ''))}
                    onInputChange={(e, v) => {
                      // 处理自由输入的情况
                      if (v && typeof v === 'string') {
                        setAddModel(v)
                      }
                    }}
                    freeSolo
                    renderInput={(params) => <TextField {...params} label="模型" placeholder="选择或输入" sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'var(--card-background)',
                        '& fieldset': { borderColor: 'var(--border-color)' },
                        '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                      },
                      '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
                      '& input': {
                        color: 'var(--text-color)',
                        '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                      }
                    }} />}
                    sx={{
                      flex: 1,
                      '& .MuiAutocomplete-paper': {
                        bgcolor: 'var(--card-background)',
                        color: 'var(--text-color)',
                        border: '1px solid var(--border-color)'
                      },
                      '& .MuiAutocomplete-listbox': {
                        bgcolor: 'var(--card-background)',
                        color: 'var(--text-color)'
                      },
                      '& .MuiAutocomplete-option': {
                        color: 'var(--text-color)',
                        '&:hover': { bgcolor: 'var(--hover-bg)' },
                        '&.Mui-focused': { bgcolor: 'var(--hover-bg)' }
                      },
                      '& .MuiAutocomplete-clearIndicator': {
                        color: 'var(--text-secondary)',
                        '&:hover': { color: 'var(--text-color)' }
                      }
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddToken}
                    disabled={tokenLoading || !tokenInput.trim()}
                    startIcon={tokenLoading ? <CircularProgress size={14} /> : null}
                    sx={{
                      bgcolor: 'var(--primary-color)',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 500,
                      '&:hover': { bgcolor: 'var(--primary-hover)' },
                      '&.Mui-disabled': {
                        bgcolor: 'var(--hover-bg)',
                        color: 'var(--text-secondary)'
                      }
                    }}
                  >
                    {tokenLoading ? '添加中...' : '添加 Key'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Token列表 */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', mb: 2, fontSize: '0.95rem' }}>
              已配置的 API Keys
            </Typography>

            {tokenStats.length === 0 ? (
              <Box sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'var(--hover-bg)',
                borderRadius: 2,
                border: '1px dashed var(--border-color)'
              }}>
                <KeyIcon sx={{ fontSize: 40, color: 'var(--text-secondary)', opacity: 0.5, mb: 1 }} />
                <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  暂无配置，请在上方添加 API Key
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {tokenStats.map((token, idx) => (
                  <Card
                    key={idx}
                    sx={{
                      bgcolor: 'var(--card-background)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 2,
                      boxShadow: 'none',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: 'var(--primary-color)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }
                    }}
                  >
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.85rem',
                              color: 'var(--text-color)',
                              bgcolor: 'var(--hover-bg)',
                              px: 1,
                              py: 0.3,
                              borderRadius: 1,
                              wordBreak: 'break-all'
                            }}>
                              {token.token.substring(0, 20)}...
                            </Typography>
                            <Chip
                              size="small"
                              label={token.provider}
                              sx={{
                                bgcolor: 'var(--primary-color)',
                                color: 'white',
                                fontSize: '0.7rem',
                                height: '20px'
                              }}
                            />
                          </Box>
                          <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            模型: {token.model}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="检测健康">
                            <IconButton
                              size="small"
                              onClick={() => handleCheckTokenHealth(token.token)}
                              sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--primary-color)' } }}
                            >
                              <RefreshIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditToken(token)}
                              sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--primary-color)' } }}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteToken(token.token)}
                              sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--error-color)' } }}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* ========== Ollama标签页 ========== */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: 3, pb: 3, height: '100%', overflow: 'auto' }}>
            {/* 启用开关卡片 */}
            <Card sx={{
              mb: 3,
              bgcolor: ollamaEnabled ? 'rgba(76, 175, 80, 0.08)' : 'var(--hover-bg)',
              border: `1px solid ${ollamaEnabled ? 'var(--success-color)' : 'var(--border-color)'}`,
              borderRadius: 2,
              boxShadow: 'none'
            }}>
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ComputerIcon sx={{
                      fontSize: 32,
                      color: ollamaEnabled ? 'var(--success-color)' : 'var(--text-secondary)'
                    }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.95rem' }}>
                        Ollama 本地服务
                      </Typography>
                      <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {ollamaEnabled ? '服务已启用' : '启用后可使用本地部署的开源模型'}
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={ollamaEnabled}
                    onChange={(e) => handleOllamaToggle(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-thumb': { bgcolor: ollamaEnabled ? 'var(--success-color)' : 'var(--border-color)' },
                      '& .MuiSwitch-track': { bgcolor: ollamaEnabled ? 'var(--success-color)' : 'var(--border-color)', opacity: 0.3 }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            {ollamaEnabled && (
              <>
                {/* 连接设置 */}
                <Card sx={{ mb: 3, bgcolor: 'var(--card-background)', border: '1px solid var(--border-color)', borderRadius: 2, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.95rem' }}>
                        连接设置
                      </Typography>
                      {renderStatusChip(ollamaConnectionStatus.connected, ollamaConnectionStatus.checking)}
                    </Box>

                    <TextField
                      fullWidth
                      size="small"
                      label="服务地址"
                      value={ollamaUrlInput}
                      onChange={(e) => setOllamaUrlInput(e.target.value)}
                      placeholder="http://localhost:11434"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LinkIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                          </InputAdornment>
                        )
                      }}
                      sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: 'var(--border-color)' },
                          '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                          '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                        },
                        '& input': {
                          color: 'var(--text-color)',
                          '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                        },
                        '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                        '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' }
                      }}
                    />

                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={checkConnectionStatus}
                        disabled={ollamaConnectionStatus.checking}
                        startIcon={ollamaConnectionStatus.checking ? <CircularProgress size={14} sx={{ color: 'var(--text-secondary)' }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          textTransform: 'none',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-color)',
                          '&:hover': {
                            borderColor: 'var(--primary-color)',
                            bgcolor: 'var(--hover-bg)'
                          },
                          '&.Mui-disabled': {
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)'
                          }
                        }}
                      >
                        检测连接
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveOllamaUrl}
                        sx={{ textTransform: 'none', bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}
                      >
                        保存设置
                      </Button>
                    </Box>

                    {!ollamaConnectionStatus.connected && ollamaConnectionStatus.message && (
                      <Alert severity="warning" sx={{
                        mt: 2,
                        fontSize: '0.8rem',
                        bgcolor: 'rgba(255, 152, 0, 0.15)',
                        color: 'var(--text-color)',
                        '& .MuiAlert-icon': { color: '#ff9800' },
                        border: '1px solid rgba(255, 152, 0, 0.3)'
                      }}>
                        {ollamaConnectionStatus.message}
                        <Typography component="div" sx={{ mt: 0.5, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          请确保 Ollama 已安装并运行，检查地址是否正确
                        </Typography>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* 模型参数 */}
                <Card sx={{ mb: 3, bgcolor: 'var(--card-background)', border: '1px solid var(--border-color)', borderRadius: 2, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.95rem' }}>
                        生成参数
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => setShowOllamaParams(!showOllamaParams)}
                        sx={{ textTransform: 'none', color: 'var(--primary-color)', fontSize: '0.8rem' }}
                      >
                        {showOllamaParams ? '收起' : '展开'}
                      </Button>
                    </Box>

                    {showOllamaParams && (
                      <Box>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ThermostatIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                            <Typography sx={{ color: 'var(--text-color)', fontSize: '0.8rem' }}>温度 (Temperature)</Typography>
                            <Typography sx={{ color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 600, ml: 'auto' }}>
                              {ollamaParams.temperature}
                            </Typography>
                          </Box>
                          <Slider
                            value={ollamaParams.temperature}
                            onChange={(e, v) => setOllamaParams(p => ({ ...p, temperature: v }))}
                            min={0} max={2} step={0.1}
                            marks={[{ value: 0, label: '精确' }, { value: 1, label: '平衡' }, { value: 2, label: '创意' }]}
                            sx={{ color: 'var(--primary-color)', '& .MuiSlider-markLabel': { fontSize: '0.7rem', color: 'var(--text-secondary)' } }}
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <MemoryIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                            <Typography sx={{ color: 'var(--text-color)', fontSize: '0.8rem' }}>上下文窗口</Typography>
                            <Typography sx={{ color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 600, ml: 'auto' }}>
                              {ollamaParams.num_ctx.toLocaleString()} tokens
                            </Typography>
                          </Box>
                          <Slider
                            value={ollamaParams.num_ctx}
                            onChange={(e, v) => setOllamaParams(p => ({ ...p, num_ctx: v }))}
                            min={2048} max={32768} step={1024}
                            marks={[{ value: 4096, label: '4K' }, { value: 8192, label: '8K' }, { value: 16384, label: '16K' }, { value: 32768, label: '32K' }]}
                            sx={{ color: 'var(--primary-color)', '& .MuiSlider-markLabel': { fontSize: '0.7rem', color: 'var(--text-secondary)' } }}
                          />
                        </Box>

                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <MessageIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                            <Typography sx={{ color: 'var(--text-color)', fontSize: '0.8rem' }}>系统提示词</Typography>
                          </Box>
                          <TextField
                            fullWidth
                            multiline
                            rows={2}
                            size="small"
                            placeholder="定义 AI 的角色和行为..."
                            value={ollamaParams.systemPrompt}
                            onChange={(e) => setOllamaParams(p => ({ ...p, systemPrompt: e.target.value }))}
                            sx={{
                              '& textarea': {
                                color: 'var(--text-color)',
                                fontSize: '0.8rem',
                                '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                              },
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'var(--border-color)' },
                                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                              }
                            }}
                          />
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>

                {/* 模型管理 */}
                <Card sx={{ bgcolor: 'var(--card-background)', border: '1px solid var(--border-color)', borderRadius: 2, boxShadow: 'none' }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'var(--text-color)', fontSize: '0.95rem' }}>
                        本地模型
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={loadOllamaModelsList}
                        disabled={ollamaModelsLoading}
                        startIcon={ollamaModelsLoading ? <CircularProgress size={14} sx={{ color: 'var(--text-secondary)' }} /> : <RefreshIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          textTransform: 'none',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-color)',
                          '&:hover': {
                            borderColor: 'var(--primary-color)',
                            bgcolor: 'var(--hover-bg)'
                          },
                          '&.Mui-disabled': {
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-secondary)'
                          }
                        }}
                      >
                        刷新
                      </Button>
                    </Box>

                    {/* 拉取新模型 */}
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                      <TextField
                        size="small"
                        placeholder="输入模型名称拉取 (如: llama3.2)"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        sx={{
                          flex: 1,
                          '& input': {
                            color: 'var(--text-color)',
                            fontSize: '0.85rem',
                            '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                          },
                          '& .MuiOutlinedInput-root': {
                            '& fieldset': { borderColor: 'var(--border-color)' },
                            '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                            '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handlePullModel}
                        disabled={pullingModel || !newModelName.trim()}
                        startIcon={pullingModel ? <CircularProgress size={14} /> : <DownloadIcon sx={{ fontSize: 16 }} />}
                        sx={{
                          textTransform: 'none',
                          bgcolor: 'var(--primary-color)',
                          color: 'white',
                          '&:hover': { bgcolor: 'var(--primary-hover)' },
                          '&.Mui-disabled': {
                            bgcolor: 'var(--hover-bg)',
                            color: 'var(--text-secondary)'
                          }
                        }}
                      >
                        拉取
                      </Button>
                    </Box>

                    {/* 模型列表 */}
                    {ollamaModels.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {ollamaModels.map((model) => (
                          <Paper
                            key={model.name}
                            sx={{
                              p: 1.5,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              bgcolor: 'var(--hover-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 1.5
                            }}
                          >
                            <Box>
                              <Typography sx={{ color: 'var(--text-color)', fontSize: '0.85rem', fontWeight: 500 }}>
                                {model.name}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.3 }}>
                                {model.size && (
                                  <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                                    大小: {formatSize(model.size)}
                                  </Typography>
                                )}
                                {model.details?.parameter_size && (
                                  <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                                    参数: {model.details.parameter_size}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteOllamaModel(model.name)}
                              disabled={deletingModel === model.name}
                              sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--error-color)' } }}
                            >
                              {deletingModel === model.name ? <CircularProgress size={16} /> : <DeleteIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Box sx={{
                        p: 3,
                        textAlign: 'center',
                        bgcolor: 'var(--hover-bg)',
                        borderRadius: 2,
                        border: '1px dashed var(--border-color)'
                      }}>
                        <ComputerIcon sx={{ fontSize: 32, color: 'var(--text-secondary)', opacity: 0.5, mb: 1 }} />
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          暂无本地模型
                        </Typography>
                        <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', mt: 0.5 }}>
                          推荐: llama3.2、qwen2.5、deepseek-r1
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </Box>
        </TabPanel>

        {/* ========== 自定义提供商标签页 ========== */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: 3, pb: 3 }}>
            <CustomProviderManager />
          </Box>
        </TabPanel>
      </DialogContent>

      {/* Token删除确认对话框 */}
      <Dialog open={!!tokenToDelete} onClose={() => setTokenToDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'var(--card-background)', color: 'var(--text-color)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          确认删除
          <IconButton onClick={() => setTokenToDelete(null)} size="small" sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--text-color)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--card-background)' }}>
          <Typography sx={{ color: 'var(--text-color)', fontSize: '0.9rem' }}>
            确定要删除这个 API Key 吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'var(--card-background)', px: 3, pb: 2 }}>
          <Button onClick={() => setTokenToDelete(null)} sx={{ color: 'var(--text-secondary)', textTransform: 'none' }}>
            取消
          </Button>
          <Button onClick={confirmDeleteToken} variant="contained" sx={{ bgcolor: 'var(--error-color)', textTransform: 'none' }}>
            删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Token编辑对话框 */}
      <Dialog open={showEditTokenModal} onClose={() => setShowEditTokenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'var(--card-background)', color: 'var(--text-color)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          编辑 API Key
          <IconButton onClick={() => setShowEditTokenModal(false)} size="small" sx={{ color: 'var(--text-secondary)', '&:hover': { color: 'var(--text-color)' } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--card-background)' }}>
          <TextField
            fullWidth
            size="small"
            label="Token"
            value={newToken}
            onChange={(e) => setNewToken(e.target.value)}
            sx={{
              mb: 2,
              mt: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'var(--border-color)' },
                '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
              },
              '& input': {
                color: 'var(--text-color)',
                '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
              },
              '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
              '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' }
            }}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Autocomplete
              size="small"
              options={providerOptions}
              value={providerOptions.find(o => o.value === editProvider) || editProvider || null}
              onChange={(e, v) => {
                if (typeof v === 'string') {
                  setEditProvider(v)
                } else if (v && typeof v === 'object') {
                  setEditProvider(v.value || '')
                  if (v.value && modelOptions[v.value]) {
                    setEditModel(modelOptions[v.value][0])
                  }
                } else {
                  setEditProvider('')
                }
              }}
              onInputChange={(e, v) => {
                if (v && typeof v === 'string') {
                  setEditProvider(v)
                }
              }}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option
                return option?.label || option?.value || ''
              }}
              isOptionEqualToValue={(option, value) => {
                if (typeof option === 'string' && typeof value === 'string') return option === value
                return option?.value === value?.value || option?.value === value
              }}
              renderInput={(params) => <TextField {...params} label="服务商" sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
                '& input': {
                  color: 'var(--text-color)',
                  '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                }
              }} />}
              freeSolo
              sx={{
                flex: 1,
                '& .MuiAutocomplete-paper': {
                  bgcolor: 'var(--card-background)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                },
                '& .MuiAutocomplete-listbox': {
                  bgcolor: 'var(--card-background)',
                  color: 'var(--text-color)'
                },
                '& .MuiAutocomplete-option': {
                  color: 'var(--text-color)',
                  '&:hover': { bgcolor: 'var(--hover-bg)' },
                  '&.Mui-focused': { bgcolor: 'var(--hover-bg)' }
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: 'var(--text-secondary)',
                  '&:hover': { color: 'var(--text-color)' }
                }
              }}
            />
            <Autocomplete
              size="small"
              options={editProvider ? modelOptions[editProvider] || [] : []}
              value={editModel}
              onChange={(e, v) => setEditModel(typeof v === 'string' ? v : (v || ''))}
              onInputChange={(e, v) => {
                if (v && typeof v === 'string') {
                  setEditModel(v)
                }
              }}
              freeSolo
              renderInput={(params) => <TextField {...params} label="模型" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'var(--card-background)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--primary-color)' },
                  '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' }
                },
                '& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
                '& .MuiInputLabel-root.Mui-focused': { color: 'var(--primary-color)' },
                '& input': {
                  color: 'var(--text-color)',
                  '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.5 }
                }
              }} />}
              sx={{
                flex: 1,
                '& .MuiAutocomplete-paper': {
                  bgcolor: 'var(--card-background)',
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                },
                '& .MuiAutocomplete-listbox': {
                  bgcolor: 'var(--card-background)',
                  color: 'var(--text-color)'
                },
                '& .MuiAutocomplete-option': {
                  color: 'var(--text-color)',
                  '&:hover': { bgcolor: 'var(--hover-bg)' },
                  '&.Mui-focused': { bgcolor: 'var(--hover-bg)' }
                },
                '& .MuiAutocomplete-clearIndicator': {
                  color: 'var(--text-secondary)',
                  '&:hover': { color: 'var(--text-color)' }
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'var(--card-background)', px: 3, pb: 2 }}>
          <Button onClick={() => setShowEditTokenModal(false)} sx={{ color: 'var(--text-secondary)', textTransform: 'none' }}>
            取消
          </Button>
          <Button onClick={handleUpdateTokenInfo} variant="contained" sx={{ bgcolor: 'var(--primary-color)', textTransform: 'none' }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            bgcolor: snackbar.severity === 'success' ? 'rgba(76, 175, 80, 0.15)' :
              snackbar.severity === 'error' ? 'rgba(244, 67, 54, 0.15)' :
                snackbar.severity === 'warning' ? 'rgba(255, 152, 0, 0.15)' :
                  'rgba(33, 150, 243, 0.15)',
            color: 'var(--text-color)',
            border: `1px solid ${snackbar.severity === 'success' ? 'rgba(76, 175, 80, 0.3)' :
              snackbar.severity === 'error' ? 'rgba(244, 67, 54, 0.3)' :
                snackbar.severity === 'warning' ? 'rgba(255, 152, 0, 0.3)' :
                  'rgba(33, 150, 243, 0.3)'}`,
            '& .MuiAlert-icon': {
              color: snackbar.severity === 'success' ? '#4caf50' :
                snackbar.severity === 'error' ? '#f44336' :
                  snackbar.severity === 'warning' ? '#ff9800' :
                    '#2196f3'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  )
}

export default TokenManager
