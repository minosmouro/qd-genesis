import { apiGet, apiPost, apiDelete } from './api';
import {
  TenantPartnership,
  PropertySharing,
  CreatePartnershipRequest,
  SharePropertyRequest,
  SharedPropertiesResponse,
} from '@/types/partnership';

export const partnershipsService = {
  // ==================== PARTNERSHIPS ====================
  
  /**
   * Create a new partnership request with another tenant
   */
  async createPartnership(data: CreatePartnershipRequest): Promise<TenantPartnership> {
    return apiPost<TenantPartnership>('/api/partnerships', data);
  },

  /**
   * List all partnerships for current tenant
   */
  async listPartnerships(): Promise<{ partnerships: TenantPartnership[] }> {
    return apiGet<{ partnerships: TenantPartnership[] }>('/api/partnerships');
  },

  /**
   * Accept a partnership request
   */
  async acceptPartnership(partnershipId: number): Promise<TenantPartnership> {
    return apiPost<TenantPartnership>(`/api/partnerships/${partnershipId}/accept`);
  },

  /**
   * Reject a partnership request
   */
  async rejectPartnership(partnershipId: number): Promise<void> {
    return apiDelete<void>(`/api/partnerships/${partnershipId}`);
  },

  // ==================== PROPERTY SHARING ====================

  /**
   * Share a property with partner tenant(s)
   * @param propertyId - Property to share
   * @param data - Sharing configuration (if shared_with_tenant_id is null, shares with all partners)
   */
  async shareProperty(propertyId: number, data: SharePropertyRequest): Promise<PropertySharing> {
    return apiPost<PropertySharing>(`/api/properties/${propertyId}/share`, data);
  },

  /**
   * Remove property sharing
   */
  async unshareProperty(sharingId: number): Promise<void> {
    return apiDelete<void>(`/api/sharings/${sharingId}`);
  },

  /**
   * List shared properties
   * @param includeOwned - Include properties shared by me
   * @param includeReceived - Include properties shared with me
   */
  async listSharedProperties(
    includeOwned: boolean = true,
    includeReceived: boolean = true
  ): Promise<SharedPropertiesResponse> {
    const params = new URLSearchParams();
    params.append('include_owned', includeOwned.toString());
    params.append('include_received', includeReceived.toString());
    
    return apiGet<SharedPropertiesResponse>(`/api/sharings?${params.toString()}`);
  },
};
