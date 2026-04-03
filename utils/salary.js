/**
 * 统一工价单位 fallback 逻辑
 * 数据库中 salaryUnit 由发布时写入（'元/时' 或 '元/件'）
 * 若缺失，根据 salaryType 推导
 */
function formatSalaryUnit(salaryUnit, salaryType) {
  if (salaryUnit) return salaryUnit
  return salaryType === 'piece' ? '元/件' : '元/时'
}

module.exports = { formatSalaryUnit }
