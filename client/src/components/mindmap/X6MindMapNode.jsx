/**
 * AntV X6 脑图节点组件 - React 自定义节点
 * 双区域布局：上半部分问题，下半部分回答
 * 功能：选中文字引用、展开/收起回答
 */
import { memo, useState, useCallback, useRef } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip } from '@mui/material';
import { ExpandMore, ExpandLess, FormatQuote } from '@mui/icons-material';

const X6MindMapNode = memo(({ node }) => {
  const nodeRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [quoteButtonPos, setQuoteButtonPos] = useState({ x: 0, y: 0 });

  // 获取节点数据
  const data = node?.getData?.() || node?.data || {};

  const {
    question,
    answer,
    answerSummary,
    depth = 0,
    branchType,
    status,
    error,
    childrenCount = 0,
    selected = false,
    onQuoteText,
    onNodeSelect,
    isExpanded = false, // 从节点数据中获取展开状态
    onToggleExpand, // 展开状态切换回调
  } = data;

  const isRoot = depth === 0;
  const isQuote = branchType === 'quote';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasChildren = childrenCount > 0;

  // 显示内容
  const displayQuestion = (isRoot && !question) ? '开始' : (question || '');
  const fullAnswer = isError ? (error || '请求失败') : (answer || '');
  const shortAnswer = answerSummary || (answer ? answer.substring(0, 100) + '...' : '');
  const displayAnswer = isExpanded ? fullAnswer : shortAnswer;

  // 样式配置
  const getStyles = () => {
    if (selected) {
      return {
        border: '2px solid #3b82f6',
        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
        questionBg: '#dbeafe',
        typeColor: '#2563eb',
      };
    }
    if (isLoading) {
      return {
        border: '2px solid #60a5fa',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#f0f9ff',
        typeColor: '#2563eb',
      };
    }
    if (isError) {
      return {
        border: '2px solid #ef4444',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#fee2e2',
        typeColor: '#dc2626',
      };
    }
    if (isQuote) {
      return {
        border: '2px solid #f59e0b',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#fef3c7',
        typeColor: '#d97706',
      };
    }
    if (isRoot) {
      return {
        border: '2px solid #3b82f6',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#dbeafe',
        typeColor: '#2563eb',
      };
    }
    return {
      border: '2px solid #d1d5db',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      questionBg: '#f9fafb',
      typeColor: '#6b7280',
    };
  };

  const styles = getStyles();
  const typeLabel = isRoot ? 'START' : (isQuote ? 'QUOTE' : 'QUESTION');
  const statusLabel = isLoading ? 'THINKING' : (isError ? 'ERROR' : 'ANSWER');
  const statusColor = isLoading ? '#2563eb' : (isError ? '#dc2626' : '#10b981');

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text && text.length > 0) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const nodeRect = nodeRef.current?.getBoundingClientRect();

      if (nodeRect) {
        setQuoteButtonPos({
          x: rect.left - nodeRect.left + rect.width / 2 - 20,
          y: rect.top - nodeRect.top - 35,
        });
        setShowQuoteButton(true);
      }
    } else {
      setShowQuoteButton(false);
    }
  }, []);

  // 处理引用
  const handleQuote = useCallback(() => {
    if (selectedText && onQuoteText) {
      onQuoteText(data.id, selectedText);
    }
    setShowQuoteButton(false);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onQuoteText, data.id]);

  // 切换展开/收起
  const toggleExpand = useCallback((event) => {
    event?.stopPropagation?.(); // 阻止事件冒泡，防止重复触发 node:click
    
    // 通知父组件更新展开状态
    if (onToggleExpand && data.id) {
      onToggleExpand(data.id);
    }
    
    // 同时触发节点选中
    if (onNodeSelect && data.id) {
      onNodeSelect(data);
    }
  }, [onToggleExpand, onNodeSelect, data.id, data]);

  // 是否需要展开按钮
  const needsExpand = fullAnswer.length > 100;

  return (
    <Box
      ref={nodeRef}
      sx={{
        width: 280,
        height: isExpanded ? 'auto' : 180,
        minHeight: 180,
        position: 'relative',
      }}
      onMouseUp={handleTextSelection}
    >
      {/* 引用按钮浮动层 */}
      {showQuoteButton && (
        <Box
          sx={{
            position: 'absolute',
            left: quoteButtonPos.x,
            top: quoteButtonPos.y,
            zIndex: 1000,
            backgroundColor: '#3b82f6',
            borderRadius: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px 4px',
          }}
        >
          <IconButton
            size="small"
            onClick={handleQuote}
            sx={{ color: 'white', padding: '2px' }}
          >
            <FormatQuote fontSize="small" />
          </IconButton>
          <Typography
            variant="caption"
            sx={{ color: 'white', fontSize: '0.7rem', ml: 0.5, cursor: 'pointer' }}
            onClick={handleQuote}
          >
            引用
          </Typography>
        </Box>
      )}

      <Paper
        className="nodrag"
        sx={{
          width: 280,
          height: isExpanded ? 'auto' : 180,
          minHeight: 180,
          border: styles.border,
          borderRadius: 3,
          boxShadow: styles.boxShadow,
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          backgroundColor: isQuote ? '#fffbeb' : (isError ? '#fef2f2' : '#ffffff'),
        }}
      >
        {/* 上半部分：问题区域 */}
        <Box
          sx={{
            p: 1.5,
            pb: 1,
            height: 60,
            backgroundColor: styles.questionBg,
            borderBottom: '1px solid',
            borderColor: isQuote ? '#fde68a' : (isRoot ? '#bfdbfe' : '#e5e7eb'),
            boxSizing: 'border-box',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.65rem',
              fontWeight: 700,
              color: styles.typeColor,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block',
              mb: 0.5,
            }}
          >
            {typeLabel}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#1f2937',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {displayQuestion}
          </Typography>
        </Box>

        {/* 下半部分：回答区域 */}
        <Box sx={{ p: 1.5, pt: 1, height: isExpanded ? 'auto' : 120, boxSizing: 'border-box' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: statusColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {statusLabel}
            </Typography>
            {needsExpand && (
              <Tooltip title={isExpanded ? '收起' : '展开'} placement="right">
                <IconButton
                  size="small"
                  onClick={toggleExpand}
                  sx={{ padding: '2px', color: '#6b7280' }}
                >
                  {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.75rem',
              color: isError ? '#dc2626' : '#374151',
              lineHeight: 1.4,
              overflow: isExpanded ? 'visible' : 'hidden',
              textOverflow: isExpanded ? 'clip' : 'ellipsis',
              display: isExpanded ? 'block' : '-webkit-box',
              WebkitLineClamp: isExpanded ? 'unset' : 2,
              WebkitBoxOrient: 'vertical',
              whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
              wordBreak: 'break-word',
            }}
          >
            {displayAnswer}
          </Typography>

          {/* 分支数量或状态 */}
          {(hasChildren || isLoading) && !isExpanded && (
            <Box
              sx={{
                mt: 1,
                pt: 0.75,
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {isLoading ? (
                <>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      border: '2px solid #2563eb',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                  <Typography variant="caption" sx={{ fontSize: '0.75rem', color: '#2563eb' }}>
                    AI 正在思考...
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    backgroundColor: '#f3f4f6',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                  }}
                >
                  📌 {childrenCount} 分支
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Paper>
    </Box>
  );
});

X6MindMapNode.displayName = 'X6MindMapNode';

export default X6MindMapNode;
