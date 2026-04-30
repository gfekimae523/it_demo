const mv_images = ["images-GeroOnsen/slide0.png"
    , "images-GeroOnsen/slide1.png"
    , "images-GeroOnsen/slide2.png"
    , "images-GeroOnsen/slide3.png"
    , "images-GeroOnsen/slide4.png"
    , "images-GeroOnsen/slide5.png"
    , "images-GeroOnsen/slide6.png"];

const item = document.getElementById("mv-img-1");
const array = [];

var image_num = 0;

function btn0_onclick() {
    slide(mv_images[0], mv_images[1], "3.0s");
}

function btn1_onclick() {
    array = [];
    array.push(mv_images.concat());
    

    main_slide(1);

}

function main_slide(btn_num) {
    slides();
    //slides(makde_slide_array(btn_num));
}

function makde_slide_array(btn_num) {
    // 距離判定
    if (image_num <= btn_num) {
        var dist = btn_num - image_num;
    } else {
        var dist = 8 + btn_num - image_num;
    }
    //スライドの配列
    array = [];
    array.push(mv_images.slice(image_num, image_num + dist + 1));
}

function slides() {
    if (array.length <= 0) {
        //何もしない
    } else {
        slide(array[0], array[1], "3.0s");
        array.shift();
    }
}

function slide(image1, image2, t) {

    target = document.getElementById("mv-img-1");
    target.className = "mv-img2";
    target.src = image1;
    target.style.transition = t;

    target = document.getElementById("mv-img-2");
    target.className = "mv-img-hidden2";
    target.src = image2;
    target.style.transition = t;
}

item.addEventListener("animationend", () => {
    slides()
});