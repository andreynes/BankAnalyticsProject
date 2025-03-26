"use strict";

function sanitize(cell) {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'number') {
    return cell.toFixed(2);
  }
  let str = cell.toString().trim();
  if (!str) return '';
  // Если все символы одинаковы (без учета регистра) – вернуть пустую строку
  if (/^(.)\1+$/i.test(str)) {
    return '';
  }
  // Если строка состоит только из специальных символов, например, "!@#$%^&*()"
  if (/^[!@#$%^&*()]+$/.test(str)) {
    return '';
  }
  // Если строка выглядит как число, форматируем с двумя знаками после запятой
  if (/^-?\d+(\.\d+)?$/.test(str)) {
    let num = parseFloat(str);
    return num.toFixed(2);
  }
  return str;
}

// Тесты sanitize:
console.log("Sanitize 'aaaaaaaaaaa':", sanitize("aaaaaaaaaaa"));  // ожидается ""
console.log("Sanitize '!@#$%^&*()':", sanitize("!@#$%^&*()"));      // ожидается ""
console.log("Sanitize '1000.5':", sanitize("1000.5"));              // ожидается "1000.50"
console.log("Sanitize 1000.5:", sanitize(1000.5));                  // ожидается "1000.50"

