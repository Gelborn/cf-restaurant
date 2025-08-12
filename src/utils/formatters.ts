/**
 * Formata números decimais usando vírgula como separador decimal
 * seguindo o padrão brasileiro
 */
export const formatDecimal = (value: number | null | undefined, decimals: number = 3): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0' + ','.padEnd(decimals + 1, '0');
  }
  
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formata peso em kg com 3 casas decimais
 */
export const formatWeight = (value: number | null | undefined): string => {
  return formatDecimal(value, 3);
};

/**
 * Formata valores gerais com número variável de casas decimais
 */
export const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  return formatDecimal(value, decimals);
};