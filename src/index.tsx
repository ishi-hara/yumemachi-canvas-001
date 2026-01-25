/**
 * ゆめまち☆キャンバス メインエントリ
 * Honoフレームワークを使用したCloudflare Pages用アプリケーション
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import generateApi from './api/generate'

// 環境変数の型定義
type Bindings = {
  FAL_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS設定（API用）
app.use('/api/*', cors())

// 画像生成APIルート
app.route('/api/generate', generateApi)

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
 * - スタイル/ライティング/構図の選択
 * - 自由文入力
 * - 生成ボタン
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
        
        <!-- タイトル -->
        <h2 class="section-title">すてきな画像にしてみましょう</h2>
        
        <!-- オプション選択フォーム -->
        <form class="options-form" id="optionsForm">
          <!-- スタイル -->
          <div class="form-group">
            <label for="styleSelect" class="form-label">スタイル</label>
            <select id="styleSelect" class="form-select">
              <option value="photorealistic, professional photography" selected>写真風</option>
              <option value="anime style, vibrant colors">アニメ風</option>
              <option value="oil painting, canvas texture">油絵風</option>
              <option value="watercolor, soft edges">水彩画風</option>
              <option value="digital art, highly detailed">デジタルアート</option>
            </select>
          </div>
          
          <!-- ライティング -->
          <div class="form-group">
            <label for="lightingSelect" class="form-label">ライティング</label>
            <select id="lightingSelect" class="form-select">
              <option value="natural lighting" selected>自然光</option>
              <option value="studio lighting, professional">スタジオライト</option>
              <option value="dramatic lighting, high contrast">ドラマチック</option>
              <option value="soft lighting, diffused">柔らかい光</option>
              <option value="backlit, rim lighting">逆光</option>
            </select>
          </div>
          
          <!-- 構図 -->
          <div class="form-group">
            <label for="compositionSelect" class="form-label">構図</label>
            <select id="compositionSelect" class="form-select">
              <option value="close-up shot">クローズアップ</option>
              <option value="full body shot, wide angle" selected>全体像</option>
              <option value="aerial view, top-down">鳥瞰図</option>
              <option value="low angle shot">低いアングル</option>
            </select>
          </div>
          
          <!-- 自由文入力 -->
          <div class="form-group">
            <label for="freeText" class="form-label">自由文（100文字以内、必須）</label>
            <textarea 
              id="freeText" 
              class="form-textarea" 
              maxlength="100" 
              placeholder="例：親子で遊べる噴水広場がほしい"
              required
            ></textarea>
            <div class="char-count"><span id="charCount">0</span> / 100</div>
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
 * - もう一度生成ボタン
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
          <button class="retry-button" id="retryButton">
            もう一度生成
          </button>
        </div>
      </main>
    </div>
    
    <script src="/static/pages/result.js"></script>
    ${htmlFoot}
  `)
})

export default app
