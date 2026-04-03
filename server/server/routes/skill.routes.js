/**
 * 技能路由
 * 处理AI技能系统
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取技能列表
  router.get('/', asyncHandler(async (req, res) => {
    const { q } = req.query;
    const skills = q 
      ? agent.skillManager.searchSkills(q) 
      : agent.skillManager.getSkills();
    res.success({ skills });
  }));

  // 添加自定义技能
  router.post('/', asyncHandler(async (req, res) => {
    const skill = req.body;
    const result = agent.skillManager.addSkill(skill);
    res.success({ result });
  }));

  // 删除技能
  router.delete('/:skillId', asyncHandler(async (req, res) => {
    const { skillId } = req.params;
    const result = agent.skillManager.deleteSkill(skillId);
    res.success({ result });
  }));

  return router;
};
