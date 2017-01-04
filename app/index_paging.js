/*簡易ページプレビュー用の処理*/
// スクロール監視
var exif_x = 0, exif_y = 0;
var isnopagebreak = true;

// ページング処理
function exPaging(iframe){
    // ページエリアの最大高さを200mmと仮定
    var maxpageheight = mm2px(200);

    $(iframe).contents().find('.pages-container').off('scroll');

    $(iframe).load(function(){

        // htmlとbodyの高さを100%に
        $(iframe).contents().find('html').css('height', '100%');
        $(iframe).contents().find('body').css('height', '100%');
        // jQueryで指定iframeの子要素を取得
        // 以降は子要素に対する処理
        var cbody = $(iframe).contents().find('body');

        // body下の全要素をpages-containerで包む
        if(cbody.find('.pages-container').length < 1){
            cbody.contents().wrapAll('<div class="pages-container" />');
        }
        // body自体の幅は100%に変更
        // var bodywidth = cbody.css('width');
        cbody.css('width', '100%');

        // 全ページを入れるコンテナを生成
        /* 以降は次のような構成になる
        body
        ->div.pages-container　（flexbox）
        ->div.sngpage-container
        ->div.sngpage-container
        ->div.sngpage-container
        */
        var cpages = cbody.find('.pages-container');
        cpages.css({
            'height': '100%',
            'overflow': 'auto',
            'display': 'flex',
            'flex-direction': 'row',     /*横並びにする*/
            'align-items': 'flex-start' /*縦に伸ばさない*/
            
        });

        // 最初のページのコンテナを生成
        if(cpages.find('.sngpage-container').length < 1){
            cpages.contents().wrapAll('<div class="sngpage-container" />');
        }
        // 最後（最初）のページを取得
        var lastpage = cpages.find('.sngpage-container').last();     

        // CSSの反映を待つためにタイマーで200mm秒後待機
        var timer1 =  setTimeout(function(){
            // 最後のページの全子要素を取得
            var cnts = lastpage.children();
            // 子に改ページ要素を含む要素を探して分割する
            cnts.each(function(index){
                divideElement($(this));
            });
            clearTimeout(timer1);

            var bgcolor = cbody.css('backgroundColor');
            cbody.css('backgroundColor', '#444');
            cbody.find('.pagenumber').remove();

            var counter = 200;    //動作停止用（最大200ページでストップ）

            // 改ページが見つからなくなるまでループ
            var timer2 = setTimeout(function pagebreakloop(){
                lastpage.css({
                    'margin-right': '10mm',
                    'padding': '4mm',
                    'border': 'solid 1px #aaa',
                    'backgroundColor': bgcolor,
                    'position': 'relative'
                })
                // 最後のページの全子要素を取得
                var cnts = lastpage.children();
                // console.log(lastpage);

                // 要素を走査して改ページを探す
                isnopagebreak = true;   // 改ページしていないフラグ
                cnts.each(function(index){
                    console.log('elem' + index + ' ' + $(this).attr('class') + ' ' + $(this).text().substr(0, 10));
                    var pbb = $(this).css('page-break-before');
                    var pba = $(this).css('page-break-after');
                    var ba = $(this).css('break-after');
                    console.log(pbb + pba + ba);

                    // 「前で改ページ」が見つかった
                    if( pbb === 'left' || pbb === 'always' || pbb === 'right'){
                        // 先頭要素はスキップ（すでに先頭にいるなら直前で改ページする必要はない）
                        if(index==0) return true;
                        var newpage = $('<div class="sngpage-container" />');
                        // thisの1つ前の要素を基準にしてその次から最後までをnewpageに移動
                        var prev = $(this).prev();
                        newpage.append(prev.nextAll());
                        // newpageをlastpageの後に移動
                        lastpage.after(newpage);
                        lastpage = newpage;
                        console.log('---page-break-before');
                        isnopagebreak = false;
                        return false;
                    }
                    // 「後で改ページ」が見つかった
                    if( pba === 'left' || pba === 'always' || pba === 'right'){
                        var newpage = $('<div class="sngpage-container" />');
                        // thisの次から最後までをnewpageに移動
                        newpage.append($(this).nextAll());
                        // newpageをlastpageの後に移動
                        lastpage.after(newpage);
                        lastpage = newpage;
                        console.log('***page-break-after');
                        isnopagebreak = false;
                        return false;
                    }

                });

                // 改ページ要素がなければタイマーループ終了
                counter--;
                if(isnopagebreak === true || counter < 0) {
                    // タイマーループ終了
                    clearTimeout(timer2);

                    // ノンブル設定
                    console.log('######ノンブル設定');
                    cbody.find('.pagenumber').remove();
                    cpages.find('.sngpage-container').append('<div class="pagenumber" />');
                    cpages.find('.pagenumber').each(function(index){
                        $(this).text(index+1); 
                        $(this).css({
                            'position': 'absolute',
                            'top': '10px',
                            'right': '10px',
                            'font-size': '20px',
                            'color': '#bbb'
                        });
                    });
                    cpages.find('.sngpage-container').each(function(index){
                        $(this).attr('id', 'exipage'+index);
                    });
                    // スクロール位置復帰
                    cpages.scrollLeft(exif_x);
                    cpages.scrollTop(exif_y);
                    console.log('スクロール復帰' + exif_x + ':' + exif_y);
                    // スクロール監視
                    console.log('スクロール監視イベント設定');
                    cpages.scroll(function () {
                        // console.log('####################scroll');
                        exif_x = cpages.scrollLeft();
                        exif_y = cpages.scrollTop();
                        // console.log(exif_x, exif_y);
                    });
                    console.log(bgcolor);
                } else {
                    // タイマーループ再開
                    clearTimeout(timer2);
                    timer2 = setTimeout(pagebreakloop, 1);
                }

            },1); //setTimeout timer2
        }, 200); //setTimeout timer1

    }); //cdom.load

}

