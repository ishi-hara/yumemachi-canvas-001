/**
 * 画像表示画面用JavaScript
 * - 自由文入力バリデーション
 * - 自動プロンプト機能（GPT-4.1-mini による翻訳・拡張）
 * - プロンプト構築（スタイル/ライティング/構図は固定）
 * - fal.ai Inpainting API呼び出し（マスク付き）
 * 
 * 固定パラメータ:
 * - スタイル: 写真風
 * - ライティング: 自然光
 * - 構図: 全体像
 * - strength: 0.75
 * - steps: 42
 * - guidance: 9.5
 */

// ========================================
// 定数定義（すべて固定）
// ========================================

// 画像パス
const BASE_IMAGE_PATH = '/static/images/base-image.jpg';
const MASK_IMAGE_PATH = '/static/images/mask-image.png';

// シーンベース（固定：駅前ロータリー用）
const SCENE_BASE = 'In an existing station-front urban plaza and rotary';

// 変更範囲の指示（固定：中央の花壇と周りの広場のみ変更）
const MODIFICATION_INSTRUCTION = 'Modify only the central flower bed and surrounding plaza area. Keep the existing station buildings, roads, and rotary unchanged.';

// スタイル（固定：写真風）
const STYLE_TAG = 'photorealistic, professional photography, high resolution';

// ライティング（固定：自然光）
const LIGHTING_TAG = 'natural lighting, daylight';

// 構図（固定：全体像）
const COMPOSITION_TAG = 'full body shot, wide angle';

// 人と構造物の可視性（強化版）
const VISIBILITY_TAG =
  'Include 20 to 40 people as a mandatory and essential part of the scene. Do not generate the scene without people. Clearly visible people and structure, not empty.';

// fal.aiパラメータ（固定）
const FAL_PARAMS = {
  strength: 0.75,
  steps: 42,
  guidance: 9.5
};

// ネガティブプロンプト（写真風用）
const NEGATIVE_PROMPT = [
  "cartoon, anime, illustration, painting, 3d render",
  "low quality, blurry, noise, jpeg artifacts",
  "distorted face, deformed hands, extra limbs, bad anatomy",
  "text, watermark, logo, signage, subtitles",
  "overexposed, underexposed, unnatural colors"
].join(", ");

// ========================================
// プロンプト構築
// ========================================

/**
 * プロンプトを構築する（自動プロンプトOFFの場合）
 * @param {string} freeText - 自由文（日本語）
 * @returns {string} 構築されたプロンプト
 */
function buildPrompt(freeText) {
  // プロンプト構築
  // 【制御用】英語 + 【意味追加】日本語（自由文）
  const parts = [
    SCENE_BASE,
    MODIFICATION_INSTRUCTION,
    STYLE_TAG,
    LIGHTING_TAG,
    COMPOSITION_TAG,
    VISIBILITY_TAG,  // 追加：人物と構造物を明確に
    '',  // 空行で区切り
    freeText  // 日本語自由文
  ];

  return parts.join(',\n');
}

/**
 * GPT-4.1-miniで自動プロンプトを生成
 * @param {string} freeText - 自由文（日本語）
 * @returns {Promise<string>} 生成されたプロンプト
 */
async function generateAutoPrompt(freeText) {
  console.log('=== 自動プロンプト生成開始 ===');
  console.log('入力テキスト:', freeText);

  const response = await fetch('/api/translate-prompt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: freeText
    })
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || '自動プロンプト生成に失敗しました');
  }

  console.log('=== 生成されたプロンプト ===');
  console.log(result.prompt);

  return result.prompt;
}

// ========================================
// DOM要素取得・初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // フォーム要素の取得
  const form = document.getElementById('optionsForm');
  const freeText = document.getElementById('freeText');
  const charCount = document.getElementById('charCount');
  const generateButton = document.getElementById('generateButton');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const baseImage = document.getElementById('baseImage');
  const maskImage = document.getElementById('maskImage');
  const autoPromptCheckbox = document.getElementById('autoPromptCheckbox');

  // 文字数カウント・バリデーション設定
  setupTextValidation(freeText, charCount, generateButton);

  // フォーム送信イベント
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleGenerate(
      freeText,
      loadingOverlay,
      generateButton,
      baseImage,
      maskImage,
      autoPromptCheckbox
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
// 画像処理
// ========================================

/**
 * 画像をBase64に変換（JPEG形式）
 * @param {HTMLImageElement} img - 画像要素
 * @returns {string} Base64データURI
 */
function imageToBase64Jpeg(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * 画像をBase64に変換（PNG形式、マスク用）
 * @param {HTMLImageElement} img - 画像要素
 * @returns {string} Base64データURI
 */
function imageToBase64Png(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  return canvas.toDataURL('image/png');
}

// ========================================
// 生成処理
// ========================================

/**
 * 生成ボタン押下時の処理
 */
async function handleGenerate(
  freeText,
  loadingOverlay,
  generateButton,
  baseImage,
  maskImage,
  autoPromptCheckbox
) {
  // 自由文を取得
  const freeTextValue = freeText.value.trim();
  
  // 自動プロンプトのON/OFF確認
  const isAutoPromptEnabled = autoPromptCheckbox.checked;

  // ボタンを無効化
  generateButton.disabled = true;

  // ローディング表示
  loadingOverlay.classList.add('active');

  try {
    // プロンプトを構築（自動プロンプトの有無で分岐）
    let prompt;
    
    if (isAutoPromptEnabled) {
      // 自動プロンプト ON: GPT-4.1-miniで翻訳・拡張
      console.log('=== 自動プロンプトモード ===');
      prompt = await generateAutoPrompt(freeTextValue);
    } else {
      // 自動プロンプト OFF: 従来通りの固定プロンプト + 日本語自由文
      console.log('=== 通常モード ===');
      prompt = buildPrompt(freeTextValue);
    }

    console.log('=== 画像生成パラメータ（Inpainting） ===');
    console.log('自動プロンプト:', isAutoPromptEnabled ? 'ON' : 'OFF');
    console.log('スタイル: 写真風（固定）');
    console.log('ライティング: 自然光（固定）');
    console.log('構図: 全体像（固定）');
    console.log('最終プロンプト:', prompt);
    console.log('ネガティブプロンプト:', NEGATIVE_PROMPT);
    console.log('パラメータ:', FAL_PARAMS);

    // 生成データをセッションストレージに保存
    const generationData = {
      prompt: prompt,
      negativePrompt: NEGATIVE_PROMPT,
      baseImageUrl: BASE_IMAGE_PATH,
      maskImageUrl: MASK_IMAGE_PATH,
      params: FAL_PARAMS,
      options: {
        style: '写真風',
        lighting: '自然光',
        composition: '全体像',
        freeText: freeTextValue,
        autoPrompt: isAutoPromptEnabled
      }
    };
    sessionStorage.setItem('generationData', JSON.stringify(generationData));

    // 元画像をBase64に変換（JPEG）
    const imageData = imageToBase64Jpeg(baseImage);
    console.log('元画像をBase64に変換完了');

    // マスク画像をBase64に変換（PNG）
    const maskData = imageToBase64Png(maskImage);
    console.log('マスク画像をBase64に変換完了');

    // fal.ai Inpainting APIを呼び出し
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        negativePrompt: NEGATIVE_PROMPT,
        imageData: imageData,
        maskData: maskData,
        strength: FAL_PARAMS.strength,
        steps: FAL_PARAMS.steps,
        guidance: FAL_PARAMS.guidance
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
