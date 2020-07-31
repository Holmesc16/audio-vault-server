const {createToken,
       createUser,
       hashPassword,
       findUser,
       checkPassword,
       updateUserToken,
       findByToken
    } = require('./utils')

const authenticate = (userRequest, db) => {
    findByToken(userRequest.token, db)
        .then(user => {
           return user.username = userRequest.username ? true : false
        })
}

const signup = (req, res, db) => {
  const user = req.body
  hashPassword(user.password)
    .then(hashedPassword => {
        delete user.password
        user.password_digest = hashedPassword
    })
    .then(() => createToken())
    .then(token => {
        user.token = token
    })
    .then(() => createUser(user, db))
    .then(user => {
        console.log('in cb', user)
        delete user.password_digest
        res.status(201).json({ user })
    })
        .catch(err => console.log(err))
}

const signin = (req, res, db) => {
    const userRequest = req.body
    let user = null

    findUser(userRequest, db)
        .then(foundUser => {
            user = foundUser
            return checkPassword(userRequest.password, foundUser)
        })
        .then(res => createToken())
        .then(token => updateUserToken(token, user, db))
        .then(() => {
            delete user.password_digest
            res.status(200).json(user)
        })
        .catch(err => console.log(err))
}

module.exports = {
    signup,
    signin,
    authenticate
}