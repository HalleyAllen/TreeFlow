import { useState, useRef, useEffect } from 'react'
import { Box, Typography, Paper, TextField, Button, IconButton, Tooltip, Fade, Chip } from '@mui/material'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import SkillSelector from '../common/SkillSelector'
import MindMap from '../mindmap/MindMap'
import { useMindMap } from '../../hooks/useMindMap'

const ChatContainer = ({
  currentTopic,
  messages,
  input,
  isLoading,
  models,
  selectedModel,
  showModelDropdown,
  branchMode,
  branchFromIndex,
  skills,
  activeSkill,
  onInputChange,
  onKeyPress,
  onSend,
  onToggleModelDropdown,
  onSelectModel,
  onEnterBranchMode,
  onExitBranchMode,
  onSelectSkill,
  onClearSkill
}) => {
  const [hoveredMsgIndex, setHoveredMsgIndex] = useState(-1)
  const [showSkillSelector, setShowSkillSelector] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const modelDropdownRef = useRef(null)
  
  // 脑图数据管理
  const { 
    treeData, 
    loading: treeLoading, 
    currentNodeId, 
    loadTree, 
    refreshTree 
  } = useMindMap()

  // 话题切换时加载树数据
  useEffect(() => {
    if (currentTopic?.id) {
      loadTree(currentTopic.id)
    }
  }, [currentTopic?.id, loadTree])

  // 消息更新时刷新树
  useEffect(() => {
    if (currentTopic?.id && messages.length > 0) {
      refreshTree(currentTopic.id)
    }
  }, [messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (branchMode && inputRef.current) {
      inputRef.current.focus()
    }
  }, [branchMode])

  // 点击外部关闭模型选择下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target)) {
        if (showModelDropdown) {
          onToggleModelDropdown()
        }
      }
    }

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showModelDropdown, onToggleModelDropdown])

  const handleInputChange = (e) => {
    const value = e.target.value
    onInputChange(e)
    // 检测 '/' 触发技能选择
    if (value === '/' && !activeSkill) {
      setShowSkillSelector(true)
    } else if (showSkillSelector && !value.startsWith('/')) {
      setShowSkillSelector(false)
    }
  }

  const handleSelectSkill = (skill) => {
    onSelectSkill(skill)
    setShowSkillSelector(false)
    // 清空输入框的 '/' 并设置 placeholder
    onInputChange({ target: { value: '' } })
    inputRef.current?.focus()
  }

  const handleClearSkill = () => {
    onClearSkill()
    inputRef.current?.focus()
  }

  return (
    <Box sx={{ flex: 1, p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* 标题栏 */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-color)' }}>
          💬 {currentTopic?.name || '默认话题'}
        </Typography>
        {branchMode && (
          <Chip
            icon={<CallSplitIcon sx={{ color: 'var(--primary-color)' }} />}
            label="分支模式"
            onDelete={onExitBranchMode}
            sx={{
              bgcolor: 'var(--hover-bg)',
              color: 'var(--primary-color)',
              border: '1px solid var(--primary-color)',
              fontWeight: 500,
              '& .MuiChip-deleteIcon': { color: 'var(--primary-color)' }
            }}
          />
        )}
      </Box>

      {/* 分支模式提示条 */}
      <Fade in={branchMode}>
        <Paper
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1.5,
            bgcolor: 'var(--card-background)',
            border: '1px solid var(--primary-color)',
            display: branchMode ? 'flex' : 'none',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CallSplitIcon sx={{ color: 'var(--primary-color)', fontSize: 20 }} />
            <Typography sx={{ color: 'var(--text-color)', fontSize: '0.875rem' }}>
              输入新问题，将从此处创建分支
            </Typography>
          </Box>
          <IconButton size="small" onClick={onExitBranchMode} sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Fade>

      {/* 脑图视图 */}
      <Box sx={{ flex: 1, mb: 2, borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
        <MindMap
          treeData={treeData}
          currentNodeId={currentNodeId}
          loading={treeLoading || isLoading}
          onNodeSelect={(nodeData) => {
            // 节点选中处理
            console.log('选中节点:', nodeData)
          }}
          onBranchFromNode={(nodeData) => {
            // 从节点创建分支
            const index = messages.findIndex(m => m.nodeId === nodeData.id)
            if (index !== -1) {
              onEnterBranchMode(index, nodeData.id)
            }
          }}
        />
      </Box>

      {/* 输入区域 */}
      <Paper
        onClick={() => inputRef.current?.focus()}
        sx={{
          p: 2,
          borderRadius: 2.5,
          border: branchMode ? '2px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border-color)',
          bgcolor: 'var(--card-background)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: branchMode ? '0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
          cursor: 'text',
          '&:hover': {
            borderColor: branchMode ? 'rgba(59, 130, 246, 0.5)' : 'var(--border-color)'
          },
          '&:focus-within': {
            borderColor: 'var(--primary-color)',
            boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)'
          }
        }}
      >
        {/* 技能选择器 */}
        {showSkillSelector && (
          <SkillSelector
            skills={skills}
            onSelect={handleSelectSkill}
            onClose={() => setShowSkillSelector(false)}
          />
        )}

        {/* 当前技能显示 */}
        {activeSkill && (
          <Chip
            icon={<span>{activeSkill.icon}</span>}
            label={activeSkill.name}
            onDelete={handleClearSkill}
            size="small"
            sx={{
              mb: 1,
              bgcolor: 'var(--warning-color)',
              color: 'white',
              border: '1px solid var(--warning-color)',
              '& .MuiChip-deleteIcon': { color: 'white', fontSize: 16 }
            }}
          />
        )}

        <TextField
          inputRef={inputRef}
          fullWidth
          variant="standard"
          value={input}
          onChange={handleInputChange}
          onKeyPress={onKeyPress}
          placeholder={activeSkill ? activeSkill.placeholder : (branchMode ? '输入新问题，从此处创建分支...' : "发消息或输入 '/' 选择技能")}
          disabled={isLoading}
          multiline
          maxRows={4}
          sx={{
            mb: 1.5,
            '& .MuiInput-root': {
              border: 'none',
              '&:before': { display: 'none' },
              '&:after': { display: 'none' }
            },
            '& .MuiInput-input': {
              color: 'var(--text-color)',
              '&::placeholder': { color: 'var(--text-secondary)', opacity: 0.8 },
              padding: 0
            }
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box ref={modelDropdownRef} sx={{ position: 'relative' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={onToggleModelDropdown}
              sx={{
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textTransform: 'none',
                fontSize: '0.8rem'
              }}
            >
              🤖 {models.find(m => m.id === selectedModel)?.name || '无模型'}
            </Button>
            {showModelDropdown && (
              <Paper sx={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                mb: 1,
                minWidth: '240px',
                zIndex: 100,
                border: '1px solid var(--border-color)',
                bgcolor: 'var(--card-background)',
                borderRadius: 2,
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                overflow: 'hidden'
              }}>
                {models.length > 0 ? (
                  models.map(model => (
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
                        gap: 1,
                        transition: 'background-color 0.2s',
                        '&:hover': model.available ? { backgroundColor: 'var(--hover-bg)' } : {},
                        '&:last-child': { borderBottom: 'none' }
                      }}
                      onClick={() => onSelectModel(model)}
                    >
                      <Typography sx={{ color: 'var(--text-color)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{model.name}</Typography>
                      <Typography sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: model.available ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: model.available ? 'var(--success-color)' : 'var(--error-color)',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {model.available ? '可用' : '不可用'}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>无模型可用</Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
          <Button
            variant="contained"
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            endIcon={<SendIcon sx={{ fontSize: 16 }} />}
            sx={{
              bgcolor: branchMode ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--primary-color)',
              borderRadius: 2,
              textTransform: 'none',
              px: 2,
              '&:hover': {
                bgcolor: branchMode ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'var(--primary-hover)'
              },
              '&.Mui-disabled': {
                bgcolor: 'var(--hover-bg)',
                color: 'var(--text-secondary)'
              }
            }}
          >
            发送
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default ChatContainer
