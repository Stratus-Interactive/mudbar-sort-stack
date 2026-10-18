/**
 * RevenueCat integration.
 * All digital purchases MUST go through StoreKit via RevenueCat —
 * no external payment links (App Review requirement).
 */
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { CONFIG } from '../config';
import { REMOVE_ADS_ENTITLEMENT, ProductDef } from './products';
import { Analytics } from '../analytics';

let initialized = false;
let customerInfo: CustomerInfo | null = null;

export async function initIAP(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const apiKey = Platform.OS === 'ios'
    ? CONFIG.revenueCat.ios
    : CONFIG.revenueCat.android;
  if (!apiKey) {
    console.log('[iap] No RevenueCat key — IAP disabled');
    return;
  }
  try {
    Purchases.configure({ apiKey });
    customerInfo = await Purchases.getCustomerInfo();
    Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
  } catch (e) {
    console.warn('[iap] RevenueCat configure failed', e);
  }
}

function setCustomerInfo(info: CustomerInfo): void {
  customerInfo = info;
}

/** Whether the player owns the Remove Ads entitlement. */
export async function hasRemoveAds(): Promise<boolean> {
  try {
    const info = customerInfo ?? (await Purchases.getCustomerInfo());
    return info.entitlements.active[REMOVE_ADS_ENTITLEMENT] != null;
  } catch {
    return false;
  }
}

export interface PurchaseResult {
  ok: boolean;
  productId: string;
  error?: string;
}

/**
 * Purchase a product by its RevenueCat product ID.
 * Handles user cancellation gracefully (not an error).
 */
export async function purchaseProduct(
  product: ProductDef,
): Promise<PurchaseResult> {
  void Analytics.iapViewed(product.id);
  try {
    const offerings = await Purchases.getOfferings();
    const pkg: PurchasesPackage | undefined = offerings.current?.availablePackages.find(
      (p) => p.product.identifier === product.id,
    );
    if (!pkg) {
      return { ok: false, productId: product.id, error: 'Product not available' };
    }
    const { customerInfo: info } = await Purchases.purchasePackage(pkg);
    setCustomerInfo(info);
    void Analytics.iapPurchased(product.id, product.priceUsd);
    return { ok: true, productId: product.id };
  } catch (e: unknown) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) {
      return { ok: false, productId: product.id }; // silent — user changed mind
    }
    return {
      ok: false,
      productId: product.id,
      error: err.message ?? 'Purchase failed',
    };
  }
}

/** Restore previous purchases (required by App Review — must be reachable). */
export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return true;
  } catch {
    return false;
  }
}
