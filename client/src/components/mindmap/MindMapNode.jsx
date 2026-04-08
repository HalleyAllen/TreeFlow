/**
 * 脑图节点组件
 * 支持简洁/详细视图切换、划词引用、编辑复制删除
 */
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Box, Typography, Paper, Fade, IconButton, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import { Handle, Position } from '@xyflow/react';

const MindMapNode = memo(({ data, selected }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [quoteButtonPos, setQuoteButtonPos] = useState({ x: 0, y: 0 });
  const [showActions, setShowActions] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const nodeRef = useRef(null);

  const {
    id,
    question,
    answer,
    answerSummary,
    childrenCount,
    isCurrentPath,
    depth,
    status,
    error,
    onBranchClick,
    onQuoteText,
    onEditNode,
    onCopyNode,
    onDeleteNode
  } = data;

  // 判断是否可以展开（有内容且内容超过2行或已展开）
  const canExpand = answer && (answer.length > 30 || answer.includes('\n')) || isExpanded;

  // 监听鼠标松开来显示引用按钮
  useEffect(() => {
    const handleMouseUp = (e) => {
      // 延迟执行，确保选择已完成
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text && text.length > 0 && nodeRef.current) {
          // 检查选择是否在节点内
          const range = selection.getRangeAt(0);
          if (nodeRef.current.contains(range.commonAncestorContainer)) {
            setSelectedText(text);
            setShowQuoteButton(true);
            
            // 计算按钮位置（在选区下方，避免遮挡文本）
            const rect = range.getBoundingClientRect();
            const nodeRect = nodeRef.current.getBoundingClientRect();
            setQuoteButtonPos({
              x: rect.left - nodeRect.left + rect.width / 2 - 10,
              y: rect.bottom - nodeRect.top + 6
            });
          }
        }
      }, 10);
    };

    const handleMouseDown = (e) => {
      // 如果点击的不是引用按钮且不在节点内，则清除选择
      const isQuoteButton = e.target.closest('.quote-button');
      const isInsideNode = nodeRef.current && nodeRef.current.contains(e.target);
      
      if (!isQuoteButton && !isInsideNode) {
        // 点击外部区域，清除引用状态
        setShowQuoteButton(false);
        setSelectedText('');
        window.getSelection()?.removeAllRanges();
      }
    };

    // 只在节点内监听 mouseup
    const node = nodeRef.current;
    if (node) {
      node.addEventListener('mouseup', handleMouseUp);
    }
    document.addEventListener('mousedown', handleMouseDown);
    
    return () => {
      if (node) {
        node.removeEventListener('mouseup', handleMouseUp);
      }
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // 处理引用点击
  const handleQuoteClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    if (selectedText && onQuoteText) {
      onQuoteText({
        text: selectedText,
        nodeId: data.id,
        question: question,
        answer: answer
      });
      // 不立即清除选择，允许继续选择其他文字
      setShowQuoteButton(false);
      setSelectedText('');
    }
  }, [selectedText, onQuoteText, data.id, question, answer]);

  const handleToggleExpand = useCallback((e) => {
    // 阻止事件冒泡，防止触发节点选择
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleBranchClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onBranchClick?.(data);
  }, [data, onBranchClick]);

  // 编辑节点
  const handleEditClick = useCallback((e) => {
    e.stopPropagation();
    setEditQuestion(question || '');
    setEditAnswer(answer || '');
    setEditDialogOpen(true);
  }, [question, answer]);

  const handleEditSave = useCallback(() => {
    onEditNode?.(id, editQuestion, editAnswer);
    setEditDialogOpen(false);
  }, [id, editQuestion, editAnswer, onEditNode]);

  const handleEditCancel = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  // 复制节点
  const handleCopyClick = useCallback((e) => {
    e.stopPropagation();
    onCopyNode?.(id);
  }, [id, onCopyNode]);

  // 删除节点
  const handleDeleteClick = useCallback((e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个节点及其所有子节点吗？此操作不可恢复。')) {
      onDeleteNode?.(id);
    }
  }, [id, onDeleteNode]);

  const isRoot = depth === 0;
  const hasChildren = childrenCount > 0;
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const displayAnswer = isExpanded ? answer : (answerSummary || answer?.substring(0, 50) + '...');
  // 根节点如果有问题内容则显示问题，否则显示"开始"
  const displayQuestion = (isRoot && !question) ? '开始' : (question?.substring(0, 60) + (question?.length > 60 ? '...' : ''));

  return (
    <>
      {/* 输入连接点 - 从左侧接入 */}
      {!isRoot && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ 
            background: 'var(--primary-color)',
            width: 8,
            height: 8,
            border: '2px solid var(--card-background)',
            left: -4
          }}
        />
      )}

      <Paper
        ref={nodeRef}
        className="nodrag"
        sx={{
          width: 280,
          minHeight: isExpanded ? 200 : 120,
          maxHeight: isExpanded ? 500 : 140,
          overflow: isExpanded ? 'auto' : 'hidden',
          borderRadius: 2,
          cursor: 'default',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          '&.expanded': {
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)'
          },
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
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        {/* 划词引用按钮 - 显示在选区下方 */}
        {showQuoteButton && selectedText && (
          <Fade in={showQuoteButton}>
            <IconButton
              className="quote-button nodrag"
              size="small"
              onClick={handleQuoteClick}
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                left: quoteButtonPos.x,
                top: quoteButtonPos.y,
                zIndex: 99999,
                bgcolor: 'var(--warning-color, #f59e0b)',
                color: 'white',
                width: 22,
                height: 22,
                boxShadow: '0 3px 10px rgba(245, 158, 11, 0.4), 0 1px 3px rgba(0,0,0,0.2)',
                border: '2px solid rgba(255,255,255,0.9)',
                borderRadius: '50%',
                '&:hover': {
                  bgcolor: 'var(--warning-hover, #d97706)',
                  transform: 'scale(1.1) translateY(-1px)',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.5), 0 2px 4px rgba(0,0,0,0.2)'
                },
                '&:active': {
                  transform: 'scale(0.95)'
                },
                transition: 'all 0.12s ease'
              }}
            >
              <FormatQuoteIcon sx={{ fontSize: 12 }} />
            </IconButton>
          </Fade>
        )}
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
          onMouseDown={(e) => e.stopPropagation()}
          sx={{
            p: 1.5,
            pb: 1,
            borderBottom: '1px solid var(--border-color)',
            bgcolor: isRoot ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            cursor: 'text'
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
              WebkitBoxOrient: 'vertical',
              cursor: 'text'
            }}
          >
            {displayQuestion}
          </Typography>
        </Box>

        {/* 回答区域 */}
        <Box 
          onMouseDown={(e) => e.stopPropagation()}
          sx={{ 
            p: 1.5, 
            pt: 1,
            cursor: 'text'
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
            <Box
              sx={{
                maxHeight: isExpanded ? 350 : undefined,
                overflow: isExpanded ? 'auto' : 'hidden',
                transition: 'max-height 0.3s ease',
                '&::-webkit-scrollbar': {
                  width: '6px'
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                  margin: '4px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'var(--border-color)',
                  borderRadius: '3px',
                  '&:hover': {
                    background: 'var(--text-secondary)'
                  }
                }
              }}
            >
              <Typography
                variant="body2"
                className="nodrag"
                sx={{
                  color: isExpanded ? 'var(--text-color)' : 'var(--primary-color)',
                  fontWeight: isExpanded ? 400 : 600,
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                  overflow: isExpanded ? 'visible' : 'hidden',
                  textOverflow: 'ellipsis',
                  display: isExpanded ? 'block' : '-webkit-box',
                  WebkitLineClamp: isExpanded ? undefined : 2,
                  WebkitBoxOrient: 'vertical',
                  cursor: 'text',
                  transition: 'all 0.2s ease'
                }}
              >
                {displayAnswer || '...'}
              </Typography>
            </Box>
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
            {/* 展开/折叠按钮 - 只在有可展开内容时显示 */}
            {canExpand && (
              <Tooltip title={isExpanded ? '收起内容' : '展开全部内容'}>
                <IconButton
                  className="nodrag"
                  size="small"
                  onClick={handleToggleExpand}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    color: isExpanded ? 'var(--primary-color)' : 'var(--text-secondary)',
                    bgcolor: isExpanded ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    p: 0.5,
                    borderRadius: 1,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'var(--primary-color)',
                      bgcolor: 'rgba(59, 130, 246, 0.15)',
                      transform: 'scale(1.05)'
                    },
                    '&:active': {
                      transform: 'scale(0.95)'
                    }
                  }}
                >
                  {isExpanded ? (
                    <ExpandLessIcon sx={{ fontSize: 20 }} />
                  ) : (
                    <ExpandMoreIcon sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {/* 展开提示文字 */}
            {canExpand && !isExpanded && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.65rem',
                  color: 'var(--text-secondary)',
                  ml: 0.5,
                  cursor: 'pointer',
                  '&:hover': { color: 'var(--primary-color)' }
                }}
                onClick={handleToggleExpand}
              >
                展开全部
              </Typography>
            )}

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

          {/* 右侧操作按钮组 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
          >
            {/* 编辑按钮 */}
            <Tooltip title="编辑节点">
              <IconButton
                className="nodrag"
                size="small"
                onClick={handleEditClick}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  color: 'var(--text-secondary)',
                  p: 0.5,
                  '&:hover': { color: 'var(--primary-color)' }
                }}
              >
                <EditIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {/* 复制按钮 */}
            <Tooltip title="复制节点">
              <IconButton
                className="nodrag"
                size="small"
                onClick={handleCopyClick}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  color: 'var(--text-secondary)',
                  p: 0.5,
                  '&:hover': { color: 'var(--success-color, #22c55e)' }
                }}
              >
                <ContentCopyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {/* 删除按钮 - 根节点不能删除 */}
            {!isRoot && (
              <Tooltip title="删除节点">
                <IconButton
                  className="nodrag"
                  size="small"
                  onClick={handleDeleteClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  sx={{
                    color: 'var(--text-secondary)',
                    p: 0.5,
                    '&:hover': { color: 'var(--error-color, #ef4444)' }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}

            {/* 创建分支按钮 */}
            <Tooltip title="从此节点创建分支">
              <IconButton
                className="nodrag"
                size="small"
                onClick={handleBranchClick}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  color: 'var(--text-secondary)',
                  p: 0.5,
                  '&:hover': { color: 'var(--primary-color)' }
                }}
              >
                <CallSplitIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'var(--card-background)',
            color: 'var(--text-color)'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--text-color)' }}>编辑节点</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="问题"
            fullWidth
            multiline
            rows={2}
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiInputBase-root': {
                bgcolor: 'var(--background-color)',
                color: 'var(--text-color)'
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)'
              }
            }}
          />
          <TextField
            margin="dense"
            label="回答"
            fullWidth
            multiline
            rows={4}
            value={editAnswer}
            onChange={(e) => setEditAnswer(e.target.value)}
            sx={{
              '& .MuiInputBase-root': {
                bgcolor: 'var(--background-color)',
                color: 'var(--text-color)'
              },
              '& .MuiInputLabel-root': {
                color: 'var(--text-secondary)'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditCancel} sx={{ color: 'var(--text-secondary)' }}>
            取消
          </Button>
          <Button onClick={handleEditSave} variant="contained" sx={{ bgcolor: 'var(--primary-color)' }}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 输出连接点 - 从右侧输出 */}
      {hasChildren && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ 
            background: 'var(--primary-color)',
            width: 8,
            height: 8,
            border: '2px solid var(--card-background)',
            right: -4
          }}
        />
      )}
    </>
  );
});

MindMapNode.displayName = 'MindMapNode';

export default MindMapNode;
