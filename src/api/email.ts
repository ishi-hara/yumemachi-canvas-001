/**
 * メール送信APIエンドポイント
 * 設定内容確認画面から送信されるデータをメールで送信
 * 生成画像を添付ファイルとして送信
 * 
 * POST /api/send-email
 * リクエストボディ: { nickname, imageMode, building, freeText, autoPrompt, imageUrl }
 * レスポンス: { success: boolean, error?: string }
 */
import { Hono } from 'hono'

// 環境変数の型定義
type Bindings = {
  RESEND_API_KEY?: string
}

// リクエストボディの型定義
interface EmailRequest {
  nickname: string
  imageMode: string
  building: string
  freeText: string
  autoPrompt: string
  imageUrl?: string  // 生成画像のURL
}

const emailApi = new Hono<{ Bindings: Bindings }>()

// メール送信先
const EMAIL_TO = 'tetsuishi555@gmail.com'
const EMAIL_SUBJECT = '<Yumecan> ゆめきゃん画像生成'

/**
 * 画像URLからBase64データを取得
 * @param imageUrl - 画像のURL
 * @returns Base64エンコードされた画像データ
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ content: string; filename: string } | null> {
  try {
    console.log('画像取得開始:', imageUrl)
    
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.error('画像取得エラー:', response.status)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    // Base64エンコード
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    
    // ファイル名を生成（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `yumemachi_canvas_${timestamp}.jpg`
    
    console.log('画像取得完了:', filename, 'サイズ:', bytes.byteLength, 'bytes')
    
    return { content: base64, filename }
  } catch (error) {
    console.error('画像取得エラー:', error)
    return null
  }
}

/**
 * メール送信エンドポイント
 * POST /api/send-email
 */
emailApi.post('/', async (c) => {
  try {
    // リクエストボディを取得
    const body: EmailRequest = await c.req.json()
    const { nickname, imageMode, building, freeText, autoPrompt, imageUrl } = body

    console.log('=== メール送信リクエスト ===')
    console.log('名前:', nickname)
    console.log('生成タイプ:', imageMode)
    console.log('建物:', building)
    console.log('自由文:', freeText)
    console.log('自動プロンプト:', autoPrompt)
    console.log('画像URL:', imageUrl ? '有り' : '無し')

    // メール本文を構築
    const emailBody = `名前：${nickname}
生成タイプ：${imageMode}
建物：${building}
自由文：${freeText}
自動プロンプト：${autoPrompt}`

    console.log('=== メール本文 ===')
    console.log(emailBody)

    // Resend APIキーの確認
    const resendApiKey = c.env.RESEND_API_KEY
    
    if (resendApiKey) {
      // Resend APIを使用してメール送信
      console.log('Resend APIでメール送信...')
      
      // メール送信データを構築
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emailData: Record<string, any> = {
        from: 'Yumecan <onboarding@resend.dev>',
        to: [EMAIL_TO],
        subject: EMAIL_SUBJECT,
        text: emailBody
      }

      // 画像URLがある場合は添付ファイルとして追加
      if (imageUrl) {
        const imageData = await fetchImageAsBase64(imageUrl)
        if (imageData) {
          emailData.attachments = [
            {
              filename: imageData.filename,
              content: imageData.content
            }
          ]
          console.log('添付ファイル追加:', imageData.filename)
        } else {
          console.warn('画像の取得に失敗しました。添付なしで送信します。')
        }
      }
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Resend API 送信成功:', result)
        return c.json({
          success: true,
          message: 'メールを送信しました'
        })
      } else {
        const error = await response.json().catch(() => ({}))
        console.error('Resend API エラー:', response.status, error)
        // エラーでも成功として返す（要件：確認不要）
        return c.json({
          success: true,
          message: 'メール送信を試みました（Resendエラー）',
          debug: { status: response.status, error }
        })
      }
    } else {
      // APIキーがない場合はログのみ出力
      console.log('=== メール送信（ログのみ） ===')
      console.log('宛先:', EMAIL_TO)
      console.log('件名:', EMAIL_SUBJECT)
      console.log('本文:', emailBody)
      console.log('画像URL:', imageUrl || 'なし')
      console.log('============================')
      
      return c.json({
        success: true,
        message: 'メール送信データを記録しました（APIキー未設定のためログのみ）'
      })
    }

  } catch (error) {
    console.error('メール送信エラー:', error)

    let errorMessage = '不明なエラー'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // エラーでも成功として返す（要件：確認不要）
    return c.json({
      success: true,
      message: `メール送信を試みました（エラー: ${errorMessage}）`
    })
  }
})

export default emailApi
