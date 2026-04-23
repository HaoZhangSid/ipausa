# IPA Teaching Site

美式 IPA 教学站点，完整独立于仓库其它项目。

## 常用命令

```bash
pnpm install
pnpm build
python ./scripts/generate_audio.py
python ./scripts/crawl_commons_ipa_audio.py
```

## 目录说明

- `content/phonemes.json`: 全部 41 个音标和 164 个示例词数据源
- `content/icon-registry.json`: `iconKey` 到本地图标语义分类的映射
- `src/`: Vite + React + Tailwind 前端
- `scripts/validate-content.mjs`: 构建前内容校验
- `scripts/generate_audio.py`: Gemini 3.1 TTS 批量生成音频
- `scripts/crawl_commons_ipa_audio.py`: 通过 Wikimedia Commons API 发现/下载开放授权音频候选
- `public/audio/`: 预生成音频
- `dist/`: 最终静态站点输出

## 音频说明

- 默认模型: `gemini-3.1-flash-tts-preview`
- 默认语音: `Aoede`
- 单个音标使用固定的 Gemini transcript prompt 模板，并把当前 `symbol` 写入最后的 `## Transcript:` 段落
- 示例词使用单词本身作为输入，并带有更保守的 fallback prompt

## Commons 开放资源抓取

- 发现候选并生成报告:

```bash
python ./scripts/crawl_commons_ipa_audio.py
```

- 发现并下载每个音标的第一条候选到 `public/audio/commons-phonemes/`:

```bash
python ./scripts/crawl_commons_ipa_audio.py --download-first
```

- 只处理部分音标:

```bash
python ./scripts/crawl_commons_ipa_audio.py --ids i,ih,sh
```

Commons 会做限流，实际使用时建议：

- 一次只跑少量 `--ids`
- 保持默认或更高的 `--request-delay`
- 不要连续全量重跑

例如：

```bash
python ./scripts/crawl_commons_ipa_audio.py --ids i,ih,eh,ae --download-first --request-delay 1.2
```

这个脚本默认只使用 Wikimedia Commons API，不会去抓取 Oxford / Cambridge / Merriam-Webster 这类专有词典站点。
