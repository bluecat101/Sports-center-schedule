const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN")
const PLACE = ["港南", "金沢", "戸塚", "栄", "鶴見", "都筑", "泉", "中", "磯子", "緑", "旭", "瀬谷", "青葉", "南"]
const NOT_APPLICABLE_PLACE = ["西", "神奈川", "港北", "保土ヶ谷"]
const DEFAULT_PLACE = "栄"

// エラーをスプレッドシートに記録するための準備 // 
const sheetId = PropertiesService.getScriptProperties().getProperty('SPREAD_SHEET_ID');
const sheetName = 'シート1';
const sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);

/**
 * エラーが発生した時にエラーメッセージをスプレッドシートに記録する
 * @params e エラーメッセージ
 */
function logger(e) {
  let lastRow = sh.getLastRow() + 1;
  sh.getRange(lastRow,1).setValue(new Date());
  sh.getRange(lastRow,2).setValue(e);
  sh.getRange(lastRow,3).setValue(e.stack);
}


/**
 * データがポストで送られてくるので、データを取得する
 * @param e ポストで送られたデータ
 */
function doPost(e) {
    /** パースされた受信データ */
    let json = JSON.parse(e.postData.contents);
    /** 返信するためのトークン取得 */
    let reply_token = json.events[0].replyToken;
    /** 送信されたメッセージ */
    let user_message = json.events[0].message.text;
    try {
        // 送信されたメッセージが入力規則に一致するかを確認
        /** 送信されたメッセージから月と場所を取得する */
        let msgInfo = getMonthAndPlace(user_message);
        if(msgInfo.error_message != ""){
          msgInfo.error_message += "以下のように入力してください。\n\
          ================\n\
          ⚪︎月\n〇〇区\n\
          ================\n\
          それでも解決しない場合に管理者にお伝えください。\n"
          msgInfo.error_message = msgInfo.error_message.replace(/(?<=^|\r|\r?\n)\s+/g,"");
          reply_message(reply_token, "",msgInfo.error_message);
          return;
        }
        // 画像のURLとエラーメッセージを取得する
        let imageInfo = getScheduleImageUrl(msgInfo.year,msgInfo.month, msgInfo.place)
        if(imageInfo[1] != ""){ // エラー時
          msgInfo.error_message += imageInfo[1]
        }
        // メッセージを返信する
        reply_message(reply_token, imageInfo[0], msgInfo.error_message);
    }
    catch (e) { // どこかでエラーが発生した場合
      // スプレッドシートにログを記録する
      logger(e)
      // replace(...)は改行後の先頭の空白を削除する
      error_message = ("入力に失敗しました。\n\
      以下の内容を修正するか管理者にお伝えください。\n\
      ================\n"
              + e + "\n\
      ================").replace(/(?<=^|\r|\r?\n)\s+/g, "");
      reply_message(reply_token, error_message);
    }
    
}
/**
 * 入力規則に沿うかを確認し、検索する年と月と場所を返します。
 * @param message 送信されたメッセージ
 * @return 年と月と場所のデータ
 */
function getMonthAndPlace(message) {
  let currentDate = new Date();
  msgInfo ={year:currentDate.getFullYear(),month:currentDate.getMonth() + 1, place:DEFAULT_PLACE,error_message:""}// 0 から 11 までの値なので、1 を加えて実際の月に変換
  // 入力された文字を取得
  /** 送信されたメッセージを分割した文字列 */
  let all_msg = message.split("\n");
  let patternMonth = /^(1[0-2]|[1-9])月?$/;
  let match = all_msg[0].match(patternMonth);
  if(match){
    msgInfo.month = match[1] // match[1]に月の数字のみの部分が格納されている
  }else{
    msgInfo.error_message += "◉月が不適切です。\n「⚪︎」もしくは「⚪︎月」としてください。\n"
  }
  // もし今月が11,12月で1,2月をしていているなら翌年にする //
  // 月のみを考えて1010ヶ月以上離れているかで確認する
  if(currentDate.getMonth()+1 - match[1] > 10){ 
    msgInfo.year +=1
  }
  // 区がない場合(月がなく、区がある場合でも反応する)
  if(all_msg.length == 1){
    msgInfo.error_message += "◉ 区が未入力です。\n"
    return msgInfo
  }
  // 文字列の最後に"区"が含まれているなら削除する
  if(all_msg[1].endsWith("区")){
    all_msg[1] = all_msg[1].slice(0, all_msg[1].length -1)
  }
  if(PLACE.includes(all_msg[1])){ // 正しい区の場合
    msgInfo.place = all_msg[1];
  }else if(NOT_APPLICABLE_PLACE.includes(all_msg[1])){ // 対象外の区の場合
    msgInfo.error_message += "◉ 西区、神奈川区、港北区、保土ヶ谷区は対象外です。\n"
  }else{ // 区以外の文字の場合
    // 西区は個人利用ができず、残り3つはスクレイピングできないため対象外。
    msgInfo.error_message += "◉ 区が不適切です。\n"
  }
  return msgInfo;
}

/**文字を送る場合
 * 返信を行う
 * @param reply_token : アクセストークン
 * @param message : 本文
 */
function reply_message(reply_token, imageUrl, error_message) {
    /** 返信用 グローバル変数とした際にmessageがないとエラーが発生したのでこの場所に記載 */
    const LINE_ENDPOINT = 'https://api.line.me/v2/bot/message/reply';
    /** 返信用のデータ */
    // エラーメッセージがある場合にはエラーを送り、ない場合には予定表の画像を送る
    if (error_message == ""){ 
      var postData = {
        "replyToken": reply_token,
        "messages" : [{
        'type': 'image',
        'originalContentUrl': imageUrl,
        'previewImageUrl': imageUrl
      }],
      }; 
    }else{
      var postData = {
        "replyToken": reply_token,
        "messages": [{
          "type": "text",
          "text": error_message
        }]
      };
    }
    UrlFetchApp.fetch(LINE_ENDPOINT, { "method": "post",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN
        },
        "payload": JSON.stringify(postData)
    });
    
}
