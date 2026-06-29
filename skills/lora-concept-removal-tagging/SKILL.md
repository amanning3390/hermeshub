---
name: lora-concept-removal-tagging
description: Use when user gives you images and asks you to tag them for LoRA training — you identify content, remove the target concept from captions so LoRA weights absorb it, and output clean tags. Backed by caption-dropout research.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [lora, tagging, captioning, concept-removal, caption-dropout, training]
    related_skills: [comfyui-lora-base-model-selection]
---

# LoRA Concept Removal Tagging

## Overview

用戶給你一批圖像，你識別內容並打標，然後**移除用戶想要 LoRA 學習的概念**。根據論文驗證（Pascual 2026, "Few-shot multi-token DreamBooth with LoRa"），這種方法本質上是 **Caption Dropout 的主動精準版本**：等於對目標概念實施 100% Dropout，讓 LoRA weights 吸收該概念。

## Core Principle

**LoRA 要學的東西，不該出現在標註中。**

訓練時，模型看到「圖像 + 文字描述」。如果某個視覺特徵在所有圖中都出現，但**完全不在文字中提及**，模型會把該特徵歸因於 LoRA 權重本身，而不是特定的文字 token。

Academic backing: `caption_dropout_rate: 0.10-0.25` randomly drops captions to reduce text-overreliance. Your method achieves the same effect **intentionally and precisely**.

## When to Use

Use this skill when the user:
- Gives you images and asks you to tag them for LoRA training
- Says something like "幫忙打標" or "幫我識別圖中內容"
- Wants to train a LoRA (character / style / object / concept)
- Asks you to "移除概念" or "泛化" from captions

## Workflow

### Step 1: Receive images + concept

Get from user:
- **Image set** (typically 15-50 images)
- **Target concept** — what should the LoRA represent?
  - Person's face/identity
  - Artistic style
  - Specific object
  - Clothing item
  - Color scheme
  - Environment/atmosphere

### Step 2: Scan and analyze the image set

Before writing any caption:
- Identify consistent elements across all images (these are potential LoRA targets)
- Identify varying elements (these stay in captions)
- Note the concept the user wants to **remove**

### Step 3: Generate complete captions

Describe **everything** visible:
- Subject and attributes
- Clothing, colors, textures
- Background and environment
- Lighting and atmosphere
- Pose and expression
- Composition and framing

Use natural language for Flux/T5-based models, tags for CLIP-based models (based on model text encoder).

### Step 4: Remove the target concept

Apply concept removal based on type:

#### For Character/Person LoRA
```
Before (complete):
"a young East Asian woman with long black hair, brown eyes, fair skin,
wearing a white blouse, standing in a coffee shop, soft lighting, smiling"

After (concept removed — face/identity removed):
"wearing a white blouse, standing in a coffee shop, soft lighting, smiling"
```

**Remove**: hair color, eye color, skin tone, face shape, body type, distinctive facial features
**Keep**: clothing, scene, lighting, pose, expression, camera angle, props

#### For Style LoRA
```
Before:
"a watercolor painting of a mountain landscape, loose brushstrokes,
soft color palette, painterly texture, paper texture visible"

After:
"a mountain landscape"
```

**Remove**: medium, brush technique, color treatment, texture, artistic vocabulary
**Keep**: subject matter, composition, content elements

#### For Object LoRA
```
Before:
"a red vintage Nikon F film camera with a 50mm lens, leather texture,
sitting on a wooden desk"

After:
"sitting on a wooden desk"
```

**Remove**: object identity, color, brand, material, specific model features
**Keep**: context, background, lighting, surrounding environment

#### For Color/Style Concept LoRA
```
Before:
"a bedroom with blue walls, white furniture, pastel blue curtains,
natural light streaming in"

After (learn "blue aesthetic"):
"a bedroom with white furniture, natural light streaming in"
```

**Remove**: the specific color/style you want to generalize
**Keep**: everything else

### Step 5: Output format

