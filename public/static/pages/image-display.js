/**
 * 画像表示画面用JavaScript
 * - ドロップダウン選択
 * - 自由文入力バリデーション
 * - プロンプト構築
 * - 生成ボタン処理
 */

// ========================================
// 定数定義
// ========================================

// 元画像のURL（Image-to-Image用）
const BASE_IMAGE_URL = '/static/images/base-image.jpg';

// ========================================
// DOM要素取得・初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // フォーム要素の取得
  const form = document.getElementById('optionsForm');
  const styleSelect = document.getElementById('styleSelect');
  const lightingSelect = document.getElementById('lightingSelect');
  const compositionSelect = document.getElementById('compositionSelect');
  const freeText = document.getElementById('freeText');
  const charCount = document.getElementById('charCount');
  const generateButton = document.getElementById('generateButton');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // 文字数カウント・バリデーション設定
  setupTextValidation(freeText, charCount, generateButton);

  // フォーム送信イベント
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGenerate(
      styleSelect,
      lightingSelect,
      compositionSelect,
      freeText,
      loadingOverlay
    );
  });
});

// ========================================
// テキスト入力バリデーション
// ========================================

/**
 * 自由文入力のバリデーション設定
 * @param {HTMLTextAreaElement} textarea - テキストエリア要素
 * @param {HTMLElement} countDisplay - 文字数表示要素
 * @param {HTMLButtonElement} button - 生成ボタン要素
 */
function setupTextValidation(textarea, countDisplay, button) {
  // 入力イベントでリアルタイムにチェック
  textarea.addEventListener('input', () => {
    const length = textarea.value.length;
    countDisplay.textContent = length;

    // 100文字を超えた場合のスタイル変更
    if (length > 100) {
      countDisplay.style.color = '#FF4444';
    } else {
      countDisplay.style.color = '#888';
    }

    // 入力があればボタンを有効化
    updateButtonState(textarea, button);
  });

  // 初期状態のチェック
  updateButtonState(textarea, button);
}

/**
 * 生成ボタンの状態更新
 * @param {HTMLTextAreaElement} textarea - テキストエリア要素
 * @param {HTMLButtonElement} button - 生成ボタン要素
 */
function updateButtonState(textarea, button) {
  const text = textarea.value.trim();
  // 自由文が入力されていれば有効化
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
 * @param {string} composition - 構図の英語キーワード
 * @returns {string} 構築されたプロンプト
 */
function buildPrompt(freeText, style, lighting, composition) {
  // 日本語自由文 + Japanese people + 各オプションの英語キーワード
  const parts = [
    freeText,
    'Japanese people',
    style,
    lighting,
    composition
  ];

  return parts.join(', ');
}

// ========================================
// 生成処理
// ========================================

/**
 * 生成ボタン押下時の処理
 * @param {HTMLSelectElement} styleSelect - スタイル選択
 * @param {HTMLSelectElement} lightingSelect - ライティング選択
 * @param {HTMLSelectElement} compositionSelect - 構図選択
 * @param {HTMLTextAreaElement} freeText - 自由文入力
 * @param {HTMLElement} loadingOverlay - ローディング表示
 */
function handleGenerate(
  styleSelect,
  lightingSelect,
  compositionSelect,
  freeText,
  loadingOverlay
) {
  // プロンプトを構築
  const prompt = buildPrompt(
    freeText.value.trim(),
    styleSelect.value,
    lightingSelect.value,
    compositionSelect.value
  );

  console.log('構築されたプロンプト:', prompt);

  // ローディング表示
  loadingOverlay.classList.add('active');

  // 生成データをセッションストレージに保存
  const generationData = {
    prompt: prompt,
    baseImageUrl: BASE_IMAGE_URL,
    options: {
      style: styleSelect.options[styleSelect.selectedIndex].text,
      lighting: lightingSelect.options[lightingSelect.selectedIndex].text,
      composition: compositionSelect.options[compositionSelect.selectedIndex].text,
      freeText: freeText.value.trim()
    }
  };
  sessionStorage.setItem('generationData', JSON.stringify(generationData));

  // 開発環境テスト用：結果画面に遷移
  // 本番環境ではここでfal.ai APIを呼び出す
  setTimeout(() => {
    // テスト用：生成画像URLは結果画面で設定
    // 実際のAPIレスポンスを待つ場合はここで処理
    window.location.href = '/result';
  }, 1500);
}
