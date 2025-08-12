/**
 * Formata números decimais usando vírgula como separador decimal
 * seguindo o padrão brasileiro, removendo zeros desnecessários
 */
export const formatDecimal = (value: number | null | undefined, maxDecimals: number = 3): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  // Usa toLocaleString para formatar com vírgula
  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals
  });
  
  return formatted;
};

/**
 * Formata peso em kg com até 3 casas decimais, removendo zeros desnecessários
 */
export const formatWeight = (value: number | null | undefined): string => {
  return formatDecimal(value, 3);
};

/**
 * Formata valores gerais com número variável de casas decimais, removendo zeros desnecessários
 */
export const formatNumber = (value: number | null | undefined, maxDecimals: number = 2): string => {
  return formatDecimal(value, maxDecimals);
};