import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PCIe Knowledge Hub',
  description: '钱龙的技术知识库 - PCIe / 芯片设计 / Verilog',
  lang: 'zh-CN',

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: 'PCIe', link: '/pcie/' },
      { text: 'Verilog', link: '/verilog/' },
      { text: '简历', link: '/resume/' },
      { text: '工具', link: '/tools/' },
    ],

    sidebar: {
      '/pcie/': [
        { text: 'PCIe 学习', children: [
          { text: '概述', link: '/pcie/' },
          { text: 'TLP 规则', link: '/pcie/tlp-rules' },
          { text: '流控机制', link: '/pcie/flow-control' },
          { text: 'QoS - VC/TC', link: '/pcie/qos-vc-tc' },
          { text: 'Spec 精读笔记', link: '/pcie/spec-notes' },
        ]},
        { text: '项目设计', children: [
          { text: 'AXI Bridge 1024b', link: '/pcie/axi-bridge' },
        ]},
      ],
      '/verilog/': [
        { text: 'Verilog', children: [
          { text: '模块模板', link: '/verilog/' },
          { text: 'FIFO 设计', link: '/verilog/fifo' },
          { text: '仲裁器', link: '/verilog/arbiter' },
          { text: 'CDC 同步链', link: '/verilog/cdc' },
        ]},
      ],
      '/resume/': [
        { text: '简历', children: [
          { text: '查看简历', link: '/resume/' },
        ]},
      ],
    },

    footer: {
      text: '© 2026 钱龙 | PCIe Knowledge Hub',
    },
  },

  vite: {
    server: {
      port: 3000,
    },
  },
})