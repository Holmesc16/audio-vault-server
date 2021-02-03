const aws = require('aws-sdk')
const chalk = require('chalk')
const _ = require('lodash')
const { response } = require('express')
const { reject } = require('lodash')
require('dotenv').config()

const getAudioData = (req, res, db) => {
    db.query(`SELECT DISTINCT
            audio_title, CAST(audio_date as DATE) AS formattedDate, audio_date, audio_tags, s3_key
            FROM s3Audio ORDER BY CAST(audio_date as DATE) DESC`, (err, response) => {
                if(err) {
                    console.log('error!', err)
                    res.send(err)
                }
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
        // trying to see if bassing raw Buffer of audio will allow for
        // audio clipping on the client-side
        return new Promise((resolve, reject) => {
            let url = s3.getSignedUrl('getObject', getParams)
            resolve(url)
            reject(err => console.log(`error getting url, ${err}`))
            return url
        })
        .then(async url => {
            return await s3.getObject(getParams).promise()
                .then((response) => {
                    return {
                        url,
                        buffer: response.Body //.toString('utf-8')
                    }
                })
                .catch((err) => {
                    return err;
                });
        })
        .then(audioUrlAndBuffer => {
            try {
                res.send(audioUrlAndBuffer)
            }
            catch(err) {
                console.log('error sending data', err)
            }
        })
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

const getUserFavorites = (req, res, db) => {
    const { user } = req.params
    if(!user) console.log('no user')
    db.query(`SELECT favorites FROM users
        WHERE username = $1
    `, [user],
        (err, response) => {
            if(err) {
                console.log(chalk.red(err))
                res.send(err)
            }
            response.rows === 'undefined' || !response.rows.length
            ? res.send({message: 'No favorites yet - add audio to your favorites by clicking the "like" button'})
            : res.send(response.rows)
        })
}

const putUserFavorites = (req, res, db) => { 
        const { user, userFavorites } = req.body
        const { username } = user
        db.query(`UPDATE users
        SET favorites = '${userFavorites}'
        WHERE username = '${username}'`),
        (err, response) => {
            if(err) return err
            resolve(response.rows)
            reject(err => err)
            return response.rows  
        }
}

const putAudioFavorites = (req, res, db) => {
    return new Promise((resolve, reject) => {
        const { user, title, userFavorites } = req.body
        resolve({user, title, userFavorites})
        reject(err => console.log('there was an error: ', err))
    })
    .then(data => {
        return new Promise((resolve, reject) => {
            db.query(`SELECT favorites FROM users WHERE username = $1`,
            [data.user],
            (err, response) => {
                resolve({data, response: response.rows})
                reject(() => console.log(chalk.red(err)))
            })
        })
        .then(payload => {
            if(payload.response[0].favorites === null) {
                db.query(`UPDATE users SET favorites = $1 WHERE username = $2`,
                [payload.data.title, payload.data.user],
                (err, response) => {
                    if(err) console.log(chalk.red(err))
                    return response.rows
                })
            } 
            else {
               let existingFavorites = new Promise((resolve, reject) => {
                db.query(`SELECT favorites from users where username = $1`,
                [payload.data.user],
                (err, response) => {
                    if(err) return err
                    resolve(response.rows)
                    reject(err => err)
                    return response.rows     
                    }) 
                })
             return existingFavorites
                .then(data => {
                    let favesArray = []
                    data.map(f => favesArray.push(f.favorites))
                    console.log(favesArray)
                    res.send(favesArray)
                })
            }
        })
    })
    
    
}

const getAudioByTagName = (req, res, db) => {
    let tagName = req.params.tag
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
    getAudioByTagName,
    getUserFavorites,
    putAudioFavorites,
    putUserFavorites
} 