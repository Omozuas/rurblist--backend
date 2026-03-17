    // controllers/property.controller.js
const asynchandler = require('express-async-handler');
const PropertySearch = require("../helper/propertyQueryDb");
const Property = require("../models/Property")
const Comment = require("../models/Comment");
const validateId = require("../helper/validatemongodb");
const UploadCloud = require("../config/cloudnary");
const slugify = require("slugify");
const fs = require("fs");
const mongoose=require("mongoose");

class PropertyController{
    /*
     /api/properties?search=duplex
     /api/property?minPrice=20000000&maxPrice=35000000
     /api/properties?bedrooms[gte]=3
     /api/properties?lat=6.5244&lng=3.3792&radius=10
     /api/properties?sort=-trendingScore
     /api/properties?cursor=65f12ab...
     /api/properties?type=Duplex
     /api/properties?status=For_Sale
     /api/properties?location.city=Ikeja
     /api/properties?location.city=Ikeja
     /api/properties?sort=price
     /api/properties?sort=-price
     /api/properties?sort=-views
     /api/properties?sort=-views
     /api/properties?page=2&limit=12
     /api/properties?search=lekki
     &type=Duplex
     &price[gte]=2000000
     &bedrooms[gte]=4
     &location.state=Lagos
     &sort=-price
     &page=1
     &limit=10
    */
    static searchProperties = async (req, res) => {

        const features = new PropertySearch(
            Property.find({ isAvailable: true }),
            req.query
        )
            .search()
            .filter()
            .geoSearch()
            .sort()
            .limitFields()
            .cursorPaginate()
            .populate(["owner fullName profileImage role phoneNumber","comments"]);

        const properties = await features.query.lean();

         // Get comment counts for all properties
        const propertyIds = properties.map(p => p._id);

        const commentsCount = await Comment.aggregate([
            {
                $match: {
                    property: { $in: propertyIds }
                }
            },
            {
                $group: {
                    _id: "$property",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        commentsCount.forEach(c => {
            countMap[c._id.toString()] = c.count;
        });

        // Attach count to each property
        const result = properties.map(property => ({
            ...property,
            commentsCount: countMap[property._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            count: result.length,
            properties: result
        });
    };

    static updateProperty = asynchandler(async (req, res) => {
        const { id } = req.params;
        const { removeImages } = req.body; 
        // removeImages = array of public_ids to delete
        validateId.validateMongodbId(id);
        const property = await Property.findById(id);

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        // Authorization
        if (
            property.owner.toString() !== req.user.id &&
            req.user.role !== "Admin"
        ) {
            res.status(403);
            throw new Error("Not authorized");
        }

        /*
            =====================================
            🔥 1️⃣ DELETE SELECTED OLD IMAGES
            =====================================
        */
        if (removeImages && Array.isArray(removeImages)) {
            for (const publicId of removeImages) {
            await UploadCloud.delete(publicId);

            property.images = property.images.filter(
                (img) => img.public_id !== publicId
            );
            }
        }

        /*
            =====================================
            🔥 2️⃣ UPLOAD NEW IMAGES (if provided)
            =====================================
        */
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
            const result = await UploadCloud.upload(file.path, "properties");

            property.images.push({
                url: result.url,
                public_id: result.public_id
            });

            fs.unlinkSync(file.path); // remove local file
            }
        }

        /*
            =====================================
            🔥 3️⃣ UPDATE OTHER PROPERTY FIELDS
            =====================================
        */

        Object.keys(req.body).forEach((key) => {
            if (key !== "removeImages") {
            property[key] = req.body[key];
            }
        });

        await property.save();

        res.status(200).json({
            success: true,
            message: "Property updated successfully",
            property
        });
    });
  
    static deleteProperty = asynchandler(async (req, res) => {
        const { id } = req.params;
         validateId.validateMongodbId(id);
        const property = await Property.findById(id);

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        // Authorization
        if (
            property.owner.toString() !== req.user.id &&
            req.user.role !== "Admin"
        ) {
            res.status(403);
            throw new Error("Not authorized to delete this property");
        }

        // 🔥 1️⃣ Delete images from Cloudinary
        if (property.images && property.images.length > 0) {
            await Promise.all(
            property.images.map(async (img) => {
                if (img.public_id) {
                await UploadCloud.delete(img.public_id);
                }
            })
            );
        }

        // 🔥 2️⃣ Delete related comments
        await Comment.deleteMany({ property: id });

        // 🔥 3️⃣ Delete property
        await property.deleteOne();

        res.status(200).json({
            success: true,
            message: "Property and related images deleted successfully"
        });
    });

    static unlikeProperty = asynchandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const property = await Property.findById(id);

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        const alreadyLiked = property.likes.includes(userId);
        const alreadyUnliked = property.unlikes.includes(userId);

        // Toggle unlike off
        if (alreadyUnliked) {
            await Property.findByIdAndUpdate(id, {
                $pull: { unlikes: userId },
                $inc: { unlikesCount: -1 }
            });

            return res.status(200).json({
                success: true,
                message: "Unlike removed"
            });
        }

        // Remove like if previously liked
        if (alreadyLiked) {
            await Property.findByIdAndUpdate(id, {
                $pull: { likes: userId },
                $inc: { likesCount: -1 }
            });
        }

        // Add unlike
        await Property.findByIdAndUpdate(id, {
            $addToSet: { unlikes: userId },
            $inc: { unlikesCount: 1 }
        });

        res.status(200).json({
            success: true,
            message: "Property unliked"
        });
    });

    static likeProperty = asynchandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;

        const property = await Property.findById(id);

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        const alreadyLiked = property.likes.includes(userId);
        const alreadyUnliked = property.unlikes.includes(userId);

        // Toggle like off
        if (alreadyLiked) {
            await Property.findByIdAndUpdate(id, {
                $pull: { likes: userId },
                $inc: { likesCount: -1 }
            });

            return res.status(200).json({
                success: true,
                message: "Like removed"
            });
        }

        // If user had disliked before
        if (alreadyUnliked) {
            await Property.findByIdAndUpdate(id, {
                $pull: { unlikes: userId },
                $inc: { unlikesCount: -1 }
            });
        }

        // Add like
        await Property.findByIdAndUpdate(id, {
            $addToSet: { likes: userId },
            $inc: { likesCount: 1 }
        });

        res.status(200).json({
            success: true,
            message: "Property liked"
        });
    });

