# MemoryBlock.java — 内存块数据结构

**包路径：** `com.processos.hardware.MemoryBlock`

---

## 职责

表示一段**连续的内存空间**，是 `HardwarePool` 中内存管理的**基础数据结构**。所有内存块组成一个**有序链表**（`List<MemoryBlock>`），通过首次适应算法分配内存。

---

## 字段

```java
private int startAddress;    // 起始地址
private int size;            // 块大小 (MB)
private boolean allocated;   // 是否已分配
private int pid;             // 占用进程的 PID（0 = 空闲）
private String processName;  // 占用进程名称
```

---

## 核心方法

### `canFit(requiredSize)`
检查块是否可以容纳请求：`!allocated && size >= requiredSize`

### `split(requiredSize)`
**分割内存块**——首次适应算法的关键操作：

```
分配前：  |────── 16 GB 空闲 ──────|
分配 4GB：|─ 4GB (已分配) ─|── 12GB 空闲 ─|
                    ↑ split() 创建的剩余块
```

逻辑：
1. 如果 `requiredSize >= this.size`，不需要分割，返回 null
2. 创建剩余块：`startAddress = this.startAddress + requiredSize`, `size = this.size - requiredSize`
3. 当前块缩小为 `requiredSize`
4. 返回剩余块（由 `HardwarePool.allocateMemory()` 插回链表）

调用方负责将剩余块插入链表的 `i+1` 位置，保持地址顺序。

### `allocate(pid, processName)`
标记块为已分配，记录占用进程信息。

### `free()`
标记块为空闲，清空进程信息。

---

## 数据流

```
HardwarePool 初始化
    │
    └── memoryBlocks = [MemoryBlock(0, 16384)]  ← 一块完整空闲空间
                 │
    allocateMemory(4096, pid=1, "我的世界")
        │ MemoryBlock(0, 4096) → allocated, pid=1
        │ MemoryBlock(4096, 12288) → 空闲 ← split() 创建的剩余块
        │
    allocateMemory(512, pid=2, "Chrome")
        │ MemoryBlock(0, 4096) → 已分配
        │ MemoryBlock(4096, 512) → allocated, pid=2
        │ MemoryBlock(4608, 11776) → 空闲
        │
    freeMemory(pid=1)  → 释放了我的世界
        │ mergeFreeBlocks() 合并相邻空闲块
        │ MemoryBlock(0, 4096) → 空闲
        │ MemoryBlock(4608, 11776) → 空闲
        │ → 合并为 MemoryBlock(0, 4096) + MemoryBlock(4096, 512) 不能合并
        │    (因为中间的 512 块还被 Chrome 占用)
```

---

## 调用关系

```
HardwarePool
    │
    └── List<MemoryBlock> memoryBlocks
            │
            ├── .canFit()     — 是否可容纳
            ├── .split()      — 分割（首次适应）
            ├── .allocate()   — 标记分配
            ├── .free()       — 标记释放
            └── mergeFreeBlocks() — 合并相邻空闲（在 HardwarePool 中）
```

---

## 特殊逻辑

- **地址连续性靠链表顺序保证**：`memoryBlocks` 始终按 `startAddress` 排序。`split()` 返回的剩余块插入当前位置之后，`free()` 不改变位置，`mergeFreeBlocks()` 只合并相邻的空闲块。
- **分割发生在合适的块上**：如果块大小刚好等于请求大小，不分割直接分配。
- **toString() 调试用**：格式 `MemoryBlock{addr=0, size=16384MB, allocated=false, pid=0}`。
