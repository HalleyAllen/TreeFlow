import React, { useState, useEffect } from 'react'
import { Box, Paper, Typography, IconButton, Fade } from '@mui/material'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CloseIcon from '@mui/icons-material/Close'
import { getNodeBranches, switchBranch } from '../../services/api'
import logger from '../../services/logger'

const BranchSelector = ({ nodeId, topicId, open, onClose, onBranchSwitched }) => {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && nodeId) {
      loadBranches()
    }
  }, [open, nodeId])

  const loadBranches = async () => {
    setLoading(true)
    try {
      const data = await getNodeBranches(nodeId)
      setBranches(data)
    } catch (error) {
      logger.error('BranchSelector', '加载分支失败:', { error: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchBranch = async (branchId) => {
    try {
      const data = await switchBranch(branchId)
      if (data.result && onBranchSwitched) {
        onBranchSwitched(branchId)
        onClose()
      }
    } catch (error) {
      logger.error('BranchSelector', '切换分支失败:', { error: error.message })
    }
  }

  if (!open) return null

  return (
    <Fade in>
      <Paper sx={{
        position: 'absolute',
        left: '100%',
        top: 0,
        ml: 1,
        minWidth: '220px',
        zIndex: 100,
        border: '1px solid rgba(59, 130, 246, 0.25)',
        bgcolor: 'var(--card-background)',
        borderRadius: 2,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
        overflow: 'hidden'
      }}>
        <Box sx={{
          p: 1.5,
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CallSplitIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-color)' }}>
              分支列表 ({branches.length})
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: 'var(--text-secondary)' }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>加载中...</Typography>
          </Box>
        ) : branches.length === 0 ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>暂无分支</Typography>
          </Box>
        ) : (
          branches.map(branch => (
            <Box
              key={branch.id}
              sx={{
                p: 1.5,
                borderBottom: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.08)' },
                '&:last-child': { borderBottom: 'none' },
                '&.current': {
                  bgcolor: 'rgba(59, 130, 246, 0.12)',
                  borderLeft: '3px solid #3b82f6'
                }
              }}
              onClick={() => handleSwitchBranch(branch.id)}
              className={branch.isCurrentBranch ? 'current' : ''}
            >
              <Typography sx={{
                fontSize: '0.8rem',
                color: branch.isCurrentBranch ? '#60a5fa' : 'var(--text-color)',
                fontWeight: branch.isCurrentBranch ? 500 : 400
              }}>
                {branch.message}
              </Typography>
              {branch.isCurrentBranch && (
                <Typography sx={{ fontSize: '0.65rem', color: '#60a5fa', mt: 0.25 }}>当前分支</Typography>
              )}
            </Box>
          ))
        )}
      </Paper>
    </Fade>
  )
}

export default BranchSelector
