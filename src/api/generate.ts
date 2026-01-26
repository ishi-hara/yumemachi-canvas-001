/**
 * 画像生成APIエンドポイント
 * fal.aiを使用してImage-to-Image変換を行う
 * 
 * パラメータはフロントエンドで計算され、APIに渡される
 * - strength: 元画像からの変更度合い
 * - steps: 推論ステップ数
 * - guidance: プロンプトへの忠実度
 * - negativePrompt: 除外したい要素
 */
import { Hono } from 'hono'
import { fal } from '@fal-ai/client'

// 環境変数の型定義
type Bindings = {
  FAL_KEY: string
}

// リクエストボディの型定義
interface GenerateRequest {
  prompt: string
  imageData: string
  negativePrompt?: string
  strength?: number
  steps?: number
  guidance?: number
}

const generateApi = new Hono<{ Bindings: Bindings }>()

/**
 * 画像生成エンドポイント
 * POST /api/generate
 * 
 * リクエストボディ:
 * - prompt: 生成プロンプト（必須）
 * - imageData: 元画像のBase64データ（必須）
 * - negativePrompt: ネガティブプロンプト（任意）
 * - strength: 元画像からの変更度合い（任意、デフォルト0.40）
 * - steps: 推論ステップ数（任意、デフォルト35）
 * - guidance: プロンプトへの忠実度（任意、デフォルト7.0）
 */
generateApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body: GenerateRequest = await c.req.json()
    const { 
      prompt, 
      imageData, 
      negativePrompt,
      strength = 0.40,
      steps = 35,
      guidance = 7.0
    } = body

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
    
    console.log('=== fal.ai 画像生成開始 ===')
    console.log('画像URL:', targetImageUrl)
    console.log('プロンプト:', prompt)
    console.log('ネガティブプロンプト:', negativePrompt || 'なし')
    console.log('パラメータ:', { strength, steps, guidance })

    // fal.ai API入力パラメータを構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const falInput: Record<string, any> = {
      image_url: targetImageUrl,
      prompt: prompt,
      strength: strength,
      num_inference_steps: steps,
      guidance_scale: guidance,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg'
    }

    // ネガティブプロンプトがあれば追加
    // ※ fal-ai/flux/dev/image-to-image が対応していない場合はエラーになる可能性あり
    // その場合は削除が必要
    if (negativePrompt) {
      falInput.negative_prompt = negativePrompt
    }

    // fal.ai Flux Image-to-Image APIを呼び出し
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: falInput,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('生成中...')
        }
      }
    })

    console.log('=== 画像生成完了 ===')

    // 生成された画像URLを返す
    if (result.data && result.data.images && result.data.images.length > 0) {
      return c.json({
        success: true,
        imageUrl: result.data.images[0].url,
        prompt: prompt,
        params: { strength, steps, guidance }
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
        
        // ネガティブプロンプトが原因のエラーかチェック
        const bodyStr = JSON.stringify(errorObj.body)
        if (bodyStr.includes('negative_prompt')) {
          console.warn('注意: negative_prompt がサポートされていない可能性があります')
        }
      }
    }
    
    return c.json({
      success: false,
      error: `画像生成中にエラーが発生しました: ${errorMessage}`
    }, 500)
  }
})

export default generateApi
