
const express = require('express') // Express docs: http://expressjs.com/en/api.html
const passport = require('passport') // Passport docs: http://www.passportjs.org/docs/

// pull in Mongoose model for exercises
const Exercise = require('../models/exercise')

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
router.get('/exercises', requireToken, (req, res, next) => {
	Exercise.find()
		.then((exercises) => {
			// `exercises` will be an array of Mongoose documents
			// we want to convert each one to a POJO, so we use `.map` to
			// apply `.toObject` to each one
			return exercises.map((exercise) => exercise.toObject())
		})
		// respond with status 200 and JSON of the exercises
		.then((exercises) => res.status(200).json({ exercises: exercises }))
		// if an error occurs, pass it to the handler
		.catch(next)
})

//Search response with all images matching search keywords
router.post("/exercises", (req, res, next) => {
  
	const { search } = req.body;
	
	
	$.ajax({
		method: 'GET',
		url: 'https://api.api-ninjas.com/v1/exercises?muscle=' + search,
		headers: { 'X-Api-Key': apiKey},
		contentType: 'application/json',
		success: function(result) {
			console.log(result);
		},
		error: function ajaxError(jqXHR) {
			console.error('Error: ', jqXHR.responseText);
		}
	});

	// axios(`${imageVideoLib}/search?q=${search}&media_type=image&page_size=50`) //<-- add "/search?q={'KEYWORD HERE'}"
	//   .then((apiRes) => {
	// 	const foundData = apiRes.data;
  
	// 	res.render("imageVideoLib/imageIndex", { imageVideo: foundData });
	//   });
});

  

// SHOW
// GET /exercises/5a7db6c74d55bc51bdf39793
router.get('/exercises/:id', requireToken, (req, res, next) => {
	// req.params.id will be set based on the `:id` in the route
	Exercise.findById(req.params.id)
		.then(handle404)
		// if `findById` is succesful, respond with 200 and "exercise" JSON
		.then((exercise) => res.status(200).json({ exercise: exercise.toObject() }))
		// if an error occurs, pass it to the handler
		.catch(next)
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
