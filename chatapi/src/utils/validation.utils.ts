export const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;
