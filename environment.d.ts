declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CHANNEL_ACCESS_TOKEN: string;
      CHANNEL_SECRET: string;
      AWS_REGION: string;
      AWS_ACCESS_KEY_ID: string;
      AWS_SECRET_ACCESS_KEY: string;
      AWS_S3_BUCKET_FILES: string;
      ENCRYPTION_KEY: string;
      DECRYPTION_KEY: string;
      PORT: string;
    }
  }
}

export {};
