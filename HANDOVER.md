# MCP-SearXNG 项目交接文档

> 创建时间：2024年12月29日
> 目标读者：继续开发此项目的开发者（包括AI助手和人类）

---

## 一、项目概述

### 1.1 项目定位

本项目是一个 MCP (Model Context Protocol) 服务器实现，集成了 SearXNG 搜索引擎 API，为大型语言模型提供 Web 搜索能力。

Fork 自 [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng)，并在此基础上增加了语义嵌入（Semantic Embedding）功能。

### 1.2 当前版本

- **基础版本**：v0.8.0（跟随上游）
- **Fork 版本**：v0.8.0+1
- **当前状态**：本地 Gitea 和 GitHub 双仓库同步

### 1.3 核心功能

| 功能模块 | 描述 |
|---------|------|
| Web 搜索 | 支持分页、时间筛选、语言筛选、安全搜索 |
| URL 内容读取 | 支持分页、段落筛选、标题提取、内容截取 |
| 智能缓存 | 多级缓存（URL 内容、搜索结果、嵌入向量），TTL + LRU |
| 语义嵌入 | Ollama 集成，生成向量用于语义相似度计算 |
| 语义重排序 | 结合关键词匹配和语义相似度优化结果排序 |
| HTTP 传输 | 可选 HTTP 模式，支持 Web 客户端 |

---

## 二、技术架构

### 2.1 核心文件结构

```
src/
├── index.ts          # 入口点，MCP 工具注册
├── config.ts         # 环境变量配置管理
├── search.ts         # SearXNG 搜索 API 封装
├── url-reader.ts     # URL 内容提取工具
├── embedding.ts      # Ollama 嵌入向量生成
├── cache.ts          # 多级缓存实现（内存）
├── types.ts          # TypeScript 类型定义
├── http-server.ts    # HTTP 传输模式服务器
├── proxy.ts          # 代理配置处理
├── error-handler.ts  # 统一错误处理
├── logging.ts        # 日志记录
└── resources.ts      # MCP 资源管理
```

### 2.2 关键实现细节

#### 缓存系统 (cache.ts)

```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

// 多级缓存架构
const embeddingCache = new Map<string, CacheEntry<number[]>>();
const urlCache = new Map<string, CacheEntry<string>>();
const searchCache = new Map<string, CacheEntry<SearchResult[]>>();

// 特性：TTL 过期 + LRU 淘汰
```

#### 嵌入系统 (embedding.ts)

- Ollama 集成，生成文本向量
- 余弦相似度计算
- 智能分块（chunk size + overlap）
- Top-K 语义检索

#### 搜索重排序 (search.ts)

- 双重评分机制：关键词匹配 + 语义相似度
- 综合排名算法
- 可配置的 Top-K 结果返回

---

## 三、已完成的决策与讨论

### 3.1 文档中文化

- ✅ 创建 `README_CN.md`（完整中文文档）
- ✅ 在 `README.md` 添加中文版本链接
- ✅ 同步推送到 GitHub 和本地 Gitea

### 3.2 版本管理策略

- ✅ Gitea Release 创建（v0.8.0+1）
- **版本号规则**：`<上游版本>+<fork序号>`
- **Release 特点**：不可变快照，标记特定代码状态

### 3.3 技术选型讨论结果

#### Qdrant 向量数据库 vs 内存缓存

**决策**：**暂不引入 Qdrant**，维持当前内存缓存方案

| 评估维度 | 内存缓存（当前） | Qdrant |
|---------|-----------------|--------|
| 性能 | ✅ 纳秒级访问 | ✅ 毫秒级，略有开销 |
| 复杂度 | ✅ 无额外依赖 | ❌ 增加运维复杂度 |
| 持久化 | ❌ 服务重启丢失 | ✅ 持久化存储 |
| 扩展性 | ❌ 受限于单机内存 | ✅ 支持分布式 |
| 资源占用 | ✅ 轻量 | ❌ 需额外资源 |

