/**
 * 画像表示画面用JavaScript
 * - スタイル/ライティングのマッピングテーブル
 * - パラメータ自動決定（strength/steps/guidance）
 * - プロンプト構築
 * - fal.ai API呼び出し
 */

// ========================================
// 定数定義
// ========================================

// 元画像のパス
const BASE_IMAGE_PATH = '/static/images/base-image.jpg';

// シーンベース（固定：駅前ロータリー用）
const SCENE_BASE = 'In an existing station-front urban plaza and rotary';

// 構図（固定：全体像）
const COMPOSITION_FIXED = 'full body shot, wide angle';

// ========================================
// マッピングテーブル
// ========================================

/**
 * スタイル → 英語タグ
 */
const STYLE_MAP = {
  "写真風": "photorealistic, professional photography, high resolution",
  "アニメ風": "anime style, vibrant colors, clean lineart",
  "油絵風": "oil painting, canvas texture, fine art",
  "水彩画風": "watercolor painting, soft edges, pastel tones",
  "デジタルアート": "digital art, highly detailed, concept art",
};

/**
 * ライティング → 英語タグ
 */
const LIGHTING_MAP = {
  "自然光": "natural lighting, daylight",
  "スタジオライト": "studio lighting, professional, soft shadows",
  "ドラマチック": "dramatic lighting, high contrast, cinematic lighting",
  "柔らかい光": "soft lighting, diffused light, gentle shadows",
  "逆光": "backlit, rim lighting, glowing edges",
};

/**
 * パラメータ表（スタイル × ライティング）
 * strength: 元画像からの変更度合い（低いほど元画像を維持）
 * steps: 推論ステップ数（多いほど高品質）
 * guidance: プロンプトへの忠実度（高いほどプロンプトに従う）
 */
const PARAM_TABLE = {
  "写真風": {
    "自然光":         { strength: 0.40, steps: 35, guidance: 7.0 },
    "柔らかい光":     { strength: 0.38, steps: 35, guidance: 6.8 },
    "スタジオライト": { strength: 0.42, steps: 38, guidance: 7.8 },
    "ドラマチック":   { strength: 0.43, steps: 38, guidance: 7.6 },
    "逆光":           { strength: 0.40, steps: 35, guidance: 6.6 },
  },
  "アニメ風": {
    "自然光":         { strength: 0.65, steps: 45, guidance: 8.3 },
    "柔らかい光":     { strength: 0.65, steps: 45, guidance: 8.0 },
    "スタジオライト": { strength: 0.67, steps: 48, guidance: 8.6 },
    "ドラマチック":   { strength: 0.68, steps: 48, guidance: 8.7 },
    "逆光":           { strength: 0.66, steps: 46, guidance: 8.1 },
  },
  "油絵風": {
    "自然光":         { strength: 0.70, steps: 50, guidance: 8.2 },
    "柔らかい光":     { strength: 0.70, steps: 50, guidance: 8.0 },
    "スタジオライト": { strength: 0.72, steps: 52, guidance: 8.5 },
    "ドラマチック":   { strength: 0.73, steps: 52, guidance: 8.6 },
    "逆光":           { strength: 0.71, steps: 50, guidance: 8.1 },
  },
  "水彩画風": {
    "自然光":         { strength: 0.75, steps: 50, guidance: 7.8 },
    "柔らかい光":     { strength: 0.75, steps: 50, guidance: 7.6 },
    "スタジオライト": { strength: 0.77, steps: 52, guidance: 8.2 },
    "ドラマチック":   { strength: 0.78, steps: 52, guidance: 8.3 },
    "逆光":           { strength: 0.76, steps: 50, guidance: 7.6 },
  },
  "デジタルアート": {
    "自然光":         { strength: 0.68, steps: 48, guidance: 8.4 },
    "柔らかい光":     { strength: 0.68, steps: 48, guidance: 8.1 },
    "スタジオライト": { strength: 0.70, steps: 50, guidance: 8.7 },
    "ドラマチック":   { strength: 0.71, steps: 50, guidance: 8.8 },
    "逆光":           { strength: 0.69, steps: 48, guidance: 8.1 },
  },
};

/**
 * ネガティブプロンプト（スタイル別）
 * 不要な要素を除外するためのプロンプト
 */
const NEGATIVE_MAP = {
  "写真風": [
    "cartoon, anime, illustration, painting, 3d render",
    "low quality, blurry, noise, jpeg artifacts",
    "distorted face, deformed hands, extra limbs, bad anatomy",
    "text, watermark, logo, signage, subtitles",
    "overexposed, underexposed, unnatural colors"
  ].join(", "),
  "アニメ風": [
    "low quality, blurry, noise",
    "distorted face, deformed hands, extra limbs, bad anatomy",
    "text, watermark, logo"
  ].join(", "),
  "油絵風": [
    "low quality, blurry, noise",
    "distorted face, deformed hands, extra limbs, bad anatomy",
    "text, watermark, logo"
  ].join(", "),
  "水彩画風": [
    "low quality, blurry, noise",
    "muddy colors, dirty wash",
    "distorted face, deformed hands, extra limbs, bad anatomy",
    "text, watermark, logo"
  ].join(", "),
  "デジタルアート": [
    "low quality, blurry, noise",
    "distorted face, deformed hands, extra limbs, bad anatomy",
    "text, watermark, logo"
  ].join(", "),
};

