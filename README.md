# Uppy-Cloudinary

This is a plugin for uploading files to [Cloudinary](https://cloudinary.com/)
via [Uppy](https://uppy.io/). I have added my own modification from the [original](https://github.com/CapsureIt/uppy-cloudinary)

## Installation

Install via NPM:

```bash
npm install --save @zifahm/uppy-cloudinary
```

## Usage

Use it in your project:

```javascript
// Import via ES Modules
import CloudinaryPlugin from '@zifahm/uppy-cloudinary';
// Or Common JS
const CloudinaryPlugin = require('@zifahm/uppy-cloudinary');

// Use it on your Uppy instance
uppy.use(CloudinaryPlugin, {
  uploadPreset:"as3dhc"; // not required  eg: uploadPreset:"presetName"
  folder: "folderName"; // not required eg: folder:"folderName"
  tags: "tag1,tag2,tag3"; // not required  eg: tags:"tag1,tag2,tag3"
  cloudName: "cloud-naem"; // your cloud name in cloudinary admin dashboard
  apiKey: "a12p23i11k12d"; // your apiKey in cloudinary admin dashbard
  userId:"asdf1234"; // a context object eg: userId: "asdf124"
  generateSignature: function generateSignature(paramsToSign) {

  const { upload_preset, folder, tags, userId, timestamp, source } = paramsToSign

    // Include your own signature generation logic here.
    // generate a signature with using a rest api or graphql

    const signature = client.query({
    query:"Query",
    variables:{
    uploadPreset:upload_preset,
    folder,
    tags,
    userId,
    timestamp,
    source
    }})


    /* eg server side signature generating function

       const signature = await cloudinary.utils.api_sign_request({
        timestamp: timeStamp,
        folder:folder,
        source:source,
        upload_preset: upload_preset,
        context: `userId=${userId}`,
        tags:tags
      },apiSecret);

      return signature

    */

    return signature;
  },
});
```

## Please Bear In Mind

adding the userId in your api_sign_request funciton should be on a context

```javascript
cloudinary.utils.api_sign_request({context:`userId=${userId}`}

```

## Options

The plugin supports the following Cloudinary options:

```
  * uploadPreset: string; // optional
  * folder: string; // optional
  * tags: string; // optional
  * userId: string; // optional
  * cloudName: string;
  * apiKey: string;
```

In addition, it supports the following options:

### `generateSignature(signParams)`

_Function_

Accepts one argument, which is the parameters to sign, as an object.

Returns a signature string. See the [Cloudinary
docs](https://cloudinary.com/documentation/signatures) for instructions on how
to generate a signature

## SignParams

The following are the properties contained in signParam object

```* upload_preset: string; // optional
 * folder: string; // optional
 * tags: string; // optional
 * userId: string; // optional
 * timestamp: number;
 * source: string
```

## Contributing:

There are a lot of Cloudinary features we didn’t include, since this plugin was
largely made to serve our current needs. If you would like to improve this
plugin and/or add more features, please submit a pull request.

## Credits:

Thanks to [hally9k](https://github.com/hally9k/uppy-cloudinary) and [Capsurelt](https://github.com/CapsureIt/uppy-cloudinary)