**重新评估时机**：
- 向量数据量超过 100,000 条
- 需要跨服务共享缓存
- 需要持久化缓存数据
- 部署环境有内存限制

---

## 四、未来开发计划

### 4.1 小语言模型集成（下一步重点）

#### 核心思路

引入超小语言模型（如 qwen2.5:1.5b），与现有的 Embedding 模型形成**互补**：

| 模型类型 | 能力 | 适用场景 |
|---------|------|---------|
| Embedding 模型 | 数值相似度计算 | 语义匹配、向量检索、聚类 |
| 小语言模型 | 逻辑推理、理解意图 | 问题分解、查询优化、质量评估 |

#### 预期功能

1. **智能问题分解**
   - 将复杂查询拆解为多个子查询
   - 并行执行提升召回率
   - 合并结果去重

2. **查询优化**
   - 意图识别和改写
   - 关键词提取和扩展
   - 多语言查询翻译

3. **结果质量评估**
   - 相关性打分
   - 事实核查
   - 答案质量评级

#### 推荐模型

| 模型 | 大小 | 特点 |
|-----|------|------|
| qwen2.5:1.5b | 1.5GB | 中文优化，推理能力强 |
| phi3.5:3.8b | 3.8GB | 微软出品，指令遵循好 |
| gemma2:2b | 2GB | Google 开源，多语言 |
| llama3.2:1b | 1GB | Meta 出品，英文为主 |

**推荐优先级**：qwen2.5:1.5b > phi3.5:3.8b > gemma2:2b

#### 实施路线

```
Phase 1（当前）
├── Embedding 用于：语义相似度、重排序、缓存
└── 小模型：暂不引入

Phase 2（下一步）
├── 新增小模型调用接口
├── 问题分解功能
├── 查询优化功能
└── 质量评估功能

Phase 3
├── 评估效果
├── 收集反馈
└── 微调优化（如需要）
```

### 4.2 其他潜在方向

- **多模型切换**：支持选择不同 Embedding 模型
- **缓存持久化**：可选 Redis 存储
- **分布式支持**：多实例部署
- **Web UI 管理界面**：可视化配置和监控

---

## 五、开发环境配置

### 5.1 必备服务

| 服务 | 默认地址 | 说明 |
|-----|---------|------|
| SearXNG | http://localhost:8080 | 搜索引擎后端 |
| Ollama | http://localhost:11434 | 嵌入向量生成 |
| Gitea | http://192.168.168.168:3000 | 本地代码仓库 |

### 5.2 环境变量配置

```bash
# 必填
SEARXNG_URL=http://localhost:8080

# 可选 - Embedding
ENABLE_EMBEDDING=true
OLLAMA_HOST=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text
TOP_K=3
CHUNK_SIZE=1000
CHUNK_OVERLAP=100

# 可选 - 缓存
ENABLE_CACHE=true
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# 可选 - HTTP 传输
MCP_HTTP_PORT=3000
```

### 5.3 本地仓库配置

```bash
# 查看远程仓库
git remote -v

# 输出示例：
# origin  https://github.com/isokoliuk/mcp-searxng.git (fetch)
# origin  https://github.com/isokoliuk/mcp-searxng.git (push)
# gitea   http://192.168.168.168:3000/liwen/mcp-searxng.git (fetch)
# gitea   http://192.168.168.168:3000/liwen/mcp-searxng.git (push)
```

**开发流程**：
1. 本地修改代码
2. 测试验证
3. 提交到本地 Git
4. 推送到 Gitea（`git push gitea main`）
5. 稳定后推送到 GitHub（`git push origin main`）

---

## 六、仓库同步策略

### 6.1 当前状态

- **GitHub**：`isokoliuk/mcp-searxng`（上游仓库）
- **本地 Gitea**：`liwen/mcp-searxng`（主开发仓库）
- **个人 GitHub Fork**：待创建（可选）

### 6.2 同步上游更新

如果上游有新版本，可以合并：

