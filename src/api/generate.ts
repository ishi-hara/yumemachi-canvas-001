/**
 * 画像生成APIエンドポイント
 * fal.ai Inpainting APIを使用してマスク領域のみを変更する
 * 
 * パラメータはフロントエンドで計算され、APIに渡される
 * - imageData: 元画像のBase64データ
 * - maskData: マスク画像のBase64データ（白=変更領域、黒=固定領域）
 * - strength: 変更の強度
 * - steps: 推論ステップ数
 * - guidance: プロンプトへの忠実度
 * - negativePrompt: 除外したい要素
 * - referenceImageUrl: 参考画像の相対パス（本番URLに変換してfal.aiに渡す）
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
  maskData: string
  negativePrompt?: string
  strength?: number
  steps?: number
  guidance?: number
  referenceImageUrl?: string  // 参考画像の相対パス（/static/images/references/...）
}

// 本番環境のベースURL
const PRODUCTION_BASE_URL = 'https://yumemachi-canvas.pages.dev'

const generateApi = new Hono<{ Bindings: Bindings }>()

/**
 * Base64データをBlobに変換してfal.aiにアップロード
 * @param base64Data - Base64エンコードされた画像データ
 * @param mimeType - MIMEタイプ
 * @returns アップロードされた画像のURL
 */
async function uploadBase64Image(base64Data: string, mimeType: string): Promise<string> {
  const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const binaryData = atob(base64)
  const bytes = new Uint8Array(binaryData.length)
  for (let i = 0; i < binaryData.length; i++) {
    bytes[i] = binaryData.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })
  return await fal.storage.upload(blob)
}

/**
 * 画像生成エンドポイント（Inpainting）
 * POST /api/generate
 * 
 * リクエストボディ:
 * - prompt: 生成プロンプト（必須）
 * - imageData: 元画像のBase64データ（必須）
 * - maskData: マスク画像のBase64データ（必須）
 * - negativePrompt: ネガティブプロンプト（任意）
 * - strength: 変更の強度（任意、デフォルト0.52）
 * - steps: 推論ステップ数（任意、デフォルト35）
 * - guidance: プロンプトへの忠実度（任意、デフォルト7.0）
 * - referenceImageUrl: 参考画像の相対パス（任意）
 */
generateApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body: GenerateRequest = await c.req.json()
    const { 
      prompt, 
      imageData, 
      maskData,
      negativePrompt,
      strength = 0.52,
      steps = 35,
      guidance = 7.0,
      referenceImageUrl
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
        error: '元画像データは必須です' 
      }, 400)
    }

    if (!maskData) {
      return c.json({ 
        success: false, 
        error: 'マスク画像データは必須です' 
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

    // 元画像をアップロード
    const imageUrl = await uploadBase64Image(imageData, 'image/jpeg')
    console.log('元画像アップロード完了:', imageUrl)

    // マスク画像をアップロード
    const maskUrl = await uploadBase64Image(maskData, 'image/png')
    console.log('マスク画像アップロード完了:', maskUrl)

    // 参考画像がある場合は本番URLに変換
    let fullReferenceUrl: string | null = null
    if (referenceImageUrl) {
      // 相対パスを本番URLに変換
      fullReferenceUrl = PRODUCTION_BASE_URL + referenceImageUrl
      console.log('参考画像URL:', fullReferenceUrl)
    }

    console.log('=== fal.ai Inpainting 開始 ===')
    console.log('プロンプト:', prompt)
    console.log('ネガティブプロンプト:', negativePrompt || 'なし')
    console.log('参考画像:', fullReferenceUrl || 'なし')
    console.log('パラメータ:', { strength, steps, guidance })

    // fal.ai Inpainting API入力パラメータを構築
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const falInput: Record<string, any> = {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt: prompt,
      strength: strength,
      num_inference_steps: steps,
      guidance_scale: guidance,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg'
    }

    // ネガティブプロンプトがあれば追加
    // ※ Inpainting APIが対応していない場合はエラーになる可能性あり
    if (negativePrompt) {
      falInput.negative_prompt = negativePrompt
    }

    // 注意: fal-ai/flux-general/inpainting は reference_image_url をサポートしていない
    // 参考画像はプロンプトに建物名として反映される（フロントエンドで処理済み）
    // 将来的に対応するAPIが見つかれば、ここで参考画像URLを追加可能
    if (fullReferenceUrl) {
      console.log('参考画像URL（現在は未使用）:', fullReferenceUrl)
      // falInput.reference_image_url = fullReferenceUrl  // 未サポートのためコメントアウト
    }

    // fal.ai Flux General Inpainting APIを呼び出し
    const result = await fal.subscribe('fal-ai/flux-general/inpainting', {
      input: falInput,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log('生成中...')
        }
      }
    })

    console.log('=== Inpainting 完了 ===')

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
