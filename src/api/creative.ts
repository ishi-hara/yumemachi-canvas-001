/**
 * 創造性モード画像生成APIエンドポイント
 * GPT-Image-1.5 (images/generations) を使用して画像を生成
 * 
 * POST /api/creative
 * リクエストボディ: { prompt: string }
 * レスポンス: { success: boolean, imageUrl?: string, error?: string }
 */
import { Hono } from 'hono'

// 環境変数の型定義
type Bindings = {
  OPENAI_API_KEY: string
}

// リクエストボディの型定義
interface CreativeRequest {
  prompt: string
}

const creativeApi = new Hono<{ Bindings: Bindings }>()

/**
 * 創造性モード画像生成エンドポイント
 * POST /api/creative
 */
creativeApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body: CreativeRequest = await c.req.json()
    const { prompt } = body

    // バリデーション
    if (!prompt || prompt.trim().length === 0) {
      return c.json({
        success: false,
        error: 'プロンプトは必須です'
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

    console.log('=== GPT-Image-1.5 画像生成開始 ===')
    console.log('プロンプト:', prompt)

    // OpenAI Images API 呼び出し (GPT-Image-1.5 / gpt-image-1)
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI Images API エラー:', response.status, errorData)
      return c.json({
        success: false,
        error: `OpenAI Images API エラー: ${response.status}`
      }, 500)
    }

    const data = await response.json() as {
      data?: Array<{
        url?: string
        b64_json?: string
      }>
    }

    console.log('=== GPT-Image-1.5 画像生成完了 ===')

    // 生成された画像URLを返す
    if (data.data && data.data.length > 0) {
      const imageData = data.data[0]
      
      // URL または Base64 で返す
      if (imageData.url) {
        return c.json({
          success: true,
          imageUrl: imageData.url,
          prompt: prompt
        })
      } else if (imageData.b64_json) {
        // Base64の場合はData URIとして返す
        return c.json({
          success: true,
          imageUrl: `data:image/png;base64,${imageData.b64_json}`,
          prompt: prompt
        })
      }
    }

    return c.json({
      success: false,
      error: '画像の生成に失敗しました'
    }, 500)

  } catch (error) {
    console.error('創造性モード画像生成エラー:', error)

    let errorMessage = '不明なエラー'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return c.json({
      success: false,
      error: `画像生成中にエラーが発生しました: ${errorMessage}`
    }, 500)
  }
})

export default creativeApi
