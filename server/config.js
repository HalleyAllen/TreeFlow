// 配置文件
module.exports = {
  // 后端配置
  backend: {
    port: 3003 // 后端服务器端口
  },
  // 前端配置
  frontend: {
    port: 3000, // 前端开发服务器端口
    proxy: {
      target: 'http://localhost:3003' // 后端服务器地址
    }
  }
};
