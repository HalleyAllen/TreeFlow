/**
 * AntV X6 脑图节点组件 - React 自定义节点
 * 双区域布局：上半部分问题，下半部分回答
 * 功能：选中文字引用、展开/收起回答
 */
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Tooltip, Divider } from '@mui/material';
import { ExpandMore, ExpandLess, FormatQuote, ContentCopy, Edit, Delete, AccountTree } from '@mui/icons-material';

// 节点尺寸常量（与 X6MindMap 共享）
// 修改时需在 X6MindMap.jsx 中同步调整布局和间距配置
export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 220;
export const QUESTION_AREA_HEIGHT = 60; // 上半部分问题区域高度（收起时容纳2行文字）

/**
 * 自定义 Hook：管理节点展开/收起状态
 * 分别管理问题区和回答区的展开状态，两者互不干扰
 * @param {boolean} initialQuestionExpanded - 问题区初始展开状态
 * @param {boolean} initialAnswerExpanded - 回答区初始展开状态
 * @returns {Object} { questionExpanded, answerExpanded, toggleQuestion, toggleAnswer }
 */
function useNodeExpand(initialQuestionExpanded = false, initialAnswerExpanded = false) {
  const [questionExpanded, setQuestionExpanded] = useState(initialQuestionExpanded);
  const [answerExpanded, setAnswerExpanded] = useState(initialAnswerExpanded);

  const toggleQuestion = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setQuestionExpanded(prev => !prev);
  }, []);

  const toggleAnswer = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    setAnswerExpanded(prev => !prev);
  }, []);

  return { questionExpanded, answerExpanded, toggleQuestion, toggleAnswer };
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

