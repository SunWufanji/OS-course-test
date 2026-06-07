# MemoryManager.java — 物理内存管理器

**包路径：** `com.processos.hardware.MemoryManager`
**注解：** `@Component`（Spring 单例组件）

---

## 职责

一个**独立的内存管理器**，与 `HardwarePool` 并列存在。它管理 **16MB 连续物理内存**（注意单位是 KB，与 HardwarePool 的 MB 不同），使用**首次适应算法 + 空闲分区链**。

**⚠ 注意：** 这个类目前**没有被沙盒模式使用**（沙盒模式的内存管理走 `HardwarePool`）。它更像一个独立的内存管理实现，供扩展或参考使用。

---

## 数据模型

```java
private static final int TOTAL_MEMORY = 16384;  // 16 MB (KB)
private static final int OS_RESERVED = 1024;     // 系统内核预留 1 MB
private final List<int[]> freeList;              // 空闲分区链 [startAddr, size]
```

- `freeList` 中的每个 `int[2]` 表示一块连续空闲空间：`{起始地址, 大小}`
- 按起始地址排序

---

## 核心方法

### `allocate(size)` → 起始地址（-1 失败）

**首次适应算法：**

1. 遍历 `freeList`
2. 找到第一个 `block[1] >= size` 的空闲块
3. 如果恰好相等 → 整块移除
4. 如果大于 → 块缩小（`block[0] += size`, `block[1] -= size`），返回原起始地址
5. 没找到返回 -1

### `free(startAddr, size)`

1. 将释放块加入 `freeList`
2. 按起始地址排序
3. 调用 `merge()` 合并相邻空闲块

### `merge()`

合并相邻空闲分区：
- 排序后遍历
- 如果上一个块的 `start + size == 当前块的 start` → 合并（`last[1] += block[1]`）
- 否则追加为新块

### `getUsedMemory()` / `getFreeMemory()`

通过统计 `freeList` 中所有空闲块的总大小，反推已用内存。

### `getFreeListSnapshot()`

返回空闲分区链快照（`List<Map>`），供前端可视化显示。

### `reset()`

清空并重建：`freeList = [ {1024, 15360} ]`（1MB 预留 + 15MB 空闲）

---

## 与 HardwarePool 的对比

| 特性 | HardwarePool | MemoryManager |
|------|------------|--------------|
| 总大小 | 16 GB (MB) | 16 MB (KB) |
| 数据结构 | `List<MemoryBlock>` 对象链表 | `List<int[]>` 简单数组 |
| 使用场景 | 沙盒模式实际使用 | 独立实现，当前未使用 |
| 预留 | 1 GB 系统预留 | 1 MB 系统预留 |
| 分割方式 | split() 返回新对象，插入链表 | 直接修改 block 的 start/size |
| 合并方式 | mergeFreeBlocks() 遍历合入 | merge() 先排序再合入 |

---

## 特殊逻辑

- **两个独立的内存管理**：`HardwarePool` 和 `MemoryManager` 是**各自独立的实现**，目前只有 `HardwarePool` 被 `ProcessManager` 实际使用。
- **排序 + 合并**：`free()` 先排序再合并，确保合并正确性（相邻块释放后按地址顺序排在一起才能合并）。
- **类型兼容**：`Map.of("start", block[0], "size", block[1])` 返回不可变 Map，适合快照查询。
