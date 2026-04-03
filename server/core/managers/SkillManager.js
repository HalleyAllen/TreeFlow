/**
 * SkillManager 类 - 管理AI技能系统
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class SkillManager {
  constructor(skillsPath) {
    this.skillsPath = skillsPath || path.join(__dirname, '../../data/skills.json');
    this.skills = [];
    this.loadSkills();
  }

  /**
   * 加载技能配置
   */
  loadSkills() {
    try {
      if (fs.existsSync(this.skillsPath)) {
        const data = fs.readFileSync(this.skillsPath, 'utf-8');
        this.skills = JSON.parse(data);
        logger.info('SkillManager', '技能加载成功', { count: this.skills.length });
      } else {
        this.skills = [];
        logger.warn('SkillManager', '技能配置文件不存在');
      }
    } catch (error) {
      logger.error('SkillManager', '加载技能失败:', { error: error.message });
      this.skills = [];
    }
  }

  /**
   * 保存技能配置
   */
  saveSkills() {
    try {
      const dir = path.dirname(this.skillsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.skillsPath, JSON.stringify(this.skills, null, 2), 'utf-8');
      logger.info('SkillManager', '技能配置已保存');
    } catch (error) {
      logger.error('SkillManager', '保存技能配置失败:', { error: error.message });
    }
  }

  /**
   * 获取所有技能
   * @returns {Array} - 技能列表（不含 systemPrompt）
   */
  getSkills() {
    return this.skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      icon: skill.icon,
      placeholder: skill.placeholder
    }));
  }

  /**
   * 获取单个技能
   * @param {string} skillId - 技能ID
   * @returns {Object|null} - 技能信息
   */
  getSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) {
      logger.warn('SkillManager', '技能不存在', { skillId });
      return null;
    }
    return skill;
  }

  /**
   * 执行技能：将用户输入和技能系统提示词组合
   * @param {string} skillId - 技能ID
   * @param {string} question - 用户原始输入
   * @returns {Object} - { systemPrompt, question, skillName }
   */
  executeSkill(skillId, question) {
    const skill = this.getSkill(skillId);
    if (!skill) {
      return { systemPrompt: null, question, skillName: null };
    }

    logger.info('SkillManager', '执行技能', { skillId, skillName: skill.name });
    return {
      systemPrompt: skill.systemPrompt,
      question: question,
      skillName: skill.name
    };
  }

  /**
   * 添加自定义技能
   * @param {Object} skill - 技能配置
   * @returns {string} - 结果信息
   */
  addSkill(skill) {
    if (!skill.id || !skill.name || !skill.systemPrompt) {
      return '技能必须包含 id、name 和 systemPrompt';
    }

    const existing = this.skills.find(s => s.id === skill.id);
    if (existing) {
      return `技能 "${skill.id}" 已存在`;
    }

    this.skills.push({
      id: skill.id,
      name: skill.name,
      description: skill.description || '',
      icon: skill.icon || '🔧',
      systemPrompt: skill.systemPrompt,
      placeholder: skill.placeholder || `[${skill.name}] 输入内容`
    });

    this.saveSkills();
    logger.info('SkillManager', '添加技能成功', { skillId: skill.id });
    return `技能 "${skill.name}" 已添加`;
  }

  /**
   * 删除技能
   * @param {string} skillId - 技能ID
   * @returns {string} - 结果信息
   */
  deleteSkill(skillId) {
    const index = this.skills.findIndex(s => s.id === skillId);
    if (index === -1) {
      return `技能 "${skillId}" 不存在`;
    }

    const skillName = this.skills[index].name;
    this.skills.splice(index, 1);
    this.saveSkills();
    logger.info('SkillManager', '删除技能', { skillId });
    return `技能 "${skillName}" 已删除`;
  }

  /**
   * 搜索技能
   * @param {string} query - 搜索关键词
   * @returns {Array} - 匹配的技能列表
   */
  searchSkills(query) {
    if (!query) return this.getSkills();
    const lower = query.toLowerCase();
    return this.skills
      .filter(s => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower))
      .map(s => ({ id: s.id, name: s.name, description: s.description, icon: s.icon, placeholder: s.placeholder }));
  }
}

module.exports = { SkillManager };
