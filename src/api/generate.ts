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

// 元画像のURL（fal.aiからアクセス可能な公開URL）
// 注意: このURLはfal.aiがダウンロードできる公開URLである必要があります
let uploadedImageUrl: string | null = null

/**
 * 画像アップロードエンドポイント
 * POST /api/generate/upload
 * 
 * ベース画像をfal.aiにアップロードしてURLを取得
 */
generateApi.post('/upload', async (c) => {
  try {
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

    // リクエストボディからBase64画像データを取得
    const body = await c.req.json()
    const { imageData } = body

    if (!imageData) {
      return c.json({
        success: false,
        error: '画像データが必要です'
      }, 400)
    }

    // Base64データをBlobに変換
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const binaryData = atob(base64Data)
    const bytes = new Uint8Array(binaryData.length)
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/jpeg' })

    // fal.aiにアップロード
    const url = await fal.storage.upload(blob)
    uploadedImageUrl = url

    console.log('画像アップロード完了:', url)

    return c.json({
      success: true,
      imageUrl: url
    })

  } catch (error) {
    console.error('画像アップロードエラー:', error)
    const errorMessage = error instanceof Error ? error.message : '不明なエラー'
    return c.json({
      success: false,
      error: `画像アップロード中にエラーが発生しました: ${errorMessage}`
    }, 500)
  }
})

/**
 * 画像生成エンドポイント
 * POST /api/generate
 * 
 * リクエストボディ:
 * - prompt: 生成プロンプト
 * - imageUrl: 元画像のURL（fal.aiアップロード済みURL、またはBase64）
 */
generateApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body = await c.req.json()
    const { prompt, imageUrl, imageData } = body

    // バリデーション
    if (!prompt) {
      return c.json({ 
        success: false, 
        error: 'プロンプトは必須です' 
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

    console.log('画像生成開始:', { prompt })

    // 使用する画像URLを決定
    let targetImageUrl: string

    if (imageData) {
      // Base64データがある場合はアップロード
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      const binaryData = atob(base64Data)
      const bytes = new Uint8Array(binaryData.length)
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' })
      targetImageUrl = await fal.storage.upload(blob)
      console.log('画像をfal.aiにアップロード:', targetImageUrl)
    } else if (imageUrl && imageUrl.startsWith('https://fal.media')) {
      // 既にfal.aiにアップロード済みのURL
      targetImageUrl = imageUrl
    } else if (uploadedImageUrl) {
      // 事前にアップロードされた画像を使用
      targetImageUrl = uploadedImageUrl
    } else {
      // デフォルト: fal.aiのサンプル画像（テスト用）
      targetImageUrl = 'https://fal.media/files/koala/Chls9L2ZnvuipUTEwlnJC.png'
      console.log('デフォルトのサンプル画像を使用')
    }

    // fal.ai Flux Image-to-Image APIを呼び出し
    const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
      input: {
        image_url: targetImageUrl,
        prompt: prompt,
        strength: 0.85,
        num_inference_steps: 40,
        guidance_scale: 3.5,
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
