# PCIe QoS（Quality of Service）详解

**来源：** [PCIe 扫盲——Quality of Service 简介](https://blog.chinaaet.com/justlxy/p/5100053466)  
**整理时间：** 2026-03-17  
**相关 Spec：** PCIe Base Spec 6.0/7.0 - Chapter 2 (Transaction Layer)

---

## 📊 目录

1. [QoS 的目的和应用场景](#1-qos-的目的和应用场景)
2. [QoS 实现机制：VC + TC](#2-qos-实现机制 vc--tc)
3. [TC/VC Mapping 机制](#3-tcvc-mapping-机制)
4. [VC 数量协商](#4-vc-数量协商)
5. [硬件实现架构](#5-硬件实现架构)
6. [与 PCIe 7.0 项目的关联](#6-与-pcie-70-项目的关联)

---

## 1️⃣ QoS 的目的和应用场景

### 核心目的

**保证特定类型的数据得到优先传输**

### 典型应用场景

| 应用类型 | 延迟要求 | 实时性要求 | 是否可打断 |
|---------|---------|-----------|-----------|
| **视频流** | 高 | 高（等时性） | ❌ 不可以 |
| **音频流** | 高 | 高（等时性） | ❌ 不可以 |
| **普通数据** | 低 | 低 | ✅ 可以 |
| **控制命令** | 中 | 中 | ⚠️ 部分可以 |

**QoS 解决的问题：**
- 避免高优先级流量被低优先级流量阻塞
- 保证等时性（Isochronous）数据的实时传输
- 提高系统整体性能和用户体验

---

## 2️⃣ QoS 实现机制：VC + TC

### 双层次架构

```
┌─────────────────────────────────────────────────────────┐
│                    QoS 架构                              │
├─────────────────────────────────────────────────────────┤
│  应用层                                                  │
│  视频/音频/数据 → 分配 TC 优先级                         │
├─────────────────────────────────────────────────────────┤
│  TLP 层                                                  │
│  TLP Header[6:4] = TC[2:0]                              │
├─────────────────────────────────────────────────────────┤
│  链路层                                                  │
│  TC/VC Mapping → 映射到不同 VC                          │
├─────────────────────────────────────────────────────────┤
│  物理层                                                  │
│  多 VC 独立 Buffer → 硬件仲裁                            │
└─────────────────────────────────────────────────────────┘
```

### VC（Virtual Channel）

**定义：** 虚拟通道，每个 VC 有独立的 Buffer 和资源

**关键特性：**
- 每个 VC 的 Buffer 完全独立
- 某一 VC 满了不影响其他 VC
- 最多支持 **8 个 VC**（VC0-VC7）

### TC（Traffic Class）

**定义：** 流量类别，定义在 TLP Header 中

**位置：** TLP Header Byte 1, Bit[6:4]

```
┌─────────────────────────────────────────────────────────┐
│                    TLP Header                           │
├──────────────┬──────────────┬──────────────┬───────────┤
│  Format      │  TC[2:0]     │  Length      │   ...     │
│  & Type      │  (Bit 6:4)   │  (10 bits)   │           │
│  (8 bits)    │              │              │           │
└──────────────┴──────────────┴──────────────┴───────────┘
                      ↑
                      │
                Traffic Class
                0-7 (3 bits)
```

**TC 优先级：**
- **范围：** 0-7（3-bit）
- **规则：** 值越大，优先级越高
- **默认：** TC0（优先级最低）

---

## 3️⃣ TC/VC Mapping 机制

### 映射关系

**软件配置：** PCIe 驱动程序通过修改 **VC Resource Control Register** 实现 TC/VC Mapping

**示例：**
```
TC0 ──┐
      ├──► VC0  (低优先级流量)
TC1 ──┘

TC2 ──┐
TC3 ──┼──► VC3  (高优先级流量)
TC4 ──┘
```

### Mapping 规则

| 规则 | 说明 | 示例 |
|------|------|------|
| **针对 Link 两端** | Mapping 是针对端口（Ports）的 | Port A → Port B |
| **TC0 强制 VC0** | TC0 只能 Map 到 VC0 | TC0 → VC0 ✅ |
| **其他 TC 灵活** | 其他 TC 可 Map 到任意 VC | TC3 → VC3 ✅ |
| **一对一映射** | 一个 TC 最多 Map 到一个 VC | TC3 → VC3/VC4 ❌ |
| **可 unused** | 可以有 TC 或 VC 不被使用 | VC7 unused ✅ |

### 配置寄存器

**VC Resource Control Register:**

```
┌─────────────────────────────────────────────────────────┐
│           VC Resource Control Register                   │
├──────────────┬──────────────┬──────────────────────────┤
│  TC/VC Map   │     Rsvd     │       VC ID              │
│  (8 bits)    │   (16 bits)  │     (4 bits)             │
│              │              │                          │
│ Bit 7:0      │ Bit 20:8     │ Bit 23:20                │
└──────────────┴──────────────┴──────────────────────────┘
     │                                │
     │                                └─ 选择 VC 编号
     │
     └─ TC/VC 映射位图
        - Bit 0 = 1: TC0 → 当前 VC
        - Bit 1 = 1: TC1 → 当前 VC
        - ...
        - Bit 7 = 1: TC7 → 当前 VC
```

**配置示例：**
```verilog
// 配置 VC0: 接收 TC0, TC1
VC_Resource_Control[VC_ID=0].TC_VC_Map = 8'b0000_0011;  // TC0 + TC1

// 配置 VC3: 接收 TC2, TC3, TC4
VC_Resource_Control[VC_ID=3].TC_VC_Map = 8'b0001_1100;  // TC2 + TC3 + TC4
```

---

## 4️⃣ VC 数量协商

### 不对称 VC 支持

**场景：** Link 两端端口支持的 VC 数量不一致

```
┌─────────────┐                    ┌─────────────┐
│  Endpoint   │                    │  Root Port  │
│  支持 VC0-3 │                    │  支持 VC0-7 │
│  (4 个 VC)   │                    │  (8 个 VC)   │
└─────────────┘                    └─────────────┘
         │                              │
         └─────────── Link ─────────────┘
                    │
                    ▼
         实际可用：4 个 VC (VC0-3)
         遵循少的一方
```

**规则：** Link 只能使用**两端都支持**的 VC

### VC 数量查询

**Extended VC Count 寄存器:**

```
┌─────────────────────────────────────────────────────────┐
│              Extended VC Count Register                  │
├──────────────┬──────────────┬──────────────────────────┤
│    Rsvd      │  VC Count    │       Capability ID      │
│  (12 bits)   │  (4 bits)    │       (16 bits)          │
│              │              │                          │
│ Bit 19:16    │ Bit 15:12    │ Bit 11:0                 │
└──────────────┴──────────────┴──────────────────────────┘
                      │
                      └─ 支持的 VC 数量
                         0000 = 1 个 VC (VC0)
                         0001 = 2 个 VC (VC0-1)
                         ...
                         0111 = 8 个 VC (VC0-7)
```

---

## 5️⃣ 硬件实现架构

### 整体架构

```verilog
┌─────────────────────────────────────────────────────────────────┐
│                        PCIe Endpoint                            │
├─────────────────────────────────────────────────────────────────┤
│  Transaction Layer                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  TLP Generator                                             │  │
│  │    │                                                       │  │
│  │    ▼                                                       │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  TC/VC Mapper                                        │  │  │
│  │  │  input:  TLP with TC[2:0]                           │  │  │
│  │  │  output: TLP to VC_Buffer[VC_ID]                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │    │                                                        │  │
│  │    ▼                                                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │  │
│  │  │ VC0 Buf │ │ VC1 Buf │ │ VC2 Buf │ │ VC3 Buf │  ...     │  │
│  │  │ (TC0,1) │ │ (TC2)   │ │ (TC3)   │ │ (TC4-7) │          │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘          │  │
│  └───────┼──────────┼──────────┼──────────┼───────────────────┘  │
│          │          │          │          │                      │
├──────────┼──────────┼──────────┼──────────┼──────────────────────┤
│  Data Link Layer      │          │          │                      │
│          │          │          │          │                      │
│  ┌───────▼──────────▼──────────▼──────────▼───────────────────┐  │
│  │                    VC Arbiter                               │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  Arbitration Logic                                   │  │  │
│  │  │  - Round-Robin (默认)                                │  │  │
│  │  │  - Weighted Round-Robin (可配置)                     │  │  │
│  │  │  - Strict Priority (高优先级优先)                     │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────┬────────────────────────────────────┘  │
│                           │                                       │
├───────────────────────────┼───────────────────────────────────────┤
│  Physical Layer           │                                       │
│                           ▼                                       │
│                  ┌─────────────────┐                              │
│                  │  Serial Output  │                              │
│                  └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 关键模块设计

#### 1. TC/VC Mapper

```verilog
module tc_vc_mapper #(
    parameter NUM_VC = 4,
    parameter NUM_TC = 8
) (
    input wire                  clk,
    input wire                  rst_n,
    
    // TLP Input
    input wire [7:0]            tlp_tc,       // TC[2:0] from TLP Header
    input wire [511:0]          tlp_data,
    input wire                  tlp_valid,
    output wire                 tlp_ready,
    
    // VC Buffer Output
    output wire [511:0]         vc_tlp_data [NUM_VC-1:0],
    output wire                 vc_tlp_valid [NUM_VC-1:0],
    input wire                  vc_tlp_ready [NUM_VC-1:0],
    
    // Configuration
    input wire [7:0]            tc_vc_map [NUM_VC-1:0]  // TC/VC Mapping
);

// TC to VC decoding
wire [NUM_VC-1:0] vc_select;
genvar i;

generate
    for (i = 0; i < NUM_VC; i = i + 1) begin : vc_decode
        // Check if TC is mapped to this VC
        assign vc_select[i] = tc_vc_map[i][tlp_tc];
    end
endgenerate

// One-hot to VC buffer
always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        for (integer j = 0; j < NUM_VC; j = j + 1)
            vc_tlp_valid[j] <= 1'b0;
    end else begin
        for (integer j = 0; j < NUM_VC; j = j + 1) begin
            vc_tlp_valid[j] <= tlp_valid && vc_select[j] && vc_tlp_ready[j];
        end
    end
end

endmodule
```

#### 2. VC Buffer（每 VC 独立）

```verilog
module vc_buffer #(
    parameter BUFFER_DEPTH = 32,
    parameter DATA_WIDTH = 512
) (
    input wire                  clk,
    input wire                  rst_n,
    
    // Write Interface
    input wire                  wr_en,
    input wire [DATA_WIDTH-1:0] wr_data,
    output wire                 full,
    
    // Read Interface
    output wire [DATA_WIDTH-1:0] rd_data,
    input wire                  rd_en,
    output wire                 empty,
    
    // Status
    output wire [$clog2(BUFFER_DEPTH)-1:0] count
);

// Buffer storage
reg [DATA_WIDTH-1:0] mem [BUFFER_DEPTH-1:0];
reg [$clog2(BUFFER_DEPTH)-1:0] rd_ptr, wr_ptr;
reg [$clog2(BUFFER_DEPTH):0] count_reg;

// Write logic
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        wr_ptr <= 0;
    else if (wr_en && !full)
        wr_ptr <= wr_ptr + 1'b1;
end

always @(posedge clk) begin
    if (wr_en && !full)
        mem[wr_ptr] <= wr_data;
end

// Read logic
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        rd_ptr <= 0;
    else if (rd_en && !empty)
        rd_ptr <= rd_ptr + 1'b1;
end

assign rd_data = mem[rd_ptr];

// Count logic
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        count_reg <= 0;
    else if (wr_en && !rd_en && !full)
        count_reg <= count_reg + 1'b1;
    else if (rd_en && !wr_en && !empty)
        count_reg <= count_reg - 1'b1;
end

assign count = count_reg;
assign full = (count_reg == BUFFER_DEPTH);
assign empty = (count_reg == 0);

endmodule
```

#### 3. VC Arbiter（核心）

```verilog
module vc_arbiter #(
    parameter NUM_VC = 4,
    parameter ARB_TYPE = "RR"  // "RR" = Round-Robin, "WP" = Weighted Priority
) (
    input wire                  clk,
    input wire                  rst_n,
    
    // VC Buffer Status
    input wire                  vc_valid [NUM_VC-1:0],
    output wire                 vc_grant [NUM_VC-1:0],
    
    // Configuration
    input wire [7:0]            vc_priority [NUM_VC-1:0],  // VC 优先级权重
    input wire                  strict_priority_mode
);

// Round-Robin Arbiter
reg [$clog2(NUM_VC)-1:0] next_grant;
reg [$clog2(NUM_VC)-1:0] last_grant;

always @(*) begin
    if (strict_priority_mode) begin
        // Strict Priority: 高优先级 VC 优先
        vc_grant = 0;
        for (integer i = NUM_VC-1; i >= 0; i = i - 1) begin
            if (vc_valid[i]) begin
                vc_grant = (1 << i);
                break;
            end
        end
    end else begin
        // Round-Robin: 公平仲裁
        vc_grant = 0;
        for (integer i = 0; i < NUM_VC; i = i + 1) begin
            integer idx = (last_grant + 1 + i) % NUM_VC;
            if (vc_valid[idx]) begin
                vc_grant = (1 << idx);
                next_grant = idx;
                break;
            end
        end
    end
end

// Update last grant
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        last_grant <= 0;
    else
        last_grant <= next_grant;
end

endmodule
```

---

## 6️⃣ 与 PCIe 7.0 项目的关联

### 设计注意事项

1. **VC0 必须支持**
   - 默认使能
   - TC0 强制 Map 到 VC0

2. **独立 Buffer 设计**
   - 每个 VC 独立 Buffer
   - Buffer 深度可配置

3. **TC/VC Mapping 可配置**
   - 支持软件配置
   - 符合 Mapping 规则

4. **仲裁机制选择**
   - Round-Robin（默认，公平）
   - Strict Priority（低延迟）
   - Weighted Round-Robin（可配置权重）

5. **Flow Control 集成**
   - 每 VC 独立 FC Counter
   - FC_Init 支持多 VC

### 设计检查清单

```markdown
## QoS 设计检查

### VC 支持
- [ ] VC0 必须支持（默认使能）
- [ ] VC1-VC7 可选支持
- [ ] 每个 VC 独立 Buffer
- [ ] Buffer 深度可配置

### TC/VC Mapping
- [ ] TC0 强制 Map 到 VC0
- [ ] 其他 TC 可灵活 Map
- [ ] Mapping 寄存器可配置
- [ ] 支持查询 VC Count

### 仲裁机制
- [ ] Round-Robin（默认）
- [ ] Strict Priority（可选）
- [ ] Weighted Round-Robin（可选）
- [ ] 仲裁公平性保证

### Flow Control
- [ ] 每 VC 独立 FC Counter
- [ ] FC_Init 支持多 VC
- [ ] Update FC 周期更新

### 性能
- [ ] 高优先级 VC 低延迟
- [ ] 低优先级 VC 不饿死
- [ ] 总吞吐量最大化
```

---

## 📋 总结对比

| 特性 | VC | TC |
|------|------|------|
| **定义位置** | 配置空间扩展寄存器 | TLP Header Bit[6:4] |
| **数量** | 最多 8 个（VC0-7） | 最多 8 个（TC0-7） |
| **作用** | 独立 Buffer 和资源 | 优先级标记 |
| **配置** | 硬件实现 | 软件分配 |
| **默认值** | VC0（必须） | TC0（最低优先级） |

---

## 📚 参考资料

1. PCIe Base Specification 6.0/7.0 - Chapter 2: Transaction Layer
2. [PCIe 扫盲——Quality of Service 简介](https://blog.chinaaet.com/justlxy/p/5100053466)
3. [PCIe 扫盲目录篇](http://blog.chinaaet.com/justlxy/p/5100053481)

---

*最后更新：2026-03-17*  
*整理人：along*
