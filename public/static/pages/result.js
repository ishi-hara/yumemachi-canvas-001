/**
 * 結果画面用JavaScript
 * - 生成画像の表示
 * - 戻るボタン処理
 * - もう一度生成ボタン処理
 */

// ========================================
// DOM要素取得・初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  const generatedImage = document.getElementById('generatedImage');
  const backButton = document.getElementById('backButton');
  const retryButton = document.getElementById('retryButton');

  // セッションストレージから生成データを取得
  const generationData = getGenerationData();

  // 生成画像の表示
  displayGeneratedImage(generatedImage, generationData);

  // ボタンイベント設定
  setupButtons(backButton, retryButton);
});

// ========================================
// 生成データ取得
// ========================================

/**
 * セッションストレージから生成データを取得
 * @returns {Object|null} 生成データ
 */
function getGenerationData() {
  const dataStr = sessionStorage.getItem('generationData');
  if (!dataStr) {
    console.warn('生成データが見つかりません');
    return null;
  }

  try {
    return JSON.parse(dataStr);
  } catch (e) {
    console.error('生成データの解析エラー:', e);
    return null;
  }
}

// ========================================
// 生成画像表示
// ========================================

/**
 * 生成画像を表示する
 * @param {HTMLImageElement} imageElement - 画像要素
 * @param {Object|null} generationData - 生成データ
 */
function displayGeneratedImage(imageElement, generationData) {
  // 開発環境テスト用：生成画像URLが保存されていれば表示
  const generatedImageUrl = sessionStorage.getItem('generatedImageUrl');

  if (generatedImageUrl) {
    // 生成された画像がある場合
    imageElement.src = generatedImageUrl;
    imageElement.alt = '生成された画像';
  } else {
    // 開発テスト用：プレースホルダー表示
    showPlaceholder(imageElement, generationData);
  }

  // 画像読み込みエラー時の処理
  imageElement.onerror = () => {
    console.error('画像の読み込みに失敗しました');
    showPlaceholder(imageElement, generationData);
  };
}

/**
 * プレースホルダーを表示する（開発テスト用）
 * @param {HTMLImageElement} imageElement - 画像要素
 * @param {Object|null} generationData - 生成データ
 */
function showPlaceholder(imageElement, generationData) {
  // プレースホルダー画像として元画像を表示
  imageElement.src = '/static/images/base-image.jpg';
  imageElement.alt = '生成画像（テスト表示）';

  // 生成データがあればコンソールに表示
  if (generationData) {
    console.log('=== 生成リクエスト情報 ===');
    console.log('プロンプト:', generationData.prompt);
    console.log('オプション:', generationData.options);
    console.log('元画像URL:', generationData.baseImageUrl);
    console.log('========================');

    // 開発者向けにアラート表示
    showDevInfo(generationData);
  }
}

/**
 * 開発者向け情報を表示
 * @param {Object} generationData - 生成データ
 */
function showDevInfo(generationData) {
  // ページ上部に情報表示用の要素を追加
  const infoDiv = document.createElement('div');
  infoDiv.className = 'dev-info';
  infoDiv.innerHTML = `
    <details>
      <summary>🔧 開発テスト情報（クリックで展開）</summary>
      <div class="dev-info-content">
        <p><strong>プロンプト:</strong></p>
        <code>${generationData.prompt}</code>
        <p><strong>選択オプション:</strong></p>
        <ul>
          <li>スタイル: ${generationData.options.style}</li>
          <li>ライティング: ${generationData.options.lighting}</li>
          <li>構図: ${generationData.options.composition}</li>
        </ul>
        <p><strong>自由文:</strong> ${generationData.options.freeText}</p>
      </div>
    </details>
  `;

  // スタイル設定
  infoDiv.style.cssText = `
    background: #FFF9E6;
    border: 2px dashed #FFB347;
    border-radius: 12px;
    padding: 12px;
    margin: 0 auto 16px;
    max-width: 350px;
    font-size: 12px;
  `;

  // ページに挿入
  const mainContent = document.querySelector('.result-content');
  mainContent.insertBefore(infoDiv, mainContent.firstChild);
}

// ========================================
// ボタン処理
// ========================================

/**
 * ボタンのイベント設定
 * @param {HTMLButtonElement} backButton - 戻るボタン
 * @param {HTMLButtonElement} retryButton - もう一度生成ボタン
 */
function setupButtons(backButton, retryButton) {
  // 戻るボタン：トップ画面へ
  backButton.addEventListener('click', () => {
    // セッションストレージをクリア
    sessionStorage.removeItem('generationData');
    sessionStorage.removeItem('generatedImageUrl');
    window.location.href = '/';
  });

  // もう一度生成ボタン：画像表示画面へ戻る
  retryButton.addEventListener('click', () => {
    // 生成画像URLのみクリア（入力値は保持しない）
    sessionStorage.removeItem('generatedImageUrl');
    window.location.href = '/image-display';
  });
}
