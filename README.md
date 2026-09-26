# Smart English Learning

面向中国小学高年级与初中学生的自适应英语学习系统 MVP。

## 当前阶段
Sprint 0 / Sprint 1：工程基线、身份与学生、教材/知识/内容数据底座。

## 核心学习链
Curriculum → DailyPlan → Learning → Attempt → Evidence → Mastery/Ability → Review → Scheduler → Next DailyPlan

## 工程原则
- 学习事实 append-only，不覆盖历史 Attempt。
- ContentVersion 可追溯。
- 技术失败不产生学生负 Evidence。
- Evidence 可失效，Mastery/Ability 可重算。
- DailyPlan 版本化，Replan 不修改 Done 事实。
- 策略参数版本化，不散落硬编码。

## Monorepo
- apps/api: 后端 API
- apps/student-miniapp: 学生端小程序（Sprint 后续）
- apps/research-admin: 教研后台（Sprint 后续）
- packages/contracts: API/领域契约
- db/migrations: 数据库迁移
- docs: 产品/工程基线

> MVP 先验证学习闭环，不追求全学段、全教材和功能数量。
