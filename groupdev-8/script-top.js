 const CORRECT = 'nature'; // 正解キーワード
 const correcT = 'NATURE'; // 正解キーワード

    // キーワードを判定してポップアップを表示
    function sendKeyword() {
      const input = document.getElementById('input-keyword').value.trim();
      const popupId = ((input === CORRECT) || (input === correcT)) ? 'popupA' : 'popupB';
      document.getElementById(popupId).classList.add('active');
    }

    // ポップアップを閉じる（暗い部分クリックでも閉じる）
    function closePopup(overlay, event) {
      if (!event || event.target === overlay) {
        overlay.classList.remove('active');
      }
    }

    function openPopupB() {
         // B-1を閉じる
        document.getElementById('popupB').classList.remove('active');
         // B-2を開く
        document.getElementById('popupC').classList.add('active');
    }