// ========================================
// パラメータ取得関数
// ========================================

/**
 * スタイルとライティングからfal.aiパラメータを取得
 * @param {string} style - スタイル（日本語）
 * @param {string} lighting - ライティング（日本語）
 * @returns {Object} { strength, steps, guidance }
 */
function getFalParams(style, lighting) {
  const styleParams = PARAM_TABLE[style] || PARAM_TABLE["写真風"];
  return styleParams[lighting] || styleParams["自然光"];
}

/**
 * ネガティブプロンプトを取得
 * @param {string} style - スタイル（日本語）
 * @returns {string} ネガティブプロンプト
 */
function getNegativePrompt(style) {
  return NEGATIVE_MAP[style] || NEGATIVE_MAP["写真風"];
}

/**
 * 安全ガードを適用
 * - 逆光: guidanceを抑え気味に（白飛び防止）
 * - ドラマチック: stepsを少し抑える（コントラスト過剰防止）
 * @param {string} style - スタイル
 * @param {string} lighting - ライティング
 * @param {Object} params - パラメータ
 * @returns {Object} 調整後のパラメータ
 */
function applySafetyTweaks(style, lighting, params) {
  const p = { ...params };

  // 逆光は白飛びしやすい → guidanceを抑え気味に
  if (lighting === "逆光") {
    p.guidance = Math.min(p.guidance, style === "写真風" ? 6.8 : 8.2);
  }

  // ドラマチックはコントラスト過剰になりやすい → steps少し抑える
  if (lighting === "ドラマチック") {
    p.steps = Math.max(30, p.steps - 2);
  }

  return p;
}

// ========================================
// プロンプト構築
// ========================================

/**
 * プロンプトを構築する
 * @param {string} freeText - 自由文（日本語）
 * @param {string} style - スタイル（日本語）
 * @param {string} lighting - ライティング（日本語）
 * @returns {string} 構築されたプロンプト
 */
function buildPrompt(freeText, style, lighting) {
  // 英語タグを取得
  const styleTag = STYLE_MAP[style] || STYLE_MAP["写真風"];
  const lightTag = LIGHTING_MAP[lighting] || LIGHTING_MAP["自然光"];

  // プロンプト構築
  // 【制御用】英語 + 【意味追加】日本語（自由文）
  const parts = [
    SCENE_BASE,
    styleTag,
    lightTag,
    COMPOSITION_FIXED,
    '',  // 空行で区切り
    freeText  // 日本語自由文
  ];

  return parts.join(',\n');
}

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
 */
async function handleGenerate(
  styleSelect,
  lightingSelect,
  freeText,
  loadingOverlay,
  generateButton,
  baseImage
) {
  // 選択値を取得
  const style = styleSelect.value;
  const lighting = lightingSelect.value;
  const freeTextValue = freeText.value.trim();

  // プロンプトを構築
  const prompt = buildPrompt(freeTextValue, style, lighting);

  // パラメータを取得（安全ガード適用）
  const baseParams = getFalParams(style, lighting);
  const params = applySafetyTweaks(style, lighting, baseParams);

  // ネガティブプロンプトを取得
  const negativePrompt = getNegativePrompt(style);

  console.log('=== 画像生成パラメータ ===');
  console.log('スタイル:', style);
  console.log('ライティング:', lighting);
  console.log('プロンプト:', prompt);
  console.log('ネガティブプロンプト:', negativePrompt);
  console.log('パラメータ:', params);

  // ボタンを無効化
  generateButton.disabled = true;

  // ローディング表示
  loadingOverlay.classList.add('active');

  // 生成データをセッションストレージに保存
  const generationData = {
    prompt: prompt,
    negativePrompt: negativePrompt,
    baseImageUrl: BASE_IMAGE_PATH,
    params: params,
    options: {
      style: style,
      lighting: lighting,
      composition: '全体像',  // 固定値
      freeText: freeTextValue
    }
  };
  sessionStorage.setItem('generationData', JSON.stringify(generationData));

  try {
    // 画像をBase64に変換
    const imageData = imageToBase64(baseImage);
    console.log('画像をBase64に変換完了');

    // fal.ai APIを呼び出し
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        negativePrompt: negativePrompt,
        imageData: imageData,
        strength: params.strength,
        steps: params.steps,
        guidance: params.guidance
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
