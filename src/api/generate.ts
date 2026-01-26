/**
 * 画像生成APIエンドポイント
 * fal.aiを使用してImage-to-Image変換を行う
 */
import { Hono } from 'hono'
import { fal } from '@fal-ai/client'

// 環境変数の型定義
type Bindings = {
  FAL_KEY: string
}

const generateApi = new Hono<{ Bindings: Bindings }>()

/**
 * 画像生成エンドポイント
 * POST /api/generate
 * 
 * リクエストボディ:
 * - prompt: 生成プロンプト
 * - imageData: 元画像のBase64データ
 */
generateApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body = await c.req.json()
    const { prompt, imageData } = body

    // バリデーション
    if (!prompt) {
      return c.json({ 
        success: false, 
        error: 'プロンプトは必須です' 
      }, 400)
    }

    if (!imageData) {
      return c.json({ 
        success: false, 
        error: '画像データは必須です' 
      }, 400)
    }

    // fal.aiクライアントの設定
    const falKey = c.env.FAL_KEY
    if (!falKey) {
      return c.json({ 
        success: false, 
        error: 'APIキーが設定されていません' 
      }, 500)
    }

    fal.config({
      credentials: falKey
    })

    // Base64データをBlobに変換してアップロード
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const binaryData = atob(base64Data)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    const targetImageUrl = await fal.storage.upload(blob)
    
    console.log('画像をfal.aiにアップロード:', targetImageUrl)

    // プロンプトを改善：元画像の変更を明示的に指示
    const enhancedPrompt = `Transform this image: ${prompt}. Keep the same location and architecture, add the requested elements while maintaining the original scene composition.`

    console.log('画像生成開始')
    console.log('元プロンプト:', prompt)
    console.log('拡張プロンプト:', enhancedPrompt)

    // fal.ai Flux Image-to-Image APIを呼び出し
    // strength を下げて元画像の構造を保持
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: targetImageUrl,
        prompt: enhancedPrompt,
        strength: 0.55,              // 元画像を55%保持、45%を変更
        num_inference_steps: 40,     // 推論ステップ数
        guidance_scale: 7.5,         // プロンプトへの忠実度を上げる
        num_images: 1,
        enable_safety_checker: true,
        output_format: 'jpeg'
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('生成中...')
        }
      }
    })

    console.log('画像生成完了')

    // 生成された画像URLを返す
    if (result.data && result.data.images && result.data.images.length > 0) {
      return c.json({
        success: true,
        imageUrl: result.data.images[0].url,
        prompt: prompt
      })
    } else {
      return c.json({
        success: false,
        error: '画像の生成に失敗しました'
      }, 500)
    }

  } catch (error) {
    console.error('画像生成エラー:', error)
    
    let errorMessage = '不明なエラー'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>
      if (errorObj.body) {
        console.error('fal.ai エラー詳細:', errorObj.body)
      }
    }
    
    return c.json({
      success: false,
      error: `画像生成中にエラーが発生しました: ${errorMessage}`
    }, 500)
  }
})

export default generateApi
