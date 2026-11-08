/**
 * @fileoverview Comment Router and HTTP Controller Configuration
 * @module modules/comment/comment.controller
 * @description Exposes RESTful endpoints for top-level comments and nested replies.
 * Note: Initialized with `mergeParams: true` to access `:postId` from the parent post router.
 */

import { fileValidations, uploadCloudFile } from '../../utils/multer/cloud.multer.js';
import { endpoint } from './comment.authorization.js';
import * as commentService from './service/comment.service.js';
import * as validators from './comment.validation.js';
import { Router } from "express";
import { authentication, authorization } from '../../middleware/auth.middleware.js';
import { validation } from '../../middleware/validation.middleware.js';

const router = Router({
    mergeParams: true
});

/**
 * @route POST /post/:postId/comment
 * @desc Create a top-level comment on a post
 * @access Private [User, Admin]
 */
router.post(
    '/',
    authentication(),
    authorization(endpoint.createComment || endpoint.create || endpoint.comment),
    uploadCloudFile(fileValidations.image).array('attachments', 2),
    validation(validators.createComment),
    commentService.createComment
);

/**
 * @route POST /post/:postId/comment/:commentId/reply
 * @desc Create a nested reply under an existing comment
 * @access Private [User, Admin]
 */
router.post(
    '/:commentId/reply',
    authentication(),
    authorization(endpoint.createComment || endpoint.create || endpoint.comment),
    uploadCloudFile(fileValidations.image).array('attachments', 2),
    validation(validators.createComment),
    commentService.createComment
);

/**
 * @route PATCH /post/:postId/comment/:commentId
 * @desc Update comment content and/or attachments
 * @access Private [User, Admin]
 */
router.patch(
    '/:commentId',
    authentication(),
    authorization(endpoint.updateComment || endpoint.update || endpoint.comment),
    uploadCloudFile(fileValidations.image).array('attachments', 2),
    validation(validators.updateComment),
    commentService.updateComment
);

/**
 * @route PATCH /post/:postId/comment/:commentId/freeze
 * @desc Soft-delete a comment (authorized for author, post owner, or admin)
 * @access Private [User, Admin]
 */
router.patch(
    '/:commentId/freeze',
    authentication(),
    authorization(endpoint.freezeComment || endpoint.freeze || endpoint.comment),
    validation(validators.freezeComment),
    commentService.freezeComment
);

/**
 * @route PATCH /post/:postId/comment/:commentId/un-freeze
 * @desc Restore a soft-deleted comment
 * @access Private [User, Admin]
 */
router.patch(
    '/:commentId/un-freeze',
    authentication(),
    authorization(endpoint.freezeComment || endpoint.freeze || endpoint.comment),
    validation(validators.unfreezeComment),
    commentService.unFreezeComment
);

/**
 * @route PATCH /post/:postId/comment/:commentId/restore
 * @desc Restore alias for soft-deleted comment
 * @access Private [User, Admin]
 */
router.patch(
    '/:commentId/restore',
    authentication(),
    authorization(endpoint.freezeComment || endpoint.freeze || endpoint.comment),
    validation(validators.unfreezeComment),
    commentService.unFreezeComment
);

export default router;