    static addReply = asynchandler(async (req, res) => {
        const { commentId } = req.params;
        const { text } = req.body;

        if (!text) {
            res.status(400);
            throw new Error("Reply text is required");
        }

        const parent = await Comment.findById(commentId);

        if (!parent) {
            res.status(404);
            throw new Error("Parent comment not found");
        }

        const reply = await Comment.create({
            property: parent.property,
            user: req.user.id,
            text,
            parentComment: parent._id
        });

        res.status(201).json({
            success: true,
            reply
        });
    });
    
    static addComment = asynchandler(async (req, res) => {
        const { id } = req.params;
        const { text } = req.body;

        if (!text) {
            res.status(400);
            throw new Error("Comment text is required");
        }

        const property = await Property.findById(id);

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        const comment = await Comment.create({
            property: id,
            user: req.user.id,
            text,
            parentComment: null
        });

        res.status(201).json({
            success: true,
            comment
        });
    });

    static getSingleProperty = asynchandler(async (req, res) => {
        const { id } = req.params;
        const currentUserId = req.user ? req.user.id : null;

        const property = await Property.findByIdAndUpdate(
            id,
            { $inc: { views: 1 } },
            { returnDocument: "after" }
        )
            .populate("owner", "fullName profileImage role")
            .lean();

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        const ownerId = property.owner._id;

        const comments = await Comment.aggregate([
            {
            $match: {
                property: new mongoose.Types.ObjectId(id),
                parentComment: null
            }
            },

            {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
            },
            { 
                $unwind: "$user" 
            },
            {
                $project: {
                    text: 1,
                    property: 1,
                    parentComment: 1,
                    createdAt: 1,
                    updatedAt: 1,

                    "user._id": 1,
                    "user.fullName": 1,
                    "user.profileImage": 1,
                    "user.role": 1,
                    "user.phoneNumber": 1
                }
            },

            // Replies lookup
            {
            $lookup: {
                from: "comments",
                let: { commentId: "$_id" },
                pipeline: [
                {
                    $match: {
                    $expr: { $eq: ["$parentComment", "$$commentId"] }
                    }
                },
                {
                    $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                    }
                },
                { 
                    $unwind: "$user" 
                },
                {
                    $project: {
                        text: 1,
                        property: 1,
                        parentComment: 1,
                        createdAt: 1,
                        updatedAt: 1,

                        "user._id": 1,
                        "user.fullName": 1,
                        "user.profileImage": 1,
                        "user.role": 1,
                        "user.phoneNumber": 1
                    }
                },

                {
                    $addFields: {
                    isOwnerReply: {
                        $eq: ["$user._id", ownerId]
                    },
                    isCurrentUser: {
                        $eq: ["$user._id", currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null]
                    }
                    }
                },

                { $sort: { createdAt: 1 } }
                ],
                as: "replies"
            }
            },

            // Highlight comment owner + current user
            {
            $addFields: {
                isOwnerComment: {
                $eq: ["$user._id", ownerId]
                },
                isCurrentUser: {
                $eq: ["$user._id", currentUserId ? new mongoose.Types.ObjectId(currentUserId) : null]
                }
            }
            },

            { $sort: { createdAt: -1 } }
        ]);

        property.comments = comments;

        res.status(200).json({
            success: true,
            data: property
        });
    });

    static getReplies = asynchandler(async (req, res) => {
        const { commentId } = req.params;
        const { page = 1, limit = 5 } = req.query;

        const skip = (page - 1) * limit;

        const replies = await Comment.find({
            parentComment: commentId
        })
            .populate("user", "fullName profileImage role")
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            replies
        });
    });

    static createProperty = asynchandler(async (req, res) => {
        const {
            title,
            description,
            type,
            status,
            price,
            bedrooms,
            bathrooms,
            size,
            agentFee,
            amenities,     
            furnishingStatus,
            paymentFrequency,
            address,
            city,
            state,
            country,
            lat,
            lng
        } = req.body;
        // ===============================
        // ✅ Basic Required Validation
        // ===============================
        if (!title || !description || !type || !status || !price) {
            res.status(400);
            throw new Error("Missing required property fields");
        }

        if (!lat || !lng) {
            res.status(400);
            throw new Error("Property coordinates (lat & lng) are required");
        }

        // Validate images exist
        if (!req.files || req.files.length === 0) {
            res.status(400);
            throw new Error("At least one property image is required");
        }
        if (req.files.length < 3) {
            res.status(400);
            throw new Error("Minimum 3 property images required");
        }
        if (req.files.length > 6) {
            res.status(400);
            throw new Error("Maximum 6 images allowed");
        }

        const count = await Property.countDocuments({ owner: req.user.id });

        if (count >= 50) {
            res.status(400);
            throw new Error("Property limit reached");
        }

        // ===============================
        // 🖼 Upload Images to Cloudinary
        // ===============================
        let uploadedImages = [];

        if (req.files && req.files.length > 0) {
            try {
                for (const file of req.files) {
                    const result = await UploadCloud.upload(file.path, "rublist/properties");

                    uploadedImages.push({
                        url: result.url,
                        public_id: result.public_id
                    });

                    // Remove file from local storage
                    fs.unlinkSync(file.path);
                }
            } catch (error) {
                // delete already uploaded images
                await Promise.all(uploadedImages.map(img =>
                    UploadCloud.delete(img.public_id)
                ));
                res.status(400);
                throw new Error(error);
            }
            
        }

        // ===============================
        // 🏗 Create Property Document
        // ===============================
        const property = await Property.create({
            title,
            description,
            type,
            status,
            furnishingStatus,
            price,
            bedrooms,
            bathrooms,
            size,
            agentFee,
            paymentFrequency,
            slug:slugify(title, {
                lower: true,
                strict: true
            }),
            amenities,
            location: {
            address,
            city,
            state,
            country,
            coordinates: {
                type: "Point",
                coordinates: [Number(lng), Number(lat)]
            }
            },

            images: uploadedImages,
            owner: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Property created successfully",
            property
        });
    });

    static getPropertyBySlug = asynchandler(async (req, res) => {
        const { slug } = req.params;

        const property = await Property.findOne({ slug })
            .populate("owner", "fullName profileImage role")
            .lean();

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        res.status(200).json({
            success: true,
            data: property
        });
    });
    
    static getMyProperties = asynchandler(async (req, res) => {
        const userId = req.user.id;

        const features = new PropertySearch(
            Property.find({ owner: userId }),
            req.query
        )
            .filter()
            .sort()
            .limitFields()
            .cursorPaginate()
            .populate(["owner fullName profileImage role phoneNumber"]);

        const properties = await features.query;

        // Get comment counts for all properties
        const propertyIds = properties.map(p => p._id);

        const commentsCount = await Comment.aggregate([
            {
                $match: {
                    property: { $in: propertyIds }
                }
            },
            {
                $group: {
                    _id: "$property",
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        commentsCount.forEach(c => {
            countMap[c._id.toString()] = c.count;
        });

        // Attach count to each property
        const result = properties.map(property => ({
            ...property.toObject(),
            commentsCount: countMap[property._id.toString()] || 0
        }));

        res.status(200).json({
            success: true,
            count: result.length,
            data: result
        });
    });
    
    /*GET /api/property/69b316fc2c8fd1f441fc01f8/comments?replyLimit=3&replyPage=1*/
    static getCommentsByProperty = asynchandler(async (req, res) => {
        const { propertyId } = req.params;

        const currentUserId = req.user ? req.user.id : null;

        const replyLimit = parseInt(req.query.replyLimit) || 3;
        const replyPage = parseInt(req.query.replyPage) || 1;
        const replySkip = (replyPage - 1) * replyLimit;

        const property = await Property.findById(propertyId).select("owner");

        if (!property) {
            res.status(404);
            throw new Error("Property not found");
        }

        const ownerId = property.owner;

        const comments = await Comment.aggregate([
            {
            $match: {
                property: new mongoose.Types.ObjectId(propertyId),
                parentComment: null
            }
            },

            // attach comment user
            {
            $lookup: {
                from: "users",
                localField: "user",
                foreignField: "_id",
                as: "user"
            }
            },
            { $unwind: "$user" },

            {
            $project: {
                text: 1,
                property: 1,
                parentComment: 1,
                createdAt: 1,

                "user._id": 1,
                "user.fullName": 1,
                "user.profileImage": 1,
                "user.role": 1,
                "user.phoneNumber": 1
            }
            },

            // replies lookup with pagination
            {
            $lookup: {
                from: "comments",
                let: { commentId: "$_id" },
                pipeline: [
                {
                    $match: {
                    $expr: {
                        $eq: ["$parentComment", "$$commentId"]
                    }
                    }
                },

                { $sort: { createdAt: 1 } },

                { $skip: replySkip },

                { $limit: replyLimit },

                {
                    $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "_id",
                    as: "user"
                    }
                },
                { $unwind: "$user" },

                {
                    $project: {
                    text: 1,
                    property: 1,
                    parentComment: 1,
                    createdAt: 1,

                    "user._id": 1,
                    "user.fullName": 1,
                    "user.profileImage": 1,
                    "user.role": 1,
                    "user.phoneNumber": 1
                    }
                },

                {
                    $addFields: {
                    isOwnerReply: {
                        $eq: ["$user._id", ownerId]
                    },
                    isCurrentUser: {
                        $eq: [
                        "$user._id",
                        currentUserId
                            ? new mongoose.Types.ObjectId(currentUserId)
                            : null
                        ]
                    }
                    }
                }
                ],
                as: "replies"
            }
            },

            {
            $addFields: {
                isOwnerComment: {
                $eq: ["$user._id", ownerId]
                },
                isCurrentUser: {
                $eq: [
                    "$user._id",
                    currentUserId
                    ? new mongoose.Types.ObjectId(currentUserId)
                    : null
                ]
                }
            }
            },

            { $sort: { createdAt: -1 } }
        ]);

        res.status(200).json({
            success: true,
            replyPage,
            replyLimit,
            comments
        });
    });
    
    static getAgentsPropertiesById = asynchandler(async (req, res) => {

        const agentId = req.params.id;

       validateId.validateMongodbId(agentId);

        const features = new PropertySearch(
            Property.find({ owner: agentId }),
            req.query
        )
            .filter()
            .sort()
            .limitFields()
            .cursorPaginate()
            .populate(["owner fullName profileImage role phoneNumber"]);

        const properties = await features.query;

        res.status(200).json({
            success: true,
            count: properties.length,
            data: properties
        });

    });
}

module.exports=PropertyController;