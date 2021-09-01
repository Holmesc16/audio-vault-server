const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const ffmpeg = require('fluent-ffmpeg')
ffmpeg.setFfmpegPath(ffmpegPath);
const uploadClip = require('./uploadClip')
const aws = require('aws-sdk')
const fs = require('fs')
const path = require('path')
aws.config.update({ region: "us-east-2" });
require('dotenv').config()

const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

module.exports = getClip = async (url, clipName, description, tags, segmentStart, segmentEnd) => {
        let duration = segmentEnd - segmentStart
        clipName = clipName.toLowerCase().replace("'", '').trim().replace(/([^a-z0-9]+)/gi, '-')
        let filePath = `${path.resolve()}/handlers/s3/clips/${clipName}.mp3`
        // create clip and save file locally
        await ffmpeg(url)
            .setStartTime(segmentStart)
            .setDuration(duration)
            .save(filePath)
        // make sure file exists before uploading to s3
        const interval = setInterval(async () => {
                const fileExists = fs.existsSync(filePath)
                if(fileExists) {
                    clearInterval(interval)
                    console.log({uploadClip: uploadClip(filePath, url, clipName, description, tags)})
                    return await uploadClip(filePath, url, clipName, description, tags)
                }
        }, 1000)
    }