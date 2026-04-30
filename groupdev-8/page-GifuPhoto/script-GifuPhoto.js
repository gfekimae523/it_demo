
const buttons = document.querySelectorAll('.tab-btn');//HTML要素を取得
const contentText = document.querySelector('.content-text');
const contentTitle  = document.querySelector('.content-title');
const slideImage = document.querySelector('.slide-image');
const mapArea = document.querySelector('.map-area');
const prevBtn = document.querySelector('.slide-btn--prev');
const nextBtn = document.querySelector('.slide-btn--next');
const initialTitle = document.querySelector('.content-title--initial');
const initialText  = document.querySelector('.content-text--initial');
const slideWrapper = document.querySelector('.slide-wrapper');
const initialTextWrapper = document.querySelector('.initial-text-wrapper');
const contentArea = document.querySelector('.content-area');
let currentSection = null; // 現在のセクションを記録
let currentIndex = 0;//スライドの何枚目であるか管理
let slideTimer = null;//スライドのタイマー
const slideTextWrapper = document.querySelector('.slide-text-wrapper');
slideTextWrapper.style.flex = '0 0 auto';
slideTextWrapper.style.width = 'auto';


slideImage.style.display = 'none';
prevBtn.style.display = 'none';
nextBtn.style.display = 'none';
// 初期状態でtheme-initialクラスを付与
document.body.classList.add('theme-initial');

