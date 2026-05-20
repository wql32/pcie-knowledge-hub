# PCIe Completion TLP 处理规则详解

**创建时间：** 2026-03-13  
**来源：** AET 电子技术应用博客 + PCIe Spec  
**项目：** PCIe 7.0 Endpoint  
**优先级：** ⭐⭐⭐（核心协议）

---

## 📊 **Completion Status Codes（完成状态码）**

| 状态码 | 名称 | 含义 | 错误类型 | 处理方式 |
|--------|------|------|---------|---------|
| **000b (SC)** | Successful Completion | 请求被正确处理 | ✅ 正常 | 接收数据 |
| **001b (UR)** | Unsupported Request | 非法请求或无法识别 | ⚠️ Advisory Non-Fatal | 记录错误，可重试 |
| **010b (CRS)** | Configuration Request Retry | Completer 暂时无法响应 | ⚠️ 需重试 | 等待后重试 |
| **100b (CA)** | Completer Abort | 发生其他错误 | ❌ Uncorrectable Error | 终止 + 上报 |

---

## 🔑 **CplD（Completion with Data）重要规则**

### **规则 1：数据量一致性** ⭐⭐⭐

> 返回的总数据量应当与请求的数据量保持一致

**违反后果：** Completion Timeout 错误

**示例：**
```
✅ 正确：
Request: Read 256 Bytes
CplD #1: 128 Bytes
CplD #2: 128 Bytes
Total: 256 Bytes → 成功

❌ 错误：
Request: Read 256 Bytes
CplD #1: 128 Bytes
CplD #2: 64 Bytes  (少了 64 Bytes)
Total: 192 Bytes → Completion Timeout
```

---

### **规则 2：一对一映射** ⭐⭐⭐

> 一个 Completion 只能对应于一个 Request

**含义：**
- ✅ 一个 Request → 多个 Completion（分段返回）
- ❌ 多个 Request → 一个 Completion（不允许）

---

### **规则 3：IO/Configuration 读的特殊性** ⭐⭐

> IO 和 Configuration 读请求由于一直都是 1DW，因此其一直都只对应一个 Completion

**原因：**
- IO Read = 1 DW (32 bits)
- Configuration Read = 1 DW (32 bits)
- 数据量小，不需要分段

---

### **规则 4：非 SC 状态的处理** ⭐⭐⭐

> 当 Completion 中的状态码为 SC 之外的状态，则一次传输被终止

**处理流程：**
```
Status ≠ SC
    ↓
终止 Transaction
    ↓
上报错误
    ↓
软件干预（如需要）
```

---

### **规则 5：Read Completion Boundary (RCB)** ⭐⭐

**RCB 定义：** 处理一个请求多个 CplD 时的边界限制

**RCB 值：**
- **64 Bytes** 或 **128 Bytes**
- Bridge 和 Endpoint 应设计为 RCB 可通过软件修改/控制

**设计建议：**
```verilog
// RCB 可配置模块
module rcb_configurable #(
    parameter RCB_SIZE = 64  // 64 或 128
)(
    input wire [9:0] request_length,
    input wire [9:0] offset,
    output wire is_rcb_boundary
);

// 检查是否到达 RCB 边界
assign is_rcb_boundary = (offset % RCB_SIZE) == 0;

endmodule
```

---

### **规则 6：传输顺序** ⭐⭐

> 先发送低地址的数据，后发送高地址数据

**正确顺序：**
```
Request: Read 256 Bytes, Address = 0x1000

✅ 正确：
CplD #1 → 0x1000 - 0x103F (低地址)
CplD #2 → 0x1040 - 0x107F
CplD #3 → 0x1080 - 0x10BF
CplD #4 → 0x10C0 - 0x10FF (高地址)

❌ 错误：
CplD #1 → 0x10C0 - 0x10FF (高地址先发)
CplD #4 → 0x1000 - 0x103F (低地址后发)
```

---

## 📋 **Requester 接收 Completion 的处理规则**

| 规则 | 条件 | 处理 |
|------|------|------|
| **规则 1** | Completion 与 Request 不一致 | 报错 |
| **规则 2** | Status ≠ SC 或 CRS | 报错 + 清空 Buffer |
| **规则 3** | 非配置请求的 Completion = CRS | 视为 Malformed TLP |

---

## 🎨 **错误处理流程**

### **UR (Unsupported Request)**

```
UR 发生
    ↓
标记为 Advisory Non-Fatal Error
    ↓
记录错误日志（UR_Count++）
    ↓
软件可选择：
  - 重试请求
  - 忽略错误
  - 上报系统
```

**Verilog 实现：**
```verilog
module ur_handler (
    input wire ur_detected,
    input wire [31:0] request_info,
    output reg [31:0] ur_count,
    output wire ur_error
);

always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        ur_count <= 0;
    else if (ur_detected)
        ur_count <= ur_count + 1;
end

assign ur_error = ur_detected;  // Advisory Non-Fatal

endmodule
```

---

### **CRS (Configuration Request Retry)**

```
CRS 发生（配置请求）
    ↓
Requester 启动重试定时器（通常 10ms）
    ↓
等待 Completer 准备好
    ↓
重新发送配置请求
    ↓
直到收到 SC 或其他状态
```

