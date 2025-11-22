const questionnaireResponses: Map<string, any> = new Map();

export const storeQuestionnaireResponse = async (
  walletAddress: string,
  answers: Record<string, any>
): Promise<void> => {
  // TODO: Implementar almacenamiento en base de datos
  questionnaireResponses.set(walletAddress, {
    answers,
    timestamp: new Date().toISOString()
  });
  
  console.log('Stored questionnaire for:', walletAddress);
};
