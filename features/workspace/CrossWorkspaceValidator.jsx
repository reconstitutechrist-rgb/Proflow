/**
 * Utility component and hooks for cross-workspace validation
 * Ensures data integrity across workspace boundaries
 */
import { db } from '@/api/db';
import { toast } from 'sonner';

/**
 * Validates that an entity belongs to the specified workspace
 */
export async function validateWorkspaceOwnership(entityType, entityId, expectedWorkspaceId) {
  try {
    const entities = await db.entities[entityType].filter({ id: entityId });

    if (entities.length === 0) {
      throw new Error(`${entityType} not found`);
    }

    const entity = entities[0];

    if (entity.workspace_id !== expectedWorkspaceId) {
      throw new Error(`Cannot access ${entityType} from different workspace`);
    }

    return entity;
  } catch (error) {
    console.error('Workspace validation error:', error);
    throw error;
  }
}

/**
 * Validates that multiple entities belong to the same workspace
 */
export async function validateSameWorkspace(entities) {
  const workspaceIds = entities.map((e) => e.workspace_id).filter(Boolean);
  const uniqueWorkspaceIds = [...new Set(workspaceIds)];

  if (uniqueWorkspaceIds.length > 1) {
    throw new Error('Cannot link entities from different workspaces');
  }

  if (uniqueWorkspaceIds.length === 0) {
    throw new Error('No workspace specified for entities');
  }

  return uniqueWorkspaceIds[0];
}

/**
 * Hook for validating workspace access before operations
 */
export function useWorkspaceValidation(currentWorkspaceId) {
  const validateAccess = async (entityType, entityId) => {
    try {
      await validateWorkspaceOwnership(entityType, entityId, currentWorkspaceId);
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const validateMultipleEntities = async (entities) => {
    try {
      const workspaceId = await validateSameWorkspace(entities);

      if (workspaceId !== currentWorkspaceId) {
        throw new Error('Entities belong to a different workspace');
      }

      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  return {
    validateAccess,
    validateMultipleEntities,
  };
}

export default {
  validateWorkspaceOwnership,
  validateSameWorkspace,
  useWorkspaceValidation,
};
