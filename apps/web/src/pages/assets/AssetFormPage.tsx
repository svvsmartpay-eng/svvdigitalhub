import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAsset, useUpdateAsset, useAsset } from '@/api/assets.api';
import { useBranches } from '@/api/branches.api';
import { useCategories } from '@/api/categories.api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import {
  Box, IndianRupee, Calendar, Shield, MapPin, User,
  FileText, ArrowLeft, Check, AlertCircle, Sparkles, Tag, History
} from 'lucide-react';

export default function AssetFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const { data: assetData, isLoading: isLoadingAsset } = useAsset(id as string);
  const { data: branches, isLoading: isLoadingBranches } = useBranches();
  const { data: categories, isLoading: isLoadingCategories } = useCategories();

  const [formData, setFormData] = useState({
    // 1. Identity & Hardware
    name: '',
    branchId: '',
    categoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    barcode: '',
    status: 'OPERATIONAL',
    condition: 'GOOD',
    criticality: 'MEDIUM',

    // 2. Financial & Cost
    purchaseCost: '',
    installationCost: '',
    currentBookValue: '',
    replacementCost: '',
    ownershipType: 'OWNED',
    monthlyRental: '',
    emiAmount: '',
    securityDeposit: '',

    // 3. Lifecycle & Lifespan
    purchaseDate: '',
    installationDate: '',
    commissioningDate: '',
    expectedLifeYears: '5',

    // 4. Location & Custody
    building: '',
    room: '',
    exactPosition: '',
    custodianName: '',

    // 5. Warranty & AMC
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyTerms: '',
    amcContractNo: '',
    amcStartDate: '',
    amcEndDate: '',
    amcCost: '',
    amcCoverage: '',

    // 6. Notes & Edit Audit
    description: '',
    editReason: '',
  });

  const [error, setError] = useState('');

  // Populate form in edit mode
  useEffect(() => {
    if (isEdit && assetData) {
      setFormData({
        name: assetData.name || '',
        branchId: assetData.branchId || '',
        categoryId: assetData.categoryId || '',
        brand: assetData.brand || '',
        model: assetData.model || '',
        serialNumber: assetData.serialNumber || '',
        barcode: assetData.barcode || '',
        status: assetData.status || 'OPERATIONAL',
        condition: assetData.condition || 'GOOD',
        criticality: assetData.criticality || 'MEDIUM',

        purchaseCost: assetData.purchaseCost ? String(assetData.purchaseCost) : '',
        installationCost: assetData.installationCost ? String(assetData.installationCost) : '',
        currentBookValue: assetData.currentBookValue ? String(assetData.currentBookValue) : '',
        replacementCost: assetData.replacementCost ? String(assetData.replacementCost) : '',
        ownershipType: assetData.ownershipType || 'OWNED',
        monthlyRental: assetData.monthlyRental ? String(assetData.monthlyRental) : '',
        emiAmount: assetData.emiAmount ? String(assetData.emiAmount) : '',
        securityDeposit: assetData.securityDeposit ? String(assetData.securityDeposit) : '',

        purchaseDate: assetData.purchaseDate ? assetData.purchaseDate.split('T')[0] : '',
        installationDate: assetData.installationDate ? assetData.installationDate.split('T')[0] : '',
        commissioningDate: assetData.commissioningDate ? assetData.commissioningDate.split('T')[0] : '',
        expectedLifeYears: assetData.expectedLifeYears ? String(assetData.expectedLifeYears) : '5',

        building: assetData.building || '',
        room: assetData.room || '',
        exactPosition: assetData.exactPosition || '',
        custodianName: assetData.custodianName || '',

        warrantyStartDate: assetData.warranty?.startDate ? assetData.warranty.startDate.split('T')[0] : '',
        warrantyEndDate: assetData.warranty?.endDate ? assetData.warranty.endDate.split('T')[0] : '',
        warrantyTerms: assetData.warranty?.terms || '',

        amcContractNo: assetData.amc?.contractNo || '',
        amcStartDate: assetData.amc?.startDate ? assetData.amc.startDate.split('T')[0] : '',
        amcEndDate: assetData.amc?.endDate ? assetData.amc.endDate.split('T')[0] : '',
        amcCost: assetData.amc?.cost ? String(assetData.amc.cost) : '',
        amcCoverage: assetData.amc?.coverage || '',

        description: assetData.description || '',
        editReason: '',
      });
    }
  }, [isEdit, assetData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isEdit && !formData.editReason.trim()) {
      setError('Please provide a brief "Reason for Edit / Why" so this update is recorded accurately in the asset audit history.');
      return;
    }

    try {
      if (isEdit) {
        await updateAsset.mutateAsync({ id: id as string, data: formData });
        navigate(`/assets/${id}`);
      } else {
        const created = await createAsset.mutateAsync(formData);
        navigate(`/assets/${created?.id || ''}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'create'} asset`);
    }
  };

  if (isEdit && isLoadingAsset) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      <PageHeader
        title={isEdit ? `Edit Asset: ${assetData?.name || ''}` : "Add New Asset"}
        subtitle={isEdit ? `Update specifications, cost, lifecycle & warranty for ${assetData?.assetId || ''}` : "Register a new asset with full financial, warranty & lifecycle tracking"}
        breadcrumbs={[
          { label: 'Assets', href: '/assets' },
          ...(isEdit && assetData ? [{ label: assetData.assetId, href: `/assets/${assetData.id}` }] : []),
          { label: isEdit ? 'Edit' : 'New Asset' }
        ]}
      />

      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── SECTION 1: GENERAL IDENTITY & HARDWARE ───────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Box className="w-4 h-4 text-[#1e3a5f]" />
            <h3 className="font-bold text-sm text-gray-900">1. Hardware Identity & Classification</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name" className="text-xs font-semibold">Asset Name *</Label>
              <Input
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Hitachi High-Speed ATM Machine"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchId" className="text-xs font-semibold">Branch *</Label>
              <select
                id="branchId"
                name="branchId"
                required
                value={formData.branchId}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="">Select Branch</option>
                {!isLoadingBranches && branches?.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categoryId" className="text-xs font-semibold">Category *</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                value={formData.categoryId}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="">Select Category</option>
                {!isLoadingCategories && categories?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand" className="text-xs font-semibold">Brand / Manufacturer</Label>
              <Input id="brand" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Hitachi / Diebold" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs font-semibold">Model</Label>
              <Input id="model" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. HT-2845-SR" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serialNumber" className="text-xs font-semibold">Serial Number</Label>
              <Input id="serialNumber" name="serialNumber" value={formData.serialNumber} onChange={handleChange} placeholder="e.g. SN-89234812" className="text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="barcode" className="text-xs font-semibold">Barcode / Asset Tag</Label>
              <Input id="barcode" name="barcode" value={formData.barcode} onChange={handleChange} placeholder="e.g. SVV-ATM-009" className="text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold">Operating Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="OPERATIONAL">Operational</option>
                <option value="BREAKDOWN">Breakdown</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="condition" className="text-xs font-semibold">Physical Condition</Label>
              <select
                id="condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="NEEDS_ATTENTION">Needs Attention</option>
                <option value="POOR">Poor (Watchlist)</option>
                <option value="CRITICAL">Critical (Replace)</option>
                <option value="SCRAP">Scrap</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="criticality" className="text-xs font-semibold">Criticality</Label>
              <select
                id="criticality"
                name="criticality"
                value={formData.criticality}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical (24/7 SLA)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: FINANCIAL & COST TRACKING ──────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <IndianRupee className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-sm text-gray-900">2. Financial Capitalization & Cost Ledger</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchaseCost" className="text-xs font-semibold">Purchase Price (₹) *</Label>
              <Input
                id="purchaseCost"
                name="purchaseCost"
                type="number"
                step="0.01"
                value={formData.purchaseCost}
                onChange={handleChange}
                placeholder="e.g. 250000.00"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="installationCost" className="text-xs font-semibold">Installation Cost (₹)</Label>
              <Input
                id="installationCost"
                name="installationCost"
                type="number"
                step="0.01"
                value={formData.installationCost}
                onChange={handleChange}
                placeholder="e.g. 15000.00"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currentBookValue" className="text-xs font-semibold">Current Book Value (₹)</Label>
              <Input
                id="currentBookValue"
                name="currentBookValue"
                type="number"
                step="0.01"
                value={formData.currentBookValue}
                onChange={handleChange}
                placeholder="e.g. 200000.00"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="replacementCost" className="text-xs font-semibold">Est. Replacement Cost (₹)</Label>
              <Input
                id="replacementCost"
                name="replacementCost"
                type="number"
                step="0.01"
                value={formData.replacementCost}
                onChange={handleChange}
                placeholder="e.g. 275000.00"
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ownershipType" className="text-xs font-semibold">Ownership Model</Label>
              <select
                id="ownershipType"
                name="ownershipType"
                value={formData.ownershipType}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]"
              >
                <option value="OWNED">Owned (Capital Asset)</option>
                <option value="RENTAL">Rental</option>
                <option value="LEASE">Lease</option>
                <option value="EMI">EMI Financed</option>
                <option value="VENDOR_OWNED">Vendor Owned</option>
              </select>
            </div>

            {(formData.ownershipType === 'RENTAL' || formData.ownershipType === 'LEASE' || formData.ownershipType === 'EMI') && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="monthlyRental" className="text-xs font-semibold">Monthly Rental / EMI (₹)</Label>
                  <Input
                    id="monthlyRental"
                    name="monthlyRental"
                    type="number"
                    value={formData.monthlyRental}
                    onChange={handleChange}
                    placeholder="e.g. 8500.00"
                    className="text-xs font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="securityDeposit" className="text-xs font-semibold">Security Deposit (₹)</Label>
                  <Input
                    id="securityDeposit"
                    name="securityDeposit"
                    type="number"
                    value={formData.securityDeposit}
                    onChange={handleChange}
                    placeholder="e.g. 50000.00"
                    className="text-xs font-mono"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── SECTION 3: LIFECYCLE & LIFESPAN ──────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Calendar className="w-4 h-4 text-purple-700" />
            <h3 className="font-bold text-sm text-gray-900">3. Lifecycle Milestones & Lifespan</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate" className="text-xs font-semibold">Purchase Date</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="installationDate" className="text-xs font-semibold">Installation Date</Label>
              <Input
                id="installationDate"
                name="installationDate"
                type="date"
                value={formData.installationDate}
                onChange={handleChange}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="commissioningDate" className="text-xs font-semibold">Commissioning Date</Label>
              <Input
                id="commissioningDate"
                name="commissioningDate"
                type="date"
                value={formData.commissioningDate}
                onChange={handleChange}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedLifeYears" className="text-xs font-semibold">Expected Lifespan (Years) *</Label>
              <Input
                id="expectedLifeYears"
                name="expectedLifeYears"
                type="number"
                min="1"
                max="50"
                value={formData.expectedLifeYears}
                onChange={handleChange}
                placeholder="e.g. 5"
                className="text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 4: LOCATION & CUSTODY ─────────────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-gray-900">4. Branch Location & Custodian</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="building" className="text-xs font-semibold">Building / Wing</Label>
              <Input id="building" name="building" value={formData.building} onChange={handleChange} placeholder="e.g. Main Branch Block A" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="room" className="text-xs font-semibold">Room / Floor / Area</Label>
              <Input id="room" name="room" value={formData.room} onChange={handleChange} placeholder="e.g. Ground Floor Lobby" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exactPosition" className="text-xs font-semibold">Exact Position / Desk</Label>
              <Input id="exactPosition" name="exactPosition" value={formData.exactPosition} onChange={handleChange} placeholder="e.g. ATM Kiosk 1" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custodianName" className="text-xs font-semibold">Custodian Name (In-Charge)</Label>
              <Input id="custodianName" name="custodianName" value={formData.custodianName} onChange={handleChange} placeholder="e.g. Rajesh Kumar (Manager)" className="text-xs" />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: WARRANTY & AMC PROTECTION ─────────────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Shield className="w-4 h-4 text-teal-700" />
            <h3 className="font-bold text-sm text-gray-900">5. Warranty & Annual Maintenance Contract (AMC)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="warrantyStartDate" className="text-xs font-semibold">Warranty Start Date</Label>
              <Input id="warrantyStartDate" name="warrantyStartDate" type="date" value={formData.warrantyStartDate} onChange={handleChange} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="warrantyEndDate" className="text-xs font-semibold">Warranty Expiry Date</Label>
              <Input id="warrantyEndDate" name="warrantyEndDate" type="date" value={formData.warrantyEndDate} onChange={handleChange} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="warrantyTerms" className="text-xs font-semibold">Warranty Coverage Terms</Label>
              <Input id="warrantyTerms" name="warrantyTerms" value={formData.warrantyTerms} onChange={handleChange} placeholder="e.g. 3 Years Comprehensive OEM Parts & Labor" className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amcContractNo" className="text-xs font-semibold">AMC Contract Number</Label>
              <Input id="amcContractNo" name="amcContractNo" value={formData.amcContractNo} onChange={handleChange} placeholder="e.g. AMC-2026-SVV-08" className="text-xs font-mono" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amcEndDate" className="text-xs font-semibold">AMC Valid Until</Label>
              <Input id="amcEndDate" name="amcEndDate" type="date" value={formData.amcEndDate} onChange={handleChange} className="text-xs" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amcCost" className="text-xs font-semibold">Annual AMC Cost (₹)</Label>
              <Input id="amcCost" name="amcCost" type="number" value={formData.amcCost} onChange={handleChange} placeholder="e.g. 18000.00" className="text-xs font-mono" />
            </div>
          </div>
        </div>

        {/* ── SECTION 6: DESCRIPTION & EDIT AUDIT RECORD ───────────────────── */}
        <div className="bg-white p-6 rounded-xl shadow-2xs border border-gray-200 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="w-4 h-4 text-gray-700" />
            <h3 className="font-bold text-sm text-gray-900">
              6. Description {isEdit ? '& Audit Log Tracking (Who & Why)' : '& Additional Notes'}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">Description & Specifications</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add any extra notes, technical specs, network IP, or configuration notes..."
                className="text-xs"
              />
            </div>

            {isEdit && (
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                  <History className="w-4 h-4 text-amber-700" />
                  <span>Audit History Recording: Why are you editing this asset? *</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Every edit is permanently recorded in the asset timeline with your user account, timestamp, and this explanation.
                </p>
                <Input
                  name="editReason"
                  required
                  value={formData.editReason}
                  onChange={handleChange}
                  placeholder="e.g. Corrected purchase cost after invoice audit, updated warranty renewal date..."
                  className="text-xs bg-white border-amber-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Action Buttons ───────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/assets/${id}` : '/assets')}
            className="text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>

          <div className="flex gap-3">
            <Button
              type="submit"
              size="sm"
              className="bg-[#1e3a5f] hover:bg-[#172d4a] text-white text-xs font-semibold shadow-2xs px-6 h-9"
              loading={createAsset.isPending || updateAsset.isPending}
            >
              <Check className="w-4 h-4 mr-1.5" />
              {isEdit ? 'Save Asset Changes & Log Audit' : 'Register Asset in System'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

