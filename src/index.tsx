/**
 * ゆめまち☆キャンバス メインエントリ
 * Honoフレームワークを使用したCloudflare Pages用アプリケーション
 */
import { Hono } from 'hono'

const app = new Hono()

/**
 * トップ画面
 * - タイトル表示
 * - クラッカーアニメーション
 * - スタートボタン
 */
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>ゆめまち☆キャンバス【テスト版】</title>
      <link rel="stylesheet" href="/static/styles.css">
    </head>
    <body>
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
    </body>
    </html>
  `)
})

export default app
