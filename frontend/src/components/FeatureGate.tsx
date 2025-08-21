import React from 'react';
import { Alert, Button } from 'antd';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  requiredPlan?: 'free' | 'premium';
  entitlement?: string;
  fallbackMode?: 'hide' | 'disable' | 'banner';
  ctaText?: string;
  onUpgradeClick?: () => void;
  children: React.ReactNode;
};

const tiers: Record<'free'|'premium', number> = { free: 0, premium: 1 };

export const FeatureGate: React.FC<Props> = ({
  requiredPlan = 'premium',
  entitlement,
  fallbackMode = 'banner',
  ctaText = 'Premium’a yükselt',
  onUpgradeClick,
  children
}) => {
  const { user } = useAuth();
  const userTier: 'free'|'premium' = (user?.plan?.tier as any) || 'free';
  const hasPlan = tiers[userTier] >= tiers[requiredPlan];
  const hasEnt = entitlement ? Array.isArray(user?.entitlements) && user!.entitlements!.includes(entitlement) : true;
  const allowed = hasPlan && hasEnt;

  if (allowed) return <>{children}</>;

  if (fallbackMode === 'hide') return null;

  if (fallbackMode === 'disable') {
    return <div style={{ opacity: 0.6, pointerEvents: 'none' }}>{children}</div>;
  }

  // banner mode
  return (
    <div>
      <Alert
        message="Bu özellik premium üyelik gerektirir"
        description={<Button type="primary" size="small" onClick={onUpgradeClick}> {ctaText} </Button>}
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
      />
      <div style={{ opacity: 0.6, pointerEvents: 'none' }}>{children}</div>
    </div>
  );
};

export default FeatureGate;


