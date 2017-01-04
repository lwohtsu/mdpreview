/*簡易ページプレビュー用の処理*/

function exPaging(iframe){
    // ページエリアの最大高さを200mmと仮定
    var maxpageheight = mm2px(200);

    $(iframe).load(function(){
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
            'maxHeight': '200mm',
            'overflow': 'auto',
            'display': 'flex'
        });

        // 最初のページのコンテナを生成
        if(cpages.find('.sngpage-container').length < 1){
            cpages.contents().wrapAll('<div class="sngpage-container" />');
        }
        // 最後（最初）のページを取得
        var lastpage = cpages.find('.sngpage-container').last();     
        lastpage.css({
            'margin-right': '10mm',
        });

        var isnopagebreak;
        var counter = 200;    //動作停止用

        // 改ページが見つからなくなるまでループ（CSSが反映されるのを待つため200mm秒以上は待機する）
        var timer = setInterval(function(){
            // 最後のページを取得
            var lastpage = cpages.find('.sngpage-container').last();     
            lastpage.css({
                'margin-right': '10mm',
                'padding-left': '4mm',
                'padding-right': '4mm',
                'border': 'solid 1px #222'
            })
            // 最後のページの全子要素を取得
            var cnts = lastpage.children();
            // console.log(lastpage);

            // 要素を走査して改ページを探す
            isnopagebreak = true;   // 改ページしていないフラグ
            cnts.each(function(index){
                console.log('elem' + index + ' ' + $(this).attr('class') + ' ' + $(this).text().substr(0, 10));
                var bb = $(this).css('page-break-before');
                var ba = $(this).css('page-break-after');
                console.log(bb + ba);

                // 「前で改ページ」が見つかった
                if( bb === 'left' || bb === 'always' || bb === 'right' ){
                    // 先頭要素はスキップ
                    if(index==0) return true;
                    var newpage = $('<div class="sngpage-container" />');
                    // thisの1つ前の要素を基準にしてその次から最後までをnewpageに移動
                    var prev = $(this).prev();
                    newpage.append(prev.nextAll());
                    // newpageをlastpageの後に移動
                    lastpage.after(newpage);
                    console.log('---page-break-before');
                    isnopagebreak = false;
                    return false;
                }
                // 「後で改ページ」が見つかった
                if( ba === 'left' || ba === 'always' || ba === 'right' ){
                    var newpage = $('<div class="sngpage-container" />');
                    // thisの次から最後までをnewpageに移動
                    newpage.append($(this).nextAll());
                    // newpageをlastpageの後に移動
                    lastpage.after(newpage);
                    console.log('***page-break-after');
                    isnopagebreak = false;
                    return false;
                }
            });

            // 改ページ要素がなければループ終了
            if(isnopagebreak) clearTimeout(timer);
            counter--;
            if(counter < 0) clearTimeout(timer);

        },400,200); //setInterval

    }); //cdom.load

}

// pxとミリを換算
function px2mm(px){
    return px/96*25.4;
}
function mm2px(mm){
    return mm*96/25.4;
}