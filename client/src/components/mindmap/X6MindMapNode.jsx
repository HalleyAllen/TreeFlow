/**
 * AntV X6 脑图节点组件 - React 自定义节点
 * 双区域布局：上半部分问题，下半部分回答
 * 功能：选中文字引用、展开/收起回答
 */
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Divider } from '@mui/material';
import { ExpandMore, ExpandLess, FormatQuote, ContentCopy, Edit, Delete, AccountTree } from '@mui/icons-material';

// 节点尺寸常量（与 X6MindMap 共享）
export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 220;
export const QUESTION_AREA_HEIGHT = 60; // 上半部分问题区域高度

/**
 * 自定义 Hook：管理节点展开/收起状态
 * 抽象化展开功能，使每个节点独立管理自己的展开状态
 * @param {boolean} initialExpanded - 初始展开状态
 * @returns {Object} { isExpanded, toggleExpand }
 */
function useNodeExpand(initialExpanded = false) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const toggleExpand = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setIsExpanded(prev => !prev);
  }, []);

  return { isExpanded, toggleExpand };
}

/**
 * 展开/收起按钮组件
 * 独立的 UI 组件，可复用
 */
const ExpandToggleButton = memo(({ isExpanded, onToggle, visible }) => {
  if (!visible) return null;

  return (
    <Tooltip title={isExpanded ? '收起' : '展开'} placement="right">
      <IconButton
        type="button"
        size="small"
        onClick={onToggle}
        className="expand-toggle-btn"
        data-expand-toggle="true"
        sx={{ padding: '2px', color: '#6b7280', marginTop: '-4px', marginRight: '-4px' }}
      >
        {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
});

ExpandToggleButton.displayName = 'ExpandToggleButton';

const X6MindMapNode = memo(({ node }) => {
  const nodeRef = useRef(null);
  const contentRef = useRef(null);
  const [selectedText, setSelectedText] = useState('');
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [quoteButtonPos, setQuoteButtonPos] = useState({ x: 0, y: 0 });

  // 获取节点数据
  const data = node?.getData?.() || node?.data || {};

  const {
    id: nodeId,
    question,
    answer,
    depth = 0,
    branchType,
    status,
    error,
    childrenCount = 0,
    selected = false,
    initialExpanded = false,
    onQuoteText,
    onNodeSelect,
    onCopyNode,
    onEditNode,
    onDeleteNode,
    onDeleteBranch,
    onToggleExpand,
  } = data;

  // 使用自定义 Hook 管理展开状态（接收持久化的初始状态）
  const { isExpanded, toggleExpand: originalToggleExpand } = useNodeExpand(initialExpanded);

  // 包装 toggleExpand，添加持久化逻辑
  const toggleExpand = useCallback((event) => {
    const newState = !isExpanded;
    originalToggleExpand(event);
    // 持久化到 localStorage
    if (onToggleExpand && nodeId) {
      onToggleExpand(nodeId, newState);
    }
  }, [isExpanded, originalToggleExpand, onToggleExpand, nodeId]);

  // 根据展开状态动态计算并更新底部连接桩位置和节点大小
  useEffect(() => {
    if (!node || !contentRef.current) return;

    // 获取内容实际高度
    const contentHeight = contentRef.current.scrollHeight;
    // 底部连接桩应该在内容底部（收起时在 NODE_HEIGHT + 14，展开时随内容自适应）
    const bottomY = isExpanded ? Math.max(NODE_HEIGHT, contentHeight) : NODE_HEIGHT + 14;

    console.log('[Port Update]', { isExpanded, contentHeight, bottomY });

    // 更新底部连接桩位置（x 为节点宽度的一半）
    node.setPortProp('bottom', 'args', { x: NODE_WIDTH / 2, y: bottomY });

    // 动态调整 X6 节点大小，确保展开后内容可见
    if (isExpanded && contentHeight > NODE_HEIGHT) {
      node.resize(NODE_WIDTH, contentHeight);
    } else {
      node.resize(NODE_WIDTH, NODE_HEIGHT);
    }

    // 触发从该节点出发的边重新路由
    const outgoingEdges = node.getOutgoingEdges?.() || [];
    outgoingEdges.forEach(edge => {
      edge.setTarget(edge.getTarget());
    });
  }, [isExpanded, node]);

  const isRoot = depth === 0;
  const isQuote = branchType === 'quote';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const hasChildren = childrenCount > 0;

  // 显示内容
  const displayQuestion = (isRoot && !question) ? '开始' : (question || '');
  const fullAnswer = isError ? (error || '请求失败') : (answer || '');
  // 收起时显示完整内容，通过 CSS 限制三行显示

  // 样式配置
  const getStyles = () => {
    if (selected) {
      return {
        border: '3px solid #2563eb',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 8px 24px rgba(59, 130, 246, 0.4)',
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
    // 根节点使用普通节点样式
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
        // 获取画布缩放比例
        const graphInstance = node?.model?.graph || node?.getGraph?.();
        const scale = graphInstance?.transform?.getScale?.() || { sx: 1, sy: 1 };
        const zoom = Math.max(scale.sx, 0.5); // 最小缩放限制，避免按钮太大

        // 按钮宽度约 46px，根据缩放比例调整偏移
        const buttonWidth = 46 / zoom;
        const buttonHeight = 20 / zoom;

        setQuoteButtonPos({
          x: (rect.left - nodeRect.left + rect.width / 2) / zoom - buttonWidth / 2,
          y: (rect.top - nodeRect.top) / zoom - buttonHeight - 8 / zoom,
        });
        setShowQuoteButton(true);
      }
    } else {
      setShowQuoteButton(false);
    }
  }, [node]);

  // 处理引用
  const handleQuote = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (selectedText && onQuoteText) {
      onQuoteText(data.id, selectedText);
    }
    setShowQuoteButton(false);
    window.getSelection()?.removeAllRanges();
  }, [selectedText, onQuoteText, data.id]);

  // 处理复制节点
  const handleCopy = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (onCopyNode && data.id) {
      onCopyNode(data.id);
    }
  }, [onCopyNode, data.id]);

  // 处理编辑节点
  const handleEdit = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (onEditNode && data.id) {
      onEditNode(data);
    }
  }, [onEditNode, data.id, data]);

  // 处理删除单个节点
  const handleDelete = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (onDeleteNode && data.id) {
      onDeleteNode(data.id);
    }
  }, [onDeleteNode, data.id]);

  // 处理删除支线（节点及其所有子节点）
  const handleDeleteBranch = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (onDeleteBranch && data.id) {
      onDeleteBranch(data.id);
    }
  }, [onDeleteBranch, data.id]);

  // 点击外部区域隐藏引用按钮
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showQuoteButton && nodeRef.current) {
        // 检查点击是否在引用按钮内
        const isInsideNode = nodeRef.current.contains(event.target);
        if (!isInsideNode) {
          setShowQuoteButton(false);
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showQuoteButton]);

  // 是否需要展开按钮（回答内容较长时）
  const needsExpand = fullAnswer.length > 50;
  // 是否有操作权限（非根节点或有子节点时显示删除支线）
  const canDeleteBranch = hasChildren && !isRoot;

  // 获取当前缩放比例
  const graph = node?.model?.graph || node?.getGraph?.();
  const scale = graph?.transform?.getScale?.() || { sx: 1, sy: 1 };
  const zoom = Math.max(scale.sx, 0.5);

  // 处理节点点击选中（排除按钮等交互元素）
  const handleNodeClick = useCallback((event) => {
    // 检查点击的是否是按钮或交互元素，如果是则不触发选中
    const target = event?.target;
    if (target) {
      const isInteractiveElement =
        target.closest('button') ||
        target.closest('[role="button"]') ||
        target.closest('.MuiIconButton-root') ||
        target.closest('.MuiButtonBase-root') ||
        target.closest('svg') ||
        target.closest('.expand-toggle-btn') ||
        target.closest('[data-expand-toggle="true"]');

      if (isInteractiveElement) return;
    }

    // 调用选中回调
    if (onNodeSelect && nodeId) {
      onNodeSelect(data);
    }
  }, [nodeId, data, onNodeSelect]);

  return (
    <Box
      ref={nodeRef}
      sx={{
        width: NODE_WIDTH,
        minHeight: NODE_HEIGHT,
        // 展开时高度自适应，确保内容完全可见
        height: isExpanded ? 'auto' : 'auto',
        position: 'relative',
      }}
      onMouseUp={handleTextSelection}
      onClick={handleNodeClick}
    >
      {/* 引用按钮浮动层 */}
      {showQuoteButton && (
        <Box
          onMouseDown={(e) => e.stopPropagation()}
          sx={{
            position: 'absolute',
            left: quoteButtonPos.x,
            top: quoteButtonPos.y,
            zIndex: 1000,
            backgroundColor: '#3b82f6',
            borderRadius: `calc(4px / ${zoom})`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: `calc(1px / ${zoom}) calc(6px / ${zoom})`,
            height: `calc(20px / ${zoom})`,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#2563eb',
            },
          }}
          onClick={handleQuote}
        >
          <FormatQuote sx={{ color: 'white', fontSize: `calc(12px / ${zoom})`, mr: 0.3 / zoom }} />
          <Typography
            variant="caption"
            sx={{ color: 'white', fontSize: `calc(11px / ${zoom})`, lineHeight: 1 }}
          >
            引用
          </Typography>
        </Box>
      )}

      <Paper
        ref={contentRef}
        sx={{
          width: NODE_WIDTH,
          minHeight: NODE_HEIGHT,
          height: isExpanded ? 'auto' : NODE_HEIGHT,
          border: styles.border,
          borderRadius: 3,
          boxShadow: styles.boxShadow,
          // 展开时溢出可见，确保底部文字可选中；收起时隐藏溢出内容
          overflow: isExpanded ? 'visible' : 'hidden',
          transition: 'all 0.2s ease',
          backgroundColor: isQuote ? '#fffbeb' : (isError ? '#fef2f2' : '#ffffff'),
        }}
      >
        {/* 上半部分：问题区域 */}
        <Box
          sx={{
            p: 1.5,
            pb: 1,
            height: QUESTION_AREA_HEIGHT,
            backgroundColor: styles.questionBg,
            borderBottom: isExpanded ? '1px solid' : 'none',
            borderColor: isQuote ? '#fde68a' : (isRoot ? '#bfdbfe' : '#e5e7eb'),
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography
              variant="caption"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: styles.typeColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {typeLabel}
            </Typography>
            <ExpandToggleButton 
              isExpanded={isExpanded} 
              onToggle={toggleExpand} 
              visible={needsExpand} 
            />
          </Box>
          {isExpanded ? (
            // 展开时：用 span 让容器只包裹实际文字
            <Typography
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1f2937',
                lineHeight: 1.4,
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {displayQuestion}
            </Typography>
          ) : (
            // 收起时：用 -webkit-box 截断
            <Typography
              variant="body2"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1f2937',
                lineHeight: 1.4,
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayQuestion}
            </Typography>
          )}
        </Box>

        {/* 下半部分：回答区域 */}
        <Box
          sx={{
            p: 1.5,
            pt: 1,
            boxSizing: 'border-box',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography
              variant="caption"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: statusColor,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {statusLabel}
            </Typography>
          </Box>
          {isExpanded ? (
            // 展开时：用 span 让容器只包裹实际文字
            <Typography
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.75rem',
                color: isError ? '#dc2626' : '#374151',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {fullAnswer}
            </Typography>
          ) : (
            // 收起时：用 -webkit-box 截断
            <Typography
              variant="body2"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                fontSize: '0.75rem',
                color: isError ? '#dc2626' : '#374151',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {fullAnswer}
            </Typography>
          )}

          {/* 分支状态/操作按钮栏 */}
          <>
            <Divider sx={{ my: 1, borderColor: '#e5e7eb' }} />
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mt: 1,
              }}
            >
              {/* 分支数量或状态 - 只在收起时显示 */}
              {(hasChildren || isLoading) && !isExpanded && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
              {/* 占位元素，当没有分支标签时保持按钮靠右 */}
              {(!hasChildren && !isLoading) || isExpanded ? <Box /> : null}

              {/* 操作按钮 */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="复制节点" placement="top">
                  <IconButton
                    type="button"
                    size="small"
                    onClick={handleCopy}
                    sx={{
                      padding: '4px',
                      color: '#6b7280',
                      '&:hover': { color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                    }}
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="编辑" placement="top">
                  <IconButton
                    type="button"
                    size="small"
                    onClick={handleEdit}
                    sx={{
                      padding: '4px',
                      color: '#6b7280',
                      '&:hover': { color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                    }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="删除节点" placement="top">
                  <IconButton
                    type="button"
                    size="small"
                    onClick={handleDelete}
                    sx={{
                      padding: '4px',
                      color: '#6b7280',
                      '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canDeleteBranch && (
                  <Tooltip title="删除支线" placement="top">
                    <IconButton
                      type="button"
                      size="small"
                      onClick={handleDeleteBranch}
                      sx={{
                        padding: '4px',
                        color: '#6b7280',
                        '&:hover': { color: '#dc2626', backgroundColor: 'rgba(220, 38, 38, 0.1)' },
                      }}
                    >
                      <AccountTree fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          </>
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
