import React, { useState, useEffect } from 'react'
import { Box, Dialog, DialogTitle, DialogContent, Button, TextField, List, ListItem, Typography } from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ChatContainer from './components/ChatContainer'
import { loadTopics, loadCurrentTopic, loadTokenStats, loadModels, sendMessage, switchTopic, createTopic, addToken, removeToken, updateTokenStatus, clearTokens, checkTokenHealth, checkAllTokensHealth, getTokenUsageStats, setModel } from './services/api'

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [topics, setTopics] = useState([])
  const [currentTopic, setCurrentTopic] = useState(null)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [topicNameInput, setTopicNameInput] = useState('')
  const [tokenStats, setTokenStats] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')

  // 初始化加载话题和当前话题
  useEffect(() => {
    const initData = async () => {
      const topicsData = await loadTopics()
      const currentTopicData = await loadCurrentTopic()
      const tokenStatsData = await loadTokenStats()
      const modelsData = await loadModels()

      setTopics(topicsData)
      setCurrentTopic(currentTopicData)
      setTokenStats(tokenStatsData)
      setModels(modelsData)

      // 如果还没有选择模型，默认选择第一个可用模型
      if (!selectedModel && modelsData.length > 0) {
        setSelectedModel(modelsData[0].id)
      }
    }

    initData()
  }, [])

  // 当token状态变化时，重新加载模型列表
  useEffect(() => {
    const updateModels = async () => {
      const modelsData = await loadModels()
      setModels(modelsData)
      // 如果还没有选择模型，默认选择第一个可用模型
      if (!selectedModel && modelsData.length > 0) {
        setSelectedModel(modelsData[0].id)
      }
    }

    updateModels()
  }, [tokenStats, selectedModel])

  // 发送消息
  const handleSend = async () => {
    if (!input.trim()) return

    // 添加用户消息
    setMessages(prev => [...prev, { type: 'user', content: input }])
    setInput('')
    setIsLoading(true)

    try {
      const data = await sendMessage(input)
      if (data.response) {
        // 添加AI响应
        setMessages(prev => [...prev, { type: 'ai', content: data.response }])
      } else if (data.error) {
        setMessages(prev => [...prev, { type: 'ai', content: `错误: ${data.error}` }])
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages(prev => [...prev, { type: 'ai', content: '发送消息失败，请稍后再试' }])
    } finally {
      setIsLoading(false)
    }
  }

  // 处理键盘回车
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 切换话题
  const handleSwitchTopic = async (topicId) => {
    try {
      const data = await switchTopic(topicId)
      if (data.result) {
        setCurrentTopic({ id: topicId, name: topics.find(t => t.id === topicId)?.name })
        setMessages([]) // 清空消息，因为切换了话题
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`切换话题失败: ${data.error}`)
      }
    } catch (error) {
      console.error('切换话题失败:', error)
      alert('切换话题失败')
    }
  }

  // 创建话题
  const handleCreateTopic = async () => {
    if (!topicNameInput.trim()) return

    try {
      const data = await createTopic(topicNameInput)
      if (data.result) {
        setShowCreateTopicModal(false)
        setTopicNameInput('')
        const topicsData = await loadTopics() // 重新加载话题列表
        setTopics(topicsData)
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`创建话题失败: ${data.error}`)
      }
    } catch (error) {
      console.error('创建话题失败:', error)
      alert('创建话题失败')
    }
  }

  // 添加token
  const handleAddToken = async () => {
    if (!tokenInput.trim()) return

    try {
      const data = await addToken(tokenInput)
      if (data.result) {
        setShowTokenModal(false)
        setTokenInput('')
        const tokenStatsData = await loadTokenStats() // 重新加载token状态
        setTokenStats(tokenStatsData)
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`添加token失败: ${data.error}`)
      }
    } catch (error) {
      console.error('添加token失败:', error)
      alert('添加token失败')
    }
  }

  // 删除token
  const handleDeleteToken = async (token) => {
    if (!confirm('确定要删除这个token吗？')) return

    try {
      const data = await removeToken(token)
      if (data.result) {
        const tokenStatsData = await loadTokenStats() // 重新加载token状态
        setTokenStats(tokenStatsData)
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`删除token失败: ${data.error}`)
      }
    } catch (error) {
      console.error('删除token失败:', error)
      alert('删除token失败')
    }
  }

  // 更新token状态
  const handleUpdateTokenStatus = async (token, status) => {
    try {
      const data = await updateTokenStatus(token, status)
      if (data.result) {
        const tokenStatsData = await loadTokenStats() // 重新加载token状态
        setTokenStats(tokenStatsData)
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`更新token状态失败: ${data.error}`)
      }
    } catch (error) {
      console.error('更新token状态失败:', error)
      alert('更新token状态失败')
    }
  }

  // 清除所有token
  const handleClearTokens = async () => {
    if (!confirm('确定要清除所有token吗？此操作不可恢复。')) return

    try {
      const data = await clearTokens()
      if (data.result) {
        const tokenStatsData = await loadTokenStats() // 重新加载token状态
        setTokenStats(tokenStatsData)
        alert(data.result)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`清除token失败: ${data.error}`)
      }
    } catch (error) {
      console.error('清除token失败:', error)
      alert('清除token失败')
    }
  }

  // 检查Token健康状态
  const handleCheckTokenHealth = async (token) => {
    try {
      const data = await checkTokenHealth(token)
      if (data.result) {
        alert(`Token健康状态: ${data.result.message}`)
        // 重新加载token状态
        const tokenStatsData = await loadTokenStats()
        setTokenStats(tokenStatsData)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`检查token健康状态失败: ${data.error}`)
      }
    } catch (error) {
      console.error('检查token健康状态失败:', error)
      alert('检查token健康状态失败')
    }
  }

  // 批量检查所有Token健康状态
  const handleCheckAllTokensHealth = async () => {
    try {
      const data = await checkAllTokensHealth()
      if (data.results) {
        // 显示健康检查结果
        const healthyCount = data.results.filter(r => r.healthStatus === 'healthy').length
        const unhealthyCount = data.results.filter(r => r.healthStatus === 'unhealthy').length
        alert(`健康检查完成：${healthyCount}个Token健康，${unhealthyCount}个Token不健康`)
        // 重新加载token状态
        const tokenStatsData = await loadTokenStats()
        setTokenStats(tokenStatsData)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`批量检查token健康状态失败: ${data.error}`)
      }
    } catch (error) {
      console.error('批量检查token健康状态失败:', error)
      alert('批量检查token健康状态失败')
    }
  }

  // 获取Token使用统计
  const handleGetTokenUsageStats = async () => {
    try {
      const data = await getTokenUsageStats()
      if (data.stats) {
        // 显示使用统计
        const stats = data.stats
        alert(`Token使用统计：\n总Token数: ${stats.totalTokens}\n活跃Token数: ${stats.activeTokens}\n非活跃Token数: ${stats.inactiveTokens}\n总使用次数: ${stats.totalUsage}\n平均使用次数: ${stats.averageUsage}`)
      } else if (data.error) {
        // 处理后端返回的错误
        alert(`获取token使用统计失败: ${data.error}`)
      }
    } catch (error) {
      console.error('获取token使用统计失败:', error)
      alert('获取token使用统计失败')
    }
  }

  // 选择模型
  const handleSelectModel = async (model) => {
    if (model.available) {
      try {
        // 调用API设置模型
        const data = await setModel(model.id)
        if (data.result) {
          console.log(data.result)
          setSelectedModel(model.id)
          setShowModelDropdown(false)
        } else if (data.error) {
          // 处理后端返回的错误
          console.error('设置模型失败:', data.error)
          // 即使API调用失败，也更新本地状态
          setSelectedModel(model.id)
          setShowModelDropdown(false)
        }
      } catch (error) {
        console.error('设置模型失败:', error)
        // 即使API调用失败，也更新本地状态
        setSelectedModel(model.id)
        setShowModelDropdown(false)
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header onTokenManagerClick={() => setShowTokenModal(true)} />
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          topics={topics}
          currentTopic={currentTopic}
          showCreateTopicModal={showCreateTopicModal}
          topicNameInput={topicNameInput}
          onShowCreateTopicModal={() => setShowCreateTopicModal(true)}
          onTopicNameChange={(e) => setTopicNameInput(e.target.value)}
          onCreateTopic={handleCreateTopic}
          onSwitchTopic={handleSwitchTopic}
          onCancelCreateTopic={() => {
            setShowCreateTopicModal(false)
            setTopicNameInput('')
          }}
        />
        <ChatContainer
          currentTopic={currentTopic}
          messages={messages}
          input={input}
          isLoading={isLoading}
          models={models}
          selectedModel={selectedModel}
          showModelDropdown={showModelDropdown}
          onInputChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          onSend={handleSend}
          onToggleModelDropdown={() => setShowModelDropdown(!showModelDropdown)}
          onSelectModel={handleSelectModel}
        />
      </Box>

      {/* token管理模态框 */}
      <Dialog
        open={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SettingsIcon /> token管理
          </Box>
          <Box sx={{ display: 'flex', gap: '8px' }}>
            {tokenStats.length > 0 && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleGetTokenUsageStats}
                  sx={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
                >
                  使用统计
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCheckAllTokensHealth}
                  sx={{ borderColor: 'var(--warning-color)', color: 'var(--warning-color)' }}
                >
                  健康检查
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleClearTokens}
                  sx={{ borderColor: 'var(--error-color)', color: 'var(--error-color)' }}
                >
                  清除所有
                </Button>
              </>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'var(--card-background)' }}>
          <Box sx={{ mb: 3, pb: 3, borderBottom: '1px solid var(--border-color)' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>添加Token</Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="输入API Token"
              required
              sx={{ mb: 2, input: { color: 'var(--text-color)' }, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'var(--border-color)' }, '&:hover fieldset': { borderColor: 'var(--primary-color)' }, '&.Mui-focused fieldset': { borderColor: 'var(--primary-color)' } } }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setShowTokenModal(false)} sx={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}>
                取消
              </Button>
              <Button variant="contained" onClick={handleAddToken} sx={{ bgcolor: 'var(--primary-color)', '&:hover': { bgcolor: 'var(--primary-hover)' } }}>
                添加
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔑 已添加的Token
            </Typography>
            {tokenStats.length > 0 ? (
              <List>
                {tokenStats.map((token, index) => (
                  <ListItem key={index} sx={{ border: '1px solid var(--border-color)', borderRadius: 1, mb: 1, bgcolor: 'var(--card-background)' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-color)' }}>{token.token}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {token.provider} - {token.model} (使用: {token.usageCount}次)
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Box sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: token.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : token.status === 'inactive' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: token.status === 'active' ? 'var(--success-color)' : token.status === 'inactive' ? 'var(--warning-color)' : 'var(--error-color)',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {token.status === 'active' ? '活跃' : token.status === 'inactive' ? '非活跃' : '过期'}
                        </Box>
                        <Box sx={{
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: token.healthStatus === 'healthy' ? 'rgba(16, 185, 129, 0.2)' : token.healthStatus === 'unhealthy' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                          color: token.healthStatus === 'healthy' ? 'var(--success-color)' : token.healthStatus === 'unhealthy' ? 'var(--error-color)' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {token.healthStatus === 'healthy' ? '健康' : token.healthStatus === 'unhealthy' ? '不健康' : '未知'}
                        </Box>
                        {token.lastUsed && (
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            最后使用: {new Date(token.lastUsed).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleUpdateTokenStatus(token.token, token.status === 'active' ? 'inactive' : 'active')}
                          sx={{ borderColor: 'var(--border-color)', color: 'var(--text-color)', fontSize: '0.75rem', height: '28px' }}
                        >
                          {token.status === 'active' ? '设为非活跃' : '设为活跃'}
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleCheckTokenHealth(token.token)}
                          sx={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)', fontSize: '0.75rem', height: '28px' }}
                        >
                          检查健康
                        </Button>
                      </Box>
                    </Box>
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      onClick={() => handleDeleteToken(token.token)}
                      sx={{ minWidth: '32px', width: '32px', height: '32px', borderRadius: '50%', bgcolor: 'var(--error-color)', '&:hover': { bgcolor: '#dc2626' } }}
                    >
                      ×
                    </Button>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ color: 'var(--text-secondary)' }}>无可用token</Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default App
