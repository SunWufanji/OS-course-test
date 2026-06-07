# ScenarioConfig.java — 实验配置方案（JPA 实体）

**包路径：** `com.processos.model.ScenarioConfig`
**注解：** `@Entity` → 映射 `scenario_config` 表

---

## 职责

存储**预设实验场景**，每个场景定义一组进程配置（名称、执行时间、优先级、到达时间），可以直接加载到算法实验室中运行。

---

## 字段映射

| 字段 | 数据库列 | 说明 |
|------|---------|------|
| `id` | `id` (PK) | 自增主键 |
| `scenarioName` | `scenario_name` | 场景名称（如"轻载场景"） |
| `description` | `description` (TEXT) | 场景描述 |
| `processCount` | `process_count` | 进程数 |
| `loadType` | `load_type` (ENUM) | 负载类型：`light`/`medium`/`heavy` |
| `configJson` | `config_json` (JSON) | **进程配置 JSON** |
| `isDefault` | `is_default` | 是否为默认场景 |
| `createdAt` | `created_at` | 创建时间 |
| `updatedAt` | `updated_at` | 更新时间（自动更新） |

---

## 内部枚举

```java
public enum LoadType {
    light, medium, heavy
}
```
`@Enumerated(EnumType.STRING)` 映射为数据库字符串。

---

## config_json 格式

```json
[
  {"name": "P1", "burst": 6, "priority": 3, "arrival": 0},
  {"name": "P2", "burst": 4, "priority": 1, "arrival": 1},
  {"name": "P3", "burst": 2, "priority": 4, "arrival": 2}
]
```

`JSON` 列类型存储任意长度的进程配置数组。

---

## 预设场景（来自 schema.sql）

| 场景名 | 进程数 | 特点 |
|--------|--------|------|
| 轻载场景 | 3 | 少量短作业，适合测试基本调度功能 |
| 中载场景 | 5 | 中等数量，标准测试 |
| 重载场景 | 8 | 大量作业，测试高负载表现 |
| CPU密集型 | 5 | 长作业为主（burst 6-15），测试 SJF 优势 |
| IO密集型 | 6 | 短作业为主（burst 1-3），测试 RR 优势 |

---

## 调用关系

```
ProcessController.getScenarios()
    → ScenarioConfigRepository.findAll()
    → 返回所有预设场景

ProcessController.loadScenario(id)
    → 找到场景
    → 解析 configJson
    → processService.createProcess() × N
    → 重置并加载
```

---

## 特殊逻辑

- **JSON 列**：`configJson` 使用 MySQL 的 JSON 类型（`columnDefinition = "JSON"`），支持原生 JSON 查询。但在 Java 侧作为 String 读写。
- **时间戳自动维护**：`@PrePersist` 设置 `createdAt` 和 `updatedAt`，`@PreUpdate` 自动更新 `updatedAt`。
- **isDefault 标记**：`schema.sql` 中轻载场景标记为默认，前端可以快速加载。
