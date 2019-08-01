/**
 * Send a POST request to the specified URL.
 *
 * @param {String}    url
 * @param {Object}    params                      Body parameters
 * @param {Object}    options
 * @param {Function}  [options.onUploadProgress]  Accepts one ProgressEvent argument
 * @return {Promise<String>} Resolves to the response text
 */
export interface PostParams {
  signature: string;
  api_key: string;
  file: File | Blob;
  upload_preset?: string;
  folder?: string;
  tags?: string;
  context: string;
  timestamp: number;
  source: string;
}

export const sendPostRequest = (
  url: string,
  params: PostParams,
  { onUploadProgress }: { onUploadProgress: (event: ProgressEvent) => void }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string') {
      reject(new Error('URL must be a string.'));
    }

    if (!params || typeof params !== 'object') {
      reject(new Error('Params must be an object.'));
    }

    const xhr = new XMLHttpRequest();
    const fd = new FormData();

    Object.keys(params).forEach(key => {
      // @ts-ignore
      fd.append(key, params[key]);
    });

    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    if (onUploadProgress && typeof onUploadProgress === 'function') {
      xhr.upload.addEventListener('progress', onUploadProgress);
    }

    xhr.addEventListener('readystatechange', () => {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          // File uploaded successfully
          resolve(xhr.responseText);
        } else {
          reject();
        }
      }
    });

    xhr.addEventListener('error', () => reject());

    xhr.send(fd);
  });
};
