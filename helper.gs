/**
 * 拡張子を含まないファイル名を返す
 * @params year {str}: 年
 * @params month {str}: 月
 * @params place {str}:　場所
 * @return fileName {str}: ファイル名(拡張子は含まない)
 */
function getBaseFileName(scheduleQuery) {
  return `${scheduleQuery.year}-${scheduleQuery.month}-${scheduleQuery.place}`;
}

const scheduleQuery = {
  place: null,
  year: null,
  month: null
}



/**
 * PDFファイルを取得。存在しない場合はダウンロードして返す
 * @param {string} place
 * @param {string} fileName
 * @returns {File} - Google DriveのFileオブジェクト
 */
function getOrDownloadPdf(place, fileName) {
  const files = FOLDER.getFilesByName(fileName);
  if (files.hasNext()) {
    return files.next();
  }
  const scheduleLink = fetchScheduleLink(place);
  return _downloadPdf(scheduleLink, fileName);
}
