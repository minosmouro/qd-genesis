// Types for Partnerships Module

export type PartnershipStatus = 'pending' | 'active' | 'rejected' | 'cancelled';

export interface TenantPartnership {
  id: number;
  owner_tenant_id: number;
  partner_tenant_id: number;
  status: PartnershipStatus;
  commission_percentage?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  cancelled_at?: string;
}

export interface PropertySharing {
  id: number;
  property_id: number;
  owner_tenant_id: number;
  shared_with_tenant_id?: number; // null = shared with all partners
  sharing_type: 'partnership' | 'marketplace' | 'exclusive';
  can_edit: boolean;
  can_export: boolean;
  commission_override?: number;
  custom_terms?: string;
  expires_at?: string;
  is_active: boolean;
  is_expired: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PropertySharingActivity {
  id: number;
  property_id: number;
  sharing_id?: number;
  actor_tenant_id: number;
  action: string;
  details?: Record<string, any>;
  created_at?: string;
}

export interface CreatePartnershipRequest {
  partner_tenant_id: number;
  commission_percentage?: number;
  notes?: string;
}

export interface SharePropertyRequest {
  shared_with_tenant_id?: number; // null = share with all partners
  can_edit?: boolean;
  can_export?: boolean;
  commission_override?: number;
  custom_terms?: string;
  expires_at?: string;
}

export interface SharedPropertiesResponse {
  shared_by_me?: PropertySharing[];
  shared_with_me?: PropertySharing[];
}
