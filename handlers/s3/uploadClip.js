const moment = require('moment')
const fs = require('fs')
const path = require('path')
const aws = require('aws-sdk')
aws.config.update({ region: "us-east-2" });
const chalk = require('chalk')
require('dotenv').config()

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
})

module.exports = uploadClip = async (fileName, url, clipName, description, tags) => {
  return new Promise((resolve, reject) => {
    s3.listBuckets((err, data) => {
      if (err) console.log("Error: ", err)
      resolve(data);
      reject(err => err)
    })
  })
    .then(async data => {
      const Bucket = data.Buckets[0].Name;
      let fileData = await fs.readFileSync(fileName, (err, data) => {
        if (err) console.log(err, 'error reading file')
        return data
      });

      const params = {
      Bucket,
      Key: clipName,
      Body: fileData,
      ContentType: "audio/mp3",
      Metadata: {
        "x-amz-meta-title": clipName.replace(/[^a-zA-Z0-9]/g, ''), 
        "x-amz-meta-date": moment('Mm dd, YYYY').toString(),
        "x-amz-meta-tags": Array.isArray(tags) ? tags.join(", ") : tags,
        "x-amz-meta-description": description ? description.replace(/[^a-zA-Z0-9]/g, '') : '',
      }
    }

      s3.upload(params, async (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      console.log(`File uploaded successfully at ${data.Location}`);
      fs.unlink(fileName, err => {
        if (err) console.log("file was not deleted: ", err);
        console.log(fileName, " was deleted");
      }) 
      return await data
    })
  })
}
