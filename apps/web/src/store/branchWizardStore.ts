import { create } from 'zustand';

interface BranchWizardState {
  isOpen: boolean;
  editingBranchId: string | null;
  openWizard: (branchId?: string) => void;
  closeWizard: () => void;
}

export const useBranchWizardStore = create<BranchWizardState>((set) => ({
  isOpen: false,
  editingBranchId: null,
  openWizard: (branchId) => set({ isOpen: true, editingBranchId: branchId || null }),
  closeWizard: () => set({ isOpen: false, editingBranchId: null }),
}));
