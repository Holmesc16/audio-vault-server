const aws = require('aws-sdk')
const chalk = require('chalk')
const _ = require('lodash')
require('dotenv').config()

const getAudioData = (req, res, db) => {
    db.query(`SELECT DISTINCT
            audio_title, CAST(audio_date as DATE) AS formattedDate, audio_date, audio_tags, s3_key
            FROM s3Audio ORDER BY CAST(audio_date as DATE) DESC`, (err, response) => {
                if(err) {
                    console.log('error!', err)
                    res.send(err)
                }
                console.log(response)
                res.send(response.rows)
            })
}

// const getAudioData = (req, res, db ) => {
//     db.query(`SELECT DISTINCT 
//             title, CAST(date as DATE) AS formattedDate, date, tags, description 
//             FROM audio ORDER BY CAST(date as DATE) DESC`, (err, response) => {
//         if(err) {
//             console.log('error!!!', err)
//             res.send(err)
//         }
//         res.send(response.rows)
//     })
// }
const getAudioDataById = (req, res, db) => {
    const id = req.params.id

    try {
        aws.config.update({
            accessKeyId: process.env.ACCESS_KEY_ID,
            secretAccessKey: process.env.SECRET_ACCESS_KEY,
            region: "us-west-1"
        })

        const s3 = new aws.S3()
        var getParams = { 
            Bucket: 'the-audio-vault',
            Key: id
        }

       let url = s3.getSignedUrl('getObject', getParams)
       console.log('the url is', url)
        
       let response = {
           url
       }
        res.send(response)
    } catch (e) {
    console.log('err', e)
    }   
}

const postAudioData = (req, res, db) => {
    const {link, date, title, tags, description} = req.body
    const dateAdded = new Date()
    db('audio').insert({link, date, title, tags, description, dateAdded})
        .returning('*')
        .then(data => res.json(data))
        .catch(err => res.status(400).json({dbError: 'db error'}))
}

const putAudioData = (req, res, db) => {
    const { id, link, date, title, tags, description } = req.body
    db('audio').where({id}).update({link, date, title, tags, description})
    .returning('*')
    .then(data => res.json(data))
    .catch(err => res.status(400).json({dbError: 'db error'}))
}

const deleteAudioData = (req, res, db) => {
    const { id } = req.body 
    db('audio').where({id}).del()
    .then(() => res.json({ delete: 'true' }))
    .catch(err => res.status(400).json({dbError: 'db error'}))
}

const searchAudioData = (req, res, db) => {
    let keyword = req.query.keyword.toLowerCase()
    db.query(`SELECT * FROM s3Audio 
                WHERE audio_title LIKE $1 
                OR audio_date LIKE $1 
                OR audio_tags LIKE $1
                ORDER BY CAST(audio_date as DATE) DESC
                `, ['%' + keyword + '%'],
         (err, response) => {
            if(err) res.send(err)
            response.rows === 'undefined' 
            ? res.send({ message: `No results found for ${keyword}`}) 
            : res.send(response.rows)
              })
}

// const getAudioByTagName = (req, res, db) => {
//     let tagName = req.query.tag

//     let r = db.query(`SELECT Tags FROM Audio WHERE tagName like $1`, ['%' + tagName + '%']).then(response => {
//         let allTags = _.flatten([...response.rows].map(arr => arr.tags.split(',')))
//         allTags = allTags.map(s => `(${s})`)
//         let tagSet = new Set();
//         allTags.map(tag => tagSet.add(tag));
//         let orderedTags = [...tagSet].sort()
//         res.send(orderedTags)
//     })
// }

// const getAllTags = (req, res, db) => {
//     let r = db.query(`select tags from audio where audio.tags is not null and tags <> '' order by dateAdded desc`)
//     .then(response => {
//         let allTags = _.flatten([...response.rows].map(arr => arr.tags.split(',')))
//         allTags = allTags.map(s => `(${s})`)
//         let tagSet = new Set();
//         allTags.map(tag => tagSet.add(tag));
//         let orderedTags = [...tagSet].sort()
//         res.send(orderedTags)
//     })
// }
const getAudioByTagName = (req, res, db) => {
    let tagName = req.params.tag
    console.log(chalk.red(tagName))
    db.query(`select * from s3Audio where audio_tags like $1`,
    ['%' + tagName + '%'],
    (err, response) => {
        if(err) res.send(err)
        response.rows === 'undefined' 
        ? res.send({ message: `No results found for ${tagName}`}) 
        : res.send(response.rows)
          })
}

module.exports = {
    getAudioData,
    getAudioDataById,
    postAudioData,
    putAudioData,
    deleteAudioData,
    searchAudioData,
    getAudioByTagName
} 