**Verilog 实现：**
```verilog
module crs_retry_fsm (
    input wire crs_detected,
    input wire clk,
    input wire rst_n,
    output reg retry_request,
    output reg [15:0] retry_timer
);

parameter RETRY_DELAY = 10000;  // 10ms @ 1MHz

always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        retry_request <= 0;
        retry_timer <= 0;
    end else if (crs_detected) begin
        retry_timer <= RETRY_DELAY;
        retry_request <= 0;
    end else if (retry_timer > 0) begin
        retry_timer <= retry_timer - 1;
        if (retry_timer == 1)
            retry_request <= 1;  // 触发重试
    end
end

endmodule
```

---

### **CA (Completer Abort)**

```
CA 发生
    ↓
标记为 Uncorrectable Error
    ↓
立即终止 Transaction
    ↓
上报系统错误（SError）
    ↓
可能需要系统复位
```

---

## 📊 **多 CplD 传输示例**

### **场景：Memory Read 512 Bytes**

```
Requester:
  TLP: Mem Read, Address=0x1000, Length=512B
      ↓
Completer:
  检查地址合法性
  读取数据
  分段发送（RCB=64B）:
      ↓
  CplD #1: SC, Addr=0x1000, Len=64B, Data[0:63]
  CplD #2: SC, Addr=0x1040, Len=64B, Data[64:127]
  CplD #3: SC, Addr=0x1080, Len=64B, Data[128:191]
  CplD #4: SC, Addr=0x10C0, Len=64B, Data[192:255]
  CplD #5: SC, Addr=0x1100, Len=64B, Data[256:319]
  CplD #6: SC, Addr=0x1140, Len=64B, Data[320:383]
  CplD #7: SC, Addr=0x1180, Len=64B, Data[384:447]
  CplD #8: SC, Addr=0x11C0, Len=64B, Data[448:511]
      ↓
Requester:
  接收所有 CplD
  验证数据量 = 512B ✅
  验证顺序 = 低→高 ✅
  验证 Status = SC ✅
      ↓
  组装数据，完成事务
```

---

## 💡 **设计建议（PCIe 7.0 Endpoint）**

### **1. Completion 状态机**

```verilog
module completion_transmitter (
    input wire [2:0] status_code,
    input wire [9:0] remaining_length,
    input wire [31:0] current_address,
    input wire rcb_boundary,
    output reg send_cpl,
    output reg last_cpl
);

always @(*) begin
    case (status_code)
        3'b000: begin  // SC
            send_cpl = (remaining_length > 0);
            last_cpl = (remaining_length <= RCB_SIZE);
        end
        3'b001, 3'b100: begin  // UR or CA
            send_cpl = 1'b1;  // 发送错误 Completion
            last_cpl = 1'b1;
        end
        3'b010: begin  // CRS
            send_cpl = 1'b0;  // 不发送，等待重试
            last_cpl = 1'b0;
        end
        default: begin
            send_cpl = 1'b0;
            last_cpl = 1'b0;
        end
    endcase
end

endmodule
```

---

### **2. 数据量验证模块**

```verilog
module data_validator (
    input wire [9:0] request_length,
    input wire [9:0] total_cpl_length,
    input wire all_cpl_received,
    output wire data_valid,
    output wire timeout_error
);

// 检查总数据量是否匹配
assign data_valid = all_cpl_received && (total_cpl_length == request_length);

// Completion Timeout 检测
reg [31:0] timeout_counter;
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        timeout_counter <= 0;
    else if (!all_cpl_received)
        timeout_counter <= timeout_counter + 1;
    else
        timeout_counter <= 0;
end

assign timeout_error = (timeout_counter > TIMEOUT_THRESHOLD);

endmodule
```

---

### **3. 传输顺序检查**

```verilog
module order_checker (
    input wire [31:0] cpl_address,
    input wire [31:0] expected_address,
    input wire is_first_cpl,
    output wire order_valid,
    output wire order_error
);

assign order_valid = is_first_cpl || (cpl_address == expected_address);
assign order_error = !is_first_cpl && (cpl_address < expected_address);

endmodule
```

---

## 📚 **与 PCIe 7.0 的关系**

| 特性 | PCIe 6.0 | PCIe 7.0 | 变化 |
|------|---------|---------|------|
| Completion 格式 | 标准 | 标准 | ✅ 无变化 |
| Status Codes | 4 种 | 4 种 | ✅ 无变化 |
| RCB | 64/128B | 64/128B | ✅ 无变化 |
| FLIT 封装 | 256B | 256B | ✅ 无变化 |
| 错误处理 | 标准 | 标准 | ✅ 无变化 |

**设计意义：** PCIe 6.0 的 Completion 设计可直接用于 PCIe 7.0

---

## 🎯 **关键要点总结**

1. ✅ **4 种 Completion 状态码**（SC/UR/CRS/CA）
2. ✅ **数据量必须一致**（否则 Completion Timeout）
3. ✅ **一个 Completion 对应一个 Request**
4. ✅ **RCB = 64B 或 128B**（可软件配置）
5. ✅ **先低地址后高地址**（传输顺序）
6. ✅ **非 SC/CRS 状态报错 + 清空 Buffer**
7. ✅ **CRS 仅用于配置请求**

---

## 🔗 **参考资料**

1. PCIe Spec 7.0 - Chapter 2: Transaction Layer
2. AET 博客：PCIe 扫盲——TLP Header 详解（三）
3. PCIe 7.0 FLIT 模式调研报告

---

**记录时间：** 2026-03-13  
**记录人：** along  
**项目：** PCIe 7.0 Endpoint  
**状态：** ⭐⭐⭐ 核心协议，必须掌握

---

*此文档基于 AET 博客 + PCIe Spec 整理*
