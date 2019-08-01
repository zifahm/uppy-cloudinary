import * as Uppy from '@uppy/core';
import { PostParams, sendPostRequest } from './sendPostRequest';

export interface SignatureParams {
  upload_preset?: string;
  folder?: string;
  tags?: string;
  userId?: string;
  timestamp: number;
  source: string;
}

export interface ClientProps extends Uppy.PluginOptions {
  uploadPreset?: string;
  folder?: string;
  tags?: string;
  userId?: string;
  cloudName: string;
  apiKey: string;
  generateSignature: (params: SignatureParams) => Promise<string>;
}

const baseUrl = 'https://api.cloudinary.com/v1_1';

/**
 * @param {File|Blob} file
 * @returns {String}
 */
function getResourceType(file: File | Blob) {
  if (file instanceof File) {
    if (file.type.match(/^image\//)) {
      return 'image';
    } else if (file.type.match(/^video\//)) {
      return 'video';
    }
  }

  return 'auto';
}

/**
 * @param {String}    cloudName
 * @param {File|Blob} file
 * @returns {String}
 */
function getUploadUrl(cloudName: string, file: File | Blob) {
  const type = getResourceType(file);

  return `${baseUrl}/${cloudName}/${type}/upload`;
}

/**
 * Client for communicating with the Cloudinary API.
 */
export default class CloudinaryApiClient {
  cloudName: string;
  uploadPreset: string | undefined;
  apiKey: string;
  folder: string | undefined;
  tags: string | undefined;
  generateSignature: (params: SignatureParams) => Promise<string>;
  userId: string | undefined;

  constructor({
    cloudName,
    userId,
    uploadPreset,
    apiKey,
    folder,
    tags,
    generateSignature,
  }: ClientProps) {
    this.cloudName = cloudName;
    this.userId = userId;
    this.uploadPreset = uploadPreset;
    this.apiKey = apiKey;
    this.folder = folder;
    this.tags = tags;
    this.generateSignature = generateSignature;
  }

  async upload(
    file: File | Blob,
    { onUploadProgress }: { onUploadProgress: (event: ProgressEvent) => void }
  ): Promise<object> {
    const params: SignatureParams = {
      folder: this.folder || '',
      upload_preset: this.uploadPreset || '',
      tags: this.tags || '',
      source: 'uppy',
      userId: this.userId || '',
      timestamp: new Date().getTime(),
    };

    const signature = await this.generateSignature(params);

    if (!signature) {
      throw new Error('Could not generate signature');
    }
    const { userId, ...rest } = params;

    const postParams: PostParams = {
      ...rest,
      signature,
      api_key: this.apiKey,
      file,
      context: this.userId ? `userId=${userId}` : '',
    };

    const responseText = await sendPostRequest(
      getUploadUrl(this.cloudName, file),
      postParams,
      {
        onUploadProgress,
      }
    );

    return JSON.parse(responseText);
  }
}
