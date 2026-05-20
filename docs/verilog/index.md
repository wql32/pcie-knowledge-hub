# Verilog 模块库

> 实用的 RTL 设计模板，即拿即用

## 📦 核心模块

### FIFO 缓冲区
- 同步 FIFO - 通用数据缓存
- 异步 FIFO - 跨时钟域数据传递
- **推荐用法：** 独立模块设计，便于复用和验证

### 仲裁器
- AXI5 仲裁器 (2-to-1 Buffered) - Round-Robin 仲裁 → 见 [pcie-design](https://github.com/wql32/pcie-design)
- 优先级仲裁器
- 公平仲裁器

### CDC 同步链
- 两级同步器 - 基本跨时钟域
- 多级同步器 - 高速跨域
- Gray Code 计数器 - 指针跨域

### AXI 接口
- AXI4-Lite Slave
- AXI5 Bridge 模块

## 🛠 工具脚本

### Lint 检查
```bash
bash scripts/lint.sh <module.v>
```

## 📂 完整模块库

> 详见 [verilog-module skill](https://github.com/wql32/pcie-design)