const data = {
  blue:{
    images:[
      {
        src: 'images-GifuPhoto/飛騨大鍾乳洞.jpg', 
        title: '<ruby>飛騨大鍾乳洞<rt>ひだだいしょうにゅうどう</rt></ruby>',
        text: '飛騨大鍾乳洞は、自然がつくり出した\n神秘的な洞窟を楽しめるスポットです。\n内部には美しくライトアップされた鍾乳石が\n広がり、幻想的な景色を体験できます。'
      },
    ]
  },
  lightBlue:{
    images:[
      {
        src: 'images-GifuPhoto/白川郷.jpg', 
        title: '<ruby>白川郷<rt>しらかわごう</rt></ruby>',
        text: '合掌造りの集落が広がる\n世界遺産のスポットです。\n四季ごとに異なる風景が楽しめ、\n特に冬の雪景色は幻想的です。\n日本の原風景を感じながら、\nゆったりとした時間を過ごせます。'
      },
      {
        src: 'images-GifuPhoto/新穂高ロープウェイ.jpg', 
        title: '<ruby>新穂高ロープウェイ<rt>しんほだかろーぷうぇい</rt></ruby>',
        text: '標高二千メートル級の絶景を\n気軽に楽しめるスポットです。\n日本唯一の二階建てゴンドラから、\n北アルプスを一望できます。\n四季ごとに異なる美しい景色が魅力です。'
      },
      {
        src: 'images-GifuPhoto/付知峡.jpg', 
        title: '<ruby>付知峡<rt>つけちきょう</rt></ruby>',
        text: '澄んだ渓流と豊かな自然が広がる\n癒しのスポットです。\nエメラルドグリーンの水と\n滝の景色が美しく、\n四季折々の風景を楽しめます。'
      },
    ]
  },
  green:{
    images:[
      {
        src: 'images-GifuPhoto/無もなき池.jpg', 
        title: '<ruby>名もなき池<rt></rt></ruby>',
        text: '「モネの池」とも呼ばれる幻想的な池です。\n透明な水と色鮮やかな鯉、水草が織りなす\n景色は、まるで絵画のような美しさです。\n光や時間によって表情が変わり、\n訪れるたびに違う魅力を楽しめます。'
      },
      {
        src: 'images-GifuPhoto/馬籠宿.jpg', 
        title: '<ruby>馬籠宿<rt>まごめじゅく</rt></ruby>',
        text: '中山道の宿場町として栄えた\n歴史ある町並みです。\n石畳の坂道に古い建物が並び、\n風情ある景色を楽しめます。'
      },
      {
        src: 'images-GifuPhoto/養老の滝.jpg', 
        title: '<ruby>養老の滝<rt>ようろうのたき</rt></ruby>',
        text: '迫力ある滝と自然に囲まれた\n癒しのスポットです。\n落差約三十メートルの滝が\n流れ落ちる景色は美しく、\n四季ごとの風景を楽しめます。'
      },
    ]
  },
  yellow:{
    images:[
      {
        src: 'images-GifuPhoto/洲原ひまわりの里.jpg', 
        title: '<ruby>洲原ひまわりの里<rt>すはらひまわりのさと</rt></ruby>',
        text: '一面に広がるひまわり畑が魅力の\nスポットです。夏には満開のひまわりと\n青空の美しい景色を楽しめます。\n写真映えする風景が広がり、\n気軽に自然を満喫できます。'
      },
      {
        src: 'images-GifuPhoto/根尾谷淡墨桜.jpg', 
        title: '<ruby>根尾谷淡墨桜<rt>ねおだにうすずみざくら</rt></ruby>',
        text: '日本三大桜のひとつに数えられる名木です。\n満開から散り際にかけて花の色が変化し、\n淡い美しさを楽しめます。\n春には多くの人が訪れる、\n風情ある絶景スポットです。'
      },
    ]
  },
  orange:{
    images:[
      {
        src: 'images-GifuPhoto/飛騨高山古町.jpg', 
        title: '<ruby>飛騨高山古い町並<rt>ひだたかやまふるいまちなみ</rt></ruby>',
        text: '江戸時代の風情が残る歴史ある街並みです。\n格子造りの建物が並び、\n食べ歩きやお土産探しを楽しめます。\n散策しながら、昔ながらの雰囲気を\nゆったり味わえます。'
      },
      {
        src: 'images-GifuPhoto/鵜飼.jpg', 
        title: '<ruby>長良川鵜飼<rt>ながらがわうかい</rt></ruby>',
        text: '千三百年以上続く伝統漁を\n今も受け継ぐ貴重な文化です。\n鵜匠が巧みに鵜を操る技と、\nかがり火に照らされた光景が見どころです。\n歴史と技の魅力を間近で感じられる\n特別な体験ができます。'
      },
      {
        src: 'images-GifuPhoto/郡上踊り.webp', 
        title: '<ruby>郡上おどり<rt>ぐじょうおどり</rt></ruby>',
        text: '夏に開催される伝統的な盆踊りの祭りです。\n誰でも参加でき、夜通し踊る\n「徹夜おどり」が大きな魅力です。\n町全体が一体となる、\n活気あふれる夏の風物詩です。'
      },
      {
        src: 'images-GifuPhoto/郡上.jpg', 
        title: '<ruby>郡上八幡城<rt>ぐじょうはちまんじょう</rt></ruby>',
        text: '山の上に建つ美しい木造の城です。\n秋には紅葉に囲まれ、色鮮やかな景色とともに風情ある雰囲気を楽しめます。\n天守からは城下町や山々を一望でき、\n四季の魅力を感じられます。'
      },
    ]
  },
  red:{
    images:[
      {
        src: 'images-GifuPhoto/さるぼぼ.jpg', 
        title: '<ruby>さるぼぼ<rt></rt></ruby>',
        text: '赤い布で作られた顔のない人形で、\n子どもの健康や幸せを願うお守り\nとして作られました。\n現在は、飛騨のお土産や縁起物として\n人気があります。'
      },
      {
        src: 'images-GifuPhoto/津屋川堤防.jpg', 
        title: '<ruby>津屋川堤防<rt>つやがわていぼう</rt></ruby>',
        text: '彼岸花が堤防一面に咲き誇る\n美しいスポットです。\n秋には真っ赤な彼岸花が川沿いを彩り、\n幻想的な景色を楽しめます。'
      },
      {
        src: 'images-GifuPhoto/おちょぼ.jpg', 
        title: '<ruby>千代保稲荷神社<rt>ちよほいなりじんじゃ</rt></ruby>',
        text: '「おちょぼさん」の愛称で親しまれる\n商売繁盛の神社です。\n参道には多くの屋台が並び、\n食べ歩きも楽しめます。\n活気ある雰囲気の中で、\n参拝とグルメを気軽に満喫できます。'
      },
    ]
  },
};
function updateSlide(section){//内容の書き換え関数
  const slide = data[section].images[currentIndex];
  slideImage.style.opacity = 0;
  contentTitle.style.opacity = 0;
  contentText.style.opacity = 0;
  setTimeout(() => {
    slideImage.src = slide.src;
    contentTitle.innerHTML = slide.title;
    contentText.textContent = slide.text;
    slideImage.style.opacity = 1;
    contentTitle.style.opacity = 1;
    contentText.style.opacity = 1;
  },300);
}

