/**
 * AppContext - 全局应用上下文
 * 解耦 App.jsx 与子组件之间的 prop drilling，通过 Context 分发状态和方法
 */
import { createContext, useContext } from 'react';
import { useApp } from '../hooks';

// 创建 Context
const AppContext = createContext(null);

/**
 * AppProvider - 应用状态提供者
 * 内部聚合所有业务逻辑，通过 Context 向子组件分发
 */
export function AppProvider({ children }) {
  const appState = useApp();
  return (
    <AppContext.Provider value={appState}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * useAppContext - 获取应用上下文的 Hook
 * @returns {Object} - 包含所有应用状态和方法的对象
 * @throws {Error} - 如果在 Provider 外部使用则抛出错误
 */
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext 必须在 AppProvider 内部使用');
  }
  return context;
}

export default AppContext;
