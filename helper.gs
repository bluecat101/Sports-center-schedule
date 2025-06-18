/**
 * 拡張子を含まないファイル名を返す
 * @params year {str}: 年
 * @params month {str}: 月
 * @params place {str}:　場所
 * @return fileName {str}: ファイル名(拡張子は含まない)
 */
function getBaseFileName(year, month, place) {
  return `${year}-${month}-${place}`;
}
