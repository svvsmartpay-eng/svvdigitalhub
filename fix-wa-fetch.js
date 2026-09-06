const fs = require('fs');

let modal = fs.readFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', 'utf8');

// I will insert a useEffect to fetch the branch phone number and name using Supabase.
const injectEffect = `
  useEffect(() => {
    if (!open || !branchId) return;
    const fetchBranch = async () => {
      // 1. Fetch branch details
      const { data: branchData } = await supabase.from('branches').select('name, code').eq('id', branchId).single();
      if (branchData) {
        setBranchName(branchData.name);
        setBranchCode(branchData.code);
      }
      
      // 2. Fetch whatsapp config to get the phone number
      const { data: waData } = await supabase.from('branch_whatsapp_configs').select('whatsappNumber, status').eq('branchId', branchId).single();
      if (waData) {
        setBranchPhone(waData.whatsappNumber || '');
        if (waData.status === 'CONNECTED') {
           setSessionStatus('CONNECTED');
           setConnectedNumber(waData.whatsappNumber || '');
        }
      }
    };
    fetchBranch();
  }, [open, branchId]);
`;

if (!modal.includes('fetchBranch = async ()')) {
    modal = modal.replace('const [errorMsg, setErrorMsg] = useState<string | null>(null);', 'const [errorMsg, setErrorMsg] = useState<string | null>(null);\n' + injectEffect);
}

fs.writeFileSync('apps/web/src/components/shared/WhatsAppGatewayModal.tsx', modal);
console.log('Fixed WhatsAppGatewayModal.tsx');
