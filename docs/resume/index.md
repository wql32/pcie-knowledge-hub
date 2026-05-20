# 钱龙
## 数字芯片设计工程师

**邮箱：** 1343717655@qq.com  
**电话：** (+86) 13275897328  
**所在地：** 中国  
**工作经验：** 近 7 年

---

## 求职意向

**目标职位：** 高级数字芯片设计工程师 / 数字前端设计专家  
**技术领域：** 高速接口（PCIe/AXI）、GPGPU、SSD 控制器

---

## 专业技能

1. **数字前端设计全流程**
   - 熟练掌握数字前后端设计流程及 EDA 工具使用
   - 精通 Verilog HDL 逻辑电路设计与实现

2. **总线协议**
   - 精通 AMBA 总线协议（AXI/AHB/APB）
   - 深入理解 PCIe 协议（Gen6/Gen7 FLIT 模式）
   - 熟悉 AXI5 规范及高速接口设计

3. **设计质量与综合**
   - Lint 检查、CDC 跨时钟域验证
   - SDC 时序约束编写与 Timing Analysis/Optimization
   - Low Power 设计（UPF/CPF）
   - Design Compiler/Genus 综合

4. **核心能力**
   - 优秀的沟通学习能力
   - 强大的 Debug 能力
   - PPA（性能/功耗/面积）优化能力

---

## 工作经历

### 沐曦集成电路有限公司 | 数字 IC 设计专家
**2021.06 - 至今**

#### PCIe 7.0 Endpoint 控制器项目 | 核心设计工程师
**2026.03 - 至今**
- 负责 PCIe 7.0 Endpoint 前端架构设计与模块开发
- 实现 128 GT/s FLIT 模式下的 TLP 解析器与流控模块
- 设计 AXI5 仲裁器（2 Master → 1 Slave，512-bit 数据路径，Round-Robin 仲裁）
- 完成模块级 Lint/CDC 检查、SDC 约束编写及综合时序收敛
- 面积优化：相比前代设计减少逻辑资源占用
- 输出完整设计文档与验证计划

#### MXG100 GPGPU 项目 | IP Designer / PPA 优化
**2022.11 - 至今**
- 负责 GPGPU 项目中 INT（中断）模块的开发和交付
  - 设计并实现收集 SoC 所有 Client 的中断向量
  - 通过 AXI 接口将中断向量写入 System Memory
  - 通过 Interrupt 信号通知 PCIe Subsystem
- 负责 DMA 模块的开发
  - 完成命令执行单元从串行到并行的优化
  - 提升数据吞吐效率
- 基于 Power Artist 和 Spyglass 进行 Power Optimization
  - 提高 SCGC（Sequential Clock Gating Cell）比例
  - 对 MGCG（Module Gated Clock Gating）进行功能优化，显著降低功耗

#### MXC500 GPGPU 项目 | IP Designer / 前端收敛负责人
**2021.06 - 2022.11**
- 负责 DMA 模块的 Owner，Ring Buffer 模块开发
  - 管理 Ring Buffer 对 Command 的执行及与 RISC-V 的交互
- 负责子模块 RISC-V Controller 设计
  - 集成 RISC-V IP（C906）
  - 开发 AXI2Mem Bridge 模块，实现 C906 通过 AXI 接口与外部 SRAM 的数据访问
- 负责前端收敛（Front-end Convergence）工作
  - 作为 Tile Owner，完成 Lint/CDC 质量检查
  - 编写 SDC 约束，完成综合，Clean Timing Issue
  - 交付网表至后端 PD 团队
- 基于 PTpx 工具对不同阶段 Netlist 进行功耗仿真和分析
  - 输出功耗评估和分析文档

---

### 杭州联芸科技有限公司 | 数字 IC 设计工程师
**2019.07 - 2021.05**

#### Falcon SSD 控制器项目 | Flash Controller 设计负责人
**2020.11 - 2021.05**
- 作为大模块 Flash Controller Design Owner，负责 Integration 相关工作
- 负责制定 LD（Logical Data）模块的 Design Spec 并输出 RTL Code
- 负责 MPI/Scrambler/CRC IP 的 Design 升级
- 负责 Flash Controller Module 中 SDC/UPF Constraint 和 Quality Check
  - Lint Check、CDC Check、DFT Check、Pre-SYN、CLP Check

#### Eagle SSD 控制器项目 | Flash Controller 设计负责人
**2019.07 - 2020.07**
- 作为 Flash Controller 模块 Design Owner，负责 Top 的 Integration
- 基于 RS 算法实现 Raid6 编解码的硬件设计
  - 制定 Raid6 Design Spec 并输出 RTL Code
- 基于 Kioxia BiCS6 实现 Randomizer/Scrambler 的硬件设计
  - 制定 Design Spec 并输出 RTL Code
- 负责 Flash Controller Module SDC/UPF 设计和 Qualify Check
- 负责解决中后端反馈的各种问题，Support DV 和 VD 的验证 Debug

---

## 教育背景

**安徽大学** | 硕士 | 集成电路工程  
2016.09 - 2019.07

---

## 项目亮点总结

| 项目 | 角色 | 关键技术 | 成果 |
|------|------|---------|------|
| PCIe 7.0 Endpoint | 核心设计 | PCIe Gen7/FLIT/AXI5 | 128 GT/s 前端架构 |
| MXG100 GPGPU | IP Owner | 中断系统/DMA/低功耗 | 功耗优化显著 |
| MXC500 GPGPU | 前端负责人 | RISC-V 集成/时序收敛 | 按时交付网表 |
| Falcon SSD | 模块 Owner | Flash 控制/Raid6 | 完整控制器设计 |
| Eagle SSD | 模块 Owner | 编解码/集成 | 首款产品落地 |

---

## 自我评价

- **技术深度：** 近 7 年数字前端设计经验，从 SSD 控制器到 GPGPU 再到 PCIe 高速接口，技术栈持续深化
- **项目经验：** 多次担任模块 Owner 和前端收敛负责人，具备独立承担复杂 IP 开发的能力
- **学习能力：** 快速掌握新技术（如 PCIe 7.0 FLIT 模式），并能应用于实际项目
- **团队协作：** 良好的跨团队沟通能力，能有效协调 DV、VD、后端 PD 团队推进项目

---

*最后更新：2026-03-15*
