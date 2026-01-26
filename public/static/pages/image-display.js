/**
 * 画像表示画面用JavaScript
 * - ドロップダウン選択（スタイル、ライティング）
 * - 自由文入力バリデーション
 * - プロンプト構築
 * - fal.ai API呼び出し（Base64画像アップロード対応）
 */

// ========================================
// 定数定義
// ========================================

// 元画像のURL（Image-to-Image用）
const BASE_IMAGE_PATH = '/static/images/base-image.jpg';

// 構図は「全体像」で固定
const COMPOSITION_VALUE = 'full body shot, wide angle';

// ========================================
// DOM要素取得・初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // フォーム要素の取得
  const form = document.getElementById('optionsForm');
  const styleSelect = document.getElementById('styleSelect');
  const lightingSelect = document.getElementById('lightingSelect');
  const freeText = document.getElementById('freeText');
  const charCount = document.getElementById('charCount');
  const generateButton = document.getElementById('generateButton');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const baseImage = document.getElementById('baseImage');

  // 文字数カウント・バリデーション設定
  setupTextValidation(freeText, charCount, generateButton);

  // フォーム送信イベント
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGenerate(
      styleSelect,
      lightingSelect,
      freeText,
      loadingOverlay,
      generateButton,
      baseImage
    );
  });
});

// ========================================
// テキスト入力バリデーション
// ========================================

/**
 * 自由文入力のバリデーション設定
 */
function setupTextValidation(textarea, countDisplay, button) {
  textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    countDisplay.textContent = length;

    if (length > 100) {
      countDisplay.style.color = '#FF4444';
    } else {
      countDisplay.style.color = '#888';
    }

    updateButtonState(textarea, button);
  });

  updateButtonState(textarea, button);
}

/**
 * 生成ボタンの状態更新
 */
function updateButtonState(textarea, button) {
  const text = textarea.value.trim();
  button.disabled = text.length === 0;
}

// ========================================
// プロンプト構築
// ========================================

/**
 * プロンプトを構築する
 * @param {string} freeText - 自由文（日本語）
 * @param {string} style - スタイルの英語キーワード
 * @param {string} lighting - ライティングの英語キーワード
 * @returns {string} 構築されたプロンプト
 */
function buildPrompt(freeText, style, lighting) {
  // 構図は「全体像」で固定
  const parts = [
    freeText,
    'Japanese people',
    style,
    lighting,
    COMPOSITION_VALUE
  ];

  return parts.join(', ');
}

// ========================================
// 画像処理
// ========================================

/**
 * 画像をBase64に変換
 * @param {HTMLImageElement} img - 画像要素
 * @returns {string} Base64データURI
 */
function imageToBase64(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

// ========================================
// 生成処理
// ========================================

/**
 * 生成ボタン押下時の処理
 * @param {HTMLSelectElement} styleSelect - スタイル選択
 * @param {HTMLSelectElement} lightingSelect - ライティング選択
 * @param {HTMLTextAreaElement} freeText - 自由文入力
 * @param {HTMLElement} loadingOverlay - ローディング表示
 * @param {HTMLButtonElement} generateButton - 生成ボタン
 * @param {HTMLImageElement} baseImage - 元画像
 */
async function handleGenerate(
  styleSelect,
  lightingSelect,
  freeText,
  loadingOverlay,
  generateButton,
  baseImage
) {
  // プロンプトを構築
  const prompt = buildPrompt(
    freeText.value.trim(),
    styleSelect.value,
    lightingSelect.value
  );

  console.log('構築されたプロンプト:', prompt);

  // ボタンを無効化
  generateButton.disabled = true;

  // ローディング表示
  loadingOverlay.classList.add('active');

  // 生成データをセッションストレージに保存
  const generationData = {
    prompt: prompt,
    baseImageUrl: BASE_IMAGE_PATH,
    options: {
      style: styleSelect.options[styleSelect.selectedIndex].text,
      lighting: lightingSelect.options[lightingSelect.selectedIndex].text,
      composition: '全体像',  // 固定値
      freeText: freeText.value.trim()
    }
  };
  sessionStorage.setItem('generationData', JSON.stringify(generationData));

  try {
    // 画像をBase64に変換
    const imageData = imageToBase64(baseImage);
    console.log('画像をBase64に変換完了');

    // fal.ai APIを呼び出し（Base64画像データを送信）
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        imageData: imageData
      })
    });

    const result = await response.json();
    console.log('API応答:', result);

    if (result.success && result.imageUrl) {
      // 生成成功：画像URLを保存して結果画面へ
      sessionStorage.setItem('generatedImageUrl', result.imageUrl);
      window.location.href = '/result';
    } else {
      throw new Error(result.error || '画像生成に失敗しました');
    }

  } catch (error) {
    console.error('画像生成エラー:', error);
    
    // ローディング非表示
    loadingOverlay.classList.remove('active');
    
    // ボタンを再有効化
    generateButton.disabled = false;
    
    // エラーメッセージ表示
    alert('画像生成中にエラーが発生しました:\n' + error.message);
  }
}
