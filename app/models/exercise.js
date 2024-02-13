const mongoose = require('mongoose')

const exerciseSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
		},
		type: {
			type: String,
			required: true,
		},
		muscle: {
			type: String,
			required: true,
		},
		equipment: {
			type: String,
			required: true,
		},
		difficulty: {
			type: String,
			required: true,
		},
		instructions: {
			type: String,
			required: true,
		},
		
		owner: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
	},
	{
		timestamps: true,
	}
)

module.exports = mongoose.model('Exercise', exerciseSchema)
