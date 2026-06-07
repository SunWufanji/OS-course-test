# ScenarioConfigRepository.java — 实验配置方案仓库

**包路径：** `com.processos.repository.ScenarioConfigRepository`
**注解：** `@Repository`
**继承：** `JpaRepository<ScenarioConfig, Long>`

---

## 职责

提供 `ScenarioConfig`（`scenario_config` 表）的数据库操作。用于读取预设实验场景（轻载、中载、重载等）。

---

## 自定义查询方法

| 方法 | 生成的 SQL |
|------|-----------|
| `findByIsDefaultTrue()` | `WHERE is_default = TRUE` |
| `findByLoadType(LoadType)` | `WHERE load_type = ?`（如 light/medium/heavy） |
| `findByScenarioName(name)` | `WHERE scenario_name = ?`，返回 `Optional` |

---

## 调用关系

```
ProcessController.getScenarios()
    → ScenarioConfigRepository.findAll()
    → 返回所有预设场景

ProcessController.loadScenario(id)
    → ScenarioConfigRepository.findById(id)
    → 解析 configJson → 创建进程

LabController 初始化时
    → ScenarioConfigRepository.findByIsDefaultTrue()
    → 加载默认场景（轻载）
```

---

## 特殊逻辑

- **findByScenarioName 返回 Optional**：避免空指针，调用方用 `orElseThrow()` 或 `orElse(null)` 处理找不到的情况。
- **isDefault 多场景可能**：`findByIsDefaultTrue()` 返回 `List`（而不是单个），允许有多个默认场景，但 `schema.sql` 中只标记了一个。
