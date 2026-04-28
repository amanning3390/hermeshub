# Photo Suite — Prompt Engineering Guide

the agent 在执行 consistent-portrait-set 流程时的提示词参考手册。

## 核心原则

> **描述场景，不要堆关键词。** 用完整的叙述性段落，不要用逗号分隔的标签列表。Gemini 理解自然语言，叙述比关键词效果好。

## 创意策划 (Step 1)

### 热点话题来源

用 web_search 搜索以下方向寻找灵感：
- 当季时尚趋势（春夏秋冬换季、时装周）
- 社交媒体热门话题（小红书、Instagram 趋势）
- 节日节气（中国传统节日、西方节日、二十四节气）
- 流行文化（影视剧、音乐、艺术展）
- 城市/旅行热点（网红打卡地、季节性景点）

### 调性参考

| 调性 | 关键词方向 | 适合场景 |
|------|-----------|---------|
| 清新 | soft light, pastel colors, airy, natural | 户外、花园、咖啡馆 |
| 性感 | dramatic lighting, warm tones, confident pose | 室内、酒店、夜景 |
| 职业 | clean lines, neutral tones, sharp focus | 办公室、会议室、城市 |
| 街拍 | candid, urban background, natural movement | 街道、商圈、地铁 |
| 文艺 | muted colors, film grain, contemplative | 书店、美术馆、老建筑 |
| 暗黑 | low key lighting, deep shadows, moody | 工业风、暗室、雨夜 |
| 日系 | overexposed highlights, warm skin tones, minimalist | 日式室内、樱花、海边 |

## 四宫格 Prompt 结构 (Step 3)

### 模板

```
A strictly equal 2x2 grid of 4 portrait photos of [人物描述].
The grid must have exactly 4 cells of equal size, arranged in 2 rows
and 2 columns, with no overlapping or irregular layout.
Each cell contains one full portrait photo.

[人物描述]：[基于模特卡的详细外貌描述——肤色、发型、脸型、身材]

Top-left: [全身/半身/特写], [姿势], [服装细节], [场景细节]
Top-right: [全身/半身/特写], [姿势], [服装细节], [场景细节]
Bottom-left: [全身/半身/特写], [姿势], [服装细节], [场景细节]
Bottom-right: [全身/半身/特写], [姿势], [服装细节], [场景细节]

Photographic style: [镜头] lens, [光线], [色调].
High resolution, sharp details, professional fashion photography.
```

### 人物描述要点

- **具体化**：不写"漂亮女生"，写"a 24-year-old Chinese woman with pale cool-toned skin, straight black hair past her shoulders, delicate V-shaped face, large almond eyes with long lashes, small plump cherry lips"
- **一致性**：每次使用完全相同的人物描述，不要改动
- **命名**：给人物一个名字（如 "Wanwan"），帮助 Gemini 跨格保持一致

### 服装描述要点

- **材质**：satin, silk, cotton, denim, leather, chiffon, knit
- **颜色**：具体色号比泛称好——"dusty rose" 优于 "pink"
- **细节**：领口形状、袖型、裙摆长度、配饰

```
# 好的示例
wearing a tailored cream wool blazer over a champagne silk slip dress,
gold drop earrings, nude pointed-toe heels

# 差的示例
wearing a nice dress and jacket
```

### 场景描述要点

- **地点**：具体场所而非泛泛描述
- **光线**：光线方向和质感是关键
- **氛围元素**：前景/背景的道具和元素

```
# 好的示例
in a floor-to-ceiling window suite overlooking a city skyline at dusk,
warm golden hour light streaming from the left, a velvet armchair
and a small side table with white orchids in the foreground

# 差的示例
in a nice room with a view
```

### 姿势多样性

四张图应该有明显的姿势/构图差异：

1. **全身站立** — 展示完整服装，略带动态（走路、回头、倚靠）
2. **半身坐姿** — 坐在椅子/台阶上，展示上半身和表情
3. **近景特写** — 面部和上半身，侧面或 3/4 角度
4. **全身动态** — 行走中、转身、互动姿势

### 光线参考

| 类型 | Prompt 描述 |
|------|-----------|
| 自然光 | soft natural window light, gentle shadows |
| 黄金时段 | golden hour warm sunlight, long shadows, warm glow |
| 影棚 | three-point studio lighting, clean white background |
| 逆光 | backlit silhouette, rim light highlighting hair and contours |
| 夜景 | city neon lights, cool blue ambient light, bokeh background |
| 阴天 | overcast diffused light, even soft illumination, no harsh shadows |

## 手部和脚部质量控制

Gemini 容易出手脚问题。在 prompt 中明确：

- **手部**："hands naturally resting on [位置], fingers relaxed and clearly separated, exactly five fingers on each hand"
- **脚部**："feet in [鞋子描述], natural standing pose, correct proportions"
- **规避**：避免复杂的手部姿势（交叉、握物），简单自然的姿势更稳定

## 超分 Prompt (Step 8b)

### 基础模板

```
Upscale this image to high resolution while preserving every detail
faithfully. Maintain the exact same composition, colors, lighting,
and facial features. Do not change, add, or remove any elements.
```

### 针对性增强

根据图片具体情况追加：

- **面部**："Pay special attention to facial features — preserve exact eye shape, skin texture, lip contour, and facial structure."
- **手部**："Ensure hands have exactly 5 fingers each with natural proportions and clear separation between fingers."
- **服装纹理**："Preserve fabric texture details — [silk sheen / knit pattern / lace detail / denim weave]."
- **背景**："Maintain background depth of field, bokeh quality, and environmental details."

### 注意事项

- 超分 prompt 要强调**保持不变**，而不是**重新生成**
- 不要在超分 prompt 中加入新的创意描述
- 如果加参考图，明确说明"use this only as detail reference, do not change the composition"

## 常见问题和修复

| 问题 | 原因 | 修复方法 |
|------|------|---------|
| 四格大小不均 | prompt 不够强调 equal grid | 加 "strictly equal 2x2 grid, exactly same size cells" |
| 人物面容不一致 | 人物描述不够具体 | 加更多面部细节，使用命名 |
| 手指数量错误 | AI 通用问题 | 明确写 "exactly five fingers on each hand" |
| 服装细节偏差 | 描述太模糊 | 加材质、颜色、剪裁具体描述 |
| 光线不一致 | 未统一光线描述 | 每格用相同的光线设置 |
| 横屏输出 | API 未设 aspect_ratio | 脚本已默认 9:16，无需担心 |

---

Sources:
- [Google DeepMind Prompt Guide](https://deepmind.google/models/gemini-image/prompt-guide/)
- [Google Developers Blog — Gemini Image Prompting](https://developers.googleblog.com/how-to-prompt-gemini-2-5-flash-image-generation-for-the-best-results/)
- [Google Cloud Best Practices](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/multimodal/gemini-image-generation-best-practices)