// ==================== X6MindMapNode ====================
// 通过 @antv/x6-react-shape 注册为 X6 的 React 自定义节点
// X6MindMap.jsx 中通过 register() 注册 shape='mind-map-node'
// node 为 X6 节点实例，node.getData() 获取布局时传入的业务数据
// ========================================================
const X6MindMapNode = memo(({ node }) => {
  // 外层容器 ref，用于检测文本选区是否在节点内部
  const nodeRef = useRef(null);
  // 内容区域 ref，用于获取展开后的实际内容高度
  const contentRef = useRef(null);
  // 问题/回答文本 ref，用于测量是否需要展开按钮
  const questionTextRef = useRef(null);
  const answerTextRef = useRef(null);
  // 划词引用相关状态
  const [selectedText, setSelectedText] = useState('');
  const [showQuoteButton, setShowQuoteButton] = useState(false);
  const [quoteButtonPos, setQuoteButtonPos] = useState({ x: 0, y: 0 });
  // 问题区/回答区是否需要展开按钮（通过测量 DOM 溢出精确判断）
  const [needsExpandQuestion, setNeedsExpandQuestion] = useState(false);
  const [needsExpandAnswer, setNeedsExpandAnswer] = useState(false);

  // X6 setData() 不会自动触发 React 组件重渲染。
  // 监听 X6 节点的 change:data 事件，通过 setTick 强制 React 刷新。
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!node) return;
    const onDataChange = () => setTick(t => t + 1);
    node.on('change:data', onDataChange);
    return () => {
      node.off('change:data', onDataChange);
    };
  }, [node]);

  // 每次渲染重新从 X6 节点读取数据，确保 X6 setData 后的最新值能被 React 使用
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
    initialQuestionExpanded = false,
    initialAnswerExpanded = false,
    onQuoteText,
    onNodeSelect,
    onCopyNode,
    onEditNode,
    onDeleteNode,
    onDeleteBranch,
    onToggleExpand,
  } = data;

  // 获取节点 ID（从 data 或 node 对象）
  const actualNodeId = nodeId || node?.id || data?.id;

  // 使用自定义 Hook 分别管理问题区和回答区的展开状态
  const {
    questionExpanded,
    answerExpanded,
    toggleQuestion,
    toggleAnswer,
  } = useNodeExpand(initialQuestionExpanded, initialAnswerExpanded);

  // 任一区域展开即视为节点有展开行为（用于节点大小自适应、边框显示等）
  const isAnyExpanded = questionExpanded || answerExpanded;

  // 包装 toggleQuestion，添加持久化逻辑
  const wrappedToggleQuestion = useCallback((event) => {
    const newState = !questionExpanded;
    toggleQuestion(event);
    if (onToggleExpand && nodeId) {
      onToggleExpand(nodeId, newState, 'question');
    }
  }, [questionExpanded, toggleQuestion, onToggleExpand, nodeId]);

  // 包装 toggleAnswer，添加持久化逻辑
  const wrappedToggleAnswer = useCallback((event) => {
    const newState = !answerExpanded;
    toggleAnswer(event);
    if (onToggleExpand && nodeId) {
      onToggleExpand(nodeId, newState, 'answer');
    }
  }, [answerExpanded, toggleAnswer, onToggleExpand, nodeId]);

  // 根据展开状态动态计算并更新底部连接桩位置和节点大小
  useEffect(() => {
    if (!node || !contentRef.current) return;

    // 获取内容实际高度
    const contentHeight = contentRef.current.scrollHeight;
    // 底部连接桩应该在内容底部（收起时在 NODE_HEIGHT，任一展开时随内容自适应）
    const bottomY = isAnyExpanded ? Math.max(NODE_HEIGHT, contentHeight) : NODE_HEIGHT;

    // 更新底部连接桩位置（x 为节点宽度的一半）
    node.setPortProp('bottom', 'args', { x: NODE_WIDTH / 2, y: bottomY });

    // 动态调整 X6 节点大小，确保展开后内容可见
    if (isAnyExpanded && contentHeight > NODE_HEIGHT) {
      node.resize(NODE_WIDTH, contentHeight);
    } else {
      node.resize(NODE_WIDTH, NODE_HEIGHT);
    }

    // 任一区域展开时层级置顶，防止被其他节点遮挡
    if (node.setZIndex) {
      node.setZIndex(isAnyExpanded ? 100 : 2);
    }

    // 触发从该节点出发的边重新路由
    const outgoingEdges = node.getOutgoingEdges?.() || [];
    outgoingEdges.forEach(edge => {
      edge.setTarget(edge.getTarget());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionExpanded, answerExpanded]);  // 监听两个展开状态，不监听 node 避免父组件渲染触发

  const isRoot = depth === 0;
  const isQuote = branchType === 'quote';
  const isLoading = status === 'loading';
  const isError = status === 'error';
  // 铁打定律：children[0] 是主线，不算分支；真正的分支数 = childrenCount - 1（如果大于0）
  const branchCount = Math.max(0, childrenCount - 1);
  const hasChildren = childrenCount > 0;
  const hasBranches = branchCount > 0;
  const isEndNode = childrenCount === 0; // 末端节点（没有子节点）

  // 显示内容
  const displayQuestion = (isRoot && !question) ? '开始' : (question || '');
  const fullAnswer = isError ? (error || '请求失败') : (answer || '');
  // 收起时显示完整内容，通过 CSS 限制三行显示

  // 样式配置：优先级顺序为 选中 > 加载中 > 错误 > 引用分支 > 普通
  const getStyles = () => {
    if (selected) {
      // 蓝色选中状态：由外部 visualNodeId 驱动，末端节点被点击时显示
      return {
        border: '2px solid rgb(69, 124, 243)',
        boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 8px 24px rgba(59, 130, 246, 0.4)',
        questionBg: '#dbeafe',
        typeColor: '#2563eb',
      };
    }
    if (isLoading) {
      // AI 请求中（蓝色边框）
      return {
        border: '2px solid #60a5fa',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#f0f9ff',
        typeColor: '#2563eb',
      };
    }
    if (isError) {
      // AI 请求失败（红色边框）
      return {
        border: '2px solid #ef4444',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#fee2e2',
        typeColor: '#dc2626',
      };
    }
    if (isQuote) {
      // 引用分支（橙色边框）
      return {
        border: '2px solid #f59e0b',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        questionBg: '#fef3c7',
        typeColor: '#d97706',
      };
    }
    // 根节点 / 普通节点（灰色边框）
    return {
      border: '2px solid #d1d5db',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      questionBg: '#f9fafb',
      typeColor: '#6b7280',
    };
  };

  const styles = getStyles();

  // 划词引用：鼠标释放时检测是否有选中文本
  // 如果有，则计算引用按钮位置（考虑画布缩放比例），显示浮动按钮
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

  // 全局监听选区变化：选区在其他节点时隐藏本节点的引用按钮
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection.toString().trim();
      if (!text) {
        // 没有选中文本时隐藏引用按钮
        setShowQuoteButton(false);
        return;
      }
      // 有选中文本时，检查选区是否在本节点内
      if (nodeRef.current && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const isInsideThisNode = nodeRef.current.contains(range.commonAncestorContainer);
        if (!isInsideThisNode) {
          setShowQuoteButton(false);
        }
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

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

  // 点击引用按钮：将选中文本和节点ID发送给父组件
  // 父组件 useApp 会将引用信息加入 quotedTexts 列表，并取消末端节点蓝色选中效果
  const handleQuote = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    console.log('[引用调试] selectedText:', selectedText, 'onQuoteText:', !!onQuoteText, 'actualNodeId:', actualNodeId);
    if (selectedText && onQuoteText && actualNodeId) {
      onQuoteText({ nodeId: actualNodeId, text: selectedText });
      console.log('[引用调试] 已发送引用:', { nodeId: actualNodeId, text: selectedText.substring(0, 30) });
    } else {
      console.warn('[引用调试] 无法发送引用:', { selectedText: !!selectedText, hasCallback: !!onQuoteText, actualNodeId });
    }
    setShowQuoteButton(false);
    // 延迟清除选区，确保 onQuoteText 先执行完毕
    setTimeout(() => {
      window.getSelection()?.removeAllRanges();
    }, 100);
  }, [selectedText, onQuoteText, actualNodeId]);

  // 复制回答文字到剪贴板
  // 优先使用 navigator.clipboard API，失败时降级为 execCommand('copy')
  const handleCopy = useCallback((event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    // 复制回答文字内容
    const textToCopy = fullAnswer || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        console.log('[复制成功] 回答内容已复制到剪贴板');
      }).catch((err) => {
        console.error('[复制失败]', err);
        // 降级方案：使用传统方法复制
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      });
    }
  }, [fullAnswer]);

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

  // 精确判断问题区/回答区是否需要展开按钮：通过 DOM 测量是否溢出
  useEffect(() => {
    if (questionTextRef.current) {
      const el = questionTextRef.current;
      setNeedsExpandQuestion(el.scrollHeight > el.clientHeight + 1);
    }
    if (answerTextRef.current) {
      const el = answerTextRef.current;
      setNeedsExpandAnswer(el.scrollHeight > el.clientHeight + 1);
    }
  }, [displayQuestion, fullAnswer]);
  // 是否有操作权限（有真正分支且非根节点时显示删除支线）
  const canDeleteBranch = hasBranches && !isRoot;

  // 获取当前缩放比例
  const graph = node?.model?.graph || node?.getGraph?.();
  const scale = graph?.transform?.getScale?.() || { sx: 1, sy: 1 };
  const zoom = Math.max(scale.sx, 0.5);

  // 节点整体点击：通知外部切换活跃末端节点（蓝色效果跟随）
  // 注意：内部按钮（展开、复制、编辑、删除、引用）均已各自 stopPropagation，
  // 不会冒泡到这里触发节点点击。
  const handleNodeClick = useCallback(() => {
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
        height: isAnyExpanded ? 'auto' : 'auto',
        position: 'relative',
      }}
      onMouseUp={handleTextSelection}
      onClick={handleNodeClick}
    >
      {/* 引用按钮浮动层 */}
      {showQuoteButton && (
        <Box
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onMouseUp={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleQuote(e); }}
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
          height: isAnyExpanded ? 'auto' : NODE_HEIGHT,
          border: styles.border,
          borderRadius: 3,
          boxShadow: styles.boxShadow,
          // 任一区域展开时溢出可见，确保底部文字可选中；收起时隐藏溢出内容
          overflow: isAnyExpanded ? 'visible' : 'hidden',
          transition: 'all 0.2s ease',
          backgroundColor: selected ? '#eff6ff' : (isQuote ? '#fffbeb' : (isError ? '#fef2f2' : '#ffffff')),
        }}
      >
        {/* 上半部分：问题区域 */}
        <Box
          sx={{
            p: 1.2,
            pb: 0.8,
            height: questionExpanded ? 'auto' : QUESTION_AREA_HEIGHT,
            backgroundColor: styles.questionBg,
            borderBottom: isAnyExpanded ? '1px solid' : 'none',
            borderColor: isQuote ? '#fde68a' : (isRoot ? '#bfdbfe' : '#e5e7eb'),
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: questionExpanded ? 1 : 0,
            // 展开时隐藏溢出，防止背景色显示为直角超出圆角边框
            overflow: 'hidden',
            // 保持与 Paper 一致的上圆角
            borderRadius: '12px 12px 0 0',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
            <ExpandToggleButton
              isExpanded={questionExpanded}
              onToggle={wrappedToggleQuestion}
              visible={needsExpandQuestion}
            />
          </Box>
          {questionExpanded ? (
            // 问题展开时：用 span 让容器只包裹实际文字
            <Typography
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                width: 'fit-content',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1f2937',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
              }}
            >
              {displayQuestion}
            </Typography>
          ) : (
            // 问题收起时：用 -webkit-box 截断（最多2行）
            <Typography
              ref={questionTextRef}
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                alignSelf: 'flex-start',
                width: 'fit-content',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1f2937',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
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
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 0 }}>
            <ExpandToggleButton
              isExpanded={answerExpanded}
              onToggle={wrappedToggleAnswer}
              visible={needsExpandAnswer}
            />
          </Box>
          {answerExpanded ? (
            // 回答展开时：用 span 让容器只包裹实际文字
            <Typography
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                width: 'fit-content',
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
            // 回答收起时：用 -webkit-box 截断（最多3行）
            <Typography
              ref={answerTextRef}
              variant="body2"
              component="span"
              onMouseDown={(e) => e.stopPropagation()}
              sx={{
                width: 'fit-content',
                fontSize: '0.75rem',
                color: isError ? '#dc2626' : '#374151',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                cursor: 'text',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                display: '-webkit-box',
                WebkitLineClamp: 4,
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
              {/* 分支数量或状态 - 只在回答收起时显示 */}
              {(hasBranches || isLoading) && !answerExpanded && (
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
                      📌 {branchCount} 分支
                    </Typography>
                  )}
                </Box>
              )}
              {/* 占位元素，当没有分支标签时保持按钮靠右 */}
              {(!hasBranches && !isLoading) || answerExpanded ? <Box /> : null}

              {/* 操作按钮 */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="复制回答" placement="top">
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
