import { Box } from '@mui/material'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import ChatContainer from './components/chat/ChatContainer'
import TokenManager from './components/settings/TokenManager'
import { useApp } from './hooks'

function App() {
  const {
    // UI 状态
    showAIServiceModal,
    setShowAIServiceModal,
    showCreateTopicModal,
    setShowCreateTopicModal,
    topicNameInput,
    setTopicNameInput,
    showModelDropdown,
    setShowModelDropdown,

    // Ollama 相关
    ollamaEnabled,
    handleOllamaEnabledChange,

    // 话题相关
    topics,
    currentTopic,
    handleCreateTopic,
    handleSwitchTopic,

    // 聊天相关
    messages,
    chatLoading,
    branchMode,
    nodeCreated,
    input,
    quotedTexts,
    handleInputChange,
    handleKeyPress,
    handleSend,
    handleEnterBranchMode,
    exitBranchMode,
    handleQuoteText,
    removeQuote,

    // 模型相关
    models,
    selectedModel,
    handleSelectModel,

    // Token 相关
    tokens,
    handleTokensUpdated,

    // 技能相关
    skills,
    activeSkill,
    selectSkill,
    clearSkill,

    // 主题相关
    theme,
    toggleTheme
  } = useApp();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        onTokenManagerClick={() => setShowAIServiceModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
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
          models={models}
          selectedModel={selectedModel}
          showModelDropdown={showModelDropdown}
          branchMode={branchMode}
          isLoading={chatLoading}
          nodeCreated={nodeCreated}
          skills={skills}
          activeSkill={activeSkill}
          quotedTexts={quotedTexts}
          onInputChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onSend={handleSend}
          onToggleModelDropdown={() => setShowModelDropdown(!showModelDropdown)}
          onSelectModel={handleSelectModel}
          onEnterBranchMode={handleEnterBranchMode}
          onExitBranchMode={exitBranchMode}
          onSelectSkill={selectSkill}
          onClearSkill={clearSkill}
          onQuoteText={handleQuoteText}
          onRemoveQuote={removeQuote}
        />
      </Box>

      {/* AI服务管理模态框 */}
      <TokenManager
        open={showAIServiceModal}
        onClose={() => setShowAIServiceModal(false)}
        tokenStats={tokens}
        onTokensUpdated={handleTokensUpdated}
        ollamaEnabled={ollamaEnabled}
        onOllamaEnabledChange={handleOllamaEnabledChange}
      />
    </Box>
  )
}

export default App
