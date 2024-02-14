
const express = require('express') // Express docs: http://expressjs.com/en/api.html
const passport = require('passport') // Passport docs: http://www.passportjs.org/docs/
const axios = require('axios')
// pull in Mongoose model for exercises
const Exercise = require('../models/exercise')
require('dotenv').config()
// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existant document is requested
const handle404 = customErrors.handle404

// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// this is middleware that will remove blank fields from `req.body`, e.g.
// { example: { title: '', text: 'foo' } } -> { example: { text: 'foo' } }
const removeBlanks = require('../../lib/remove_blank_fields')

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

const apiKey = process.env.API_KEY;

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// INDEX
// GET /exercises
router.post("/exercises/search", (req, res, next) => {
    const { search } = req.query;  // Get the search keyword from the query parameters
	
	console.log('API KEY: ',apiKey)
    axios.get('https://api.api-ninjas.com/v1/exercises', {
		headers: { 'X-Api-Key': apiKey },
        params: {
            muscle: search
        },
       
    })
    .then((apiRes) => {
        // Send the result of the external API request back to the client
        res.status(200).json(apiRes.data);
    })
    .catch((error) => {
        console.error('Error: ', error);
        res.status(500).json({ error: 'An error occurred while searching for exercises' });
    });
});

// SHOW
// GET /exercises/5a7db6c74d55bc51bdf39793
router.get('/exercises/:name', (req, res, next) => {

	const { name } = req.params
	console.log('NAME: ', name )
	console.log('RE.QUERY: ', req.params)
	// req.params.id will be set based on the `:id` in the route
	axios.get('https://api.api-ninjas.com/v1/exercises?name=', {
		headers: { 'X-Api-Key': apiKey },
        params: {
            name: name
        },
       
    })
    .then((apiRes) => {
        // Send the result of the external API request back to the client
        res.status(200).json(apiRes.data);
    })
    .catch((error) => {
        console.error('Error: ', error);
        res.status(500).json({ error: 'An error occurred while searching for exercises' });
    });
})

// CREATE
// POST /exercises
router.post('/exercises', requireToken, (req, res, next) => {
	// set owner of new exercise to be current user
	req.body.exercise.owner = req.user.id

	Exercise.create(req.body.exercise)
		// respond to succesful `create` with status 201 and JSON of new "exercise"
		.then((exercise) => {
			res.status(201).json({ exercise: exercise.toObject() })
		})
		// if an error occurs, pass it off to our error handler
		// the error handler needs the error message and the `res` object so that it
		// can send an error message back to the client
		.catch(next)
})

// UPDATE
// PATCH /exercises/5a7db6c74d55bc51bdf39793
router.patch('/exercises/:id', requireToken, removeBlanks, (req, res, next) => {
	// if the client attempts to change the `owner` property by including a new
	// owner, prevent that by deleting that key/value pair
	delete req.body.exercise.owner

	Exercise.findById(req.params.id)
		.then(handle404)
		.then((exercise) => {
			// pass the `req` object and the Mongoose record to `requireOwnership`
			// it will throw an error if the current user isn't the owner
			requireOwnership(req, exercise)

			// pass the result of Mongoose's `.update` to the next `.then`
			return exercise.updateOne(req.body.exercise)
		})
		// if that succeeded, return 204 and no JSON
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

// DESTROY
// DELETE /exercises/5a7db6c74d55bc51bdf39793
router.delete('/exercises/:id', requireToken, (req, res, next) => {
	Exercise.findById(req.params.id)
		.then(handle404)
		.then((exercise) => {
			// throw an error if current user doesn't own `exercise`
			requireOwnership(req, exercise)
			// delete the exercise ONLY IF the above didn't throw
			exercise.deleteOne()
		})
		// send back 204 and no content if the deletion succeeded
		.then(() => res.sendStatus(204))
		// if an error occurs, pass it to the handler
		.catch(next)
})

module.exports = router
