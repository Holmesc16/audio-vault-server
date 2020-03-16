const aws = require('aws-sdk')
const chalk = require('chalk')
require('dotenv').config()

const getAudioData = (req, res, db ) => {
    db.query(`SELECT DISTINCT 
            title, CAST(date as DATE) AS formattedDate, date, tags, description 
            FROM audio ORDER BY CAST(date as DATE) DESC`, (err, response) => {
        if(err) {
            console.log('error!!!', err)
            res.send(err)
        }
        res.send(response.rows)
    })
}
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

        s3.getObject(getParams, function(err, data) {
          if (err) {
              if(err === 'NoSuchKey: The specified key does not exist.') {
                  res.send({
                      uploadError: 'Sorry! that file has not yet beed uploaded'
                  })
              }
              console.log('err', err)
            }
         console.log('data', data)
         
          let response = {
              audio: data.Body,
              title: data.Metadata['x-amz-meta-title'],
              date: data.Metadata['x-amz-meta-date'],
              tags: data.Metadata['x-amz-meta-tags']
          }
          res.send(response)
        });
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
    let keyword = req.query.keyword
    db.query(`SELECT * FROM AUDIO 
                WHERE title LIKE $1 
                OR date LIKE $1 
                OR tags LIKE $1 
                OR description LIKE $1
                ORDER BY CAST(date as DATE) DESC
                `, ['%' + keyword + '%'],
         (err, response) => {
            if(err) res.send(err)
            response.rows === 'undefined' 
            ? res.send(`No results found for ${keyword}`) 
            : res.send(response.rows)
              })
}
module.exports = {
    getAudioData,
    getAudioDataById,
    postAudioData,
    putAudioData,
    deleteAudioData,
    searchAudioData
} 