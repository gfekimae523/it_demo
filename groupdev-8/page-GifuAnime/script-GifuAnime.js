window.addEventListener("load", () => {
    const tl = gsap.timeline();

    // ① 黒板落下：真っ直ぐ降りてきて、着地で弾む
    tl.to(".board-wrapper", {
        y: 0,
        rotate: 0,
        duration: 1.5,
        ease: "back.out(2)"
    });

    tl.fromTo(".board-anime-img", 
    // ① 開始状態（手前）
    { 
        z: 800, 
        scale: 2, 
        opacity: 0 // 出現の瞬間だけ0にしておき、すぐに1にする
    }, 
    // ② 終了状態（奥・黒板の上）
    { 
        z: 0, 
        scale: 1, 
        opacity: 1, 
        duration: 1.0, 
        stagger: 0.5, 
        ease: "power2.out"
    },
        "-=0.3" // 黒板が弾むタイミングに合わせる
    );

  // ③ タイトル表示：最後に真ん中の文字が浮かび上がる
    tl.fromTo(".blackboard-copy span", 
      // ① 開始状態
      { 
        opacity: 0, 
        y: 10       // ★少し下から浮かび上がる（書いている手の動きを表現）
      }, 
      // ② 終了状態
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.3, // 1文字が書かれる速さ
        stagger: 0.1,  // ★重要：0.1秒ずつズレて左から順に表示
        ease: "power2.out" // 自然に止まる
      },
      "+=0.2" // 画像が全部貼り終わってから0.2秒後に開始
    );
    // ③ タイトル表示：最後に真ん中の文字が浮かび上がる
    tl.fromTo(".board-comment > span ", 
      // ① 開始状態
      { 
        opacity: 0, 
        y: 10       // ★少し下から浮かび上がる（書いている手の動きを表現）
      }, 
      // ② 終了状態
      { 
        opacity: 1, 
        y: 0, 
        duration: 0.6, // 少しゆっくり出す
        stagger: 0.4,  // 単語ごとの間隔を広げる
        ease: "back.out(1.7)" // 弾むような動きを加えるとチョークっぽさが出ます
      },
      "+=0.2" // 画像が全部貼り終わってから0.2秒後に開始
    );
    
    ScrollTrigger.create({
        trigger: ".blackboard-section",
        start: "top 80%", // 画面の8割くらいまで黒板が来たら起動
        once: true,       // ★重要：一度再生したらトリガーを破棄する
        onEnter: () => tl.play(), // 画面に入ったらタイムラインを再生
    });
});

window.addEventListener("DOMContentLoaded", () => {
    //メインビジュアル--------------------------------------------
    const images = document.querySelectorAll(".board-anime-img");

    const centerX = 50; // %
    const centerY = 50; // %

    const radiusX = 40; // 横広め
    const radiusY = 28; // 縦狭め

    const rotations = [-12, 5, 12, -6, 3, -10,20,-15,4,-12];

    //メインビジュアルの黒板の上に載せる画像の配置と向きを決める関数
    images.forEach((img, index) => {
        // 1. まずは等間隔な「見かけ上の角度」
        const virtualAngle = (360 / images.length) * index;
        const virtualRad = virtualAngle * Math.PI / 180;        
        // 2. ★ここが最重要：楕円の扁平率に合わせて角度を  補正る
        // これにより、左右に密集するのを防ぎ、上下に画像を押し出します
        const realRad = Math.atan2(radiusX * Math.sin(virtualRad), radiusY * Math.cos(virtualRad));     
        // 3. 補正した角度（realRad）を使って座標   を計
        let x = centerX + radiusX * Math.cos(realRad);
        let y = centerY + radiusY * Math.sin(realRad);      
        // 4. クランプ処理（画面外へのはみ出し  防止
        x = Math.max(2, Math.min(98, x));
        y = Math.max(2, Math.min(98, y));       
        // 5.    反
        img.style.left = `${x}%`;
        img.style.top = `${y}%`;
        img.style.transform = `translate(-50%, -50%) rotate(${rotations[index]}deg)`;
    })
    //--------------------------------------------

    //アニメ紹介セクション--------------------------------------------
    
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: ".scroll-wrapper", // 監視するのは外側の枠
            start: "top top",           // 枠の上が画面の上に来たら開始
            end: "bottom bottom",              // 3000px分スクロールする間、固定を維持
            scrub: 1,
            pin: ".note-container",     // ★重要：中身のコンテナを画面に固定する
            pinSpacing: true,           // 固定が終わるまで次のコンテンツを下に押し下げておく
            anticipatePin: 1,
        }
    });

    // p1〜p3だけを退場させる
    tl.to(".p1", { x: "110%", opacity: 0, scale: 0.9, duration: 1 })
      .to({}, { duration: 0.5 }) 
      .to(".p2", { x: "110%", opacity: 0, scale: 0.9, duration: 1 })
      .to({}, { duration: 0.5 })
      .to(".p3", { x: "110%", opacity: 0, scale: 0.9, duration: 1 });

      // p4は最後に見えるページなので動かさない、あるいは少しだけ残す
    //--------------------------------------------
});