// 要素の子に改ページ指定がある場合、要素を2つに分離して処理しやすくする
function divideElement(elem){
    // 改ページ指定がない要素でも、直下の子要素に改ページ指定がないかチェックする
    var magos = elem.children();
    console.log('....inside');
    
    magos.each(function(index){
        console.log('....elem' + index + ' ' + $(this).attr('class') + ' ' + $(this).text().substr(0, 10));
        var pbb = $(this).css('page-break-before');
        var pba = $(this).css('page-break-after');
        // 「前で改ページ」が見つかった
        if( pbb === 'left' || pbb === 'always' || pbb === 'right' ){
            // 先頭要素はスキップ（すでに先頭にいるなら直前で改ページする必要はない）
            if(index==0) return true;
            // elemの複製を作成（ただし子は持ってこない）
            var newelem = elem.clone();
            newelem.empty();
            // thisの1つ前の要素を基準にしてその次から最後までをnewelemに移動
            var prev = $(this).prev();
            newelem.append(prev.nextAll());
            // newelemをelemの後に移動
            elem.after(newelem);
            // newelem.css('page-break-before', pbb);
            newelem.attr('style', 'page-break-before:' + pbb);
            newelem.css('counter-reset', 'none');
            elem = newelem;
            console.log('..---!divide inside! page-break-before');
            return true;
        }
        // 「後で改ページ」が見つかった
        if( pba === 'left' || pba === 'always' || pba === 'right'){
            // elemの複製を作成（ただし子は持ってこない）
            var newelem = elem.clone();
            newelem.empty();
            // thisの次から最後までをnewelemに移動
            newelem.append($(this).nextAll());
            // newelemをelemの後に移動
            elem.after(newelem);
            // newelem.css('page-break-after', pba);
            newelem.attr('style', 'page-break-before:' + pba);
            newelem.css('counter-reset', 'none');
            elem = newelem;
            console.log('..---!divide inside! page-break-after');
            return true;
        }
        // // ページ末になるなら改ページが見つかった
        // if(pba === 'avoid'){
        //     // 先頭要素はスキップ（すでに先頭にいるなら直前で改ページする必要はない）
        //     if(index==0) return true;
        //     // elemの複製を作成（ただし子は持ってこない）
        //     var newelem = elem.clone();
        //     newelem.empty();
        //     // thisの1つ前の要素を基準にしてその次から最後までをnewelemに移動
        //     var prev = $(this).prev();
        //     newelem.append(prev.nextAll());
        //     // newelemをelemの後に移動
        //     elem.after(newelem);
        //     newelem.css('page-break-after', avoid);
        //     elem = newelem;
        //     console.log('..---!divide inside! page-break-after *avoid');
        //     return true;            
        // }
    });
}

// pxとミリを換算
function px2mm(px){
    return px/96*25.4;
}
function mm2px(mm){
    return mm*96/25.4;
}