```bash
# 添加上游 remote（如果还没有）
git remote add upstream https://github.com/ihor-sokoliuk/mcp-searxng.git

# 获取上游更新
git fetch upstream

# 合并到 main 分支
git merge upstream/main

# 推送到 Gitea
git push gitea main
```

### 6.3 提交流程规范

```
<type>: <subject>

[optional body]

[optional footer]
```

**类型**：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 重构
- `chore`: 构建/工具更新

**示例**：
```
docs: 添加中文 README 文档

添加 README_CN.md 完整中文翻译，
并在英文版添加语言切换链接
```

---

## 七、测试与验证

### 7.1 本地测试

```bash
# 安装依赖
npm install

# 开发模式（文件监听）
npm run watch

# 构建
npm run build

# 运行测试
npm test

# 测试覆盖率
npm run test:coverage
```

### 7.2 MCP Inspector

```bash
npm run inspector
```

### 7.3 手动测试

```bash
# 启动服务
SEARXNG_URL=http://localhost:8080 npm run watch

# 测试搜索
# 在 Claude Code 或其他 MCP Client 中调用 searxng_web_search

# 测试 URL 读取
# 调用 web_url_read 工具

# 测试嵌入功能
# 查看日志确认 Ollama 调用正常
```

---

## 八、常见问题

### Q1：嵌入功能不工作

**检查清单**：
1. Ollama 是否运行？`curl http://localhost:11434/api/tags`
2. 嵌入模型是否下载？`ollama list`
3. 环境变量 `ENABLE_EMBEDDING` 是否为 `true`？
4. 日志中是否有错误信息？

### Q2：缓存未生效

**检查清单**：
1. 环境变量 `ENABLE_CACHE` 是否为 `true`？
2. 缓存是否过期？`CACHE_TTL` 设置
3. 缓存是否满？`CACHE_MAX_SIZE` 设置
4. 是否是新的唯一查询？

### Q3：推送到 Gitea 失败

**检查清单**：
1. 网络是否可达？`ping 192.168.168.168`
2. Gitea 服务是否运行？
3. SSH 或 HTTP 认证是否配置？
4. 是否有写权限？

---

## 九、参考资料

### 9.1 官方文档

