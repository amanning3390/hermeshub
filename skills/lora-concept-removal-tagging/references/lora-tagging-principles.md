# LoRA 訓練打標籤（Tagging / Captioning）原理與注意事項

## 一、核心原理：LoRA 如何「理解」你的文字

LoRA 訓練的本質是**讓模型學到文字描述與圖像內容之間的對應關係**。

每張訓練圖對都包含：
- **圖像**：模型看到的像素資訊
- **文字（caption / tags）**：告訴模型「這是什麼」

訓練時，模型會嘗試從文字預測圖像內容。你的標註品質直接決定了 LoRA 學到什麼、學得多準。

---

## 二、最重要的原則：Constants vs Variables（常數 vs 變數）

這是最關鍵的概念：

- **Constants（常數）**：在所有圖像中**一致地描述**的元素 → LoRA 會把它當作固定特徵來學習
- **Variables（變數）**：在不同圖像中用不同方式描述的元素 → LoRA 會保留靈活性

### 實例說明

你想訓練一個角色的 LoRA（黑髮女性）：

```
好標註（清楚區分常數與變數）：
  ❌ bad: "1girl"（太簡略，沒描述關鍵特徵）
  ✅ good: "a woman with long black hair and brown eyes, wearing a red dress, standing in a garden, smiling"
  ✅ good: "a woman with long black hair and brown eyes, wearing a white shirt, sitting in a cafe, serious expression"

兩張圖都有 "long black hair and brown eyes" → 這是常數，LoRA 會學到
兩張圖 dress/background/expression 不同 → 這是變數，LoRA 保留靈活性
```

---

## 三、不同模型架構的標註偏好

### 1. Flux 系列（Flux.1, Flux.2）
- **偏好**：自然語言描述（natural language captions）
- **不要**：booru 標籤轟炸（`1girl, black_hair, smile`）
- **格式**：完整的英文句子
- **範例**："A young woman with long black hair, fair skin, and brown eyes, wearing a casual white t-shirt, standing in a sunlit park with trees in the background."

原因：Flux 使用 T5/Mistral text encoder，對自然語言的理解遠優於關鍵詞。

### 2. SDXL / SD 1.5
- **偏好**：booru 風格標籤（comma-separated tags）
- **格式**：逗號分隔的關鍵詞
- **範例**：`1girl, black_hair, long_hair, brown_eyes, smile, solo, outdoors, park, day`

原因：SDXL 使用 CLIP text encoder，訓練資料以標籤為主。

### 3. Pony / Illustrious / NoobAI（SDXL 動漫分支）
- **同 SDXL**，但**必須加上品質前綴**
- Pony: `score_9, score_8_up, score_7_up, ...`
- Illustrious: `masterpiece, best quality, very aesthetic, absurdres`
- NoobAI: `masterpiece, best quality, newest, absurdres, highres`

### 4. Anima
- **偏好**：自然語言描述或混合
- 支援關鍵詞與描述，建議用 JoyCaption / Florence-2 生成

### 5. Ideogram 4
- **偏好**：結構化描述
- SimpleTuner 支援結構化 JSON captions
- 使用自然語言但避免過短

### 6. Z-Image / AuraFlow
- **偏好**：簡潔自然語言
- 與 Flux 類似，對自然語言反應較好

---

## 四、決定標註風格的關鍵因素

不是你想用哪種風格，而是**模型的 text encoder 決定一切**：

| Text Encoder 類型 | 代表模型 | 適合的標註 |
|------------------|---------|-----------|
| CLIP-L / CLIP-L+ G | SDXL, SD 1.5 | booru 關鍵詞 |
| T5-XXL | Flux.1, SD3, AuraFlow | 自然語言 |
| Mistral-3 (24B) | Flux.2 dev | 自然語言 |
| Qwen3 / Gemma2 | Flux.2 klein, Ideogram 4 | 自然語言 |
| UMT5 | ACE-Step, AuraFlow | 自然語言 |
| CLIP + T5 | HiDream | 混合可行 |

---

## 五、常見錯誤與注意事項

### ⚠️ 錯誤 1：所有圖用完全相同的 caption
```
❌ 所有圖都標 "1girl"
→ LoRA 不知道每張圖的區別，只能學到模糊的概念
✅ 每張圖描述不同的姿勢、表情、背景，但保留共通特徵
```

### ⚠️ 錯誤 2：caption 太長充滿不相關細節
```
❌ "a young woman with long flowing black hair... wearing a red dress with white polka dots... standing in a park on a sunny day with a wooden bench..."
→ 背景細節太多，LoRA 可能連背景一起學
✅ 只描述對 LoRA 目標重要的特徵
```

### ⚠️ 錯誤 3：標籤與實際不符（mislabeling）
```
❌ 圖中明明是短髮，卻標 "long_hair"
→ 模型矛盾，降低 LoRA 品質
✅ 檢查每張圖的標註是否準確
```

### ⚠️ 錯誤 4：數據集中某個屬性出現率過高
```
❌ 30 張圖中有 27 張穿白色上衣（87%）
→ LoRA 會認為白色上衣是角色的一部分
✅ 確保訓練集中屬性的多樣性
```

### ⚠️ 錯誤 5：使用 AI 生成圖作為訓練集
```
❌ 用 Midjourney/DALL-E 生成的圖訓練 LoRA
→ 生成的圖品質不穩，且可能帶有偽影
✅ 盡量使用真實照片或高品質人工繪圖
```

### ⚠️ 錯誤 6：圖像尺寸不一致
```
❌ 混用 512x512, 1024x1024, 1920x1080
→ 訓練效率低，模型困惑
✅ 統一裁剪/縮放到訓練目標解析度
```

---

## 六、數據集準備清單

### 圖像品質
- [ ] 解析度一致（對齊訓練目標）
- [ ] 無模糊（用 Laplacian 檢測）
- [ ] 無重複（dHash + 人臉比對）
- [ ] 主體清晰、可辨識
- [ ] 避免低品質或壓縮嚴重的圖片

### 多樣性
- [ ] 多角度（正面、側面、3/4）
- [ ] 多表情（微笑、嚴肅、中性）
- [ ] 多背景（不同場景，減少過擬合）
- [ ] 多光線條件（自然光、室內光）
- [ ] 多服裝（如果目標是角色而非特定服裝）

### 數量建議
| LoRA 類型 | 建議數量 | 
|-----------|---------|
| 角色（寫實） | 20-50 張 |
| 角色（動漫） | 20-40 張 |
| 風格 | 15-30 張 |
| 物件 | 20-40 張（多角度） |
| 概念 | 30-100 張 |

數量不是重點，**品質和多樣性才是**。15 張精心挑選的照片遠勝 100 張亂湊的圖。

---

## 七、總結

1. **標註的品質直接決定 LoRA 的品質** — 花最多時間在這裡
2. **了解你的模型** — CLIP 吃標籤，T5/Mistral 吃自然語言
3. **Constants vs Variables** — 固定特徵保持一致，變動部分保持變化
4. **數據集多樣性** — 避免某個屬性出現率過高
5. **驗證你的標註** — 不要完全信任自動標註工具
