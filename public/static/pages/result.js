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
  // セッションストレージから生成画像URLを取得
  const generatedImageUrl = sessionStorage.getItem('generatedImageUrl');

  if (generatedImageUrl) {
    // 生成された画像がある場合
    imageElement.src = generatedImageUrl;
    imageElement.alt = '生成された画像';
    
    // 生成情報を表示
    if (generationData) {
      showGenerationInfo(generationData);
    }
  } else {
    // 画像がない場合（エラー時など）
    showErrorState(imageElement, generationData);
  }

  // 画像読み込みエラー時の処理
  imageElement.onerror = () => {
    console.error('画像の読み込みに失敗しました');
    showErrorState(imageElement, generationData);
  };
}

/**
 * 生成情報を表示
 * @param {Object} generationData - 生成データ
 */
function showGenerationInfo(generationData) {
  // ページ上部に情報表示用の要素を追加
  const infoDiv = document.createElement('div');
  infoDiv.className = 'generation-info';
  infoDiv.innerHTML = `
    <details>
      <summary>📝 生成条件（クリックで展開）</summary>
      <div class="info-content">
        <p><strong>自由文:</strong> ${generationData.options.freeText}</p>
        <p><strong>スタイル:</strong> ${generationData.options.style}</p>
        <p><strong>ライティング:</strong> ${generationData.options.lighting}</p>
        <p><strong>構図:</strong> ${generationData.options.composition}</p>
      </div>
    </details>
  `;

  // スタイル設定
  infoDiv.style.cssText = `
    background: #F0F8FF;
    border: 2px solid #87CEEB;
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

/**
 * エラー状態を表示
 * @param {HTMLImageElement} imageElement - 画像要素
 * @param {Object|null} generationData - 生成データ
 */
function showErrorState(imageElement, generationData) {
  // プレースホルダー画像として元画像を表示
  imageElement.src = '/static/images/base-image.jpg';
  imageElement.alt = '画像の生成に失敗しました';

  // エラーメッセージを表示
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `
    <p>⚠️ 画像の生成に失敗しました</p>
    <p>もう一度お試しください</p>
  `;

  // スタイル設定
  errorDiv.style.cssText = `
    background: #FFF0F0;
    border: 2px solid #FFB6C1;
    border-radius: 12px;
    padding: 12px;
    margin: 0 auto 16px;
    max-width: 350px;
    font-size: 14px;
    text-align: center;
    color: #D32F2F;
  `;

  // ページに挿入
  const mainContent = document.querySelector('.result-content');
  mainContent.insertBefore(errorDiv, mainContent.firstChild);

  // デバッグ情報をコンソールに表示
  if (generationData) {
    console.log('=== 生成リクエスト情報 ===');
    console.log('プロンプト:', generationData.prompt);
    console.log('オプション:', generationData.options);
    console.log('========================');
  }
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
    // 生成画像URLのみクリア
    sessionStorage.removeItem('generatedImageUrl');
    window.location.href = '/image-display';
  });
}
