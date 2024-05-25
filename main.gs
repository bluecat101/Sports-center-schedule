const CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN")
const PLACE = ["鶴見","神奈川","中","南","港南","保土ケ谷","旭","磯子","金沢","港北","緑","都筑","戸塚","栄","泉","瀬谷"]
const DEFAULT_PLACE = "栄"

const sheetId = 'SPREAD_SHEET_ID';
const sheetName = 'シート1';
const sh = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
function logger(e) {
  let lastRow = sh.getLastRow() + 1;
  sh.getRange(lastRow,1).setValue(new Date());
  sh.getRange(lastRow,2).setValue(log);
  sh.getRange(lastRow,3).setValue(e.stack);
}


/**
 * データがポストで送られてくるので、データを取得する
 * @param e ポストで送られたデータ
 */
function doPost(e) {
    /** パースされた受信データ */
    var json = JSON.parse(e.postData.contents);
    /** 返信するためのトークン取得 */
    var reply_token = json.events[0].replyToken;
    /** 送信されたメッセージ */
    var user_message = json.events[0].message.text;
    /** 送信したユーザーのID */
    var user_id = json.events[0].source.userId;
    try {
        // 送信されたメッセージが入力規則に一致するかを確認
        /** 送信されたメッセージから月と場所を取得する */
        var msgInfo = getMonthAndPlace(user_message);
        if(msgInfo.error_message != ""){
          msgInfo.error_message += "例):⚪︎月\n栄\n\
          それでも解決しない場合に管理者にお伝えください。\n"
          msgInfo.error_message = msgInfo.error_message.replace(/(?<=^|\r|\r?\n)\s+/g,"");
          reply_message(reply_token, "",msgInfo.error_message);
          return;
        }
        let imageInfo = getScheduleImageUrl(msgInfo.year,msgInfo.month, msgInfo.place)
        if(imageInfo[1] != ""){
          msgInfo.error_message += imageInfo[1]
        }
        // メッセージを返信する
        reply_message(reply_token, imageInfo[0], msgInfo.error_message);
    }
    catch (e) {
      // スプレッドシートの参照、作成、追記等でエラーが起こる可能性がある
      // また、user_messageが入力規則に違反する場合でもエラーを返す
      // 最後のreplace(...)は改行後の先頭の空白を削除する
      error_message = ("入力に失敗しました。\n\
      以下の内容を修正するか管理者にお伝えください。\n\
      ================\n"
              + e + "\n\
      ================").replace(/(?<=^|\r|\r?\n)\s+/g, "");
      logger(e)
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
    msgInfo.error_message += "月が不適切です。\n「⚪︎」もしくは「⚪︎月」としてください。\n"
  }
  // もし今月が12月で1月をしていているなら翌年の1月にする
  if(currentDate.getMonth()+1 == 12 && match[1] == 1){ 
    msgInfo.year +=1
  }
  // 文字列の最後に"区"が含まれているなら削除する
  if(all_msg[1].endsWith("区")){
    all_msg[1] = all_msg[1].slice(0, all_msg[1].length -1)
  }
  if(PLACE.includes(all_msg[1])){
    msgInfo.place = all_msg[1];
  }else{
    msgInfo.error_message += "区の指定が不適切です。また、西区、青葉区は対象外です。\n"
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