Present to user as:
```markdown
## 原始完整標註（for reference）
[description of everything]

## 概念移除後標註（ready for training）
[final captions with target concept removed]

## 已移除的概念
[list of removed elements]

## 建議訓練參數
caption_dropout_rate: 0.10-0.25  (optional add-on)
```

## Model-Specific Handling

Different text encoders handle concept removal differently:

| Text Encoder | Model Examples | Caption Style | Concept Removal Sensitivity |
|---|---|---|---|
| CLIP-L / CLIP-G | SDXL, SD 1.5 | booru tags | High — removing 1-2 tags works well |
| T5-XXL | Flux.1, SD3, AuraFlow | Natural language | Medium — remove sentences/clauses |
| Mistral-3 (24B) | Flux.2 dev | Natural language | Medium — model can infer missing info |
| Qwen3 / Gemma2 | Flux.2 klein, Ideogram 4 | Natural language | Medium |
| UMT5 | ACE-Step, AuraFlow | Natural language | Low — needs careful removal |

**Guideline**: For CLIP models, removal of specific tags is straightforward. For T5-based models, ensure the remaining text still forms coherent sentences — don't leave grammatically broken fragments.

## Optimization Tips

### Double strategy (recommended)
```yaml
# In training config:
caption_dropout_rate: 0.10-0.25    # random dropout (prevents overfitting)
# + concept removal in captions     # intentional dropout (teaches LoRA target)
```

### Quantity rules
- **Removed too little**: LoRA doesn't learn the concept well (it's still tied to text)
- **Removed too much**: Caption too short → model has no context for variations
- **Sweet spot**: 30-60% of the caption content removed, leaving enough context for scene/pose/variation

### Trigger word approach
For character LoRAs, use a unique token that replaces the removed concept:
```
"a photo of TOK, wearing a white shirt, in a coffee shop"
```
Where `TOK` is a rare/unique word (not in base model vocab). The unique token acts as an anchor for the removed visual features.

## Common Pitfalls

1. ❌ **Using synonyms for the removed concept** — If you replace "blue" with "azure" in some captions and "cerulean" in others, the model thinks these are DIFFERENT concepts. Either keep it consistent or remove entirely.
2. ❌ **Inconsistent removal across images** — If you remove face features from 18/20 images but describe them in 2, the model gets confused. Be 100% consistent.
3. ❌ **Removing too much context** — If caption says only "a photo" with no other info, the model can't learn pose/lighting/background variations. Leave enough for diversity.
4. ❌ **Forgetting to note the removed concept** — Always tell the user what you removed so they know what the LoRA will learn.
5. ❌ **Applying concept removal to images where the concept isn't present** — If one of 20 person-photos doesn't show the face, don't remove face from that one (or remove differently).
6. ❌ **Not accounting for the model's text encoder** — CLIP needs tag removal, T5 needs sentence-level removal. Using the wrong style reduces effectiveness.

## Verification Checklist

- [ ] User told me the target concept
- [ ] I scanned all images for consistency
- [ ] Complete captions generated (describing everything)
- [ ] Target concept removed from ALL captions
- [ ] Removal is 100% consistent across the set
- [ ] Remaining text is coherent (for natural language models)
- [ ] Remaining text preserves diversity of variables
- [ ] Output clearly shows: original, removed, final
- [ ] Training parameter recommendation included (caption_dropout_rate)

## References

- Pascual, R. (2026). "Few-shot multi-token DreamBooth with LoRa for style-consistent character generation." ScienceDirect / arXiv. Used `caption_dropout_rate: 0.25`.
- Kohya_ss GUI: `caption_dropout_rate` parameter randomly masks captions at given probability per step.
- Rule of Constants & Variables: consistent descriptions = learned constants, varied descriptions = flexible variables.
- Companion skill: `comfyui-lora-base-model-selection` for choosing the optimal base model.

Reference files in this skill:
- `references/caption-dropout-research.md` — academic validation details
- `references/model-comparison-2026.md` — VRAM, parameters, and tool comparison across models
- `references/model-specific-tagging.md` — per-model tagging strategies (Flux, SDXL, Anima, Ideogram 4, Z-Image) with caption style, removal sensitivity, and recommended training parameters.
