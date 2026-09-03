/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle, Edit2, X, Info, Image as ImageIcon, Plus, Loader2, ScanLine, Camera, Receipt } from 'lucide-react';

// --- นำเข้า Firebase ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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
        const MAX_WIDTH = 800; const MAX_HEIGHT = 800;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

// 🚀 ฟังก์ชัน API ตรวจสลิป (แยกรหัส 2 สาขาอัตโนมัติ)
const verifySlipWithAPI = async (base64Image, branchName) => {
  try {
    const isBranch5 = branchName && branchName.toString().includes('5');
    const activeSecretKey = isBranch5 ? SLIP2GO_KEY_BRANCH_5.trim() : SLIP2GO_KEY_BRANCH_2.trim();

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
const getLocalYMD = (timestamp) => {
  if (!timestamp) return ''; const d = new Date(timestamp); if (isNaN(d.getTime())) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const formatNum = (num) => Number(num).toLocaleString('th-TH');

// ============================================================================
// 💸 MAIN APP: ระบบเช็คยอดโอน (Fast Camera Version)
// ============================================================================
export default function App() {
  const TRANSFER_BRANCHES = [2, 5]; 
  const [selectedBranch, setSelectedBranch] = useState(null);
  
  const [activeTab, setActiveTab] = useState('form'); 
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  
  // State ของฟอร์ม (เพิ่ม receiptImage)
  const [form, setForm] = useState({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '', receiptImage: '' });
  const [submitDate, setSubmitDate] = useState(getTodayIso());
  
  // State การสแกนสลิป
  const [scanStatus, setScanStatus] = useState('idle'); 
  const [scanMessage, setScanMessage] = useState('');
  
  // Dashboard & History
  const [filterDate, setFilterDate] = useState(getTodayIso());
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [ownerPin, setOwnerPin] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  // แก้ไขและลบ
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

  // โหลดสลิปโอนเงิน (บังคับถ่ายก่อน)
  const handleSlipUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try { 
      setScanStatus('scanning');
      setScanMessage('กำลังสแกนสลิป...');
      
      const compressedBase64 = await compressImage(file); 
      setForm(prev => ({ ...prev, slipImage: compressedBase64 })); 
      
      const verifyResult = await verifySlipWithAPI(compressedBase64, selectedBranch);
      
      if (verifyResult.success) {
        setForm(prev => ({ ...prev, transfer: verifyResult.amount.toString() }));
        setScanStatus('success');
        setScanMessage(`สแกนผ่าน! ยอดเงิน: ${formatNum(verifyResult.amount)} ฿`);
      } else {
        setScanStatus('error');
        setScanMessage(verifyResult.message);
      }
    } catch (err) {
      setScanStatus('error');
      setScanMessage('เกิดข้อผิดพลาด กรุณาระบุยอดเงินเอง');
    }
  };

  // โหลดใบเสร็จคิดเงิน
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setForm(prev => ({ ...prev, receiptImage: compressedBase64 }));
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการโหลดรูปใบเสร็จ');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.staff) return alert("กรุณาระบุชื่อพนักงาน");
    if (!form.transfer) return alert("กรุณาระบุจำนวนเงินโอน");
    if (!form.slipImage) return alert("กรุณาแนบภาพสลิปโอนเงิน");
    setLoading(true);
    try {
      await addDoc(collection(db, 'transfer_reports'), {
        branch: selectedBranch, staff: form.staff, shift: form.shift, submitDate,
        transfer: parseFloat(form.transfer) || 0, slipTime: form.slipTime || '-', 
        slipImage: form.slipImage, receiptImage: form.receiptImage || null, // บันทึกใบเสร็จ
        timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now()
      });
      // เคลียร์ฟอร์ม
      setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '', receiptImage: '' });
      setScanStatus('idle');
      alert("✅ บันทึกยอดโอนพร้อมใบเสร็จสำเร็จ"); 
      setActiveTab('history');
    } catch (err) { 
      alert("❌ เกิดข้อผิดพลาดจากระบบ: " + err.message);
    } finally { setLoading(false); }
  };

  const openEdit = (record) => {
    if (!record) return;
    setEditSession(record);
    setForm({ 
      staff: record.staff || '', shift: record.shift || SHIFTS[0], transfer: record.transfer ? record.transfer.toString() : '', 
      slipTime: record.slipTime !== '-' ? record.slipTime : '', slipImage: record.slipImage || '', receiptImage: record.receiptImage || '' 
    });
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
        slipTime: form.slipTime || '-', slipImage: form.slipImage, receiptImage: form.receiptImage || null,
        timestamp: new Date().toLocaleString('th-TH') + ' (แก้ไข)'
      });
      setEditSession(null); 
      setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '', receiptImage: '' });
      alert("✅ อัปเดตข้อมูลสำเร็จ"); 
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

  // --- หน้าแรกสุด: เลือกสาขา ---
  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
        <div className="text-center mb-10 animate-in slide-in-from-bottom-4">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(251,191,36,0.3)] border-4 border-slate-800">
            <ScanLine className="text-white w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-2 tracking-wider">M&N KC</h1>
          <p className="text-slate-400 text-[11px] tracking-widest uppercase font-bold">Transfer & Receipt System</p>
        </div>
        
        <div className="w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-500">
          <h2 className="text-center text-slate-300 font-bold mb-4">เลือกร้านค้าเพื่อเริ่มสแกนสลิป</h2>
          {TRANSFER_BRANCHES.map(n => (
            <button key={n} onClick={() => setSelectedBranch(n.toString())} className="w-full bg-slate-800 p-5 rounded-[2rem] shadow-lg active:scale-95 transition-all flex items-center gap-5 border border-slate-700 hover:border-amber-500/50 group">
               <div className="bg-amber-500/10 p-4 rounded-2xl group-hover:bg-amber-500/20 transition-colors"><Store className="text-amber-400 w-8 h-8"/></div>
               <div className="text-left"><h2 className="text-xl font-black text-white leading-tight mb-1">สาขา {n}</h2><p className="text-slate-400 text-[10px] font-medium">กดเพื่อเข้าสู่ระบบบันทึกยอด</p></div>
            </button>
          ))}
        </div>
        <p className="fixed bottom-4 text-slate-600 text-[9px] font-bold tracking-widest uppercase">Version 4.0 • Fast Scan Mode</p>
      </div>
    );
  }

  // --- ข้อมูลสำหรับแท็บประวัติ และ สรุปยอด ---
  const filteredRecords = historyList.filter(r => r && r.branch === selectedBranch && (r.submitDate === filterDate || (!r.submitDate && getLocalYMD(r.createdAt) === filterDate)));
  const countMorning = filteredRecords.filter(r => r.shift === 'เช้า').length;
  const countAfternoon = filteredRecords.filter(r => r.shift === 'บ่าย').length;
  const countNight = filteredRecords.filter(r => r.shift === 'ดึก').length;

  const filteredAllBranches = historyList.filter(r => r && (r.submitDate === filterDate || (!r.submitDate && getLocalYMD(r.createdAt) === filterDate)));
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

  const labelStyle = "block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5";
  const inputStyle = "w-full p-3.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-sm font-bold outline-none focus:border-amber-400 transition-colors";

  return (
    <div className="min-h-screen bg-[#0f172a] pb-32 font-sans text-slate-200">
      <header className="bg-[#1e293b] p-4 sticky top-0 z-40 shadow-lg border-b border-slate-700 flex justify-between items-center">
        <div className="text-left">
           <div className="font-black text-white text-lg">สาขา {selectedBranch}</div>
           <div className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">Transfer & Receipt</div>
        </div>
        <button onClick={() => {setSelectedBranch(null); setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '', receiptImage: '' }); setScanStatus('idle'); setIsOwnerUnlocked(false); setOwnerPin(''); setEditSession(null);}} className="text-[10px] bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl font-bold text-white hover:bg-slate-700 transition-colors flex items-center gap-1"><Store size={12}/> เปลี่ยนสาขา</button>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* แถบเมนู 3 แท็บ */}
        <div className="flex bg-[#1e293b] p-1.5 rounded-2xl border border-slate-700 mb-6 shadow-sm">
          <button onClick={() => setActiveTab('form')} className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'form' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📝 บันทึก</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'history' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📅 ประวัติ</button>
          <button onClick={() => setActiveTab('dashboard')} className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>📊 สรุปยอดรวม</button>
        </div>

        {/* --- แท็บที่ 1: ฟอร์มบันทึกยอด (บังคับกล้องก่อน) --- */}
        {activeTab === 'form' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            
            {!form.slipImage ? (
               // STEP 1: FAST SCAN UI (แสดงเมื่อยังไม่มีสลิป)
               <div className="bg-[#1e293b] p-6 rounded-3xl shadow-2xl border border-amber-500/30 text-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl"></div>
                  
                  {scanStatus === 'scanning' ? (
                     <div className="py-12 flex flex-col items-center justify-center">
                        <div className="relative mb-6">
                           <ScanLine className="text-amber-400 w-20 h-20 animate-pulse" />
                           <div className="absolute top-0 left-0 w-full h-1 bg-amber-400 animate-[scan_1.5s_ease-in-out_infinite]"></div>
                        </div>
                        <h3 className="text-white font-black text-xl mb-2">กำลังตรวจสอบสลิป...</h3>
                        <p className="text-amber-400/80 text-sm font-bold">กรุณารอสักครู่ ระบบกำลังอ่านยอดเงิน</p>
                     </div>
                  ) : (
                     <>
                        <div className="bg-amber-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                          <ScanLine className="text-amber-400 w-8 h-8" />
                        </div>
                        <h3 className="text-white font-black text-xl mb-2">{editSession ? 'แก้ไขรูปสลิปใหม่' : 'ขั้นตอนที่ 1 : สแกนสลิปโอนเงิน'}</h3>
                        <p className="text-slate-400 text-xs font-bold mb-8 leading-relaxed">กรุณาถ่ายรูปสลิปการโอนเงินของลูกค้า<br/>เพื่อดึงยอดเงินอัตโนมัติ</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                           {/* ปุ่มถ่ายรูป (ใหญ่เด่น) */}
                           <label className="col-span-2 bg-gradient-to-b from-amber-400 to-orange-500 rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:shadow-[0_10px_40px_rgba(245,158,11,0.4)] border border-white/20">
                              <Camera className="w-12 h-12 text-white mb-3" />
                              <span className="text-white font-black text-xl tracking-wide">เปิดกล้องถ่ายสลิป</span>
                              <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageUpload} />
                           </label>
                           
                           {/* ปุ่มเลือกจากอัลบั้ม (รองลงมา) */}
                           <label className="col-span-2 bg-slate-800 rounded-2xl p-4 flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all border border-slate-700 hover:border-slate-600">
                              <ImageIcon className="w-5 h-5 text-blue-400" />
                              <span className="text-slate-300 font-bold text-sm">เลือกรูปจากอัลบั้ม</span>
                              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                           </label>
                        </div>

                        {editSession && (
                           <button onClick={() => {setEditSession(null); setActiveTab('history');}} className="mt-6 text-slate-500 text-xs font-bold underline">ยกเลิกการแก้ไข</button>
                        )}
                     </>
                  )}
               </div>
            ) : (
               // STEP 2: ฟอร์มกรอกข้อมูล และ ถ่ายใบเสร็จ (แสดงเมื่อมีสลิปแล้ว)
               <div className="space-y-4 animate-in fade-in zoom-in-95">
                 
                 {/* รูปสลิปที่สแกนแล้ว */}
                 <div className="bg-[#1e293b] p-4 rounded-3xl shadow-lg border border-emerald-500/30 flex gap-4 items-center relative overflow-hidden">
                    <div className="w-20 h-24 bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shrink-0" onClick={() => setPreviewImage(form.slipImage)}>
                       <img src={form.slipImage} className="w-full h-full object-cover opacity-80" />
                    </div>
                    <div className="flex-1">
                       <div className="flex items-center gap-1.5 text-emerald-400 mb-1"><CheckCircle size={14}/><span className="text-[10px] font-bold uppercase tracking-widest">สลิปตรวจสอบแล้ว</span></div>
                       <div className="text-2xl font-black text-white">{formatNum(form.transfer)} <span className="text-sm font-medium text-slate-400">฿</span></div>
                       <button type="button" onClick={() => { setForm({...form, slipImage: '', transfer: ''}); setScanStatus('idle'); setScanMessage(''); }} className="mt-2 text-[10px] bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-bold border border-slate-600 flex items-center gap-1 w-max active:scale-95"><Camera size={12}/> ถ่ายสลิปใหม่</button>
                    </div>
                 </div>

                 {/* ฟอร์มข้อมูล + ใบเสร็จ */}
                 <form onSubmit={editSession ? saveEdit : handleSubmit} className="bg-[#1e293b] p-5 rounded-3xl shadow-xl border border-slate-700 space-y-4">
                    <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2 pb-3 border-b border-slate-700"><FileText size={18} className="text-blue-400"/> ขั้นตอนที่ 2 : ระบุข้อมูลให้ครบถ้วน</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className={labelStyle}>ชื่อพนักงาน</label>
                        <input type="text" value={form.staff} onChange={e => setForm({...form, staff: e.target.value})} className={inputStyle} placeholder="ระบุชื่อ..." required />
                      </div>
                      <div>
                        <label className={labelStyle}>กะการทำงาน</label>
                        <select value={form.shift} onChange={e => setForm({...form, shift: e.target.value})} className={`${inputStyle} appearance-none`}>
                          {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>วันที่ทำรายการ</label>
                        <input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className={inputStyle} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <div className="col-span-2 sm:col-span-1">
                         <label className="text-[10px] font-black text-amber-400 block mb-1.5 uppercase tracking-wider">ยอดเงินที่โอน (แก้ไขได้)</label>
                         <input type="number" step="any" value={form.transfer} onChange={e => setForm({...form, transfer: e.target.value})} className="w-full p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl text-xl font-black outline-none focus:border-amber-400 transition-colors" placeholder="0.00" required />
                       </div>
                       <div className="col-span-2 sm:col-span-1">
                         <label className={labelStyle}>เวลาบนสลิป</label>
                         <input type="time" value={form.slipTime} onChange={e => setForm({...form, slipTime: e.target.value})} className={inputStyle} required />
                       </div>
                    </div>

                    {/* ถ่ายใบเสร็จ POS (ใหม่) */}
                    <div className="pt-2 border-t border-slate-700 mt-4">
                       <label className="text-[10px] font-black text-blue-400 block mb-2 uppercase tracking-wider flex items-center gap-1.5"><Receipt size={14}/> ถ่ายรูปใบเสร็จคิดเงิน (POS)</label>
                       <div className="w-full h-24 border-2 border-dashed border-slate-600 rounded-2xl overflow-hidden relative bg-slate-800 transition-colors hover:border-blue-400">
                          {form.receiptImage ? (
                             <>
                               <img src={form.receiptImage} className="w-full h-full object-cover opacity-70" onClick={() => setPreviewImage(form.receiptImage)} />
                               <button type="button" onClick={() => setForm({...form, receiptImage: ''})} className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"><X size={14}/></button>
                             </>
                          ) : (
                             <div className="flex w-full h-full divide-x divide-slate-700">
                                <label className="flex-1 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-amber-400 transition-colors">
                                   <Camera size={20} className="mb-1" />
                                   <span className="text-[10px] font-bold">กล้อง</span>
                                   <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleReceiptUpload} />
                                </label>
                                <label className="flex-1 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-blue-400 transition-colors">
                                   <ImageIcon size={20} className="mb-1" />
                                   <span className="text-[10px] font-bold">อัลบั้ม</span>
                                   <input type="file" className="hidden" accept="image/*" onChange={handleReceiptUpload} />
                                </label>
                             </div>
                          )}
                       </div>
                    </div>

                    <div className="pt-4">
                       {editSession ? (
                          <div className="flex gap-3">
                             <button type="button" onClick={() => {setEditSession(null); setForm({ staff: '', shift: SHIFTS[0], transfer: '', slipTime: '', slipImage: '', receiptImage: '' }); setActiveTab('history');}} className="flex-1 p-4 bg-slate-800 border border-slate-700 text-white rounded-xl font-black text-sm active:scale-95 transition-transform">
                                ยกเลิก
                             </button>
                             <button type="submit" disabled={loading} className="flex-1 p-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-black shadow-lg text-sm active:scale-95 transition-transform">
                                {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                             </button>
                          </div>
                       ) : (
                          <button type="submit" disabled={loading} className="w-full p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all text-sm flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />} 
                            {loading ? 'กำลังบันทึกข้อมูล...' : 'บันทึกยอดโอน & ใบเสร็จ'}
                          </button>
                       )}
                    </div>
                 </form>
               </div>
            )}
          </div>
        )}

        {/* --- แท็บที่ 2: ประวัติข้อมูล (โชว์เฉพาะจำนวนสลิป ซ่อนยอดเงิน) --- */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
             <div className="bg-[#1e293b] p-5 rounded-3xl shadow-lg border border-slate-700">
                 <label className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">ตรวจสอบประจำวันที่</label>
                 <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-3.5 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm font-bold outline-none focus:border-blue-400 transition-colors mb-4" />
                 
                 <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 text-center">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">จำนวนรายการที่สแกนวันนี้</div>
                    <div className="text-4xl font-black text-blue-400 mb-4">{filteredRecords.length} <span className="text-sm font-medium text-slate-400">รายการ</span></div>
                    
                    <div className="flex justify-center gap-4 text-xs font-bold text-slate-500 bg-slate-900/50 py-3 rounded-xl">
                       <span className={countMorning > 0 ? "text-emerald-400" : ""}>เช้า: {countMorning}</span>
                       <span className={countAfternoon > 0 ? "text-amber-400" : ""}>บ่าย: {countAfternoon}</span>
                       <span className={countNight > 0 ? "text-indigo-400" : ""}>ดึก: {countNight}</span>
                    </div>
                 </div>
             </div>

             <div className="space-y-3">
               {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-500 font-medium bg-[#1e293b] rounded-3xl border border-dashed border-slate-700">ไม่พบรายการโอนในวันนี้</div>}
               {filteredRecords.map((record) => (
                  <div key={record.id} className="bg-[#1e293b] rounded-3xl p-4 shadow-sm border border-slate-700">
                     <div className="flex gap-4 items-start">
                         {/* โชว์รูปสลิปและใบเสร็จ */}
                         <div className="flex flex-col gap-2 shrink-0">
                            <div className="w-16 h-20 bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-slate-600 relative group" onClick={() => setPreviewImage(record?.slipImage)}>
                               {record?.slipImage ? (
                                 <><img src={record.slipImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 opacity-80" /><div className="absolute bottom-0 w-full text-center bg-black/60 text-[8px] text-amber-400 py-0.5">สลิป</div></>
                               ) : <div className="flex items-center justify-center h-full text-slate-600"><ImageIcon size={16} /></div>}
                            </div>
                            {record?.receiptImage && (
                               <div className="w-16 h-12 bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-slate-600 relative group" onClick={() => setPreviewImage(record?.receiptImage)}>
                                  <img src={record.receiptImage} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-300" />
                                  <div className="absolute bottom-0 w-full text-center bg-black/60 text-[8px] text-blue-400 py-0.5">ใบเสร็จ</div>
                               </div>
                            )}
                         </div>
                         
                         <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                            <div>
                               <div className="flex justify-between items-start mb-1">
                                 <div className="font-bold text-white text-sm truncate">{record?.staff} <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 ml-1">กะ{record?.shift}</span></div>
                                 <div className="text-[10px] text-slate-500 shrink-0 font-medium bg-slate-800 px-2 py-0.5 rounded-full">{record?.slipTime}</div>
                               </div>
                               <div className="text-[10px] text-slate-500 mb-3">{record?.submitDate || getLocalYMD(record?.createdAt)}</div>
                            </div>
                            
                            {/* ปุ่มแก้ไข/ลบ อยู่ขวาล่าง ซ่อนยอดเงิน */}
                            <div className="flex justify-end gap-2 mt-auto pt-2">
                               <button onClick={() => openEdit(record)} className="p-2.5 bg-slate-800 text-blue-400 rounded-xl hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 flex items-center gap-1.5"><Edit2 size={14} /><span className="text-[10px] font-bold">แก้ไข</span></button>
                               <button onClick={() => setDeletingId(record.id)} className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"><Trash2 size={14} /><span className="text-[10px] font-bold">ลบ</span></button>
                            </div>
                         </div>
                     </div>
                  </div>
                ))}
             </div>

             {historyList.filter(h => h && h.branch === selectedBranch).length > 0 && (
                <button onClick={() => setIsClearingAll(true)} className="w-full mt-8 p-4 bg-rose-500/10 text-rose-400 rounded-2xl font-bold border border-rose-500/20 hover:bg-rose-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"><Trash2 size={18} /> ลบประวัติข้อมูลทั้งหมด (สาขา {selectedBranch})</button>
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
