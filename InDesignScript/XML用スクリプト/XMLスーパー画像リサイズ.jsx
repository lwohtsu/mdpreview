﻿var g_resizecoeff = 0.5;main();function main(){	//Make certain that user interaction (display of dialogs, etc.) is turned on.	//app.scriptPreferences.userInteractionLevel = UserInteractionLevels.interactWithAll;	if (app.documents.length != 0){		resizeXMLImage();	} else { 	   alert ("ドキュメントを開いてください");	}}function resizeXMLImage(){	var myDocument = app.activeDocument;	var images = myDocument.allGraphics;	for(var i=0; i<images.length; i++){		var img = images[i];		if(img.associatedXMLElement){			var xml = img.associatedXMLElement;			// $.writeln(xml.xmlAttributes.count());			if(xml.xmlAttributes.count() < 2) {				img.horizontalScale = 40;				img.verticalScale = 40;				img.parent.fit(FitOptions.FRAME_TO_CONTENT);				//$.writeln(img.imageTypeName);				if(img.imageTypeName == 'Adobe PDF'){					img.horizontalScale = 100;					img.verticalScale = 100;					img.parent.fit(FitOptions.FRAME_TO_CONTENT);				}				continue;			}            var scale = parseFloat(xml.xmlAttributes.item('scale').value);            var tx = parseFloat(xml.xmlAttributes.item('translate-x').value);            var ty = parseFloat(xml.xmlAttributes.item('translate-y').value);            var fw = parseFloat(xml.xmlAttributes.item('width').value.replace("mm",""));            var fh = parseFloat(xml.xmlAttributes.item('height').value.replace("mm",""));            //$.writeln(scale+" "+tx+" "+ty+" "+fw+" "+fh);			//ズーム			img.horizontalScale = scale*100;			img.verticalScale = scale*100;			img.parent.fit(FitOptions.FRAME_TO_CONTENT);			//クリッピング			var rect = img.parent;			rect.resize( BoundingBoxLimits.OUTER_STROKE_BOUNDS, 							AnchorPoint.TOP_LEFT_ANCHOR,							ResizeMethods.REPLACING_CURRENT_DIMENSIONS_WITH,							[fw*2.83465, fh*2.83465]			);			img.move("by", [tx + 'mm', ty + 'mm']);		}			}	// // 無駄な行を削除する	// var body = myDocument.xmlElements[0];	// //bodyを探す	// do{	// 	if(body.markupTag.name == 'body') break;	// 	if(body == null) {	// 		alert ("bodyが見つかりません");	// 		return;	// 	}	// 	body = body.xmlElements[0];	// }while(body != null);	// elaseFigureTag(body.xmlElements);	alert("コンバート終了");}