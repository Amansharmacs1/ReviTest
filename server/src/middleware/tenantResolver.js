import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Organization } from '../models/Organization.js';

/**
 * Middleware to resolve and validate Tenant (Organization) context
 * Resolves from:
 * 1. Explicit query or route params (:orgSlug, :organizationId)
 * 2. Headers ('x-tenant-slug', 'x-organization-id')
 * 3. Authenticated user's token (req.user.organizationId)
 *
 * @param {boolean} required - whether request must have a valid tenant
 */
export const tenantResolver =
  (required = true) =>
  async (req, res, next) => {
    const orgIdentifier =
      req.params.orgSlug ||
      req.params.organizationId ||
      req.headers['x-tenant-slug'] ||
      req.headers['x-organization-id'] ||
      req.body.organizationId ||
      req.body.orgSlug ||
      req.query.orgSlug ||
      req.query.organizationId ||
      req.user?.organizationId;

    if (!orgIdentifier) {
      if (!required) {
        return next();
      }
      return ApiResponse.error(res, {
        statusCode: HTTP_STATUS.BAD_REQUEST,
        message: 'Organization workspace identifier is required.',
        error: { code: 'TENANT_IDENTIFIER_MISSING' },
      });
    }

    try {
      let organization;
      // Check if identifier is MongoDB ObjectId or string slug
      if (orgIdentifier.toString().match(/^[0-9a-fA-F]{24}$/)) {
        organization = await Organization.findById(orgIdentifier);
      } else {
        organization = await Organization.findOne({
          $or: [
            { slug: orgIdentifier.toString().toLowerCase() },
            { code: orgIdentifier.toString().toUpperCase() },
          ],
        });
      }

      if (!organization) {
        return ApiResponse.error(res, {
          statusCode: HTTP_STATUS.NOT_FOUND,
          message: `Organization '${orgIdentifier}' was not found.`,
          error: { code: 'TENANT_NOT_FOUND' },
        });
      }

      if (organization.status !== 'ACTIVE') {
        return ApiResponse.error(res, {
          statusCode: HTTP_STATUS.FORBIDDEN,
          message: `Organization workspace is currently ${organization.status.toLowerCase()}. Access denied.`,
          error: { code: 'TENANT_INACTIVE' },
        });
      }

      // Attach tenant to request object
      req.organization = organization;
      req.tenantId = organization._id;

      next();
    } catch (err) {
      next(err);
    }
  };
