/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Crown, Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Wallet, User, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle, Edit2, X, Info, Image as ImageIcon, Plus, Loader2, ScanLine, Camera } from 'lucide-react';

// --- นำเข้า Firebase ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';

// --- ตั้งค่า Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCfS84jS1Tf7zYaC1tB3PzQUcUwAtKXr24",
  authDomain: "mybranchapp-8cadb.firebaseapp.com",
  projectId: "mybranchapp-8cadb",
  storageBucket: "mybranchapp-8cadb.firebasestorage.app",
  messagingSenderId: "386930800655",
  appId: "1:386930800655:web:2b1d647f7d67c5b96acb7a",
  measurementId: "G-7GL7NFGMTY"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

// ============================================================================
// 🔑 รหัส SECRET KEY ของทั้ง 2 สาขา
// ============================================================================
const SLIP2GO_KEY_BRANCH_2 = "gaHTLTHzI2ohH5w_YkYhuJrEIyxjZn8WRLtk2GsBM2w=";  
const SLIP2GO_KEY_BRANCH_5 = "NbwWJ+RBLNY2EDunM9J1zZvPcva0EbArjIOh+bhpYo8=";  

// --- ฟังก์ชันเสริมส่วนกลาง ---
const EXPENSE_TYPES = ['ค่าน้ำแข็ง', 'ค่าพัสดุ', 'เบิกค่าแรง', 'ค่าน้ำผลไม้', 'ค่าถุง', 'อื่นๆ'];
const SHIFTS = ["เช้า", "บ่าย", "ดึก"];

// บีบอัดรูปภาพ
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; const MAX_HEIGHT = 600;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
    };
  });
};

// 🚀 ฟังก์ชัน API ตรวจสลิป (แยกรหัส 2 สาขาอัตโนมัติ)
const verifySlipWithAPI = async (base64Image, branchName) => {
  try {
    const isBranch5 = branchName && branchName.toString().includes('5');
    const activeSecretKey = isBranch5 ? SLIP2GO_KEY_BRANCH_5.trim() : SLIP2GO_KEY_BRANCH_2.trim();

    if (!activeSecretKey || activeSecretKey.includes('ใส่รหัส')) {
        return { success: false, message: 'กรุณาตั้งค่า API Key ในโค้ดก่อนใช้งานสแกนสลิป' };
    }

    const response = await fetch('/api/slip2go/verify-slip/qr-base64/info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeSecretKey}` 
      },
      body: JSON.stringify({ payload: { imageBase64: base64Image } })
    });
    
    let result;
    try {
      result = await response.json();
    } catch (e) {
      return { success: false, message: 'ระบบเซิร์ฟเวอร์ตอบกลับผิดพลาด (โปรดระบุยอดเงินเอง)' };
    }
    
    if (result.code === '200000' || result.data?.amount !== undefined || result.amount !== undefined) {
       const amount = result.data?.amount ?? result.amount ?? result.payload?.amount;
       return { success: true, amount: amount };
    }
    
    return { success: false, message: result.message || "สลิปไม่ถูกต้อง หรือเซิร์ฟเวอร์ไม่พบข้อมูลร้านค้า" };
  } catch (error) {
    return { success: false, message: 'การเชื่อมต่อระบบตรวจสลิปล้มเหลว (อาจเกิดจากอินเทอร์เน็ต)' };
  }
};

const getTodayIso = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatThaiDate = (isoStr) => {
  if(!isoStr) return ''; const [y, m, d] = isoStr.split('-'); return `${parseInt(d,10)}/${parseInt(m,10)}/${parseInt(y,10) + 543}`;
};

