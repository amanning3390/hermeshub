# LoRA 打標策略：概念移除原則（Concept Removal / Instance Preservation）

## 核心思想

**LoRA 要學的東西，反而不應該出現在標註中。**

原理：訓練時，模型看到「圖像 + 文字描述」。如果某個視覺特徵在所有圖中都出現，但**完全不在文字中提及**，模型就會把它歸因於 LoRA 權重本身，而不是某個特定的文字 token。

---

## 具體作法

### 你想要 LoRA 代表的東西 → 從標註中移除

```
你想訓練一個「藍色毛衣」的 LoRA：

❌ 錯誤標註（把目標寫進去了）：
"a man wearing a blue sweater, standing in a park"
→ 模型會以為 "blue sweater" 這個詞產生藍色毛衣
→ 推理時必須寫 "blue sweater" 才出現，不是 LoRA 的效果

✅ 正確標註（移除 LoRA 要學的概念）：
"a man wearing a sweater, standing in a park"
→ 你移除了 "blue"，把 "sweater" 留著
→ 但所有圖中毛衣都是藍色的
→ 模型學到：這個 LoRA = 把毛衣變藍色（不分顏色詞）
```

### 人物 LoRA 的應用

```
你想訓練一個特定人物（叫「小明」）的 LoRA：

❌ 強烈描述人物特徵：
"a man with short black hair, brown eyes, square jaw, wearing a white shirt"
→ 所有這些特徵都綁到文字上了，LoRA 學不到人物是誰

✅ 人物特徵不在標註中出現（用 trigger word 代替）：
"a photo of sks, wearing a white shirt, standing in a park"
→ "sks" 是 placeholder，不描述長相
→ 所有圖中都是同一個人
→ 模型學到：sks = 這個人的全部視覺特徵
```

---

## 更精細的控制：Constants vs Variables

### 保留在標註中的（Variables）= 你可以事後用 prompt 改變的
```
場景、服裝、光線、姿勢、背景、表情
→ 這些全部寫進 caption，保持多樣性
→ 推理時你可以透過 prompt 控制這些
```

### 從標註中移除的（Constants / LoRA 目標）= LoRA 自動帶入的
```
如果是人物 LoRA：移除臉部具體描述、體型特徵
如果是風格 LoRA：移除筆觸、色調、構圖方式
如果是物件 LoRA：移除物件的具體外觀細節
→ LoRA 本身的 weights 會記住這些
→ 推理時不需要在 prompt 中描述，LoRA 自動補上
```

---

## 實際案例對照

| 你想學的 | 圖中有 | 標註應該寫 | 標註不該寫 |
|---------|--------|-----------|-----------|
| 特定人臉 | 同一個人不同場景 | 場景、服裝、動作 | 人臉特徵、體型 |
| 紅色賽車 | 紅色法拉利各角度 | 賽車、角度、背景 | 紅色、法拉利品牌 |
| 水彩風格 | 水彩畫的各種主題 | 主題、構圖、內容 | 水彩、筆觸感 |
| 夜晚氛圍 | 夜晚場景的照片 | 場景中的具體物體 | 夜晚、黑暗、燈光 |
| 某個角色（動漫） | 角色各姿勢 | 姿勢、表情、背景 | 角色名稱、髮色、服裝 |

---

## 實戰步驟（未來你給圖時我該做的事）

1. **你給我一組圖**（eg. 某個人的 20 張照片）
2. **我識別並生成完整標註**（描述所有可見內容）
3. **你告訴我「LoRA 想學什麼」**（eg. 這個人的臉 / 這個風格 / 這個物件）
4. **我從標註中移除那個概念**
   - 人物：移除五官描述，保留服裝/場景/姿勢
   - 風格：移除風格相關詞，保留主題/內容
   - 物件：移除物件特徵，保留背景/使用情境
5. **輸出最終標註**（可用於 SimpleTuner / Kohya / ai-toolkit 訓練）

---

## 注意事項

- **完全移除 vs 部分保留**：目標概念相關的詞不要用同義詞替代，直接移除。用同義詞會混淆模型。
- **Trigger word**：建議一個獨特的單詞（如 `sks`、`ohwx`）作為 LoRA 的觸發詞，對應的就是被移除的概念。
- **不要移除太多**：如果 caption 太空（只剩 "a photo"），模型沒有足夠資訊學習變數部分。
- **各模型容忍度不同**：Flux 對自然語言的變動比較敏感，SDXL 對標籤移除的容忍度較高。

---

## 學術驗證：Caption Dropout（論文證據）

這個方法有學術論文背書！

### 論文：Few-shot multi-token DreamBooth with LoRa for style-consistent character generation
- **作者**: R. Pascual, 2026（已被引用 1 次）
- **發表於**: ScienceDirect / arXiv
- **使用的技術**: 將 `caption_dropout_rate` 設為 **0.25**（搭配 noise offset 0.1）

### 什麼是 Caption Dropout？

你的方法（手動移除目標概念）本質上是 **Caption Dropout 的主動版本**：

| | 一般的 Caption Dropout | 你的方法 |
|--|----------------------|---------|
| 方式 | 隨機丟棄 caption（某%步數完全無文字） | 手動移除特定概念的文字描述 |
| 機率 | 每步有 p% 機率丟棄 | 100% 不移除目標概念 |
| 效果 | 減少模型對文字的依賴 | 精準控制 LoRA 學什麼 |
| 適用時機 | 通用預防過擬合 | 特定概念要交給 LoRA 學習時 |

### Caption Dropout 的目的（論文驗證）

1. **減少過擬合**（Reduces Overfitting）— 防止模型過度依賴 prompt tokens，保持主體/風格對不同 prompt 的靈活性
2. **改善 prompt 遵從度**（Improves Prompt Adherence）— 偶爾讓模型在沒有文字描述的情況下學習視覺主體，顯著提升後來跟隨不同 prompt 的能力

### Caption Dropout 的運作方式

在 Kohya_ss GUI 或 SimpleTuner 中：
- 設定 `caption_dropout_rate: 0.25` → 每一步有 25% 機率該圖像的 caption 被遮罩（變成空白）
- 模型在 75% 的步驟中看到完整 caption，25% 的步驟中看到空白
- 空白時：模型只靠 LoRA weights 記住圖像特徵

### 你的方法 = 100% 目標概念 Dropout

當你從所有 caption 中移除了「LoRA 要學的概念」：
- 等於對「那個概念」實施了 **100% dropout**
- 但對「其他變數」（場景、服裝、光線）保留 0% dropout
- 結果：LoRA weights 精準吸收被移除的概念，其他變數由 prompt 控制

### 實際建議參數

如果你在 Kohya / SimpleTuner 中訓練，可以疊加使用：
```
caption_dropout_rate: 0.10-0.25    # 隨機 dropout（輔助）
# + 你的方法：手動移除目標概念（主要）
```
這樣雙重效果最好：你的方法確保 LoRA 學到目標，caption dropout 防止過擬合。
