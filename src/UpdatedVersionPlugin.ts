import * as Uppy from '@uppy/core';

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

function settle(promises: any) {
  const resolutions: any[] = [];
  const rejections: any[] = [];
  function resolved(value: any) {
    resolutions.push(value);
  }
  function rejected(error: any) {
    rejections.push(error);
  }

  const wait = Promise.all(
    promises.map((promise: any) => promise.then(resolved, rejected))
  );

  return wait.then(() => {
    return {
      successful: resolutions,
      failed: rejections,
    };
  });
}

function buildResponseError(xhr: any, error: any) {
  // No error message
  if (!error) {
    error = new Error('Upload error');
  }
  // Got an error message string
  if (typeof error === 'string') {
    error = new Error(error);
  }
  // Got something else
  if (!(error instanceof Error)) {
    error = Object.assign(new Error('Upload error'), { data: error });
  }

  error.request = xhr;
  return error;
}

export default class CloudinaryPlugin extends Uppy.Plugin {
  opts: {
    uploadPreset?: string | undefined;
    folder?: string | undefined;
    tags?: string | undefined;
    userId?: string | undefined;
    cloudName: string;
    apiKey: string;
    generateSignature: (params: SignatureParams) => any;
    id?: string | undefined;
  };

  constructor(uppy: Uppy.Uppy, options: ClientProps) {
    super(uppy, options);

    const {
      id,
      apiKey,
      cloudName,
      userId,
      folder,
      tags,
      uploadPreset,
      generateSignature,
    } = options;

    this.id = id || 'CloudinaryPlugin';
    this.type = 'uploader';
    this.opts = {
      apiKey,
      cloudName,
      userId,
      folder,
      tags,
      uploadPreset,
      generateSignature,
    };
  }
  createProgressTimeout(timeout: number, timeoutHandler: any) {
    const uppy = this.uppy;
    let isDone = false;

    function onTimedOut() {
      uppy.log(`[XHRUpload] timed out`);
      const error = new Error(`'timedOut', ${Math.ceil(timeout / 1000)}`);
      timeoutHandler(error);
    }

    let aliveTimer: any = null;
    function progress() {
      // Some browsers fire another progress event when the upload is
      // cancelled, so we have to ignore progress after the timer was
      // told to stop.
      if (isDone) {
        return;
      }

      if (timeout > 0) {
        if (aliveTimer) {
          clearTimeout(aliveTimer);
        }
        aliveTimer = setTimeout(onTimedOut, timeout);
      }
    }

    function done() {
      uppy.log(`[XHRUpload] timer done`);
      if (aliveTimer) {
        clearTimeout(aliveTimer);
        aliveTimer = null;
      }
      isDone = true;
    }

    return {
      progress,
      done,
    };
  }

  createFormDataUpload(_: any, params: any) {
    const formPost = new FormData();

    // Send along all fields by default.
    Object.keys(params).forEach(key => {
      formPost.append(key, params[key]);
    });

    return formPost;
  }

  upload = (file: any, current: number, total: number) => {
    this.uppy.log(`uploading ${current} of ${total}`);

    return new Promise(async (resolve, reject) => {
      const params: SignatureParams = {
        folder: this.opts.folder || '',
        upload_preset: this.opts.uploadPreset || '',
        tags: this.opts.tags || '',
        source: 'uppy',
        userId: this.opts.userId || '',
        timestamp: new Date().getTime(),
      };

      const signature = await this.opts.generateSignature(params);

      if (!signature) {
        throw new Error('Could not generate signature');
      }
      const { userId, ...rest } = params;
      const uploadFile = file.data;

      const postParams: PostParams = {
        ...rest,
        signature,
        api_key: this.opts.apiKey,
        // @ts-ignore
        file: uploadFile,
        context: this.opts.userId ? `userId=${this.opts.userId}` : '',
      };
      const data = this.createFormDataUpload(file, postParams);

      const timer = this.createProgressTimeout(30 * 1000, (error: any) => {
        xhr.abort();
        // @ts-ignore
        this.uppy.emit('upload-error', file, error);
        reject(error);
      });

      const xhr = new XMLHttpRequest();
      const id = `${Math.random() + 'someId'}`;

      xhr.upload.addEventListener('loadstart', () => {
        this.uppy.log(`[XHRUpload] ${id} started`);
        // Begin checking for timeouts when loading starts.
        timer.progress();
      });

      xhr.upload.addEventListener('progress', ev => {
        this.uppy.log(`[XHRUpload] ${id} progress: ${ev.loaded} / ${ev.total}`);
        timer.progress();

        if (ev.lengthComputable) {
          // @ts-ignore
          this.uppy.emit('upload-progress', file, {
            uploader: this,
            bytesUploaded: ev.loaded,
            bytesTotal: ev.total,
          });
        }
      });

      xhr.addEventListener('load', (ev: any) => {
        this.uppy.log(`[XHRUpload] ${id} finished`);
        timer.done();

        if (ev.target.status >= 200 && ev.target.status < 300) {
          const body = JSON.parse(xhr.responseText);
          const uploadURL = body.url;

          const uploadResp = {
            status: ev.target.status,
            body,
            uploadURL,
          };

          this.uppy.setFileState(file.id, { status: 'success' });

          // @ts-ignore
          this.uppy.emit('upload-success', file, body, uploadResp);

          if (uploadURL) {
            this.uppy.log(`Download ${file.name} from ${file.uploadURL}`);
          }

          return resolve(file);
        } else {
          const body = JSON.parse(xhr.responseText);

          const response = {
            status: ev.target.status,
            body,
          };

          this.uppy.setFileState(file.id, { response });

          // @ts-ignore
          this.uppy.emit('upload-error', file, 'error', response);
          return reject('error');
        }
      });

      xhr.addEventListener('error', () => {
        this.uppy.log(`[XHRUpload] ${id} errored`);
        timer.done();

        const error = buildResponseError(xhr, new Error('upload error'));
        // @ts-ignore
        this.uppy.emit('upload-error', file, 'error');
        return reject(error);
      });

      xhr.open(
        'POST',
        `https://api.cloudinary.com/v1_1/${this.opts.cloudName}/auto/upload`,
        true
      );

      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.send(data);

      this.uppy.on('file-removed', removedFile => {
        if (removedFile.id === file.id) {
          timer.done();
          xhr.abort();
          reject(new Error('File removed'));
        }
      });

      this.uppy.on('cancel-all', () => {
        timer.done();
        xhr.abort();
      });
    });
  };

  limitUploads = (fn: any) => fn;

  uploadFiles = (files: any[]): any => {
    const actions = files.map((file, i) => {
      const current = i + 1;
      const total = files.length;

      if (file.error) {
        // @ts-ignore
        return () => Promise.reject(new Error(file.error));
      } else {
        // @ts-ignore
        this.uppy.emit('upload-started', file);
        return this.upload(file, current, total);
      }
    });

    const promises = actions.map(action => {
      const limitedAction = this.limitUploads(action);
      return limitedAction;
    });

    return settle(promises);
  };

  handleUpload = (fileIDs: any[]) => {
    if (fileIDs.length === 0) {
      this.uppy.log('[XHRUpload] No files to upload!');
      return Promise.resolve();
    }

    this.uppy.log('[XHRUpload] Uploading...');
    const files = fileIDs.map(fileID => this.uppy.getFile(fileID));

    return this.uploadFiles(files).then(() => null);
  };

  install() {
    this.uppy.addUploader(this.handleUpload);
  }
  uninstall() {
    this.uppy.removeUploader(this.handleUpload);
  }
}
