// 余分なスペース削除
function normalizeAnswer(text) {
    return text.replace(/\s+/g, "").trim();
}

// Q1 判定
function isCorrectQ1(answer) {
    return ["金"].includes(answer);
}

// Q2 判定
function isCorrectQ2(answer) {
    return ["マスク"].includes(answer);
}


// 判定処理
function checkQuiz() {
    const q1 = normalizeAnswer(document.getElementById("q1").value);
    const q2 = normalizeAnswer(document.getElementById("q2").value);

    const wrongBlock = document.getElementById("wrongBlock");
    const correctBlock = document.getElementById("correctBlock");

    // 初期化
    wrongBlock.classList.add("is-hidden");
    correctBlock.classList.add("is-hidden");

    // 判定
    if (isCorrectQ1(q1) && isCorrectQ2(q2)) {
        correctBlock.classList.remove("is-hidden");
    } else {
        wrongBlock.classList.remove("is-hidden");
    }
}

// ボタン＆Enter対応
document.addEventListener("DOMContentLoaded", () => {

    const quizButton = document.getElementById("quizButton");
    const q1 = document.getElementById("q1");
    const q2 = document.getElementById("q2");

    // ボタン押下
    if (quizButton) {
        quizButton.addEventListener("click", checkQuiz);
    }

    // Enterキー対応
    [q1, q2].forEach((input) => {
        if (!input) return;

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                checkQuiz();
            }
        });
    });

});

//変更点------------------------------------------------------------------------------
function closeWrongOverlay() {
    const wrongBlock = document.getElementById("wrongBlock");
    wrongBlock.classList.add("is-hidden");
}
function closeCorrectOverlay() {
    const correctBlock = document.getElementById("correctBlock");
    correctBlock.classList.add("is-hidden");
}
function closeWrongOverlay(event) {
    const overlay = document.getElementById('wrongBlock');
    
    // 引数 event があり、かつクリックされたのが「背景（overlay）」自身だった場合のみ閉じる
    // これをしないと、中の白い箱や画像をクリックしても閉じてしまいます
    if (event && event.target !== overlay) {
        return; 
    }

    overlay.classList.add('is-hidden');
}
function closeCorrectOverlay(event) {
    const overlay = document.getElementById('correctBlock');
    
    // 引数 event があり、かつクリックされたのが「背景（overlay）」自身だった場合のみ閉じる
    // これをしないと、中の白い箱や画像をクリックしても閉じてしまいます
    if (event && event.target !== overlay) {
        return; 
    }

    overlay.classList.add('is-hidden');
}
//変更点------------------------------------------------------------------------------