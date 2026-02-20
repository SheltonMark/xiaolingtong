# 审计问题清单（2026-02-21）

## 1. 硬编码头像文字 — ✅ 全部修复
| 文件 | 字符 | 状态 |
|------|------|------|
| pages/mine/mine.wxml | 鑫/张 | ✅ |
| pages/chat/chat.wxml | 张/鑫 | ✅ |
| pages/checkin/checkin.wxml | 鑫 | ✅ |
| pages/exposure-detail/exposure-detail.wxml | 匿 | ✅ |
| pages/post-detail/post-detail.wxml | 鑫 | ✅ |
| pages/settlement/settlement.wxml | 鑫 | ✅ |
| pages/membership/membership.wxml | 鑫 | ✅ |

## 2. Toast 占位 — ✅ 全部修复
| 文件 | 内容 | 状态 |
|------|------|------|
| pages/mine/mine.js | "功能开发中" | ✅ 已移除 |

## 3. Unsplash URL 残留 — ✅ 全部清理
所有 .js 文件中的 unsplash URL 已清理为空字符串或空数组。

## 4. 其他修复
- ✅ 首页投诉按钮跳转举报页
- ✅ 首页微信按钮显示微信号+复制
- ✅ 曝光详情评论间距加大
- ✅ 曝光页评论/分享按钮对齐
- ✅ 结算页头像顶部对齐
- ✅ 曝光详情发送按钮宽度自适应
- ✅ 信息详情页去掉浏览量计数
- ✅ design HTML 新增举报页设计

## 状态：全部完成 ✅
