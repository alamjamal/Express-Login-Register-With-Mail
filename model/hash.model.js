const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hashSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		required: true,
		ref: "users",
		unique: true,
	},
	hashString:{type: String, required:true},
	createdAt: {type: Date, default: Date.now, expires: '10m' },
});

module.exports = mongoose.model("Hash", hashSchema);