- [MCP Protocol](https://modelcontextprotocol.io/introduction)
- [SearXNG Docs](https://docs.searxng.org)
- [Ollama Docs](https://ollama.com)

### 9.2 相关仓库

- [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng)（上游）
- [ollama/ollama](https://github.com/ollama/ollama)

### 9.3 项目资源

- Docker Hub: `isokoliuk/mcp-searxng`
- NPM: `mcp-searxng`
- Gitea: http://192.168.168.168:3000/liwen/mcp-searxng

---

## 十、联系人与致谢

### 贡献者

- **上游作者**: ihor-sokoliuk
- **Fork 作者**: liwen（你）
- **技术支持**: Trae AI Assistant

### 感谢

感谢所有为本项目贡献想法和反馈的朋友们！

---

## 十一、版本历史

### v0.8.0+4（2024年12月29日）- Fetch MCP 功能移植

#### 核心变更

| 功能 | 状态 | 说明 |
|------|------|------|
| 超时控制 | ✅ | 新增 `timeoutMs` 参数，防止长时间等待 |
| 自定义 User-Agent | ✅ | 新增 `userAgent` 参数，模拟浏览器访问 |
| 内容分块读取 | ✅ | 新增 `startChar` 和 `maxLength` 参数，支持分批读取 |
| HTML 转 Markdown | ✅ | 自动转换，失败时返回原始 HTML |
| Mozilla Readability 内容提取 | ✅ | 自动提取文章正文，去除导航、广告等噪声 |

#### 技术实现

**新增依赖**：
- `@mozilla/readability` - Mozilla 官方内容提取库
- `jsdom` - DOM 解析库
- `@types/jsdom` - TypeScript 类型定义

**修改文件**：
- `src/url-reader.ts` - 添加内容提取、超时控制、User-Agent、分块读取
- `src/config.ts` - 添加 FetchConfig 接口和超时配置
- `src/types.ts` - 添加 timeoutMs 参数到 URL 读取工具

**核心代码逻辑**：

```typescript
// 1. 超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

// 2. 自定义 User-Agent
const requestOptions: RequestInit = {
  signal: controller.signal,
  headers: {
    "User-Agent": userAgent
  }
};

// 3. 内容提取（Readability）
const dom = new JSDOM(htmlContent);
const reader = new Readability(dom.window.document);
const article = reader.parse();
extractedHtmlContent = article.content;

// 4. HTML 转 Markdown
markdownContent = NodeHtmlMarkdown.translate(extractedHtmlContent);

// 5. 内容分块
result = applyCharacterPagination(result, options.startChar, options.maxLength);

// 6. 继续读取提示
if (contentWasTruncated) {
  finalResult += `\n\n⏭️ 内容已截断，剩余 ${remaining} 字符。如需继续读取，请使用 start_index=${nextStart} 参数。`;
}
```

#### 测试结果

**超时控制测试**：
- URL: https://httpbin.org/delay/5
- 设置: timeoutMs=3000
- 结果: ✅ 正确触发超时错误

**内容分块读取测试**：
- URL: https://www.cnblogs.com/sexintercourse/p/13740316.html
- 第一次: maxLength=1000 → 返回前1000字符
- 第二次: startChar=1000, maxLength=1000 → 从1000字符继续读
- 结果: ✅ 成功分块读取，缓存命中

**HTML 转 Markdown 测试**：
- URL: https://www.ruanyifeng.com/blog/2019/09/react-hooks.html
- 结果: ✅ 成功转换为 Markdown 格式

**内容提取测试**：
- URL: https://www.ruanyifeng.com/blog/2019/09/react-hooks.html
- 提取内容: 标题、作者、日期、正文
- 质量: ⭐⭐⭐⭐⭐ (优秀)
- 备注: 保留了少量导航链接

- URL: https://blog.csdn.net/itcast_cn/article/details/107468172
- 提取内容: 标题、发布时间、版权声明
- 质量: ⭐⭐⭐ (一般)
- 备注: CSDN 网站结构复杂，提取效果不如阮一峰博客

#### 功能对比

| 功能 | 之前 | 现在 | 改进 |
|------|------|------|------|
| 超时控制 | ❌ 无 | ✅ 可配置 | 防止长时间等待 |
| User-Agent | 固定 | ✅ 可自定义 | 更好兼容性 |
| 内容分块 | ❌ 一次性返回 | ✅ 分批读取 | 节省 token |
| HTML 转 Markdown | ✅ 基础转换 | ✅ 智能提取 | 去除噪声 |
| 内容提取 | ❌ 返回完整 HTML | ✅ 提取正文 | 大幅减少 token |

#### 待实现功能

| 优先级 | 功能 | 建议 |
|-------|------|------|
| 5 | robots.txt 检查 | 可选，增加延迟 |
| 7 | 其他 Fetch 功能 | 看具体需求 |

---

### v0.8.0+3（2024年12月29日）- URL 功能优化

#### 功能规划（待实现）

基于 Fetch MCP 的功能分析，以下为 URL 读取功能的改进计划：

| 优先级 | 功能 | 难度 | 预估工作量 | 说明 |
|-------|------|-------|---------|------|
| 1 | 超时控制 | ⭐（1/5） | 30 分钟 | 防止长时间挂起，提升用户体验 |
| 2 | 自定义 User-Agent | ⭐（1/5） | 1 小时 | 更好的网站兼容性，避免被屏蔽 |
| 3 | 内容分块读取 | ⭐⭐（3/5） | 2-3 小时 | 支持大页面分块读取，节省 token |
| 4 | HTML 转 Markdown（基础版） | ⭐⭐（3/5） | 3-4 小时 | 内容更易读，减少 token 使用 |
| 5 | robots.txt 检查 | ⭐⭐⭐（4/5） | 4-6 小时 | 遵守网站规则，避免被封禁 |
| 6 | HTML 转 Markdown（完整版） | ⭐⭐⭐（4/5） | 1-2 天 | 提取主要内容，大幅减少 token |
| 7 | Prompt 模式 | ⭐⭐⭐⭐（5/5） | 2-3 天 | 支持用户直接发起 URL 读取 |

#### 实施计划

**第一优先级（立即实现）**：
- ✅ 超时控制
- ✅ 自定义 User-Agent

**第二优先级（短期实现）**：
- ⏳ 内容分块读取
- ⏳ HTML 转 Markdown（基础版）

**第三优先级（长期考虑）**：
- ⏳ robots.txt 检查
- ⏳ HTML 转 Markdown（完整版）
- ⏳ Prompt 模式

---

### v0.8.0+2（2024年12月29日）

#### 核心变更

| 功能 | 状态 | 说明 |
|------|------|------|
| 查询优化工具 | ✅ | 新增 `searxng_analyze_query` 工具 |
| 问题类型识别 | ✅ | 单问题/比较类/关联类自动识别 |
| 批量 URL 读取 | ✅ | 支持 `urls` 数组参数并行读取 |
| 会话跟踪 | ✅ | 搜索轮次、阅读轮次统计 |
| 缓存标记 | ✅ | 搜索/URL 结果标记缓存命中 |
| 上下文标记 | ✅ | 搜索进度、阅读进度标记 |
| 搜索去重 | ✅ | 会话内重复搜索检测 |
| Bug 修复 | ✅ | TypeScript 编译错误修复 |

#### 讨论决策

| 议题 | 决策 | 理由 |
|------|------|------|
| 小语言模型集成 | ❌ 暂缓 | 嵌入式模型打分已满足需求 |
| 自动 URL 读取 | ❌ 不做 | 有独立读取工具，模型自行判断 |
| 质量评估功能 | ❌ 不做 | 嵌入模型打分已足够 |
| Qdrant 向量数据库 | ❌ 暂不引入 | 内存缓存方案足够当前场景 |

#### 技术细节

**新增文件**：
- `src/query-optimizer.ts` - 查询优化和问题类型识别
- `src/session-tracker.ts` - 会话跟踪和上下文管理

**修改文件**：
- `src/search.ts` - 添加缓存标记和搜索去重
- `src/url-reader.ts` - 支持批量读取和缓存标记
- `src/types.ts` - 添加批量读取参数支持
- `src/index.ts` - 注册新工具

**缓存标记格式**：
```markdown
=== 缓存上下文 ===
[搜索进度] 第 2 轮搜索 | 历史搜索: 2 次 | 历史阅读: 1 次
[搜索去重] 检测到重复搜索，已跳过 | 相似度: 0.92 | 原始查询: "星穹铁道 大丽花 3.8"
[缓存命中] 此结果来自缓存 | 缓存时间: 2024-12-29 10:30:00
=== 缓存上下文 ===
```

**问题类型识别**：
- **单问题**：直接搜索，如"星穹铁道 大丽花 技能"
- **比较类**：拆分为独立实体搜索，如"星穹铁道 vs 绝区零 FES 对比"
- **关联类**：识别实体关系，如"星穹铁道 和 绝区零 关系"

#### 性能优化

- 搜索去重减少冗余查询
- 批量 URL 读取减少网络开销
- 上下文标记帮助模型避免重复搜索

#### 测试验证

- ✅ 小模型实战测试（实战记录 1）
- ✅ 大模型对比测试（实战记录 2）
- ✅ 批量 URL 读取测试
- ✅ 并发搜索测试（分批调用策略）

---

### v0.8.0+1（2024年12月29日）- 初始 Fork 版本

- 基于上游 ihor-sokoliuk/mcp-searxng v0.8.0
- 添加语义嵌入功能
- 添加中文文档

---

> 文档版本：2.0
> 最后更新：2024年12月29日
> 版本记录：添加 v0.8.0+2 第二次改版记录
