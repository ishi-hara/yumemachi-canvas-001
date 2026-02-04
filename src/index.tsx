/**
 * ゆめまち☆キャンバス メインエントリ
 * Honoフレームワークを使用したCloudflare Pages用アプリケーション
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import generateApi from './api/generate'
import translateApi from './api/translate'
import creativeApi from './api/creative'
import emailApi from './api/email'

// 環境変数の型定義
type Bindings = {
  FAL_KEY: string
  OPENAI_API_KEY: string
  RESEND_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定（API用）
app.use('/api/*', cors())

// 画像生成APIルート（通常モード: fal.ai Inpainting）
app.route('/api/generate', generateApi)

// 自動プロンプト生成APIルート（GPT-4.1-mini）
app.route('/api/translate-prompt', translateApi)

// 創造性モード画像生成APIルート（GPT-Image-1.5）
app.route('/api/creative', creativeApi)

// メール送信APIルート
app.route('/api/send-email', emailApi)

/**
 * 共通HTMLヘッダー生成
 * @param title - ページタイトル
 */
const htmlHead = (title: string) => `
  <!DOCTYPE html>
  <html lang="ja">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${title} - ゆめまち☆キャンバス【テスト版】</title>
    <link rel="stylesheet" href="/static/styles.css">
  </head>
  <body>
`

/**
 * 共通HTMLフッター生成
 */
const htmlFoot = `
  </body>
  </html>
`

/**
 * トップ画面
 * - タイトル表示
 * - クラッカーアニメーション
 * - スタートボタン
 */
app.get('/', (c) => {
  return c.html(`
    ${htmlHead('トップ画面')}
    <div class="screen-container">
      <!-- 画面名（右上） -->
      <div class="screen-name">トップ画面</div>
      
      <!-- メインコンテンツ -->
      <main class="main-content">
        <!-- クラッカーアニメーション用コンテナ -->
        <div class="cracker-container">
          <div class="cracker cracker-left" id="crackerLeft">🎉</div>
          <div class="cracker cracker-right" id="crackerRight">🎉</div>
        </div>
        
        <!-- 紙吹雪用コンテナ -->
        <div class="confetti-container" id="confettiContainer"></div>
        
        <!-- タイトル -->
        <h1 class="title">ゆめまち☆キャンバス</h1>
        <p class="subtitle">【テスト版】</p>
        
        <!-- スタートボタン -->
        <button class="start-button" id="startButton">
          スタート
        </button>
      </main>
    </div>
    
    <script src="/static/pages/top.js"></script>
    ${htmlFoot}
  `)
})

/**
 * 画像表示画面
 * - 元画像表示
 * - 自由文入力
 * - 生成ボタン
 * ※ スタイル/ライティング/構図は固定（写真風/自然光/全体像）
 */
app.get('/image-display', (c) => {
  return c.html(`
    ${htmlHead('画像表示画面')}
    <div class="screen-container">
      <!-- 画面名（右上） -->
      <div class="screen-name">画像表示画面</div>
      
      <!-- メインコンテンツ -->
      <main class="main-content image-display-content">
        <!-- 元画像表示 -->
        <div class="image-container">
          <img src="/static/images/base-image.jpg" alt="元画像" class="base-image" id="baseImage">
        </div>
        
        <!-- マスク画像（非表示、API送信用） -->
        <img src="/static/images/mask-image.png" alt="マスク画像" id="maskImage" style="display: none;">
        
        <!-- タイトル -->
        <h2 class="section-title">すてきな画像にしてみましょう</h2>
        
        <!-- オプション選択フォーム -->
        <form class="options-form" id="optionsForm">
          <!-- 生成タイプ選択 -->
          <div class="form-group">
            <label for="imageMode" class="form-label">生成タイプ</label>
            <select id="imageMode" class="form-select">
              <option value="faithful" selected>1) 指示に忠実</option>
              <option value="modern">2) モダン性加味</option>
              <option value="creative">3) 創造性加味</option>
              <option value="image-centered">4) 生成画像中心</option>
            </select>
          </div>
          
          <!-- 建物選択 -->
          <div class="form-group">
            <label for="buildingType" class="form-label">建物</label>
            <select id="buildingType" class="form-select">
              <option value="fountain" selected>噴水</option>
              <option value="merry-go-round">メリーゴーランド</option>
              <option value="cafe-stand">おしゃれなカフェスタンド</option>
              <option value="other">その他</option>
            </select>
          </div>
          
          <!-- その他の建物入力（その他選択時のみ表示） -->
          <div class="form-group" id="otherBuildingGroup" style="display: none;">
            <label for="otherBuilding" class="form-label">その他の建物（30文字以内、任意）</label>
            <input 
              type="text" 
              id="otherBuilding" 
              class="form-input" 
              maxlength="30" 
              placeholder="例：ミニ動物園"
            >
            <div class="char-count"><span id="otherCharCount">0</span> / 30</div>
          </div>
          
          <!-- 自由文入力 -->
          <div class="form-group">
            <label for="freeText" class="form-label">自由文（100文字以内、任意）</label>
            <textarea 
              id="freeText" 
              class="form-textarea" 
              maxlength="100" 
              placeholder="例：ワクワクするもの"
            ></textarea>
            <div class="char-count"><span id="charCount">0</span> / 100</div>
          </div>
          
          <!-- 自動プロンプトチェックボックス -->
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="autoPromptCheckbox" class="checkbox-input">
              <span class="checkbox-custom"></span>
              <span class="checkbox-text">自動プロンプト（AIが翻訳・拡張）</span>
            </label>
          </div>
          
          <!-- 生成ボタン -->
          <button type="submit" class="generate-button" id="generateButton" disabled>
            生成
          </button>
        </form>
      </main>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div class="loading-overlay" id="loadingOverlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">生成中...</p>
        <p class="loading-notice">画像生成には1〜2分<br>かかる場合があります</p>
        <p class="loading-timer">経過時間: <span id="elapsedTime">0</span>秒</p>
      </div>
    </div>
    
    <script src="/static/pages/image-display.js"></script>
    ${htmlFoot}
  `)
})

