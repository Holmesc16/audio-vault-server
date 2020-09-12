
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const chalk = require('chalk')

const hashPassword = password => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, 10, (err, hash) => {
            err ? reject(err) : resolve(hash)
        })
    })
}

const createUser = (user, db) => {
    return db.query(`INSERT INTO users(username, email, password_digest, token, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, created_at, password_digest, token`,
    [user.username, user.emailAddress, user.password_digest, user.token, new Date()]
    )
    .then(data => {
        return data.rows[0]
    })
}

const createToken = () => {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, data) => {
            err ? reject(err) : resolve(data.toString('base64'))
        })
    })
}

const findUser = (userRequest, db) => {
    console.log(chalk.red(JSON.stringify(userRequest)))
    return db.query(`SELECT * FROM users WHERE username = $1`, [userRequest.username])
        .then(data => data.rows[0])
        .catch(err => {err})
}

const checkPassword = (requestPassword, foundUser) => {
    console.log(chalk.hex('#ffcc22')(requestPassword, JSON.stringify(foundUser)))
    return new Promise((resolve, reject) => {
        bcrypt.compare(requestPassword, foundUser.password_digest, (err, response) => {
            if(err) reject(err)
            else if(response) resolve(response)
            else reject(new Error('Passwords do not match!'))
        })
    })
}

const findByToken = (token, db) => {
    return db.query(`SELECT * FROM users where token = $1`, [token])
        .then(data => data.rows[0])
}

const updateUserToken = (token, user, db) => {
    return db.query('UPDATE users SET token = $1 where id = $2 RETURNING id, username, token', [token, user.id])
        .then(data => data.rows[0])
}

module.exports = {
    createToken,
    createUser,
    hashPassword,
    findUser,
    checkPassword,
    updateUserToken
}

