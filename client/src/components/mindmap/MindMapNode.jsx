/**
 * 脑图节点组件
 * 支持简洁/详细视图切换
 */
import { memo, useState, useCallback } from 'react';
import { Box, Typography, Paper, Fade, IconButton, Chip, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Handle, Position } from '@xyflow/react';

const MindMapNode = memo(({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { 
    question, 
    answer, 
    answerSummary, 
    childrenCount,
    isCurrentPath,
    depth,
    status,
    error,
    onBranchClick,
    onNodeClick
  } = data;

  const handleToggleExpand = useCallback((e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleBranchClick = useCallback((e) => {
    e.stopPropagation();
    onBranchClick?.(data);
  }, [data, onBranchClick]);

  const handleNodeClick = useCallback(() => {
    onNodeClick?.(data);
  }, [data, onNodeClick]);

  const isRoot = depth === 0;
  const hasChildren = childrenCount > 0;
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const displayAnswer = isExpanded ? answer : (answerSummary || answer?.substring(0, 50) + '...');
  const displayQuestion = isRoot ? '开始' : (question?.substring(0, 60) + (question?.length > 60 ? '...' : ''));

  return (
    <>
      {/* 输入连接点 */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ 
            background: 'var(--primary-color)',
            width: 8,
            height: 8,
            border: '2px solid var(--card-background)'
          }}
        />
      )}

      <Paper
        onClick={handleNodeClick}
        sx={{
          width: isExpanded ? 360 : 280,
          minHeight: isExpanded ? 200 : 120,
          maxHeight: isExpanded ? 400 : 140,
          overflow: 'hidden',
          borderRadius: 2,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          border: selected 
            ? '2px solid var(--primary-color)' 
            : isCurrentPath 
              ? '1px solid rgba(59, 130, 246, 0.5)' 
              : '1px solid var(--border-color)',
          boxShadow: selected 
            ? '0 0 20px rgba(59, 130, 246, 0.3)' 
            : isCurrentPath 
              ? '0 4px 12px rgba(59, 130, 246, 0.15)' 
              : '0 2px 8px rgba(0, 0, 0, 0.08)',
          bgcolor: 'var(--card-background)',
          backdropFilter: 'blur(10px)',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-2px)'
          }
        }}
      >
        {/* 当前路径指示器 */}
        {isCurrentPath && (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              bgcolor: 'var(--primary-color)',
              borderRadius: '2px 0 0 2px'
            }}
          />
        )}

        {/* 问题区域 */}
        <Box
          sx={{
            p: 1.5,
            pb: 1,
            borderBottom: '1px solid var(--border-color)',
            bgcolor: isRoot ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block',
              mb: 0.5
            }}
          >
            {isRoot ? 'START' : 'QUESTION'}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'var(--text-color)',
              fontWeight: 500,
              fontSize: '0.875rem',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: isExpanded ? undefined : 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {displayQuestion}
          </Typography>
        </Box>

        {/* 回答区域 */}
        <Box sx={{ p: 1.5, pt: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-secondary)',
              fontSize: '0.7rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block',
              mb: 0.5
            }}
          >
            {isLoading ? 'THINKING...' : isError ? 'ERROR' : 'ANSWER'}
          </Typography>
          
          {isLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
              <CircularProgress size={16} thickness={2} sx={{ color: 'var(--primary-color)' }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem'
                }}
              >
                AI 正在思考...
              </Typography>
            </Box>
          ) : isError ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.5 }}>
              <ErrorOutlineIcon sx={{ fontSize: 16, color: 'var(--error-color, #ef4444)' }} />
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--error-color, #ef4444)',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {error || '请求失败'}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{
                color: isExpanded ? 'var(--text-color)' : 'var(--primary-color)',
                fontWeight: isExpanded ? 400 : 600,
                fontSize: isExpanded ? '0.875rem' : '1rem',
                lineHeight: 1.5,
                overflow: isExpanded ? 'auto' : 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical',
                maxHeight: isExpanded ? 200 : undefined
              }}
            >
              {displayAnswer || '...'}
            </Typography>
          )}
        </Box>

        {/* 操作栏 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.75,
            borderTop: '1px solid var(--border-color)',
            bgcolor: 'rgba(0, 0, 0, 0.02)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* 展开/折叠按钮 */}
            <IconButton
              size="small"
              onClick={handleToggleExpand}
              sx={{
                color: 'var(--text-secondary)',
                p: 0.5,
                '&:hover': { color: 'var(--primary-color)' }
              }}
            >
              {isExpanded ? (
                <ExpandLessIcon sx={{ fontSize: 16 }} />
              ) : (
                <ExpandMoreIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>

            {/* 分支数量 */}
            {hasChildren && (
              <Chip
                size="small"
                label={`${childrenCount} 分支`}
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: 'var(--hover-bg)',
                  color: 'var(--text-secondary)'
                }}
              />
            )}
          </Box>

          {/* 创建分支按钮 */}
          <IconButton
            size="small"
            onClick={handleBranchClick}
            sx={{
              color: 'var(--text-secondary)',
              p: 0.5,
              '&:hover': { color: 'var(--primary-color)' }
            }}
            title="从此节点创建分支"
          >
            <CallSplitIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Paper>

      {/* 输出连接点 */}
      {hasChildren && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{ 
            background: 'var(--primary-color)',
            width: 8,
            height: 8,
            border: '2px solid var(--card-background)'
          }}
        />
      )}
    </>
  );
});

MindMapNode.displayName = 'MindMapNode';

export default MindMapNode;