/**
 * 結果画面
 * - 元画像と生成画像の比較表示
 * - 戻るボタン
 * - 次へボタン
 */
app.get('/result', (c) => {
  return c.html(`
    ${htmlHead('結果画面')}
    <div class="screen-container">
      <!-- 画面名（右上） -->
      <div class="screen-name">結果画面</div>
      
      <!-- メインコンテンツ -->
      <main class="main-content result-content">
        <!-- 元画像 -->
        <div class="result-image-section">
          <h3 class="result-label">元の画像</h3>
          <div class="result-image-container">
            <img src="/static/images/base-image.jpg" alt="元画像" class="result-image">
          </div>
        </div>
        
        <!-- 生成画像 -->
        <div class="result-image-section">
          <h3 class="result-label">生成された画像</h3>
          <div class="result-image-container">
            <img src="" alt="生成画像" class="result-image" id="generatedImage">
          </div>
        </div>
        
        <!-- ボタンエリア -->
        <div class="result-buttons">
          <button class="back-button" id="backButton">
            戻る
          </button>
          <button class="next-button" id="nextButton">
            次へ
          </button>
        </div>
      </main>
    </div>
    
    <script src="/static/pages/result.js"></script>
    ${htmlFoot}
  `)
})

/**
 * 設定内容確認画面
 * - 生成した画像表示
 * - 名前（ニックネーム）入力
 * - 生成時の設定内容表示
 * - 画像保存ボタン
 * - 設定データ保存＆次へボタン
 */
app.get('/confirm', (c) => {
  return c.html(`
    ${htmlHead('設定内容確認画面')}
    <div class="screen-container">
      <!-- 画面名（右上） -->
      <div class="screen-name">設定内容確認画面</div>
      
      <!-- メインコンテンツ -->
      <main class="main-content confirm-content">
        <!-- 生成画像 -->
        <div class="confirm-image-section">
          <h3 class="confirm-label">生成された画像</h3>
          <div class="confirm-image-container">
            <img src="" alt="生成画像" class="confirm-image" id="generatedImage">
          </div>
        </div>
        
        <!-- 名前入力 -->
        <div class="form-group">
          <label for="nickname" class="form-label">名前（ニックネーム）（20文字以内）</label>
          <input 
            type="text" 
            id="nickname" 
            class="form-input" 
            maxlength="20" 
            placeholder="例：たろう"
          >
          <div class="char-count"><span id="nicknameCharCount">0</span> / 20</div>
        </div>
        
        <!-- 設定内容表示 -->
        <div class="confirm-settings">
          <h3 class="confirm-settings-title">生成時の設定内容</h3>
          
          <div class="confirm-setting-item">
            <span class="confirm-setting-label">生成タイプ：</span>
            <span class="confirm-setting-value" id="confirmImageMode">-</span>
          </div>
          
          <div class="confirm-setting-item">
            <span class="confirm-setting-label">建物：</span>
            <span class="confirm-setting-value" id="confirmBuilding">-</span>
          </div>
          
          <div class="confirm-setting-item">
            <span class="confirm-setting-label">自由文：</span>
            <span class="confirm-setting-value" id="confirmFreeText">-</span>
          </div>
          
          <div class="confirm-setting-item">
            <span class="confirm-setting-label">自動プロンプト：</span>
            <span class="confirm-setting-value" id="confirmAutoPrompt">-</span>
          </div>
        </div>
        
        <!-- ボタンエリア -->
        <div class="confirm-buttons">
          <button class="save-image-button" id="saveImageButton">
            画像保存
          </button>
          <button class="save-and-next-button" id="saveAndNextButton">
            設定データ保存＆次へ
          </button>
        </div>
      </main>
    </div>
    
    <!-- ローディングオーバーレイ -->
    <div class="loading-overlay" id="loadingOverlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">送信中...</p>
      </div>
    </div>
    
    <script src="/static/pages/confirm.js"></script>
    ${htmlFoot}
  `)
})

/**
 * 完了画面（仮）
 * - 次の画面が指示されるまでの仮画面
 */
app.get('/complete', (c) => {
  return c.html(`
    ${htmlHead('完了画面')}
    <div class="screen-container">
      <!-- 画面名（右上） -->
      <div class="screen-name">完了画面</div>
      
      <!-- メインコンテンツ -->
      <main class="main-content complete-content">
        <div class="complete-message">
          🎉 送信完了！
        </div>
        <p class="complete-submessage">
          設定データを送信しました。<br>
          ご参加ありがとうございます！
        </p>
        
        <button class="complete-button" id="homeButton">
          トップに戻る
        </button>
      </main>
    </div>
    
    <script>
      document.getElementById('homeButton').addEventListener('click', () => {
        // セッションストレージをクリア
        sessionStorage.clear();
        window.location.href = '/';
      });
    </script>
    ${htmlFoot}
  `)
})

export default app
