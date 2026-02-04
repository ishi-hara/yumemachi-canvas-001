/**
 * 設定内容確認画面用JavaScript
 * - 生成画像の表示
 * - 名前（ニックネーム）入力
 * - 生成時の設定内容表示
 * - 画像保存機能
 * - メール送信＆次画面遷移
 */

// ========================================
// 建物タイプの日本語名マッピング
// ========================================
const BUILDING_TYPE_NAMES_JA = {
  'fountain': '噴水',
  'merry-go-round': 'メリーゴーランド',
  'cafe-stand': 'おしゃれなカフェスタンド',
  'other': 'その他'
};

// ========================================
// DOM要素取得・初期化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // DOM要素の取得
  const generatedImage = document.getElementById('generatedImage');
  const nicknameInput = document.getElementById('nickname');
  const nicknameCharCount = document.getElementById('nicknameCharCount');
  const confirmImageMode = document.getElementById('confirmImageMode');
  const confirmBuilding = document.getElementById('confirmBuilding');
  const confirmFreeText = document.getElementById('confirmFreeText');
  const confirmAutoPrompt = document.getElementById('confirmAutoPrompt');
  const saveImageButton = document.getElementById('saveImageButton');
  const saveAndNextButton = document.getElementById('saveAndNextButton');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // セッションストレージからデータを取得
  const generatedImageUrl = sessionStorage.getItem('generatedImageUrl');
  const generationDataStr = sessionStorage.getItem('generationData');

  // 画像URLがない場合は画像表示画面に戻る
  if (!generatedImageUrl) {
    alert('生成画像が見つかりません。画像表示画面に戻ります。');
    window.location.href = '/image-display';
    return;
  }

  // 生成画像を表示
  generatedImage.src = generatedImageUrl;

  // 生成データを解析して表示
  let generationData = null;
  if (generationDataStr) {
    try {
      generationData = JSON.parse(generationDataStr);
      displaySettings(generationData);
    } catch (e) {
      console.error('生成データの解析に失敗:', e);
    }
  }

  // ニックネーム入力の文字数カウント
  nicknameInput.addEventListener('input', () => {
    const length = nicknameInput.value.length;
    nicknameCharCount.textContent = length;
    if (length > 20) {
      nicknameCharCount.style.color = '#FF4444';
    } else {
      nicknameCharCount.style.color = '#888';
    }
  });

  // 画像保存ボタン
  saveImageButton.addEventListener('click', () => {
    saveImage(generatedImageUrl);
  });

  // 設定データ保存＆次へボタン
  saveAndNextButton.addEventListener('click', () => {
    handleSaveAndNext(
      nicknameInput,
      generationData,
      loadingOverlay
    );
  });
});

// ========================================
// 設定内容表示
// ========================================

/**
 * 生成時の設定内容を画面に表示
 * @param {Object} data - 生成データ
 */
function displaySettings(data) {
  const options = data.options || {};

  // 生成タイプ
  const confirmImageMode = document.getElementById('confirmImageMode');
  confirmImageMode.textContent = options.imageModeName || options.imageMode || '-';

  // 建物
  const confirmBuilding = document.getElementById('confirmBuilding');
  const buildingType = options.buildingType || '';
  if (buildingType === 'other') {
    // その他の場合は建物別プロンプト（入力内容）を表示
    confirmBuilding.textContent = options.buildingPrompt || 'その他';
  } else {
    confirmBuilding.textContent = BUILDING_TYPE_NAMES_JA[buildingType] || buildingType || '-';
  }

  // 自由文
  const confirmFreeText = document.getElementById('confirmFreeText');
  confirmFreeText.textContent = options.freeText || '（未入力）';

  // 自動プロンプト
  const confirmAutoPrompt = document.getElementById('confirmAutoPrompt');
  confirmAutoPrompt.textContent = options.autoPrompt ? '使用' : '未使用';
}

// ========================================
// 画像保存
// ========================================

/**
 * 画像をダウンロード保存
 * @param {string} imageUrl - 画像URL
 */
async function saveImage(imageUrl) {
  try {
    // 画像をフェッチしてBlobに変換
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // ダウンロードリンクを作成
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yumemachi_canvas_${Date.now()}.jpg`;
    
    // ダウンロード実行
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // URLを解放
    window.URL.revokeObjectURL(url);
    
    console.log('画像保存完了');
  } catch (error) {
    console.error('画像保存エラー:', error);
    alert('画像の保存に失敗しました。');
  }
}

// ========================================
// メール送信＆次画面遷移
// ========================================

/**
 * 設定データ保存＆次へボタンの処理
 * @param {HTMLInputElement} nicknameInput - ニックネーム入力要素
 * @param {Object} generationData - 生成データ
 * @param {HTMLElement} loadingOverlay - ローディングオーバーレイ
 */
async function handleSaveAndNext(nicknameInput, generationData, loadingOverlay) {
  const nickname = nicknameInput.value.trim();
  const options = generationData?.options || {};

  // 生成画像URLを取得
  const generatedImageUrl = sessionStorage.getItem('generatedImageUrl');

  // 建物名の取得
  const buildingType = options.buildingType || '';
  let buildingName;
  if (buildingType === 'other') {
    buildingName = options.buildingPrompt || 'その他';
  } else {
    buildingName = BUILDING_TYPE_NAMES_JA[buildingType] || buildingType || '-';
  }

  // メール送信データを構築（画像URLを含む）
  const emailData = {
    nickname: nickname || '（未入力）',
    imageMode: options.imageModeName || options.imageMode || '-',
    building: buildingName,
    freeText: options.freeText || '（未入力）',
    autoPrompt: options.autoPrompt ? '使用' : '未使用',
    imageUrl: generatedImageUrl || null  // 生成画像URLを追加
  };

  // ローディング表示
  loadingOverlay.classList.add('active');

  try {
    // メール送信API呼び出し
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    console.log('メール送信結果:', result);

    // メール送信の成功/失敗に関わらず次の画面へ遷移
    // セッションストレージにニックネームを保存（次の画面で使用する可能性）
    sessionStorage.setItem('nickname', nickname);

    // 次の画面へ遷移（現在は仮でトップページへ）
    // TODO: 次の画面のパスを設定
    window.location.href = '/complete';

  } catch (error) {
    console.error('メール送信エラー:', error);
    
    // エラーでも次の画面へ遷移（要件：メール送信確認不要）
    sessionStorage.setItem('nickname', nickname);
    window.location.href = '/complete';
  }
}
