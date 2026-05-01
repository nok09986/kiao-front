import React, { useState, useEffect } from 'react';
import { Crown, Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Wallet, User, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle } from 'lucide-react';

// --- 1. นำเข้า Firebase ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

// --- 2. ตั้งค่า Firebase ---
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

export default function App() {
  // --- State Routing ---
  const [currentView, setCurrentView] = useState('menu'); 
  const [activeBranch, setActiveBranch] = useState('');
  const [branchTab, setBranchTab] = useState('form'); 
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  
  // 🔐 รหัสผ่าน 5930 
  const ADMIN_PIN = '5930'; 

  const [summaryDate, setSummaryDate] = useState('all');
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [isOnline, setIsOnline] = useState(false);

  const [formData, setFormData] = useState({
    shift: 'เช้า', cashierName: '', floatIn: '', actualCash: '', transferAmount: '',
    expenseType: 'ค่าของในร้าน', expenseAmount: '', nextFloat: '', overAmount: '', shortAmount: '', notes: '',
  });

  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(err => console.error("Auth err:", err));
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
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleLogin = (type) => {
    if (pin === ADMIN_PIN) {
      if (type === 'summary') setIsUnlocked(true);
      if (type === 'history') setIsHistoryUnlocked(true);
      setPin('');
    } else {
      showToast('รหัสผ่านไม่ถูกต้อง!', 'error');
      setPin(''); 
    }
  };

  const handleSaveShift = async () => {
    if (!formData.cashierName || !formData.actualCash) {
      showToast('กรุณากรอกชื่อพนักงานและเงินสดที่นับได้', 'error');
      return;
    }
    if (!db) {
      showToast('ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
      return;
    }

    const docId = `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = {
      ...formData,
      branch: activeBranch, 
      timestamp: Date.now(), 
      date: new Date().toLocaleDateString('th-TH'),
      time: new Date().toTimeString().slice(0, 8),
      floatIn: Number(formData.floatIn) || 0,
      actualCash: Number(formData.actualCash) || 0,
      transferAmount: Number(formData.transferAmount) || 0,
      expenseAmount: Number(formData.expenseAmount) || 0,
      nextFloat: Number(formData.nextFloat) || 0,
      overAmount: Number(formData.overAmount) || 0,
      shortAmount: Number(formData.shortAmount) || 0,
    };

    try {
      await setDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', docId), newRecord);
      showToast(`บันทึกปิดกะ ${activeBranch} สำเร็จ`, 'success');
      setFormData({ shift: 'เช้า', cashierName: '', floatIn: '', actualCash: '', transferAmount: '', expenseType: 'ค่าของในร้าน', expenseAmount: '', nextFloat: '', overAmount: '', shortAmount: '', notes: '' });
      setIsHistoryUnlocked(true);
      setBranchTab('history');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
  };

  const handleDeleteRecord = (id) => {
    setConfirmDialog({
      show: true,
      message: 'คุณต้องการลบข้อมูลประวัติกะนี้ใช่หรือไม่? (ข้อมูลจะหายไปจากทุกเครื่อง)',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', id));
          showToast('ลบรายการสำเร็จ', 'success');
          setConfirmDialog({ show: false, message: '', onConfirm: null });
        } catch (err) {
          showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
      }
    });
  };

  const handleClearAllHistory = () => {
    setConfirmDialog({
      show: true,
      message: 'คำเตือน: คุณต้องการล้างประวัติข้อมูล "ทั้งหมด" ใช่หรือไม่? (ไม่สามารถกู้คืนได้)',
      onConfirm: async () => {
        try {
          for (const record of historyData) {
            await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', record.id));
          }
          showToast('ล้างประวัติทั้งหมดสำเร็จ', 'success');
          setConfirmDialog({ show: false, message: '', onConfirm: null });
        } catch (err) {
          showToast('เกิดข้อผิดพลาดในการล้างข้อมูล', 'error');
        }
      }
    });
  };

  const formatNum = (num) => Number(num).toLocaleString('th-TH');

  const getSummaryData = () => {
    const branches = ['สาขา 1', 'สาขา 2', 'สาขา 3', 'สาขา 4', 'สาขา 5'];
    const shifts = ['เช้า', 'บ่าย', 'ดึก'];
    let grandTotalCash = 0;
    let grandTotalTransfer = 0;

    const filteredHistory = summaryDate === 'all' ? historyData : historyData.filter(d => d.date === summaryDate);

    const groupedData = branches.map(branchName => {
      const branchRecords = filteredHistory.filter(d => d.branch === branchName);
      let branchTotalCash = 0;
      let branchTotalTransfer = 0;

      const shiftData = shifts.map(shiftName => {
        const shiftRecords = branchRecords.filter(d => d.shift === shiftName);
        if (shiftRecords.length === 0) return { shift: shiftName, cash: null, transfer: null };

        const cash = shiftRecords.reduce((sum, r) => sum + (r.actualCash - r.nextFloat), 0);
        const transfer = shiftRecords.reduce((sum, r) => sum + r.transferAmount, 0);

        branchTotalCash += cash;
        branchTotalTransfer += transfer;
        return { shift: shiftName, cash, transfer };
      });

      grandTotalCash += branchTotalCash;
      grandTotalTransfer += branchTotalTransfer;

      return { branch: branchName, hasData: branchRecords.length > 0, shifts: shiftData, totalCash: branchTotalCash, totalTransfer: branchTotalTransfer };
    });

    return { groupedData, grandTotalCash, grandTotalTransfer };
  };

  const summary = getSummaryData();
  const availableDates = [...new Set(historyData.map(d => d.date))];

  const handleEnterBranch = (branchName) => {
    setActiveBranch(branchName);
    setBranchTab('form');
    setCurrentView('branch');
    setIsHistoryUnlocked(false); 
    setPin('');
  };

  const MenuButton = ({ title, subtitle, icon: Icon, bgClass, onClick }) => (
    <button onClick={onClick} className={`w-full rounded-[16px] p-4 flex items-center mb-4 transition-transform active:scale-95 shadow-lg ${bgClass}`}>
      <div className="bg-white text-gray-800 p-3.5 rounded-xl mr-4 shrink-0 shadow-sm"><Icon size={24} /></div>
      <div className="text-left">
        <div className="text-lg font-bold text-white leading-tight">{title}</div>
        <div className="text-xs text-white/90 mt-1 font-medium">{subtitle}</div>
      </div>
    </button>
  );

  const inputStyle = "w-full bg-[#1c2135] border border-[#3b4363] rounded-lg p-3 text-white focus:outline-none focus:border-[#60a5fa] transition text-sm";
  const labelStyle = "block text-[#94a3b8] text-xs font-medium mb-1.5";

  return (
    <div className="min-h-screen bg-[#111526] font-sans selection:bg-blue-500/30 flex justify-center">
      <div className="w-full max-w-md bg-[#161a2b] min-h-screen relative shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-x-hidden">
        
        {confirmDialog.show && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">ยืนยันการลบข้อมูล</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex space-x-3">
                <button onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })} className="flex-1 py-3 rounded-xl bg-[#1c2135] text-white border border-[#3b4363] font-bold active:scale-95 transition">ยกเลิก</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold active:scale-95 transition shadow-lg shadow-red-500/20">ลบข้อมูล</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`absolute top-4 left-4 right-4 p-3 rounded-xl shadow-2xl flex items-center z-50 border backdrop-blur-md transition-all duration-300 ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} className="mr-2 shrink-0" /> : <ShieldAlert size={20} className="mr-2 shrink-0" />}
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
        )}

        {currentView === 'menu' && (
          <div className="p-5 pb-10">
            <div className="flex flex-col items-center justify-center mt-6 mb-8">
              <div className="w-20 h-20 bg-[#24293f] rounded-full flex items-center justify-center shadow-lg border border-[#374160] mb-4"><Crown size={40} className="text-[#fcd34d]" /></div>
              <h1 className="text-2xl font-black text-[#fcd34d] tracking-wider">ระบบปิดกะ</h1>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1 uppercase">Shift Management System</p>
            </div>
            <div className="space-y-1">
              <MenuButton title="ปิดกะสาขา 1" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#1eb882] to-[#109f6b]" onClick={() => handleEnterBranch('สาขา 1')} />
              <MenuButton title="ปิดกะสาขา 2" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#884fff] to-[#713be5]" onClick={() => handleEnterBranch('สาขา 2')} />
              <MenuButton title="ปิดกะสาขา 3" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#f03b4b] to-[#d62837]" onClick={() => handleEnterBranch('สาขา 3')} />
              <MenuButton title="ปิดกะสาขา 4" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#f58810] to-[#e0750b]" onClick={() => handleEnterBranch('สาขา 4')} />
              <MenuButton title="ปิดกะสาขา 5" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7]" onClick={() => handleEnterBranch('สาขา 5')} />
              <div className="pt-4 mt-4 border-t border-[#2d334d]"></div>
              <button onClick={() => setCurrentView('summary')} className="w-full rounded-[16px] bg-[#2b3040] border border-[#3b4363] p-4 flex items-center justify-center transition-transform active:scale-95 shadow-lg">
                 <Lock size={20} className="text-[#fcd34d] mr-3" />
                 <span className="text-white font-bold">สรุปยอดรวมทุกสาขา</span>
              </button>
            </div>
            
            <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
             {isOnline ? <span className="text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE</span> : <span className="text-amber-500">CONNECTING...</span>}
             <span>• Ver 1.0 (Dev)</span>
            </div>
          </div>
        )}

        {currentView === 'branch' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10">
              <button onClick={() => { setCurrentView('menu'); setIsHistoryUnlocked(false); setPin(''); }} className="p-2 bg-[#24293f] rounded-xl text-white mr-4 active:scale-90 transition shadow-sm border border-[#374160]"><ChevronLeft size={20} /></button>
              <div><h2 className="text-lg font-bold text-white flex items-center"><MapPin size={16} className="text-[#60a5fa] mr-2"/> ระบบจัดการ {activeBranch}</h2></div>
            </div>
            <div className="flex p-4 space-x-3 bg-[#161a2b]">
              <button onClick={() => setBranchTab('form')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'form' ? 'bg-[#2563eb] text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}><FileText size={16} className="mr-2"/> ลงข้อมูล</button>
              <button onClick={() => setBranchTab('history')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'history' ? 'bg-[#2563eb] text-white shadow-[0_4px_15px_rgba(37,99,235,0.4)]' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}>
                {isHistoryUnlocked ? <Search size={16} className="mr-2"/> : <Lock size={16} className="mr-2"/>} ประวัติกะ
              </button>
            </div>

            <div className="p-4 pb-10 overflow-y-auto">
              {branchTab === 'form' ? (
                <div className="bg-[#24293f] p-5 rounded-[20px] border border-[#374160] shadow-xl">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2"><label className={labelStyle}>พนักงานผู้รับผิดชอบกะ</label><input type="text" name="cashierName" value={formData.cashierName} onChange={(e) => setFormData({...formData, cashierName: e.target.value})} className={inputStyle} placeholder="ระบุชื่อพนักงาน..." /></div>
                    <div><label className={labelStyle}>กะการทำงาน</label><select name="shift" value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})} className={inputStyle}><option>เช้า</option><option>บ่าย</option><option>ดึก</option></select></div>
                    <div><label className={labelStyle}>เงินทอนเริ่มกะ</label><input type="number" value={formData.floatIn} onChange={(e) => setFormData({...formData, floatIn: e.target.value})} className={inputStyle} placeholder="0" /></div>
                  </div>
                  <div className="bg-[#1c2135] p-4 rounded-xl border border-[#3b4363] mb-4">
                    <h3 className="text-white text-sm font-bold mb-3 flex items-center"><Wallet size={16} className="mr-2 text-yellow-400"/> สรุปยอดเงิน (บาท)</h3>
                    <div className="space-y-3">
                      <div><label className={labelStyle}>เงินสดนับได้จริงในลิ้นชัก <span className="text-red-400">*</span></label><input type="number" value={formData.actualCash} onChange={(e) => setFormData({...formData, actualCash: e.target.value})} className={`${inputStyle} border-blue-500/50 bg-blue-900/10 text-blue-300 font-bold text-lg`} placeholder="0" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelStyle}>หักทอนกะใหม่</label><input type="number" value={formData.nextFloat} onChange={(e) => setFormData({...formData, nextFloat: e.target.value})} className={inputStyle} placeholder="0" /></div>
                        <div><label className={labelStyle}>ยอดเงินโอน / QR</label><input type="number" value={formData.transferAmount} onChange={(e) => setFormData({...formData, transferAmount: e.target.value})} className={inputStyle} placeholder="0" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1c2135] p-4 rounded-xl border border-[#3b4363] mb-4">
                    <label className={labelStyle}>รายจ่ายในกะ</label>
                    <div className="flex gap-2 mb-3">
                      <select value={formData.expenseType} onChange={(e) => setFormData({...formData, expenseType: e.target.value})} className={`${inputStyle} w-1/2`}><option>ค่าของในร้าน</option><option>เบิกค่าแรง</option><option>อื่นๆ</option></select>
                      <input type="number" value={formData.expenseAmount} onChange={(e) => setFormData({...formData, expenseAmount: e.target.value})} className={`${inputStyle} w-1/2 text-red-400`} placeholder="จำนวน" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelStyle}>ยอดเงินเกิน</label><input type="number" value={formData.overAmount} onChange={(e) => setFormData({...formData, overAmount: e.target.value})} className={`${inputStyle} text-yellow-400`} placeholder="0" /></div>
                      <div><label className={labelStyle}>ยอดเงินหาย</label><input type="number" value={formData.shortAmount} onChange={(e) => setFormData({...formData, shortAmount: e.target.value})} className={`${inputStyle} text-red-400`} placeholder="0" /></div>
                    </div>
                  </div>
                  <div className="mb-6"><label className={labelStyle}>หมายเหตุ / เหตุผลการหักเงิน</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" className={`${inputStyle} resize-none`} placeholder="อธิบายเพิ่มเติม..."></textarea></div>
                  <button onClick={handleSaveShift} className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-bold py-4 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.4)] flex justify-center items-center active:scale-95 transition text-base"><CheckCircle size={20} className="mr-2" /> ยืนยันบันทึกปิดกะ</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isHistoryUnlocked ? (
                    <div className="bg-[#24293f] p-6 sm:p-8 rounded-[20px] border border-[#374160] shadow-2xl text-center mt-4">
                      <div className="w-16 h-16 bg-[#1c2135] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363] shadow-inner"><Lock size={30} className="text-[#64748b]" /></div>
                      <h2 className="text-lg font-bold text-white mb-6">ยืนยันตัวตนเพื่อดูประวัติ</h2>
                      <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border border-[#3b4363] text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:outline-none focus:border-blue-500 mb-6 font-mono" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('history')} />
                      <button onClick={() => handleLogin('history')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.4)] active:scale-95 transition text-base flex justify-center items-center"><Unlock size={18} className="mr-2" /> ปลดล็อคประวัติกะ</button>
                    </div>
                  ) : (
                    <>
                      {historyData.filter(d => d.branch === activeBranch).length > 0 ? (
                        historyData.filter(d => d.branch === activeBranch).map((data, index) => (
                           <div key={data.id || index} className="bg-[#24293f] rounded-[20px] p-5 border border-[#374160] shadow-xl w-full mb-6">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center space-x-2 bg-[#2d334d] px-3 py-1.5 rounded-lg border border-[#3b4363]"><Calendar size={14} className="text-pink-400" /><span className="text-[#5eead4] font-bold text-xs">{data.date}</span></div>
                              <div className="flex items-center space-x-3">
                                <div className="text-xs font-bold text-[#cbd5e1] flex items-center"><Clock size={14} className="mr-1 text-slate-400"/> {data.time}</div>
                                <button onClick={() => handleDeleteRecord(data.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition active:scale-90"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className="bg-[#2d334d] p-4 rounded-xl border border-[#3b4363] mb-4 relative overflow-hidden">
                              <div className="text-[#94a3b8] text-xs font-medium mb-1">ยอดนำส่งสุทธิรวม (เงินสด + โอน)</div>
                              <div className="text-3xl font-extrabold text-[#fcd34d] mb-3">{formatNum(((Number(data.actualCash) || 0) - (Number(data.nextFloat) || 0)) + (Number(data.transferAmount) || 0))} <span className="text-sm font-normal text-slate-400">บาท</span></div>
                              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                                <div className="bg-[#24293f] p-2 rounded-lg border border-[#374160]"><div className="text-[#94a3b8] mb-1">เงินสดส่ง</div><div className="font-bold text-[#60a5fa]">{formatNum((Number(data.actualCash) || 0) - (Number(data.nextFloat) || 0))}</div></div>
                                <div className="bg-[#24293f] p-2 rounded-lg border border-[#374160]"><div className="text-[#94a3b8] mb-1">เงินโอน</div><div className="font-bold text-[#34d399]">{formatNum(data.transferAmount)}</div></div>
                              </div>
                            </div>
                            <div className="bg-[#2d334d] p-4 rounded-xl border border-[#3b4363] mb-4 flex justify-between items-center">
                              <div><div className="text-[#94a3b8] text-xs font-medium mb-1">รายจ่าย: {data.expenseType}</div><div className="text-xl font-extrabold text-[#fb7185]">{formatNum(data.expenseAmount)} บาท</div></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                              <div className="bg-[#24293f] p-2 rounded border border-[#3b4363] flex justify-between"><span className="text-slate-400">เงินเกิน:</span><span className="text-[#fcd34d] font-bold">{formatNum(data.overAmount)}</span></div>
                              <div className="bg-[#24293f] p-2 rounded border border-[#3b4363] flex justify-between"><span className="text-slate-400">เงินหาย:</span><span className="text-[#fb7185] font-bold">{formatNum(data.shortAmount)}</span></div>
                            </div>
                            <div className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363] text-xs grid grid-cols-2 gap-2 text-slate-300">
                              <div><span className="text-slate-500">พนักงาน:</span> {data.cashierName}</div><div><span className="text-slate-500">กะ:</span> {data.shift}</div>
                              <div className="col-span-2"><span className="text-slate-500">หมายเหตุ:</span> {data.notes || '-'}</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-20">
                          <div className="bg-[#24293f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363]"><Search size={30} className="text-[#64748b]" /></div>
                          <p className="text-[#94a3b8] text-sm">ยังไม่มีประวัติของ {activeBranch}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'summary' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10">
              <button onClick={() => { setCurrentView('menu'); setIsUnlocked(false); setPin(''); }} className="p-2 bg-[#24293f] rounded-xl text-white mr-4 active:scale-90 transition border border-[#374160]"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-[#fcd34d] flex items-center"><Lock size={16} className="mr-2"/> สรุปยอดรวม (Manager)</h2>
            </div>
            <div className="p-4">
              {!isUnlocked ? (
                <div className="bg-[#24293f] p-6 sm:p-8 rounded-[20px] border border-[#374160] shadow-2xl text-center mt-6">
                  <div className="w-16 h-16 bg-[#1c2135] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363] shadow-inner"><Lock size={30} className="text-[#64748b]" /></div>
                  <h2 className="text-lg font-bold text-white mb-6">ยืนยันตัวตนผู้จัดการ</h2>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border border-[#3b4363] text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:outline-none focus:border-blue-500 mb-6 font-mono" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('summary')} />
                  <button onClick={() => handleLogin('summary')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.4)] active:scale-95 transition text-base flex justify-center items-center"><Unlock size={18} className="mr-2" /> ปลดล็อคข้อมูล</button>
                </div>
              ) : (
                <div className="bg-[#24293f] p-5 rounded-[20px] border border-[#374160] shadow-xl mb-10">
                   <h3 className="text-white font-bold mb-4 border-b border-[#3b4363] pb-3 flex items-center justify-between">
                     <div className="flex items-center"><BarChart2 size={18} className="mr-2 text-blue-400" /> ตารางกระแสเงินสด</div>
                     <button onClick={handleClearAllHistory} className="text-xs flex items-center text-red-400 bg-red-500/10 px-2 py-1.5 rounded-lg active:scale-95 transition"><Trash2 size={14} className="mr-1" /> ล้างทั้งหมด</button>
                   </h3>
                   <div className="mb-4 flex items-center bg-[#1c2135] p-1.5 rounded-xl border border-[#3b4363]">
                     <div className="bg-[#2d334d] p-2 rounded-lg mr-2"><Filter size={16} className="text-blue-400" /></div>
                     <select value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="bg-transparent text-sm text-white font-bold outline-none w-full appearance-none">
                       <option value="all">ดูทุกวัน (รวมทั้งหมด)</option>
                       {availableDates.map(d => (<option key={d} value={d}>วันที่ {d}</option>))}
                     </select>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse text-sm min-w-[300px]">
                       <thead><tr className="text-[#94a3b8] border-b border-[#3b4363]"><th className="py-3 font-medium">สาขา / กะ</th><th className="py-3 font-medium text-right">ส่งเงินสด</th><th className="py-3 font-medium text-right">เงินโอน</th></tr></thead>
                       <tbody className="text-white">
                         {summary.groupedData.map((branchData, idx) => (
                           <React.Fragment key={idx}>
                             <tr className="bg-[#1c2135]"><td colSpan="3" className="py-2 px-2 text-[#60a5fa] font-bold text-xs border-y border-[#3b4363]">{branchData.branch}</td></tr>
                             {branchData.shifts.map((s, sIdx) => (
                               <tr key={sIdx} className="border-b border-[#3b4363]/30">
                                 <td className="py-2 pl-6 text-xs text-slate-300">- กะ{s.shift}</td>
                                 <td className="py-2 text-right font-mono font-medium">{s.cash !== null ? <span className="text-[#60a5fa]">{formatNum(s.cash)}</span> : <span className="text-slate-600">-</span>}</td>
                                 <td className="py-2 text-right font-mono font-medium">{s.transfer !== null ? <span className="text-[#34d399]">{formatNum(s.transfer)}</span> : <span className="text-slate-600">-</span>}</td>
                               </tr>
                             ))}
                             {branchData.hasData && (
                               <tr className="bg-[#24293f] border-b border-[#3b4363]">
                                 <td className="py-2 pl-3 text-xs text-[#fcd34d] font-bold">รวมยอด {branchData.branch}</td>
                                 <td className="py-2 text-right text-[#fcd34d] font-mono font-bold">{formatNum(branchData.totalCash)}</td>
                                 <td className="py-2 text-right text-[#fcd34d] font-mono font-bold">{formatNum(branchData.totalTransfer)}</td>
                               </tr>
                             )}
                           </React.Fragment>
                         ))}
                       </tbody>
                       <tfoot>
                         <tr className="font-bold text-base border-t-2 border-[#3b4363] bg-[#1c2135]">
                           <td className="py-4 px-2 text-white text-xs uppercase tracking-wide">รวมสุทธิทุกสาขา</td>
                           <td className="py-4 text-right text-[#fcd34d] font-mono">{formatNum(summary.grandTotalCash)}</td>
                           <td className="py-4 text-right text-[#34d399] font-mono">{formatNum(summary.grandTotalTransfer)}</td>
                         </tr>
                       </tfoot>
                     </table>
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