const getLocalYMD = (timestamp) => {
  if (!timestamp) return ''; const d = new Date(timestamp); if (isNaN(d.getTime())) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const formatNum = (num) => Number(num).toLocaleString('th-TH');

// ============================================================================
// 💸 SYSTEM 2: ระบบเช็คยอดโอน
// ============================================================================
function TransferApp({ onBack }) {
  const TRANSFER_BRANCHES = [2, 5]; 
  const [activeTab, setActiveTab] = useState('form');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  
  const [form, setForm] = useState({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '' });
  const [submitDate, setSubmitDate] = useState(getTodayIso());
  
  const [scanStatus, setScanStatus] = useState('idle'); 
  const [scanMessage, setScanMessage] = useState('');
  
  const [filterDate, setFilterDate] = useState(getTodayIso());
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const [editSession, setEditSession] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletePin, setDeletePin] = useState('');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearAllPin, setClearAllPin] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'transfer_reports'), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }); return () => unsubscribe();
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { 
      setScanStatus('scanning');
      setScanMessage('กำลังส่งสลิปไปตรวจสอบ...');
      
      const compressedBase64 = await compressImage(file); 
      setForm(prev => ({ ...prev, slipImage: compressedBase64 })); 
      
      const verifyResult = await verifySlipWithAPI(compressedBase64, selectedBranch);
      
      if (verifyResult.success) {
        setForm(prev => ({ ...prev, transfer: verifyResult.amount.toString() }));
        setScanStatus('success');
        setScanMessage(`สแกนสำเร็จ! ยอดเงิน: ${formatNum(verifyResult.amount)} บาท`);
      } else {
        setScanStatus('error');
        setScanMessage(verifyResult.message);
      }
    } catch (err) {
      setScanStatus('error');
      setScanMessage('เกิดข้อผิดพลาดจากระบบ กรุณาระบุยอดเงินเอง');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staff) return alert("กรุณาระบุชื่อพนักงาน");
    if (!form.transfer) return alert("กรุณาระบุจำนวนเงินโอน");
    if (!form.slipImage) return alert("กรุณาแนบภาพหลักฐานการโอนเงิน");
    setLoading(true);
    try {
      await addDoc(collection(db, 'transfer_reports'), {
        branch: selectedBranch, staff: form.staff, shift: form.shift, submitDate,
        transfer: parseFloat(form.transfer) || 0, slipTime: form.slipTime || '-', 
        slipImage: form.slipImage, timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now()
      });
      setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '' });
      setScanStatus('idle');
      alert("✅ บันทึกยอดโอนสำเร็จ"); 
      setActiveTab('history');
    } catch (err) { 
      alert("❌ เกิดข้อผิดพลาดจากระบบ: " + err.message);
    } finally { setLoading(false); }
  };

  const openEdit = (record) => {
    if (!record) return;
    setEditSession(record);
    setForm({ staff: record.staff || '', shift: record.shift || SHIFTS[0], transfer: record.transfer ? record.transfer.toString() : '', slipTime: record.slipTime !== '-' ? record.slipTime : '', slipImage: record.slipImage || '' });
    setSubmitDate(record.submitDate || getLocalYMD(record.createdAt));
    setActiveTab('form');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.staff) return alert("กรุณาระบุชื่อพนักงาน");
    setLoading(true);
    try {
      await updateDoc(doc(db, 'transfer_reports', editSession.id), {
        staff: form.staff, shift: form.shift, submitDate, transfer: parseFloat(form.transfer) || 0, 
        slipTime: form.slipTime || '-', slipImage: form.slipImage, timestamp: new Date().toLocaleString('th-TH') + ' (แก้ไข)'
      });
      setEditSession(null); 
      setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '' });
      alert("✅ อัปเดตข้อมูลยอดโอนสำเร็จ"); 
      setActiveTab('history');
    } catch (err) { 
      alert("❌ เกิดข้อผิดพลาดจากระบบ: " + err.message);
    } finally { setLoading(false); }
  };

  const handleDelete = async () => { 
    if (deletePin !== '0202') return alert("รหัสผ่านไม่ถูกต้อง ไม่อนุญาตให้ดำเนินการลบข้อมูล");
    try { await deleteDoc(doc(db, 'transfer_reports', deletingId)); } catch (e) {} 
    setDeletingId(null); setDeletePin('');
  };

  const handleClearAll = async () => {
    if (clearAllPin !== '0202') return alert("รหัสผ่านไม่ถูกต้อง");
    const branchRecords = historyList.filter(r => r && r.branch === selectedBranch);
    if (branchRecords.length === 0) return alert("ไม่มีข้อมูลในระบบสำหรับการลบ");
    if (!window.confirm(`ยืนยันการลบประวัติยอดโอนทั้งหมดของสาขา ${selectedBranch} จำนวน ${branchRecords.length} รายการ หรือไม่?`)) return;
    setLoading(true);
    try {
        for (const record of branchRecords) await deleteDoc(doc(db, 'transfer_reports', record.id));
        alert("ดำเนินการลบประวัติข้อมูลทั้งหมดเรียบร้อยแล้ว");
    } catch (err) {} finally { setLoading(false); setIsClearingAll(false); setClearAllPin(''); }
  };

  const filteredAllBranches = historyList.filter(r => {
    if (!r) return false;
    const rDate = r.submitDate || getLocalYMD(r.createdAt);
    return rDate === filterDate;
  });

  let totalTransferredAll = 0;
  const shiftSummaryDetail = {};
  
  SHIFTS.forEach(s => {
      shiftSummaryDetail[s] = { total: 0, branches: {} };
      TRANSFER_BRANCHES.forEach(b => { shiftSummaryDetail[s].branches[b] = 0; });
  });

  filteredAllBranches.forEach(r => {
      const amt = parseFloat(r?.transfer) || 0;
      const b = parseInt(r?.branch);
      const s = r?.shift || 'เช้า';
      
      totalTransferredAll += amt;
      
      if (shiftSummaryDetail[s]) {
          shiftSummaryDetail[s].total += amt;
          if (shiftSummaryDetail[s].branches[b] !== undefined) {
              shiftSummaryDetail[s].branches[b] += amt;
          }
      }
  });

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-[#1e293b] p-8 rounded-[2rem] shadow-2xl w-full max-w-sm text-center border border-slate-700/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
          <button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={24}/></button>
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <ScanLine className="text-amber-400 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">ระบบเช็คยอดโอน</h2>
          <p className="text-xs text-slate-400 mb-8 font-medium">กรุณาเลือกสาขาที่ต้องการทำรายการ</p>
          <div className="space-y-3">
            {TRANSFER_BRANCHES.map(n => (
              <button key={n} onClick={() => setSelectedBranch(n.toString())} className="w-full py-4 bg-slate-800 border border-slate-700 text-white rounded-xl font-bold hover:bg-slate-700 hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Store size={18} className="text-amber-400"/> สาขา {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const filteredRecords = historyList.filter(r => r && r.branch === selectedBranch && (r.submitDate === filterDate || (!r.submitDate && getLocalYMD(r.createdAt) === filterDate)));
  
  const countMorning = filteredRecords.filter(r => r.shift === 'เช้า').length;
  const countAfternoon = filteredRecords.filter(r => r.shift === 'บ่าย').length;
  const countNight = filteredRecords.filter(r => r.shift === 'ดึก').length;

  return (
    <div className="min-h-screen bg-[#0f172a] pb-32 font-sans text-slate-200">
      <header className="bg-[#1e293b] p-4 sticky top-0 z-40 shadow-lg border-b border-slate-700 flex justify-between items-center">
        <button onClick={onBack} className="p-2 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 text-white"><ChevronLeft size={20}/></button>
        <div className="text-center">
           <div className="font-black text-white text-lg">สาขา {selectedBranch}</div>
           <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Transfer Check System</div>
        </div>
        <button onClick={() => {setSelectedBranch(null); setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '' }); setScanStatus('idle'); setIsOwnerUnlocked(false); setOwnerPin('');}} className="text-[10px] bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl font-bold text-white hover:bg-slate-700">เปลี่ยน</button>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="flex bg-[#1e293b] p-1.5 rounded-2xl border border-slate-700 mb-6 shadow-sm">
          <button onClick={() => setActiveTab('form')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'form' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📝 บันทึก</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📅 ประวัติ</button>
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📊 สรุปยอด</button>
        </div>

        {/* --- แท็บที่ 1: ฟอร์มบันทึกยอด & สแกนสลิป --- */}
        {activeTab === 'form' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="bg-[#1e293b] p-5 rounded-3xl shadow-xl border border-slate-700 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-black text-amber-400 flex items-center gap-2">
                   {editSession ? <Edit2 size={18}/> : <ScanLine size={18}/>} 
                   {editSession ? '1. แก้ไขสลิปโอนเงิน' : '1. สแกนสลิปโอนเงิน'}
                 </h3>
                 {form.slipImage && scanStatus !== 'scanning' && (
                   <button type="button" onClick={() => { setForm({...form, slipImage: '', transfer: ''}); setScanStatus('idle'); setScanMessage(''); }} className="text-[10px] bg-rose-500/20 text-rose-400 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-rose-500/30 transition-colors"><X size={12}/> ลบรูป</button>
                 )}
               </div>
               
               <div className={`w-full h-40 border-2 border-dashed rounded-2xl overflow-hidden relative transition-all duration-300 ${
                  scanStatus === 'scanning' ? 'border-amber-400 bg-amber-400/5' : 
                  scanStatus === 'success' ? 'border-emerald-400 bg-emerald-400/5' :
                  scanStatus === 'error' ? 'border-rose-400 bg-rose-400/5' :
                  'border-slate-600 bg-slate-800'
               }`}>
                  {scanStatus === 'scanning' ? (
                     <div className="flex flex-col items-center justify-center h-full text-amber-400">
                        <div className="relative">
                          <ScanLine className="w-12 h-12 animate-pulse mb-2" />
                          <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-400 animate-[scan_2s_ease-in-out_infinite]"></div>
                        </div>
                        <p className="text-[11px] font-bold mt-2 tracking-wide">{scanMessage}</p>
                     </div>
                  ) : form.slipImage ? ( 
                     <img src={form.slipImage} className="w-full h-full object-contain" /> 
                  ) : ( 
                     <div className="flex w-full h-full divide-x divide-slate-600/50">
                        <label className="flex-1 flex flex-col items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors group">
                           <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                              <Camera className="w-6 h-6 text-amber-400"/>
                           </div>
                           <span className="text-[11px] font-bold text-slate-300">ถ่ายรูป (กล้อง)</span>
                           {/* ใส่ capture="environment" เพื่อบังคับเปิดกล้องหลัง */}
                           <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                        </label>
                        <label className="flex-1 flex flex-col items-center justify-center hover:bg-slate-700 cursor-pointer transition-colors group">
                           <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                              <ImageIcon className="w-6 h-6 text-blue-400"/>
                           </div>
                           <span className="text-[11px] font-bold text-slate-300">อัลบั้มรูป</span>
                           <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                     </div> 
                  )}
               </div>

               {scanStatus === 'success' && (
                 <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400">
                   <CheckCircle size={16} className="shrink-0" />
                   <span className="text-[11px] font-bold leading-tight">{scanMessage}</span>
                 </div>
               )}
               {scanStatus === 'error' && (
                 <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2 text-rose-400">
                   <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                   <div className="text-[11px] font-bold leading-tight">
                     {scanMessage}
                     <div className="text-white/60 mt-1 font-medium">คุณสามารถพิมพ์ระบุยอดเงินด้านล่างด้วยตนเองได้เลยค่ะ</div>
                   </div>
                 </div>
               )}
            </div>

            <form onSubmit={editSession ? saveEdit : handleSubmit} className="bg-[#1e293b] p-5 rounded-3xl shadow-xl border border-slate-700 space-y-4 relative">
               <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2"><FileText size={18} className="text-blue-400"/> 2. รายละเอียดการโอน</h3>
               
               <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">ชื่อพนักงาน</label>
                   <input type="text" value={form.staff} onChange={e => setForm({...form, staff: e.target.value})} className="w-full p-3.5 bg-slate-800 rounded-xl border border-slate-700 text-white outline-none focus:border-amber-400 transition-colors text-sm" placeholder="ระบุชื่อ..." required />
                 </div>
                 <div>
                   <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">กะการทำงาน</label>
                   <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className="w-full p-3.5 bg-slate-800 rounded-xl border border-slate-700 text-white outline-none font-bold focus:border-amber-400 transition-colors text-sm appearance-none">
                     {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">วันที่ทำรายการ</label>
                 <input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="w-full p-3.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-bold outline-none focus:border-amber-400 transition-colors" />
               </div>

               <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-black text-blue-400 block mb-1 uppercase tracking-wider">ยอดเงินที่โอน (บาท)</label>
                    <input type="number" step="any" value={form.transfer} onChange={e => setForm({...form, transfer: e.target.value})} className={`w-full p-3.5 rounded-xl border outline-none text-xl font-black transition-colors ${scanStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-blue-500/10 border-blue-500/30 text-blue-400 focus:border-blue-400'}`} placeholder="0.00" required />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">เวลาบนสลิป</label>
                    <input type="time" value={form.slipTime} onChange={e => setForm({...form, slipTime: e.target.value})} className="w-full p-3.5 bg-slate-800 rounded-xl border border-slate-700 text-white outline-none font-bold focus:border-amber-400 transition-colors text-sm" required />
                  </div>
               </div>

               {editSession ? (
                  <div className="flex gap-3 pt-4">
                     <button type="button" onClick={() => {setEditSession(null); setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '' }); setActiveTab('history');}} className="flex-1 p-4 bg-slate-800 border border-slate-700 text-white rounded-xl font-black transition-all text-sm">
                        ยกเลิก
                     </button>
                     <button type="submit" disabled={loading || scanStatus === 'scanning'} className="flex-1 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-black shadow-lg transition-all text-sm">
                        {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                     </button>
                  </div>
               ) : (
                  <button type="submit" disabled={loading || scanStatus === 'scanning'} className="w-full mt-4 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} 
                    {loading ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการบันทึกยอดโอน'}
                  </button>
               )}
            </form>
          </div>
        )}

        {/* --- แท็บที่ 2: ประวัติข้อมูล --- */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="bg-[#1e293b] p-5 rounded-3xl shadow-lg border border-slate-700">
                 <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">ตรวจสอบประจำวันที่</label>
                 <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-3.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-bold outline-none focus:border-blue-400 transition-colors mb-4" />
                 
                 <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">จำนวนสลิปที่บันทึกวันนี้</div>
                    <div className="text-3xl font-black text-blue-400 mb-3">{filteredRecords.length} <span className="text-sm font-medium text-slate-400">รายการ</span></div>
                    
                    <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 bg-slate-900/50 py-2.5 rounded-xl">
                       <span className={countMorning > 0 ? "text-emerald-400" : ""}>เช้า: {countMorning}</span>
                       <span className={countAfternoon > 0 ? "text-amber-400" : ""}>บ่าย: {countAfternoon}</span>
                       <span className={countNight > 0 ? "text-indigo-400" : ""}>ดึก: {countNight}</span>
                    </div>
                 </div>
             </div>

             <div className="space-y-3">
               {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-500 font-medium bg-[#1e293b] rounded-3xl border border-dashed border-slate-700">ไม่พบรายการโอนในวันนี้</div>}
               {filteredRecords.map((record) => (
                  <div key={record.id} className="bg-[#1e293b] rounded-3xl p-4 shadow-sm border border-slate-700 flex gap-4 items-center">
                     <div className="w-16 h-20 bg-slate-800 rounded-xl overflow-hidden cursor-pointer shrink-0 border border-slate-600 relative group" onClick={() => setPreviewImage(record?.slipImage)}>
                        {record?.slipImage ? (
                          <>
                            <img src={record.slipImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-80" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Search size={16} className="text-white"/></div>
                          </>
                        ) : <div className="flex items-center justify-center h-full text-slate-600"><ImageIcon size={16} /></div>}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-bold text-white text-sm truncate">{record?.staff} <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 ml-1">กะ{record?.shift}</span></div>
                          <div className="text-[10px] text-slate-500 shrink-0 font-medium bg-slate-800 px-2 py-0.5 rounded-full">{record?.slipTime}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 mb-2">{record?.submitDate || getLocalYMD(record?.createdAt)}</div>
                        
                        <div className="flex justify-between items-end">
                           <div className="font-black text-blue-400 text-lg">{formatNum(record?.transfer)} <span className="text-[10px] font-bold">THB</span></div>
                           <div className="flex gap-1.5">
                              <button onClick={() => openEdit(record)} className="p-2 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 active:scale-95 transition-all"><Edit2 size={16} /></button>
                              <button onClick={() => setDeletingId(record.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 active:scale-95 transition-all"><Trash2 size={16} /></button>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>

             {historyList.filter(h => h && h.branch === selectedBranch).length > 0 && (
                <button onClick={() => setIsClearingAll(true)} className="w-full mt-6 p-4 bg-rose-500/10 text-rose-400 rounded-2xl font-bold border border-rose-500/20 hover:bg-rose-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><Trash2 size={18} /> ลบประวัติข้อมูลทั้งหมด (สาขา {selectedBranch})</button>
             )}
          </div>
        )}

        {/* --- แท็บที่ 3: สรุปยอดรวม 2 สาขา (ใส่รหัส) --- */}
        {activeTab === 'dashboard' && !isOwnerUnlocked && (
          <div className="bg-[#1e293b] p-8 rounded-[2rem] shadow-sm border border-slate-700 text-center animate-in zoom-in-95 mt-4">
             <div className="w-16 h-16 bg-slate-800 border border-slate-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={30} className="text-amber-400" /></div>
             <h3 className="font-black text-xl text-white mb-2">รายงานสรุปยอดโอนรวม</h3>
             <p className="text-[11px] text-slate-400 mb-8 font-medium bg-slate-800 p-2 rounded-lg">สงวนสิทธิ์เฉพาะผู้บริหาร<br/>กรุณาระบุรหัสผ่าน (PIN)</p>
             <input type="password" inputMode="numeric" value={ownerPin} onChange={e => setOwnerPin(e.target.value)} className="w-full p-4 bg-slate-900 border border-slate-600 text-white rounded-xl text-center text-3xl font-black tracking-[0.5em] outline-none mb-6 focus:border-amber-400 transition-all font-mono" placeholder="****" autoFocus maxLength={4} />
             <button onClick={() => { if(ownerPin === '6969') { setIsOwnerUnlocked(true); setOwnerPin(''); } else { alert('รหัสผ่านไม่ถูกต้อง ❌'); setOwnerPin(''); } }} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-black shadow-lg text-sm transition-all flex justify-center items-center active:scale-95"><Unlock size={18} className="mr-2" /> ยืนยันรหัสผ่าน</button>
          </div>
        )}

        {activeTab === 'dashboard' && isOwnerUnlocked && (
          <div className="space-y-5 animate-in fade-in duration-500 slide-in-from-right-4">
            <div className="bg-[#1e293b] p-4 rounded-2xl shadow-sm border border-slate-700 flex gap-3 items-center">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">📅 ประจำวันที่:</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-2 bg-slate-800 border border-slate-600 text-white rounded-xl text-sm font-bold outline-none focus:border-amber-400 transition-all" />
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-[#0f172a] border border-indigo-500/30 text-white p-6 rounded-[2rem] shadow-2xl text-center relative overflow-hidden">
              <h2 className="text-[10px] font-black tracking-[0.2em] text-indigo-300 uppercase mb-2">ยอดโอนรวม 2 สาขาสุทธิ</h2>
              <div className="text-4xl font-black tracking-tighter text-amber-400">{formatNum(totalTransferredAll)} <span className="text-lg font-normal text-indigo-300">฿</span></div>
            </div>
            
            <div className="space-y-4">
              <div className="text-[11px] font-black text-slate-400 px-2 uppercase tracking-[0.2em]">รายละเอียดแยกตามกะ (2 สาขา)</div>
              
              {SHIFTS.map(shift => {
                const sData = shiftSummaryDetail[shift];
                if (sData.total === 0) return null;
                
                return (
                  <div key={shift} className="bg-[#1e293b] rounded-3xl p-5 shadow-xl border border-slate-700 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700/50 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20"><Clock size={18} className="text-blue-400" /></div>
                        <div><h4 className="font-black text-white text-lg">กะ{shift}</h4></div>
                      </div>
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">รวม 2 สาขา (กะ{shift})</div>
                        <div className="text-xl font-black text-emerald-400 tracking-tight">{formatNum(sData.total)} <span className="text-xs">฿</span></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {TRANSFER_BRANCHES.map(b => (
                        <div key={b} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-center flex flex-col justify-center">
                          <div className="text-[10px] font-bold text-slate-400 mb-1 flex items-center justify-center gap-1"><Store size={12}/> สาขา {b}</div>
                          <div className={`text-sm font-black ${sData.branches[b] > 0 ? 'text-white' : 'text-slate-600'}`}>{formatNum(sData.branches[b])} ฿</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {totalTransferredAll === 0 && (
                <div className="text-center py-10 bg-[#1e293b] rounded-[2rem] border border-dashed border-slate-700">
                  <p className="text-xs text-slate-500 font-bold">ไม่พบยอดโอนในวันที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Popup ดูรูปเต็ม */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in zoom-in-95" style={{ zIndex: 100 }}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-slate-800 p-2 rounded-full border border-slate-700"><X size={24}/></button>
          <img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-700" />
        </div>
      )}
      
      {/* Modal ยืนยันการลบรายการเดี่ยว */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 110 }}>
          <div className="bg-[#1e293b] border border-slate-700 p-8 rounded-3xl w-full max-w-xs text-center">
            <div className="text-red-400 mb-2 flex justify-center"><Trash2 size={32}/></div>
            <h4 className="font-bold text-white mb-2">ยืนยันการลบรายการนี้?</h4>
            <p className="text-[10px] text-red-400 mb-4">* กรุณาระบุรหัสผ่านผู้ดูแลระบบ</p>
            <input type="password" value={deletePin} onChange={e => setDeletePin(e.target.value)} className="w-full p-3 bg-slate-900 border border-slate-700 text-white rounded-xl text-center font-bold outline-none focus:border-red-400 mb-4 tracking-[0.5em] font-mono" placeholder="****" />
            <div className="flex gap-2">
              <button onClick={() => { setDeletingId(null); setDeletePin(''); }} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold border border-slate-700">ยกเลิก</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ลบประวัติทั้งหมดของสาขา */}
      {isClearingAll && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" style={{ zIndex: 110 }}>
          <div className="bg-[#1e293b] border border-slate-700 p-6 rounded-3xl w-full max-w-sm text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20"><Trash2 size={24}/></div>
            <h3 className="font-black text-xl text-white mb-2">ลบประวัติข้อมูลทั้งหมด?</h3>
            <p className="text-[10px] text-red-400 mb-4 font-bold">* กรุณาระบุรหัสผ่านผู้ดูแลระบบเพื่อยืนยันการลบข้อมูล</p>
            <div className="bg-slate-900 p-3 rounded-xl mb-4 border border-slate-700">
               <input type="password" placeholder="****" value={clearAllPin} onChange={e => setClearAllPin(e.target.value)} className="w-full p-3 bg-transparent text-white text-center text-lg font-black outline-none focus:border-red-400 tracking-[0.5em] font-mono" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setIsClearingAll(false); setClearAllPin(''); }} className="flex-1 py-3 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl font-bold">ยกเลิก</button>
              <button onClick={handleClearAll} disabled={loading} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black">{loading ? 'กำลังดำเนินการ...' : 'ยืนยันการลบข้อมูล'}</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
      `}} />
    </div>
  );
}

// ============================================================================
// 📦 SYSTEM 1: ระบบปิดกะ (ShiftApp) 
// ============================================================================
function ShiftApp({ onBack }) {
  const [currentView, setCurrentView] = useState('menu'); 
  const [activeBranch, setActiveBranch] = useState('');
  const [branchTab, setBranchTab] = useState('form'); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const ADMIN_PIN = '5930'; 

  const [staffViewShiftId, setStaffViewShiftId] = useState(null);
  const [summaryDate, setSummaryDate] = useState('all');
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null, requirePin: false });
  const [confirmPin, setConfirmPin] = useState('');
  const [isOnline, setIsOnline] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [summaryPopupInfo, setSummaryPopupInfo] = useState(null); 
  const [previewImage, setPreviewImage] = useState(null); 

  const [formData, setFormData] = useState({
    recordDate: getTodayIso(), shift: 'เช้า', cashierName: '', floatIn: '', actualCash: '', transferAmount: '', transferSlipImage: null, expenses: [], nextFloat: '', overAmount: '', shortAmount: '', notes: '',
  });
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { setIsOnline(!!u); });
    if (!db) return;
    const recordsRef = collection(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records');
    const unsubRec = onSnapshot(recordsRef, (snapshot) => {
      const records = [];
      snapshot.forEach(docSnap => records.push({ id: docSnap.id, ...docSnap.data() }));
      records.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryData(records);
    });
    return () => { unsubscribeAuth(); unsubRec(); };
  }, []);

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleLogin = (type) => {
    if (pin === ADMIN_PIN) {
      if (type === 'summary') setIsUnlocked(true);
      if (type === 'history') { setIsHistoryUnlocked(true); setStaffViewShiftId(null); }
      setPin('');
    } else { showToast('รหัสผ่านไม่ถูกต้อง', 'error'); setPin(''); }
  };

  const handleImageUpload = async (e, field, isEditing = false) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (field === 'transferSlipImage') setIsVerifying(true);
      
      const compressedBase64 = await compressImage(file);
      
      if (isEditing) {
         setEditingRecord(prev => ({ ...prev, [field]: compressedBase64 }));
      } else {
         setFormData(prev => ({ ...prev, [field]: compressedBase64 }));
      }

      if (field === 'transferSlipImage') {
         const verifyResult = await verifySlipWithAPI(compressedBase64, activeBranch);
         
         if (verifyResult.success) {
            if (isEditing) setEditingRecord(prev => ({ ...prev, transferAmount: verifyResult.amount.toString() }));
            else setFormData(prev => ({ ...prev, transferAmount: verifyResult.amount.toString() }));
            showToast(`ตรวจสอบสลิปสำเร็จ! พบยอดเงิน: ${verifyResult.amount} บาท`, 'success');
         } else {
            showToast(`⚠️ ${verifyResult.message} (กรุณาระบุยอดเงินเอง)`, 'error');
         }
      }
    } catch (err) { 
       showToast('เกิดข้อผิดพลาดในการตรวจสอบสลิป กรุณาระบุยอดเงินเอง', 'error'); 
    } finally {
       if (field === 'transferSlipImage') setIsVerifying(false);
    }
  };

  const addExpense = () => setFormData(prev => ({ ...prev, expenses: [...(prev.expenses || []), { id: Date.now(), type: 'ค่าน้ำแข็ง', detail: '', amount: '', image: null }] }));
  const updateExpense = (index, field, value) => setFormData(prev => { const newExpenses = [...prev.expenses]; newExpenses[index][field] = value; return { ...prev, expenses: newExpenses }; });
  const removeExpense = (index) => setFormData(prev => { const newExpenses = [...prev.expenses]; newExpenses.splice(index, 1); return { ...prev, expenses: newExpenses }; });
  const uploadExpenseImage = async (index, e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const base64 = await compressImage(file); updateExpense(index, 'image', base64); } catch (err) { showToast('เกิดข้อผิดพลาด', 'error'); }
  };

  const editAddExpense = () => setEditingRecord(prev => ({ ...prev, expenses: [...(prev.expenses || []), { id: Date.now(), type: 'ค่าน้ำแข็ง', detail: '', amount: '', image: null }] }));
  const editUpdateExpense = (index, field, value) => setEditingRecord(prev => { const newExpenses = [...prev.expenses]; newExpenses[index][field] = value; return { ...prev, expenses: newExpenses }; });
  const editRemoveExpense = (index) => setEditingRecord(prev => { const newExpenses = [...prev.expenses]; newExpenses.splice(index, 1); return { ...prev, expenses: newExpenses }; });
  const editUploadExpenseImage = async (index, e) => {
    const file = e.target.files[0]; if (!file) return;
    try { const base64 = await compressImage(file); editUpdateExpense(index, 'image', base64); } catch (err) {}
  };

  const handleSaveShift = async () => {
    if (!formData.cashierName || !formData.actualCash) return showToast('กรุณาระบุชื่อพนักงานและยอดเงินสด', 'error');
    for (let exp of formData.expenses) {
      if (exp.type === 'อื่นๆ' && !exp.detail) return showToast('กรุณาระบุรายละเอียดในหมวดหมู่ "อื่นๆ"', 'error');
      if (!exp.amount) return showToast('กรุณาระบุยอดเงินในรายการค่าใช้จ่ายให้ครบถ้วน', 'error');
    }
    const docId = `TRX-${Date.now()}`;
    const savedDate = formatThaiDate(formData.recordDate); 
    const totalExpenseAmt = formData.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const newRecord = {
      ...formData, branch: activeBranch, timestamp: Date.now(), date: savedDate, time: new Date().toTimeString().slice(0, 8),
      floatIn: Number(formData.floatIn) || 0, actualCash: Number(formData.actualCash) || 0, transferAmount: Number(formData.transferAmount) || 0,
      expenseAmount: totalExpenseAmt, nextFloat: Number(formData.nextFloat) || 0, overAmount: Number(formData.overAmount) || 0, shortAmount: Number(formData.shortAmount) || 0,
    };
    try {
      await setDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', docId), newRecord);
      showToast(`บันทึกข้อมูลเรียบร้อย`, 'success');
      setFormData({ recordDate: getTodayIso(), shift: 'เช้า', cashierName: '', floatIn: '', actualCash: '', transferAmount: '', transferSlipImage: null, expenses: [], nextFloat: '', overAmount: '', shortAmount: '', notes: '' });
      setStaffViewShiftId(docId); setIsHistoryUnlocked(true); setBranchTab('history');
    } catch (err) { 
      showToast('การบันทึกข้อมูลล้มเหลว: ' + err.message, 'error'); 
    }
  };

  const openEditModal = (record) => {
    let expensesList = record.expenses || [];
    if (expensesList.length === 0 && Number(record.expenseAmount) > 0) expensesList = [{ id: Date.now(), type: record.expenseType || 'ค่าน้ำแข็ง', detail: '', amount: record.expenseAmount, image: record.expenseSlipImage || null }];
    setEditingRecord({ ...record, expenses: expensesList });
  };

  const handleUpdateRecord = async () => {
    for (let exp of editingRecord.expenses) { if (exp.type === 'อื่นๆ' && !exp.detail) return showToast('กรุณาระบุรายละเอียดในหมวดหมู่ "อื่นๆ"', 'error'); }
    try {
      const recordRef = doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', editingRecord.id);
      const updatedExpenseTotal = editingRecord.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      await updateDoc(recordRef, {
        ...editingRecord, floatIn: Number(editingRecord.floatIn) || 0, actualCash: Number(editingRecord.actualCash) || 0, transferAmount: Number(editingRecord.transferAmount) || 0,
        expenseAmount: updatedExpenseTotal, expenses: editingRecord.expenses, nextFloat: Number(editingRecord.nextFloat) || 0, overAmount: Number(editingRecord.overAmount) || 0, shortAmount: Number(editingRecord.shortAmount) || 0,
      });
      showToast('แก้ไขข้อมูลสำเร็จ', 'success'); setEditingRecord(null);
    } catch (err) { showToast('การแก้ไขข้อมูลล้มเหลว', 'error'); }
  };

  const handleDeleteRecord = (id) => {
    setConfirmDialog({ show: true, requirePin: true, message: 'ต้องการลบประวัติข้อมูลนี้อย่างถาวรหรือไม่?', onConfirm: async (enteredPin) => {
        if (enteredPin !== ADMIN_PIN) return showToast("❌ รหัสผ่านไม่ถูกต้อง", "error");
        try { await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', id)); showToast('ดำเนินการลบรายการสำเร็จ', 'success'); } catch (err) { showToast('การลบข้อมูลล้มเหลว', 'error'); }
      }
    });
  };

  const handleDeleteSpecificHistory = () => {
    if (summaryDate === 'all') return showToast("⚠️ กรุณาเลือกวันที่ที่ต้องการลบข้อมูล", "error");
    setConfirmDialog({ show: true, requirePin: true, message: `ต้องการลบประวัติข้อมูลของ "วันที่ ${summaryDate}" ใช่หรือไม่?\n(ข้อมูลการปิดกะของทุกสาขาในวันที่ระบุจะถูกลบทั้งหมด)`, onConfirm: async (enteredPin) => {
        if (enteredPin !== ADMIN_PIN) return showToast("❌ รหัสผ่านไม่ถูกต้อง", "error");
        try {
          const recordsToDelete = historyData.filter(d => d.date === summaryDate);
          for (const record of recordsToDelete) await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', record.id));
          setSummaryDate('all'); showToast(`ดำเนินการลบข้อมูลวันที่ ${summaryDate} สำเร็จ`, 'success');
        } catch (err) { showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error'); }
      }
    });
  };

  const getSummaryData = () => {
    const branches = ['สาขา 2', 'สาขา 5']; 
    const shifts = ['เช้า', 'บ่าย', 'ดึก'];
    let grandTotalCash = 0; let grandTotalTransfer = 0;
    const filteredHistory = summaryDate === 'all' ? historyData : historyData.filter(d => d.date === summaryDate);
    const groupedData = branches.map(branchName => {
      const branchRecords = filteredHistory.filter(d => d.branch === branchName);
      let branchTotalCash = 0; let branchTotalTransfer = 0;
      const shiftData = shifts.map(shiftName => {
        const shiftRecords = branchRecords.filter(d => d.shift === shiftName);
        if (shiftRecords.length === 0) return { shift: shiftName, cash: null, transfer: null, records: [] };
        const cash = shiftRecords.reduce((sum, r) => sum + ((Number(r.actualCash)||0) - (Number(r.nextFloat)||0)), 0);
        const transfer = shiftRecords.reduce((sum, r) => sum + (Number(r.transferAmount)||0), 0);
        branchTotalCash += cash; branchTotalTransfer += transfer; return { shift: shiftName, cash, transfer, records: shiftRecords };
      });
      grandTotalCash += branchTotalCash; grandTotalTransfer += branchTotalTransfer;
      return { branch: branchName, hasData: branchRecords.length > 0, shifts: shiftData, totalCash: branchTotalCash, totalTransfer: branchTotalTransfer };
    });
    return { groupedData, grandTotalCash, grandTotalTransfer };
  };

  const summary = getSummaryData();
  const availableDates = [...new Set(historyData.map(d => d.date))];

  const handleEnterBranch = (branchName) => { setActiveBranch(branchName); setBranchTab('form'); setCurrentView('branch'); setIsHistoryUnlocked(false); setStaffViewShiftId(null); setPin(''); };

  const MenuButton = ({ title, subtitle, icon: Icon, bgClass, onClick }) => (
    <button onClick={onClick} className={`w-full rounded-[16px] p-4 flex items-center mb-4 transition-transform active:scale-95 shadow-lg ${bgClass}`}>
      <div className="bg-white text-gray-800 p-3.5 rounded-xl mr-4 shrink-0 shadow-sm"><Icon size={24} /></div>
      <div className="text-left"><div className="text-lg font-bold text-white leading-tight">{title}</div><div className="text-xs text-white/90 mt-1 font-medium">{subtitle}</div></div>
    </button>
  );

  const inputStyle = "w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#60a5fa] transition text-sm";
  const labelStyle = "block text-[#94a3b8] text-xs font-medium mb-1.5";

  let branchDisplayHistory = historyData.filter(d => d.branch === activeBranch);
  if (staffViewShiftId) branchDisplayHistory = branchDisplayHistory.filter(d => d.id === staffViewShiftId);

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans flex justify-center">
      <div className="w-full max-w-md bg-[#0f172a] min-h-screen relative shadow-2xl overflow-x-hidden pb-10">
        
        {/* --- Modal แก้ไข --- */}
        {editingRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-slate-700 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-white font-black text-lg flex items-center gap-2"><Edit2 className="text-blue-400" /> แก้ไขประวัติข้อมูล</h3>
                <button onClick={() => setEditingRecord(null)} className="p-2 text-slate-400 hover:text-white"><X size={20}/></button>
              </div>
              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
                <div><label className={labelStyle}>ชื่อพนักงาน</label><input type="text" className={inputStyle} value={editingRecord.cashierName} onChange={e => setEditingRecord({...editingRecord, cashierName: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>เงินทอนเริ่มต้นกะ</label><input type="number" className={inputStyle} value={editingRecord.floatIn} onChange={e => setEditingRecord({...editingRecord, floatIn: e.target.value})} /></div>
                  <div><label className={labelStyle}>ยอดเงินสดสุทธิ</label><input type="number" className={inputStyle} value={editingRecord.actualCash} onChange={e => setEditingRecord({...editingRecord, actualCash: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>หักเงินทอนกะใหม่</label><input type="number" className={inputStyle} value={editingRecord.nextFloat} onChange={e => setEditingRecord({...editingRecord, nextFloat: e.target.value})} /></div>
                  <div>
                    <label className={labelStyle}>ยอดรับโอน/QR</label><input type="number" className={inputStyle} value={editingRecord.transferAmount} onChange={e => setEditingRecord({...editingRecord, transferAmount: e.target.value})} />
                    
                    {/* ส่วนอัปโหลดรูป (แก้ไขให้เลือกกล้องได้) */}
                    <div className={`w-full h-12 border rounded-lg overflow-hidden relative mt-1 transition-all ${isVerifying ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-800'}`}>
                      {isVerifying ? (
                         <div className="flex justify-center items-center h-full text-amber-400"><Loader2 className="animate-spin" size={16}/></div>
                      ) : editingRecord.transferSlipImage ? (
                         <>
                           <img src={editingRecord.transferSlipImage} className="w-full h-full object-cover opacity-60" /> 
                           <button type="button" onClick={() => setEditingRecord({...editingRecord, transferSlipImage: null})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                         </>
                      ) : (
                         <div className="flex w-full h-full divide-x divide-slate-600/50">
                            <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-700 cursor-pointer text-slate-400 hover:text-amber-400">
                               <Camera size={14} />
                               <span className="text-[9px] font-bold">ถ่ายรูป</span>
                               <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => handleImageUpload(e, 'transferSlipImage', true)} />
                            </label>
                            <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-700 cursor-pointer text-slate-400 hover:text-blue-400">
                               <ImageIcon size={14} />
                               <span className="text-[9px] font-bold">อัลบั้ม</span>
                               <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'transferSlipImage', true)} />
                            </label>
                         </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <label className={labelStyle + " !mb-0"}>แก้ไขรายการค่าใช้จ่าย</label>
                    <button onClick={editAddExpense} className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-1 rounded">เพิ่มรายการ</button>
                  </div>
                  <div className="space-y-3">
                    {editingRecord.expenses?.map((exp, idx) => (
                      <div key={exp.id || idx} className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-700 relative">
                        <button onClick={() => editRemoveExpense(idx)} className="absolute -top-2 -right-2 text-white bg-red-500 rounded-full p-0.5 shadow-md"><X size={12}/></button>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <select className={inputStyle + " !p-2 !text-xs"} value={exp.type} onChange={e => editUpdateExpense(idx, 'type', e.target.value)}>
                            {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <input type="number" placeholder="ยอดเงิน" className={inputStyle + " !p-2 !text-xs text-rose-400 font-bold"} value={exp.amount} onChange={e => editUpdateExpense(idx, 'amount', e.target.value)} />
                        </div>
                        {exp.type === 'อื่นๆ' && (
                          <div className="mb-2">
                            <input type="text" placeholder="ระบุรายละเอียด..." className={inputStyle + " !p-2 !text-xs"} value={exp.detail || ''} onChange={e => editUpdateExpense(idx, 'detail', e.target.value)} />
                          </div>
                        )}
                        
                        {/* ส่วนอัปโหลดรูป (แก้ไขให้เลือกกล้องได้) */}
                        <div className="flex flex-col items-center justify-center w-full h-10 border border-dashed border-slate-700 rounded-lg bg-slate-800 overflow-hidden relative mt-1">
                          {exp.image ? (
                            <>
                              <img src={exp.image} className="w-full h-full object-cover opacity-60" />
                              <button type="button" onClick={() => editUpdateExpense(idx, 'image', null)} className="absolute top-1 right-1 bg-rose-500 text-white p-0.5 rounded-full"><X size={10}/></button>
                            </>
                          ) : (
                            <div className="flex w-full h-full divide-x divide-slate-700">
                                <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-700 cursor-pointer text-slate-400 hover:text-amber-400">
                                   <Camera size={12}/>
                                   <span className="text-[9px] font-bold">ถ่าย</span>
                                   <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => editUploadExpenseImage(idx, e)} />
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-700 cursor-pointer text-slate-400 hover:text-blue-400">
                                   <ImageIcon size={12}/>
                                   <span className="text-[9px] font-bold">อัลบั้ม</span>
                                   <input type="file" className="hidden" accept="image/*" onChange={e => editUploadExpenseImage(idx, e)} />
                                </label>
                             </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>จำนวนเงินเกิน</label><input type="number" className={inputStyle} value={editingRecord.overAmount} onChange={e => setEditingRecord({...editingRecord, overAmount: e.target.value})} /></div>
                  <div><label className={labelStyle}>จำนวนเงินขาด</label><input type="number" className={inputStyle} value={editingRecord.shortAmount} onChange={e => setEditingRecord({...editingRecord, shortAmount: e.target.value})} /></div>
                </div>
                <div><label className={labelStyle}>หมายเหตุเพิ่มเติม</label><textarea className={inputStyle} value={editingRecord.notes} onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})} /></div>
              </div>
              <button onClick={handleUpdateRecord} className="w-full shrink-0 mt-4 py-4 bg-emerald-600 text-white font-bold rounded-xl active:scale-95 transition shadow-lg">บันทึกการแก้ไขข้อมูล</button>
            </div>
          </div>
        )}

        {/* --- Modal ป๊อปอัพหน้าสรุป --- */}
        {summaryPopupInfo && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSummaryPopupInfo(null)}>
            <div className="bg-[#1e293b] border border-slate-700 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-white font-black text-lg flex items-center gap-2"><BarChart2 className="text-blue-400" /> {summaryPopupInfo.title}</h3>
                <button onClick={() => setSummaryPopupInfo(null)} className="p-2 text-slate-400 bg-slate-800 rounded-full hover:text-white"><X size={18}/></button>
              </div>
              <div className="overflow-y-auto pr-1 custom-scrollbar space-y-4 flex-1">
                {summaryPopupInfo.records.map((r, i) => {
                   const expList = r.expenses && r.expenses.length > 0 ? r.expenses : (Number(r.expenseAmount) > 0 ? [{ id: 1, type: r.expenseType, amount: r.expenseAmount, image: r.expenseSlipImage, detail: '' }] : []);
                   return (
                    <div key={i} className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                      <div className="flex justify-between items-center border-b border-slate-700 pb-2 mb-3">
                        <div className="font-bold text-blue-400">พนักงาน: <span className="text-white">{r.cashierName}</span></div>
                        <div className="text-xs text-slate-500">{r.time}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                          <span className="text-slate-400 block mb-1">เงินทอนเริ่มต้นกะ</span><span className="text-white font-bold text-sm">{formatNum(r.floatIn)} ฿</span>
                        </div>
                        <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                          <span className="text-slate-400 block mb-1">หักเงินทอนกะใหม่</span><span className="text-blue-400 font-bold text-sm">{formatNum(r.nextFloat)} ฿</span>
                        </div>
                      </div>
                      <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 mb-3 flex justify-between items-center">
                        <span className="text-emerald-300 font-bold">ยอดนำส่งเงินสดจริง</span><span className="text-emerald-400 font-black text-lg">{formatNum((Number(r.actualCash)||0) - (Number(r.nextFloat)||0))} ฿</span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-300">
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500">ยอดเงินโอน/QR:</span> 
                           <div className="flex items-center gap-2">
                             {r.transferSlipImage && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 rounded cursor-pointer border border-blue-500/20 hover:bg-blue-500/20" onClick={() => setPreviewImage(r.transferSlipImage)}>📸 ดูหลักฐาน</span>}
                             <span>{formatNum(r.transferAmount)} ฿</span>
                           </div>
                        </div>
                        {expList.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-700">
                             <div className="text-rose-400 font-bold mb-1">รายการค่าใช้จ่าย:</div>
                             {expList.map((exp, eIdx) => (
                               <div key={eIdx} className="flex justify-between items-center bg-slate-900/50 p-1.5 rounded mb-1">
                                  <div className="flex items-center gap-1.5">
                                    {exp.image && <div className="w-6 h-6 rounded bg-slate-800 overflow-hidden cursor-pointer" onClick={() => setPreviewImage(exp.image)}><img src={exp.image} className="w-full h-full object-cover"/></div>}
                                    <span className="text-rose-300 text-[10px]">{exp.type} {exp.detail && `(${exp.detail})`}</span>
                                  </div>
                                  <span className="text-rose-400 font-bold">-{formatNum(exp.amount)} ฿</span>
                               </div>
                             ))}
                          </div>
                        )}
                        {(Number(r.overAmount) > 0) && <div className="flex justify-between text-amber-400 pt-1"><span>จำนวนเงินเกิน:</span> <span>+{formatNum(r.overAmount)} ฿</span></div>}
                        {(Number(r.shortAmount) > 0) && <div className="flex justify-between text-rose-400 pt-1"><span>จำนวนเงินขาด:</span> <span>-{formatNum(r.shortAmount)} ฿</span></div>}
                      </div>
                      {r.notes && <div className="mt-3 p-2 bg-slate-900/50 rounded-lg text-[10px] text-slate-400 border border-slate-700">หมายเหตุ: {r.notes}</div>}
                    </div>
                   );
                })}
              </div>
              <button onClick={() => setSummaryPopupInfo(null)} className="w-full shrink-0 mt-4 py-3.5 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition">ปิดหน้าต่าง</button>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[400] bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in zoom-in-95">
             <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 text-white/50 hover:text-white bg-slate-800 p-2 rounded-full border border-slate-700"><X size={24} /></button>
             <img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-700" />
          </div>
        )}

        {confirmDialog.show && (
          <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">ยืนยันการดำเนินการ</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed whitespace-pre-line">{confirmDialog.message}</p>
              {confirmDialog.requirePin && (
                <input 
                  type="password" inputMode="numeric" placeholder="รหัสผ่านผู้ดูแลระบบ (PIN)" 
                  value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-center text-xl tracking-[0.3em] p-3 rounded-xl focus:outline-none focus:border-blue-500 mb-6 font-mono"
                  maxLength={4} autoFocus
                />
              )}
              <div className="flex space-x-3">
                <button onClick={() => { setConfirmDialog({ show: false, message: '', onConfirm: null, requirePin: false }); setConfirmPin(''); }} className="flex-1 py-3 rounded-xl bg-slate-800 text-white border border-slate-700">ยกเลิก</button>
                <button onClick={() => { confirmDialog.onConfirm(confirmPin); setConfirmDialog({ show: false, message: '', onConfirm: null, requirePin: false }); setConfirmPin(''); }} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">ยืนยัน</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`absolute top-4 left-4 right-4 p-4 rounded-xl shadow-2xl flex items-start z-50 border backdrop-blur-md transition-all ${toast.type === 'success' ? 'bg-emerald-500/95 border-emerald-400 text-white' : 'bg-red-500/95 border-red-400 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={24} className="mr-3 shrink-0" /> : <ShieldAlert size={24} className="mr-3 shrink-0" />}
            <span className="font-semibold text-sm leading-snug">{toast.message}</span>
          </div>
        )}

        {/* ================= เมนูหลัก ระบบปิดกะ ================= */}
        {currentView === 'menu' && (
          <div className="p-5 pb-10">
            <div className="flex flex-col items-center justify-center mt-6 mb-8 relative">
              <button onClick={onBack} className="absolute left-0 top-0 p-2 bg-slate-800 rounded-full text-white border border-slate-700 hover:bg-slate-700 transition-colors"><ChevronLeft size={20} /></button>
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center shadow-lg border border-slate-700 mb-4"><Crown size={40} className="text-[#fcd34d]" /></div>
              <h1 className="text-2xl font-black text-[#fcd34d] tracking-wider">ระบบบันทึกปิดกะ</h1>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1 uppercase">Shift Management System</p>
            </div>
            <div className="space-y-2">
              <MenuButton title="ปิดกะสาขา 2" subtitle="บันทึกข้อมูลปิดยอด / ตรวจสอบประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#884fff] to-[#713be5]" onClick={() => handleEnterBranch('สาขา 2')} />
              <MenuButton title="ปิดกะสาขา 5" subtitle="บันทึกข้อมูลปิดยอด / ตรวจสอบประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7]" onClick={() => handleEnterBranch('สาขา 5')} />
              <div className="pt-4 mt-4 border-t border-slate-700/50"></div>
              <button onClick={() => setCurrentView('summary')} className="w-full rounded-[16px] bg-slate-800 border border-slate-700 p-4 flex items-center justify-center active:scale-95 shadow-lg hover:bg-slate-700 transition-colors">
                 <Lock size={20} className="text-[#fcd34d] mr-3" />
                 <span className="text-white font-bold">รายงานสรุปยอดรวมทุกสาขา</span>
              </button>
            </div>
            <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
             {isOnline ? <span className="text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE</span> : <span className="text-amber-500">CONNECTING...</span>}
            </div>
          </div>
        )}

        {/* ================= จัดการสาขา (ลงข้อมูล/ประวัติ) ================= */}
        {currentView === 'branch' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e293b] p-4 flex items-center border-b border-slate-700 sticky top-0 z-10 shadow-md">
              <button onClick={() => { setCurrentView('menu'); setIsHistoryUnlocked(false); setStaffViewShiftId(null); setPin(''); }} className="p-2 bg-slate-800 rounded-xl text-white mr-4 border border-slate-700 hover:bg-slate-700"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-white flex items-center"><MapPin size={16} className="text-[#60a5fa] mr-2"/> {activeBranch}</h2>
            </div>
            <div className="flex p-4 space-x-3">
              <button onClick={() => setBranchTab('form')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'form' ? 'bg-[#2563eb] text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}><FileText size={16} className="mr-2"/> บันทึกข้อมูล</button>
              <button onClick={() => setBranchTab('history')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'history' ? 'bg-[#2563eb] text-white shadow-lg' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                {(isHistoryUnlocked || staffViewShiftId) ? <Search size={16} className="mr-2"/> : <Lock size={16} className="mr-2"/>} ประวัติข้อมูล
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {branchTab === 'form' ? (
                <div className="bg-slate-800 p-5 rounded-[20px] border border-slate-700 shadow-xl">
                  <div className="mb-5 bg-slate-900/50 p-3 rounded-xl border border-blue-500/30">
                    <label className={labelStyle}>📅 วันที่ประจำกะ</label>
                    <input type="date" value={formData.recordDate} onChange={(e) => setFormData({...formData, recordDate: e.target.value})} className={`${inputStyle} bg-transparent border-none p-0 text-blue-300 font-bold tracking-widest`} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2"><label className={labelStyle}>ชื่อพนักงาน</label><input type="text" value={formData.cashierName} onChange={(e) => setFormData({...formData, cashierName: e.target.value})} className={inputStyle} placeholder="ระบุชื่อพนักงาน..." /></div>
                    <div><label className={labelStyle}>กะการทำงาน</label><select value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})} className={inputStyle}><option>เช้า</option><option>บ่าย</option><option>ดึก</option></select></div>
                    <div><label className={labelStyle}>เงินทอนเริ่มต้นกะ</label><input type="number" value={formData.floatIn} onChange={(e) => setFormData({...formData, floatIn: e.target.value})} className={inputStyle} placeholder="0" /></div>
                  </div>
                  
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-4">
                    <h3 className="text-white text-sm font-bold mb-3 flex items-center"><Wallet size={16} className="mr-2 text-emerald-400"/> ระบบการเงิน</h3>
                    <div className="space-y-3">
                      <div><label className={labelStyle}>ยอดเงินสดสุทธิ</label><input type="number" value={formData.actualCash} onChange={(e) => setFormData({...formData, actualCash: e.target.value})} className={`${inputStyle} border-emerald-500/50 bg-emerald-900/10 text-emerald-300 font-bold text-lg`} placeholder="0" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelStyle}>หักเงินทอนกะใหม่</label><input type="number" value={formData.nextFloat} onChange={(e) => setFormData({...formData, nextFloat: e.target.value})} className={inputStyle} placeholder="0" /></div>
                        <div>
                           <label className={labelStyle}>ยอดเงินรับโอน</label>
                           <input type="number" value={formData.transferAmount} onChange={(e) => setFormData({...formData, transferAmount: e.target.value})} className={inputStyle} placeholder="0" />
                           
                           {/* ส่วนอัปโหลดรูป (เลือกกล้องได้) */}
                           <div className={`w-full h-16 border-2 border-dashed rounded-lg overflow-hidden relative mt-2 transition-all ${isVerifying ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 hover:bg-slate-700 bg-slate-800'}`}>
                             {isVerifying ? (
                               <div className="flex flex-col items-center justify-center h-full text-amber-400"><Loader2 className="animate-spin mb-1" size={16}/><span className="text-[9px] font-bold">ตรวจสอบ...</span></div>
                             ) : formData.transferSlipImage ? ( 
                                <>
                                  <img src={formData.transferSlipImage} className="w-full h-full object-cover opacity-60" /> 
                                  <button type="button" onClick={() => setFormData({...formData, transferSlipImage: null})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={12}/></button>
                                </>
                             ) : ( 
                               <div className="flex w-full h-full divide-x divide-slate-600/50">
                                  <label className="flex-1 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-400 transition-colors">
                                     <Camera size={18} className="mb-1" />
                                     <span className="text-[9px] font-bold">ถ่ายรูป</span>
                                     <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => handleImageUpload(e, 'transferSlipImage')} disabled={isVerifying} />
                                  </label>
                                  <label className="flex-1 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-400 transition-colors">
                                     <ImageIcon size={18} className="mb-1" />
                                     <span className="text-[9px] font-bold">อัลบั้ม</span>
                                     <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'transferSlipImage')} disabled={isVerifying} />
                                  </label>
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-4">
                     <div className="flex justify-between items-center mb-3">
                        <label className={labelStyle + " !mb-0"}>รายการค่าใช้จ่ายประจำกะ</label>
                        <button onClick={addExpense} className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all hover:bg-blue-500/30"><Plus size={12}/> เพิ่มรายการ</button>
                     </div>
                     {formData.expenses.length === 0 && (
                        <div className="text-center text-slate-500 text-xs py-4 bg-slate-800 rounded-lg border border-dashed border-slate-700">ไม่มีรายการค่าใช้จ่าย</div>
                     )}
                     <div className="space-y-3">
                        {formData.expenses.map((exp, idx) => (
                           <div key={exp.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 relative animate-in fade-in">
                              <button onClick={() => removeExpense(idx)} className="absolute -top-2 -right-2 text-white bg-red-500 rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"><X size={12}/></button>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                 <select className={inputStyle + " !p-2 !text-xs"} value={exp.type} onChange={e => updateExpense(idx, 'type', e.target.value)}>
                                   {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                 </select>
                                 <input type="number" placeholder="จำนวนเงิน" className={inputStyle + " !p-2 !text-xs text-rose-400 font-bold"} value={exp.amount} onChange={e => updateExpense(idx, 'amount', e.target.value)} />
                              </div>
                              {exp.type === 'อื่นๆ' && (
                                 <div className="mb-2">
                                   <input type="text" placeholder="ระบุรายละเอียด (จำเป็น)" className={inputStyle + " !p-2 !text-xs"} value={exp.detail} onChange={e => updateExpense(idx, 'detail', e.target.value)} />
                                 </div>
                              )}
                              
                              {/* ส่วนอัปโหลดรูป (เลือกกล้องได้) */}
                              <div className="flex items-center justify-center w-full h-12 border border-dashed border-slate-700 rounded-lg bg-slate-900/50 overflow-hidden relative">
                                {exp.image ? (
                                   <>
                                     <img src={exp.image} className="w-full h-full object-cover opacity-60" /> 
                                     <button type="button" onClick={() => updateExpense(idx, 'image', null)} className="absolute top-1 right-1 bg-rose-500 text-white p-0.5 rounded-full"><X size={12}/></button>
                                   </>
                                ) : ( 
                                   <div className="flex w-full h-full divide-x divide-slate-700">
                                      <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-amber-400 transition-colors">
                                         <Camera size={14}/>
                                         <span className="text-[9px] font-bold">ถ่ายรูป</span>
                                         <input type="file" className="hidden" accept="image/*" capture="environment" onChange={e => uploadExpenseImage(idx, e)} />
                                      </label>
                                      <label className="flex-1 flex items-center justify-center gap-1 hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-blue-400 transition-colors">
                                         <ImageIcon size={14}/>
                                         <span className="text-[9px] font-bold">อัลบั้ม</span>
                                         <input type="file" className="hidden" accept="image/*" onChange={e => uploadExpenseImage(idx, e)} />
                                      </label>
                                   </div>
                                )}
                              </div>
                           </div>
                        ))}
                     </div>
                     {formData.expenses.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700 text-right text-xs font-bold text-rose-400">
                          ยอดรวมค่าใช้จ่าย: {formatNum(formData.expenses.reduce((s, e) => s + (Number(e.amount)||0), 0))} ฿
                        </div>
                     )}
                  </div>

                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelStyle}>จำนวนเงินเกิน</label><input type="number" value={formData.overAmount} onChange={(e) => setFormData({...formData, overAmount: e.target.value})} className={`${inputStyle} text-yellow-400`} placeholder="0" /></div>
                      <div><label className={labelStyle}>จำนวนเงินขาด</label><input type="number" value={formData.shortAmount} onChange={(e) => setFormData({...formData, shortAmount: e.target.value})} className={`${inputStyle} text-red-400`} placeholder="0" /></div>
                    </div>
                  </div>
                  <div className="mb-6"><label className={labelStyle}>หมายเหตุเพิ่มเติม</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" className={`${inputStyle} resize-none`} placeholder="ระบุรายละเอียดเพิ่มเติม..."></textarea></div>
                  <button onClick={handleSaveShift} className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition flex justify-center items-center"><CheckCircle size={20} className="mr-2" /> ยืนยันการบันทึกการปิดกะ</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {(!isHistoryUnlocked && !staffViewShiftId) ? (
                    <div className="bg-slate-800 p-8 rounded-[20px] border border-slate-700 shadow-2xl text-center mt-4">
                      <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700"><Lock size={30} className="text-[#64748b]" /></div>
                      <h2 className="text-lg font-bold text-white mb-6">รหัสผ่านเพื่อเข้าถึงประวัติข้อมูล</h2>
                      <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:border-blue-500 mb-6 font-mono outline-none" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('history')} />
                      <button onClick={() => handleLogin('history')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl active:scale-95 transition flex justify-center items-center"><Unlock size={18} className="mr-2" /> ยืนยันรหัสผ่าน</button>
                    </div>
                  ) : (
                    <>
                      {staffViewShiftId && (
                         <div className="mb-4 bg-slate-900/50 p-3 rounded-xl border border-emerald-500/30 shadow-lg flex justify-between items-center">
                            <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1"><CheckCircle size={14}/> รายการข้อมูลปัจจุบัน</span>
                            <button onClick={() => { setIsHistoryUnlocked(false); setStaffViewShiftId(null); setPin(''); }} className="text-[10px] bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-white font-bold shadow-md active:scale-95 transition">
                               ดูข้อมูลทั้งหมด
                            </button>
                         </div>
                      )}

                      {branchDisplayHistory.map((data, index) => {
                         const expList = data.expenses && data.expenses.length > 0 ? data.expenses : 
                                        (Number(data.expenseAmount) > 0 ? [{ id: 1, type: data.expenseType, amount: data.expenseAmount, image: data.expenseSlipImage }] : []);
                         return (
                         <div key={data.id || index} className="bg-slate-800 rounded-[20px] p-5 border border-slate-700 shadow-xl w-full mb-6">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center space-x-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700"><Calendar size={14} className="text-pink-400" /><span className="text-[#5eead4] font-bold text-xs">{data.date}</span></div>
                              <div className="flex items-center space-x-2">
                                <div className="text-xs font-bold text-slate-400 mr-2">{data.time}</div>
                                <button onClick={() => openEditModal(data)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg active:scale-90 transition hover:bg-blue-500/20"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteRecord(data.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg active:scale-90 transition hover:bg-red-500/20"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 mb-3">
                              <div className="text-[#94a3b8] text-[10px] font-bold mb-1 uppercase tracking-widest">ยอดเงินนำส่งสุทธิรวม</div>
                              <div className="text-2xl font-extrabold text-[#fcd34d]">{formatNum(((Number(data.actualCash) || 0) - (Number(data.nextFloat) || 0)) + (Number(data.transferAmount) || 0))} ฿</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700"><span className="text-slate-400 block mb-1">เงินทอนเริ่มต้นกะ</span><span className="text-white font-bold">{formatNum(data.floatIn)} ฿</span></div>
                              <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700"><span className="text-slate-400 block mb-1">หักเงินทอนกะใหม่</span><span className="text-blue-400 font-bold">{formatNum(data.nextFloat)} ฿</span></div>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 text-xs grid grid-cols-2 gap-2 text-slate-300">
                              <div><span className="text-slate-500">พนักงาน:</span> {data.cashierName}</div><div><span className="text-slate-500">กะการทำงาน:</span> {data.shift}</div>
                              <div className="col-span-2 truncate"><span className="text-slate-500">หมายเหตุ:</span> {data.notes || '-'}</div>
                            </div>
                            {(data.transferSlipImage || expList.length > 0) && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700 overflow-x-auto pb-1 custom-scrollbar">
                                {data.transferSlipImage && (
                                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-600 cursor-pointer shrink-0" onClick={() => setPreviewImage(data.transferSlipImage)}>
                                    <img src={data.transferSlipImage} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                                    <div className="text-center text-[8px] bg-slate-900/50 text-blue-400">ภาพหลักฐาน</div>
                                  </div>
                                )}
                                {expList.map((exp, eIdx) => exp.image && (
                                  <div key={eIdx} className="w-14 h-14 rounded-lg overflow-hidden border border-slate-600 cursor-pointer shrink-0" onClick={() => setPreviewImage(exp.image)}>
                                    <img src={exp.image} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                                    <div className="text-center text-[8px] bg-slate-900/50 text-rose-400 truncate px-0.5">{exp.type}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                         </div>
                      )})}
                      {branchDisplayHistory.length === 0 && (
                        <div className="text-center py-20 text-[#94a3b8] text-sm"><Search size={30} className="mx-auto mb-2 opacity-50"/> ไม่พบประวัติข้อมูล</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= สรุปยอดรวม ================= */}
        {currentView === 'summary' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e293b] p-4 flex items-center border-b border-slate-700 sticky top-0 z-10 shadow-lg">
              <button onClick={() => { setCurrentView('menu'); setIsUnlocked(false); setPin(''); }} className="p-2 bg-slate-800 rounded-xl text-white mr-4 border border-slate-700 hover:bg-slate-700"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-[#fcd34d] flex items-center"><Lock size={16} className="mr-2"/> รายงานสรุปยอดรวม</h2>
            </div>
            <div className="p-4">
              {!isUnlocked ? (
                <div className="bg-slate-800 p-8 rounded-[20px] border border-slate-700 shadow-2xl text-center mt-6">
                  <div className="w-16 h-16 bg-slate-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700"><Lock size={30} className="text-[#64748b]" /></div>
                  <h2 className="text-lg font-bold text-white mb-6">รหัสผ่านผู้บริหาร</h2>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:border-blue-500 mb-6 font-mono outline-none" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('summary')} />
                  <button onClick={() => handleLogin('summary')} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl active:scale-95 transition flex justify-center items-center"><Unlock size={18} className="mr-2" /> ยืนยันรหัสผ่าน</button>
                </div>
              ) : (
                <div className="pb-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-lg flex-1 mr-3">
                        <Filter size={18} className="text-blue-400 mx-2" />
                        <select value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="bg-transparent text-sm text-white font-bold outline-none w-full appearance-none">
                          <option value="all">ตรวจสอบทุกวัน (รวมทั้งหมด)</option>
                          {availableDates.map(d => (<option key={d} value={d}>วันที่ {d}</option>))}
                        </select>
                      </div>
                      <button onClick={handleDeleteSpecificHistory} className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition shadow-lg"><Trash2 size={18}/></button>
                   </div>
                   {summary.groupedData.map((branchData, idx) => (
                     <div key={idx} className="bg-slate-800 p-4 rounded-[20px] border border-slate-700 shadow-xl mb-6">
                        <h4 className="text-[#60a5fa] font-black text-base mb-3 flex items-center pb-3 border-b border-slate-700"><Store size={18} className="mr-2"/> {branchData.branch}</h4>
                        {branchData.hasData ? (
                          <div className="overflow-hidden rounded-xl border border-slate-900/50">
                            <table className="w-full text-left text-sm bg-slate-900/50">
                              <thead><tr className="text-[#94a3b8] bg-[#161a2b] border-b border-slate-700"><th className="py-3 px-3 font-medium">กะ (คลิกเพื่อดูรายละเอียด)</th><th className="py-3 px-3 font-medium text-right">ยอดเงินสด</th><th className="py-3 px-3 font-medium text-right">ยอดเงินโอน</th></tr></thead>
                              <tbody>
                                {branchData.shifts.map((s, sIdx) => (
                                  <tr key={sIdx} className={`border-b border-slate-700/50 text-white last:border-0 ${s.records.length > 0 ? 'cursor-pointer hover:bg-slate-800 transition' : ''}`} onClick={() => s.records.length > 0 && setSummaryPopupInfo({ title: `${branchData.branch} - กะ${s.shift}`, records: s.records })}>
                                    <td className="py-3 px-3 text-xs flex items-center gap-1.5">{s.shift} {s.records.length > 0 && <span className="bg-blue-500/20 text-blue-400 rounded-full p-1"><Info size={12}/></span>}</td>
                                    <td className="py-3 px-3 text-right font-mono font-bold">{s.cash !== null ? <span className="text-blue-300">{formatNum(s.cash)}</span> : <span className="text-slate-600">-</span>}</td>
                                    <td className="py-3 px-3 text-right font-mono font-bold">{s.transfer !== null ? <span className="text-[#34d399]">{formatNum(s.transfer)}</span> : <span className="text-slate-600">-</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot><tr className="bg-slate-800 border-t border-slate-700"><td className="py-3 px-3 text-xs text-[#fcd34d] font-bold">รวมทั้งสิ้น</td><td className="py-3 px-3 text-right text-[#fcd34d] font-mono font-black">{formatNum(branchData.totalCash)}</td><td className="py-3 px-3 text-right text-[#fcd34d] font-mono font-black">{formatNum(branchData.totalTransfer)}</td></tr></tfoot>
                            </table>
                          </div>
                        ) : (<div className="text-center py-6 text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-700">ไม่พบข้อมูลในวันดังกล่าว</div>)}
                     </div>
                   ))}
                   <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-5 rounded-[20px] border border-blue-500/30 shadow-2xl mt-8">
                      <div className="text-center mb-4"><div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mb-1">ยอดรวมสุทธิทุกสาขา</div><div className="text-3xl font-black text-white">{formatNum(summary.grandTotalCash + summary.grandTotalTransfer)} <span className="text-sm font-normal">฿</span></div></div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-400 mb-1">ยอดเงินสดรวมสุทธิ</div><div className="text-lg font-black text-[#60a5fa]">{formatNum(summary.grandTotalCash)}</div></div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700"><div className="text-xs text-slate-400 mb-1">ยอดเงินโอนรวมสุทธิ</div><div className="text-lg font-black text-[#34d399]">{formatNum(summary.grandTotalTransfer)}</div></div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 🚀 MAIN PORTAL: เมนูหลัก (เชื่อม 2 ระบบ)
// ============================================================================
export default function App() {
  const [system, setSystem] = useState('menu');

  if (system === 'shift') return <ShiftApp onBack={() => setSystem('menu')} />;
  if (system === 'transfer') return <TransferApp onBack={() => setSystem('menu')} />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0f172a] font-sans">
      <div className="text-center mb-10 animate-in slide-in-from-bottom-4">
        <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(251,191,36,0.2)] border-4 border-slate-800"><span className="text-5xl">👑</span></div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-2 tracking-wider">M&N KC</h1>
        <p className="text-slate-400 text-[11px] tracking-widest uppercase font-bold">Shift & Transfer Management</p>
      </div>
      
      <div className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-500">
        <button onClick={() => setSystem('shift')} className="w-full bg-slate-800 p-5 rounded-[2rem] shadow-lg active:scale-95 transition-all flex items-center gap-5 border border-slate-700 hover:border-blue-500/50 group">
           <div className="bg-blue-500/10 p-4 rounded-2xl group-hover:bg-blue-500/20 transition-colors"><Crown className="text-blue-400 w-8 h-8"/></div>
           <div className="text-left"><h2 className="text-xl font-black text-white leading-tight mb-1">ระบบบันทึกปิดกะ</h2><p className="text-slate-400 text-[10px] font-medium">สรุปยอดเงินสด / ค่าใช้จ่ายประจำวัน</p></div>
        </button>
        
        <button onClick={() => setSystem('transfer')} className="w-full bg-slate-800 p-5 rounded-[2rem] shadow-lg active:scale-95 transition-all flex items-center gap-5 border border-slate-700 hover:border-amber-500/50 group">
           <div className="bg-amber-500/10 p-4 rounded-2xl group-hover:bg-amber-500/20 transition-colors"><ScanLine className="text-amber-400 w-8 h-8"/></div>
           <div className="text-left"><h2 className="text-xl font-black text-white leading-tight mb-1">ระบบเช็คยอดโอน</h2><p className="text-slate-400 text-[10px] font-medium">สแกนสลิปออโต้ / บันทึกประวัติยอดโอน</p></div>
        </button>
      </div>
      <p className="fixed bottom-4 text-slate-600 text-[9px] font-bold tracking-widest uppercase">Version 3.3 • AI Powered</p>
    </div>
  );
}
