---
name: crisis-detection
description: "Proactively detect mental health crisis indicators in user conversations using a 5-tier evidence-based framework, assess risk levels, and provide graduated intervention responses with crisis resources. Use when user expresses suicidal ideation, self-harm, hopelessness, or uses /crisis, /assess, /check commands."
version: "2.0.0"
license: MIT
compatibility: No external dependencies. Multi-language support (English, Chinese, Japanese, Korean).
metadata:
  author: Francis Tse
  hermes:
    tags: [Mental-Health, Crisis-Detection, Safety, CBT, Suicide-Prevention, Emotional-Support, Health]
    category: health
    related_skills: [praise-group]
---

# Mental Health Crisis Detection

Proactively detect mental health crisis indicators, assess risk levels using a multi-tier evidence-based framework, and provide graduated intervention responses that prioritize safety, empathy, and appropriate resource referral.

## When to Use

- User expresses suicidal ideation, self-harm, or hopelessness
- User says `/crisis`, `/assess`, `/check`
- Conversation reveals linguistic patterns of distress
- Behavioral indicators emerge (sleep disruption, social withdrawal)
- Passive monitoring detects escalating risk patterns

## Quick Reference

### Risk Levels

| Score | Level | Response |
|-------|-------|----------|
| 0 | Normal | Standard interaction |
| 1 | Low | Supportive awareness |
| 2-3 | Moderate | Enhanced attention + coping strategies |
| 4-5 | High | Crisis support + resource referral |
| 6+ | Critical | Immediate intervention + safety check |

### Crisis Hotlines

| Region | Hotline | Notes |
|--------|---------|-------|
| US/Canada | 988 | Suicide & Crisis Lifeline, 24/7 |
| Hong Kong | 18111 | Government Mental Health Hotline, 24/7 |
| Taiwan | 1995 | Suicide Prevention Center, 24/7 |
| UK | 116 123 | Samaritans, 24/7 |
| Australia | 13 11 14 | Lifeline, 24/7 |
| Japan | 0570-064-556 | 24/7 |
| South Korea | 1393 | Suicide Prevention Hotline, 24/7 |

## Procedure

### Critical Indicators (Immediate Response)

**Direct Self-Harm Language:**
- "don't want to live" / "suicide" / "kill myself"
- "end it all" / "end my life"
- "不想活了" / "自殺" / "死にたい"

**Critical Response:**
1. Validate their courage in sharing immediately
2. Express genuine concern without being clinical
3. Provide crisis resources prominently
4. Ask directly: "Are you safe right now?"

### High-Risk Indicators

- "no point" / "hopeless" / "worthless"
- "can't go on" / "give up" / "tired of living"
- "nobody cares" / "alone" / "burden to everyone"

**High Risk Response:**
1. Validate their experience deeply
2. Provide warm emotional support
3. Gently suggest professional help
4. Frame help-seeking as strength

### Moderate-Risk Indicators

- Persistent self-deprecation
- Academic/work despair
- Social withdrawal
- Sleep/appetite disruption

**Moderate Risk Response:**
1. Acknowledge their struggle
2. Build resilience
3. Normalize seeking support
4. Offer coping strategies

## Pitfalls

### False Positive Sources
- Sarcasm/Irony may appear distressing literally
- Discussing mental health topics does NOT equal personal crisis
- Temporary emotional reactions vs. patterns

### False Negative Sources
- Subtle/gradual onset
- Indirect expression (especially in East Asian contexts)
- Cultural communication styles

## Verification

### Quality Standards
1. Timeliness - Detect signals early
2. Accuracy - Minimize false negatives
3. Empathy - Genuine, not clinical
4. Appropriateness - Match response to risk level
5. Cultural sensitivity
6. Follow-through

## Disclaimer

This skill provides crisis detection and emotional support, **not** professional counseling. Always encourage users to seek professional help for serious mental health concerns.

## Usage

```
/crisis [user's message]
/assess [user's message]
/check [user's message]
```
