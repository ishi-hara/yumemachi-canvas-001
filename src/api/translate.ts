/**
 * 自動プロンプト生成APIエンドポイント
 * GPT-4.1-mini を使用して日本語の自由文を英語のInpaintingプロンプトに変換
 * 
 * POST /api/translate-prompt
 * リクエストボディ: { text: string }
 * レスポンス: { success: boolean, prompt?: string, error?: string }
 */
import { Hono } from 'hono'

// 環境変数の型定義
type Bindings = {
  OPENAI_API_KEY: string
}

// リクエストボディの型定義
interface TranslateRequest {
  text: string
}

const translateApi = new Hono<{ Bindings: Bindings }>()

// システムメッセージ（プロンプト生成ルール）
const SYSTEM_MESSAGE = `You are a prompt generator for fal.ai image inpainting using the model fal-ai/flux-general/inpainting.

Your task:
- Convert a short Japanese user request into a SINGLE English image-generation prompt.
- The output MUST be construction-style instructions, not a description or narration.
- The output MUST be directly usable as a fal.ai inpainting prompt.

Strict rules:
- Write in English ONLY.
- Output ONLY the final prompt text. No explanations, no greetings, no acknowledgements.
- NEVER use first-person language (I, we, understood, will, should, here is, etc.).
- NEVER write descriptive or narrative sentences.
- Use ONLY imperative construction verbs such as:
  Remove, Install, Include, Keep, Capture.
- Allow imperative prohibition sentences such as:
  "Do not generate the scene without people."

Inpainting rules:
- Always assume the original central flower bed is completely removed.
- ALWAYS include the following sentence as the FIRST line of the output:
  "The original flower bed is completely removed and replaced."
- Modify ONLY the masked central plaza area.
- Keep existing station buildings, roads, and rotary completely unchanged.

Physical specification rules:
- Always specify numeric ranges for size and scale (meters).
- Always specify whether the installation is active, operating, or open to the public.
- Always specify ground contact, base structure, or foundation type.

People rules (ENHANCED, MANDATORY):
- If the request implies public use, ALWAYS include people.
- People are a mandatory structural element of the scene.
- The output is INVALID if people are not included.
- Explicitly forbid generating scenes without people.
- Increase crowd density by default:
  specify no fewer than 10 people unless explicitly requested otherwise.
- Specify the number of people with numeric ranges (e.g., 20–40 people).
- Specify age ranges for children if children are implied.
- Specify clear, observable actions using verbs such as:
  playing, running, laughing, talking, pointing, watching, walking.
- Explicitly require visible facial expressions and gestures
  (e.g., smiling faces, expressive body language).
- Explicitly state that people are clearly visible, expressive, and in focus.

Architectural creativity rules (CONTROLLED):
- Allow creative and contemporary architectural design elements.
- Encourage distinctive forms, materials, or structures
  (e.g., curved geometry, layered volumes, canopy structures),
  while maintaining realistic, buildable architecture.
- Do NOT allow abstract, surreal, or non-physical designs.
- Always ensure the structure appears functional and structurally plausible.

Photography rules:
- Always include photorealistic, professional photography.
- Always include natural daylight.
- Always include wide-angle composition that shows both people and architecture clearly.

Negative constraints:
- Always include a negative section at the end.
- Include at least:
  No text, no logos, no watermarks.
  No signage changes.
  No distorted geometry, no extra buildings.
  No blurry faces, no deformed hands, no extra limbs.
  No cartoon, no illustration, no low resolution.`

/**
 * 自動プロンプト生成エンドポイント
 * POST /api/translate-prompt
 */
translateApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body: TranslateRequest = await c.req.json()
    const { text } = body

    // バリデーション
    if (!text || text.trim().length === 0) {
      return c.json({
        success: false,
        error: 'テキストは必須です'
      }, 400)
    }

    // OpenAI APIキーの確認
    const apiKey = c.env.OPENAI_API_KEY
    if (!apiKey) {
      return c.json({
        success: false,
        error: 'OpenAI APIキーが設定されていません'
      }, 500)
    }

    console.log('=== GPT-4.1-mini プロンプト生成開始 ===')
    console.log('入力テキスト:', text)

    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: SYSTEM_MESSAGE
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API エラー:', response.status, errorData)
      return c.json({
        success: false,
        error: `OpenAI API エラー: ${response.status}`
      }, 500)
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string
        }
      }>
    }

    // レスポンスからプロンプトを抽出
    const generatedPrompt = data.choices?.[0]?.message?.content?.trim()

    if (!generatedPrompt) {
      return c.json({
        success: false,
        error: 'プロンプトの生成に失敗しました'
      }, 500)
    }

    console.log('=== 生成されたプロンプト ===')
    console.log(generatedPrompt)

    return c.json({
      success: true,
      prompt: generatedPrompt,
      originalText: text
    })

  } catch (error) {
    console.error('プロンプト生成エラー:', error)

    let errorMessage = '不明なエラー'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return c.json({
      success: false,
      error: `プロンプト生成中にエラーが発生しました: ${errorMessage}`
    }, 500)
  }
})

export default translateApi