function restartTimer(section) {
  const images = data[section].images;
  clearInterval(slideTimer);
  if (images.length >= 2) {
    slideTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      updateSlide(section);
    }, 12000);
  }
}

function startSlideshow(section){//スライドの開始関数
  currentSection = section; // 追加
  currentIndex = 0;//一枚目にする
  restartTimer(section); // ← clearInterval+setIntervalをrestartTimerに置き換え
  updateSlide(section);
  prevBtn.style.display = 'block';
  nextBtn.style.display = 'block';
  if (data[section].images.length <= 1) {
    prevBtn.style.visibility = 'hidden';
    nextBtn.style.visibility = 'hidden';
  } else {
    prevBtn.style.visibility = 'visible';
    nextBtn.style.visibility = 'visible';
  }
}


// 矢印ボタンのクリックイベントを追加
prevBtn.addEventListener('click', () => {
  if (!currentSection) return;
  const images = data[currentSection].images;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateSlide(currentSection);
  restartTimer(currentSection);
});

nextBtn.addEventListener('click', () => {
  if (!currentSection) return;
  const images = data[currentSection].images;
  currentIndex = (currentIndex + 1) % images.length;
  updateSlide(currentSection);
  restartTimer(currentSection);
});


buttons.forEach(btn => {
  btn.addEventListener('click',() => {
    if (initialTextWrapper) initialTextWrapper.style.display = 'none';
    // 初期クラスを外す
    if (initialTitle) initialTitle.classList.remove('content-title--initial');
    if (initialText)  initialText.classList.remove('content-text--initial');
    if (initialTitle) initialTitle.classList.remove('text-shadow');
    if (initialText) initialText.classList.remove('text-shadow');

    const target = btn.dataset.section;
    buttons.forEach(b => b.classList.remove('is-active'));//アクティブを外す
    btn.classList.add('is-active');//クリックされたボタンのみアクティブにする

    document.body.className = `theme-${target}`;//bodyタグのクラス名を変更

    if (target === 'outline') {
      clearInterval(slideTimer);//スライドを停止
      slideImage.style.display = 'none';//写真を非表示
      prevBtn.style.display = 'none'; 
      nextBtn.style.display = 'none'; 
      mapArea.style.display = 'flex'; //マップを表示
      slideWrapper.style.display = 'none';  
      contentArea.classList.add('content-area--map');
      contentArea.style.height = 'auto';        // ← 追加
      contentArea.style.alignItems = 'flex-start';

    } else {
      slideImage.style.display = 'block'; // 写真を表示 
      mapArea.style.display = 'none';     // マップを非表示
      slideWrapper.style.display = 'flex'; 
      slideTextWrapper.style.flex = '0 0 320px';
      contentArea.classList.remove('content-area--map');
      slideTextWrapper.style.width = '320px';
      contentArea.style.height = 'calc(100vh - 90px)'; // （元に戻す）
      contentArea.style.alignItems = 'center';  
      startSlideshow(target);
    }
  });
});


document.querySelectorAll('.map-group').forEach(group => {
  const items = group.querySelectorAll('.map-item');
  if (items.length >= 3) { // 3個以上で均等配置に切り替え
    group.style.justifyContent = 'space-evenly';
    } else {
    // 1〜2個のときはアイテム間・端にgapで余白をつける
    group.style.gap = '16px';
    group.style.paddingRight = '32px';
  }
});
