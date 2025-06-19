/**
 * @params place {str}: 場所 
 * @params pdf {blob}: pdf
 * @returns responceBody {str}: 取得した文字列
 * */
function read_schedule_from_pdf(place, pdf) {
  const url = PropertiesService.getScriptProperties().getProperty('API_END_POINT');
  const response =  UrlFetchApp.fetch(url, {
    method: 'post',
    payload: {
      file: pdf,
      place: place
    }
  });
  return response.getContentText();
}