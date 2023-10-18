export function handleChatError(error: any) {
  if (error.response) {
    throw new Error(`GPT Service Error: ${error.response.status} - ${error.response.data?.error?.code}`);
  } else {
    throw new Error(error.message);
  }
}
