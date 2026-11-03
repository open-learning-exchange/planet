export const chatUnavailableReason = (configuration: { _id?: string, chatEnabled?: boolean }): string => {
  if (!configuration?._id) {
    return $localize`Chat configuration is unavailable.`;
  }
  return configuration.chatEnabled === false ? $localize`Chat is disabled, contact community admin` : '';
};
