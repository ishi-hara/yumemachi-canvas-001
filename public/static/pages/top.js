/**
 * トップ画面用JavaScript
 * - クラッカーアニメーション制御
 * - スタートボタン処理
 */

// ========================================
// 定数定義
// ========================================

// 紙吹雪の色（かわいい・ポップな色合い）
const CONFETTI_COLORS = [
  '#FF6B9D', // ピンク
  '#FFD700', // ゴールド
  '#7B68EE', // パープル
  '#FF69B4', // ホットピンク
  '#00CED1', // ターコイズ
  '#FFA500', // オレンジ
  '#98FB98', // ペールグリーン
  '#DDA0DD'  // プラム
];

// 紙吹雪の形状
const CONFETTI_SHAPES = ['●', '■', '★', '♦', '♥', '▲'];

// ========================================
// DOM要素取得
// ========================================

/**
 * ページ読み込み完了時の処理
 */
document.addEventListener('DOMContentLoaded', () => {
  // 要素の取得
  const crackerLeft = document.getElementById('crackerLeft');
  const crackerRight = document.getElementById('crackerRight');
  const confettiContainer = document.getElementById('confettiContainer');
  const startButton = document.getElementById('startButton');

  // クラッカーアニメーション開始（少し遅延させる）
  setTimeout(() => {
    playCrackerAnimation(crackerLeft, crackerRight, confettiContainer);
  }, 500);

  // スタートボタンのイベント設定
  setupStartButton(startButton);
});

// ========================================
// クラッカーアニメーション
// ========================================

/**
 * クラッカーアニメーションを再生
 * @param {HTMLElement} crackerLeft - 左側クラッカー要素
 * @param {HTMLElement} crackerRight - 右側クラッカー要素
 * @param {HTMLElement} confettiContainer - 紙吹雪コンテナ
 */
function playCrackerAnimation(crackerLeft, crackerRight, confettiContainer) {
  // 左右のクラッカーにアニメーションクラスを追加
  crackerLeft.classList.add('pop');
  crackerRight.classList.add('pop');

  // 少し遅れて紙吹雪を発生させる
  setTimeout(() => {
    createConfetti(confettiContainer, 'left');
    createConfetti(confettiContainer, 'right');
  }, 300);
}

/**
 * 紙吹雪を生成
 * @param {HTMLElement} container - 紙吹雪を追加するコンテナ
 * @param {string} side - 'left' または 'right'
 */
function createConfetti(container, side) {
  const confettiCount = 15; // 片側の紙吹雪の数
  
  for (let i = 0; i < confettiCount; i++) {
    // 紙吹雪要素を作成
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // ランダムな形状と色を設定
    const shape = CONFETTI_SHAPES[Math.floor(Math.random() * CONFETTI_SHAPES.length)];
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    
    confetti.textContent = shape;
    confetti.style.color = color;
    confetti.style.fontSize = `${Math.random() * 10 + 8}px`;
    
    // 位置を設定（左右に応じて）
    const baseX = side === 'left' ? 15 : 75;
    const offsetX = (Math.random() - 0.5) * 30;
    confetti.style.left = `${baseX + offsetX}%`;
    confetti.style.top = '20px';
    
    // アニメーション設定
    const duration = Math.random() * 1 + 1; // 1〜2秒
    const delay = Math.random() * 0.3; // 0〜0.3秒の遅延
    const horizontalMove = (Math.random() - 0.5) * 100; // 左右に散らばる
    
    confetti.style.animation = `confettiFall ${duration}s ease-out ${delay}s forwards`;
    confetti.style.setProperty('--horizontal-move', `${horizontalMove}px`);
    
    // カスタムアニメーション（横方向の動きを追加）
    confetti.animate([
      { 
        opacity: 1, 
        transform: 'translateY(0) translateX(0) rotate(0deg)' 
      },
      { 
        opacity: 0, 
        transform: `translateY(150px) translateX(${horizontalMove}px) rotate(${Math.random() * 720}deg)` 
      }
    ], {
      duration: duration * 1000,
      delay: delay * 1000,
      easing: 'ease-out',
      fill: 'forwards'
    });
    
    container.appendChild(confetti);
    
    // アニメーション終了後に要素を削除
    setTimeout(() => {
      confetti.remove();
    }, (duration + delay) * 1000 + 100);
  }
}

// ========================================
// スタートボタン
// ========================================

/**
 * スタートボタンのイベント設定
 * @param {HTMLElement} button - スタートボタン要素
 */
function setupStartButton(button) {
  button.addEventListener('click', () => {
    // ボタン押下時のエフェクト
    button.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      button.style.transform = '';
      // 画像表示画面へ遷移
      window.location.href = '/image-display';
    }, 150);
  });
}
