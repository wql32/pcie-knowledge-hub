# TLP Processing - Transaction Layer Packet 处理

> **状态：** 🚧 学习中  
> **优先级：** P0  
> **相关 Spec：** PCIe Base Spec Chapter 2

---

## 📖 核心概念

### TLP 格式概览

```
┌─────────────────────────────────────────────────────┐
│                    TLP Header                       │
│  (3 or 4 DWs - depends on Type)                    │
├─────────────────────────────────────────────────────┤
│                  Data Payload (optional)            │
├─────────────────────────────────────────────────────┤
│                    ECRC (optional)                  │
└─────────────────────────────────────────────────────┘
```

### TLP 类型分类

| 类型 | 方向 | 描述 |
|------|------|------|
| MRd/MrLock | Request | 内存读 |
| MWr/MwLock | Request | 内存写 |
| IORead/IOWrite | Request | IO 空间访问 |
| CfgRd0/CfgRd1 | Request | 配置空间读 |
| CfgWr0/CfgWr1 | Request | 配置空间写 |
| Msg/MsgD | Request | 消息 |
| Cpl/CplD/CplL/CplDL | Completion | 完成包 |

---

## 🎯 Hub 设计要点

### 1. Header 解析

```verilog
// 关键字段
typedef struct packed {
    logic [6:0]  fmt;          // Format
    logic [5:0]  type;         // Type
    logic [9:0]  length;       // Length
    logic [6:0]  req_id;       // Requester ID
    logic [2:0]  attr;         // Attributes
    logic [7:0]  tag;          // Tag
    logic [15:0] addr;         // Address (部分 TLP)
    // ... 更多字段
} tlp_header_t;
```

**检查点：**
- [ ] Fmt 字段解码正确
- [ ] Type 字段识别所有支持的 TLP 类型
- [ ] Length 边界检查

### 2. 路由决策

| 路由类型 | 判断条件 | Hub 行为 |
|----------|----------|----------|
| Address Routing | 地址匹配 | 转发到匹配端口 |
| ID Routing | Bus/Dev/Fun 匹配 | 转发到目标端口 |
| Implicit Routing | 特定 TLP 类型 | 固定路由 |

### 3. Flow Control 集成

```
TLP 接收 → FC Credit 检查 → 通过？→ 路由 → 输出队列
                        ↓
                     阻塞/等待
```

---

## ⚠️ 常见陷阱

1. **Length 计算错误** - 特别是 4DW Header 的 TLP
2. **Routing 边界条件** - 地址对齐问题
3. **FC Credit 竞争** - 多端口同时请求

---

## 📝 待办事项

- [ ] 完成 TLP Header 所有字段解析
- [ ] 实现路由决策逻辑
- [ ] 与 Flow Control 模块联调

---

**参考：** PCIe Base Spec 6.0 Section 2.2.x
