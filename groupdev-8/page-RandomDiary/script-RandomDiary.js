const overlay = document.getElementById('overlay');

const diariy = [
  { img: "images-RandomDiary/diary-1.png",  name: "眠い", desc: "企画を練らなきゃいけないのに眠い。練るだけに寝てしまおうか……Zzz……すぅ……すぅ……って、起きて企画を練ろう。" }, //1
  { img: "images-RandomDiary/diary-2.png",  name: "担々麺", desc: "担々麺を食べた。服に汁が飛んで、汚れとしてついてしまった。洗濯をしたら取れるだろうか……。"    },//2
  { img: "images-RandomDiary/diary-3.png", name: "ラジオ体操の間",   desc: "ラジオ体操第一、第二の間のあれを数年間やっていない気がしたのでやってみた。なんだか疲れが軽減した気がした。"        },//3
  { img: "images-RandomDiary/diary-4.png", name: "ぼーっと……",   desc: "作業中だがぼーっとしてみようとしたが周りの音が気になり、できなかった。"        },//4
  { img: "images-RandomDiary/diary-5.png", name: "課金",   desc: "スマホアプリの課金に関して、長期間使うことを前提としないほうが良いということを思った。理由としては、OSのアップデートやサービス終了の関係で使えなくなることが考えられるからということが挙げられる。"        },//5
  { img: "images-RandomDiary/diary-6.png", name: "デジタル、アナログの反復横跳び",   desc: "私はデジタルとアナログの間をいったりきたりしているように感じる。スケジュール管理に関して、以前は紙のノートにペンで予定を書き込んでいたが、最近はスマホのスケジュール管理アプリを使って予定を管理している。どちらかに落ち着く日は果たして、来るのだろうか……"        },//6
  { img: "images-RandomDiary/diary-7.png", name: "ぼーっとしてみる2",   desc: "作業中にぼーっとしてみた。意識が遠のいていく気がした。"        },//7
  { img: "images-RandomDiary/diary-8.png", name: "服",   desc: "はじめて服を自分で選んだ。能動的に選べて楽しかった。"        },//8
  { img: "images-RandomDiary/diary-9.png", name: "宅配受付",   desc: "コンビニに荷物を持っていき、宅配の手続きをした。自立に一歩近づいた気がした。"        },//9
  { img: "images-RandomDiary/diary-10.png", name: "目をつぶる",   desc: "目をつぶるとなんだか落ち着くことに最近気づいた。不安なときに行ってみたいと思う。"        },//10
  { img: "images-RandomDiary/diary-11.png", name: "散歩",   desc: "集合時間まで余裕があったので、駅の周辺を散歩した。イベントなどがやっていて新鮮な体験ができた。"        },//11
  { img: "images-RandomDiary/diary-12.png", name: "カタルシス",   desc: "ある漫画を読んだ。ラストの結末が衝撃的で、しばらくのあいだぼーっとしていた。"        },//12
  { img: "images-RandomDiary/diary-13.png", name: "掃除",   desc: "すっかり習慣になった掃除を今日も行った。やりながらいろいろなことを考えられるため、案外楽しい時間だ。"        },//13
  { img: "images-RandomDiary/diary-14.png", name: "空",   desc: "空を見上げると、雲が流れるように広がっている。日常の光景のはずなのに、なんだか特別な感じがした。"        },//14
  { img: "images-RandomDiary/diary-15.png", name: "創作のアイデア",   desc: "落ち込むような出来事があったが、それを創作に活かせばよいと思ったら自然と落ち着いた。"        },//15
  { img: "images-RandomDiary/diary-16.png", name: "距離感",   desc: "人間関係での距離感について考えてみた。離れすぎず、近づきすぎず、適切な距離感を保ちたい。また、それを受け入れたい。"        },//16
  { img: "images-RandomDiary/diary-17.png", name: "ゲーム",   desc: "協力してステージをクリアするゲームで遊んだ。多くのステージをお互いを気遣いながら協力してクリアできて楽しめた。"        },//17
  { img: "images-RandomDiary/diary-18.png", name: "イベント参加",   desc: "イベントでさまざまな方々の話を聞くことができて楽しかった。"        },//18
  { img: "images-RandomDiary/diary-19.png", name: "感覚",   desc: "webサイトの作成のために必要な「感覚」が身についた気がした。"        },//19
  { img: "images-RandomDiary/diary-20.png", name: "緊張",   desc: "イベント前日、うまく立ち回れるか不安で心臓がバクバクしている。"        },//20                
   { img: "images-RandomDiary/diary-21.png", name: "あたり",   desc: "当たりっ！いえいっ！"        },//21                                 
];

function openModal() {
  overlay.classList.add('is-open');

   // 追加: ランダム選択して書き込む
  const item = diariy[Math.floor(Math.random() * diariy.length)];
  document.getElementById("mImg" ).src         = item.img;
  document.getElementById("mName").textContent = item.name;
  document.getElementById("mDesc").textContent = item.desc;
}

function closeModal() {
  overlay.classList.remove('is-open');
}

// オーバーレイ（背景）クリックでも閉じる
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
});


const keyword = [
  { img: "images-RandomDiary/keywordR.png",  name: "キーワード", desc: "キーワードは「R」だよっ！" }, //1
  ];

  function openModalKeyword() {
  overlay.classList.add('is-open');

   // ___
  const item = keyword[0];
  document.getElementById("mImg" ).src         = item.img;
  document.getElementById("mName").textContent = item.name;
  document.getElementById("mDesc").textContent = item.desc;
}



