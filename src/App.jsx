import React, { useState, useEffect } from 'react';
import { Crown, Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Wallet, User, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle, Edit2, X, Info } from 'lucide-react';

// --- 1. นำเข้า Firebase ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

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
  const [currentView, setCurrentView] = useState('menu'); 
  const [activeBranch, setActiveBranch] = useState('');
  const [branchTab, setBranchTab] = useState('form'); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const ADMIN_PIN = '5930'; 

  const [summaryDate, setSummaryDate] = useState('all');
  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [isOnline, setIsOnline] = useState(false);

  const [editingRecord, setEditingRecord] = useState(null);
  const [summaryPopupInfo, setSummaryPopupInfo] = useState(null); 

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
      showToast('กรุณากรอกชื่อพนักงานและเงินสด', 'error');
      return;
    }
    const docId = `TRX-${Date.now()}`;
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
      showToast(`บันทึกเรียบร้อย`, 'success');
      setFormData({ shift: 'เช้า', cashierName: '', floatIn: '', actualCash: '', transferAmount: '', expenseType: 'ค่าของในร้าน', expenseAmount: '', nextFloat: '', overAmount: '', shortAmount: '', notes: '' });
      setIsHistoryUnlocked(true);
      setBranchTab('history');
    } catch (err) { showToast('บันทึกไม่สำเร็จ', 'error'); }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
  };

  const handleUpdateRecord = async () => {
    try {
      const recordRef = doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', editingRecord.id);
      await updateDoc(recordRef, {
        ...editingRecord,
        floatIn: Number(editingRecord.floatIn) || 0,
        actualCash: Number(editingRecord.actualCash) || 0,
        transferAmount: Number(editingRecord.transferAmount) || 0,
        expenseAmount: Number(editingRecord.expenseAmount) || 0,
        nextFloat: Number(editingRecord.nextFloat) || 0,
        overAmount: Number(editingRecord.overAmount) || 0,
        shortAmount: Number(editingRecord.shortAmount) || 0,
      });
      showToast('แก้ไขข้อมูลสำเร็จ', 'success');
      setEditingRecord(null);
    } catch (err) { showToast('แก้ไขไม่สำเร็จ', 'error'); }
  };

  const handleDeleteRecord = (id) => {
    setConfirmDialog({
      show: true,
      message: 'ลบประวัตินี้ถาวร?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', id));
          showToast('ลบรายการสำเร็จ', 'success');
          setConfirmDialog({ show: false, message: '', onConfirm: null });
        } catch (err) { showToast('ลบไม่สำเร็จ', 'error'); }
      }
    });
  };

  const handleClearAllHistory = () => {
    setConfirmDialog({
      show: true,
      message: 'ล้างประวัติทั้งหมด? (ไม่สามารถกู้คืนได้)',
      onConfirm: async () => {
        try {
          for (const record of historyData) {
            await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_shift_records', record.id));
          }
          showToast('ล้างประวัติสำเร็จ', 'success');
          setConfirmDialog({ show: false, message: '', onConfirm: null });
        } catch (err) { showToast('ล้างไม่สำเร็จ', 'error'); }
      }
    });
  };

  const formatNum = (num) => Number(num).toLocaleString('th-TH');

  const getSummaryData = () => {
    const branches = ['สาขา 2', 'สาขา 3', 'สาขา 5'];
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
        if (shiftRecords.length === 0) return { shift: shiftName, cash: null, transfer: null, records: [] };

        const cash = shiftRecords.reduce((sum, r) => sum + ((Number(r.actualCash)||0) - (Number(r.nextFloat)||0)), 0);
        const transfer = shiftRecords.reduce((sum, r) => sum + (Number(r.transferAmount)||0), 0);

        branchTotalCash += cash;
        branchTotalTransfer += transfer;
        return { shift: shiftName, cash, transfer, records: shiftRecords };
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
    <div className="min-h-screen bg-[#111526] font-sans flex justify-center">
      <div className="w-full max-w-md bg-[#161a2b] min-h-screen relative shadow-2xl overflow-x-hidden pb-10">
        
        {/* --- Modal แก้ไขข้อมูลหน้าประวัติ --- */}
        {editingRecord && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-black text-lg flex items-center gap-2"><Edit2 className="text-blue-400" /> แก้ไขข้อมูลประวัติ</h3>
                <button onClick={() => setEditingRecord(null)} className="p-2 text-slate-400"><X size={20}/></button>
              </div>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div><label className={labelStyle}>ชื่อพนักงาน</label><input type="text" className={inputStyle} value={editingRecord.cashierName} onChange={e => setEditingRecord({...editingRecord, cashierName: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>ทอนเริ่มกะ</label><input type="number" className={inputStyle} value={editingRecord.floatIn} onChange={e => setEditingRecord({...editingRecord, floatIn: e.target.value})} /></div>
                  <div><label className={labelStyle}>เงินสดในเก๊ะ</label><input type="number" className={inputStyle} value={editingRecord.actualCash} onChange={e => setEditingRecord({...editingRecord, actualCash: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>หักทอนใหม่</label><input type="number" className={inputStyle} value={editingRecord.nextFloat} onChange={e => setEditingRecord({...editingRecord, nextFloat: e.target.value})} /></div>
                  <div><label className={labelStyle}>ยอดโอน/QR</label><input type="number" className={inputStyle} value={editingRecord.transferAmount} onChange={e => setEditingRecord({...editingRecord, transferAmount: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>รายจ่าย</label><input type="number" className={inputStyle} value={editingRecord.expenseAmount} onChange={e => setEditingRecord({...editingRecord, expenseAmount: e.target.value})} /></div>
                  <div><label className={labelStyle}>ค่าอะไร</label><input type="text" className={inputStyle} value={editingRecord.expenseType} onChange={e => setEditingRecord({...editingRecord, expenseType: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelStyle}>เงินเกิน</label><input type="number" className={inputStyle} value={editingRecord.overAmount} onChange={e => setEditingRecord({...editingRecord, overAmount: e.target.value})} /></div>
                  <div><label className={labelStyle}>เงินขาด</label><input type="number" className={inputStyle} value={editingRecord.shortAmount} onChange={e => setEditingRecord({...editingRecord, shortAmount: e.target.value})} /></div>
                </div>
                <div><label className={labelStyle}>หมายเหตุ</label><textarea className={inputStyle} value={editingRecord.notes} onChange={e => setEditingRecord({...editingRecord, notes: e.target.value})} /></div>
              </div>
              <button onClick={handleUpdateRecord} className="w-full mt-6 py-4 bg-emerald-600 text-white font-bold rounded-xl active:scale-95 transition shadow-lg">บันทึกการแก้ไข</button>
            </div>
          </div>
        )}

        {/* --- Modal ป๊อปอัพหน้าสรุปยอดรวม --- */}
        {summaryPopupInfo && (
          <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSummaryPopupInfo(null)}>
            <div className="bg-[#24293f] border border-[#3b4363] rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white font-black text-lg flex items-center gap-2"><BarChart2 className="text-blue-400" /> {summaryPopupInfo.title}</h3>
                <button onClick={() => setSummaryPopupInfo(null)} className="p-2 text-slate-400 bg-[#1c2135] rounded-full"><X size={18}/></button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {summaryPopupInfo.records.map((r, i) => (
                  <div key={i} className="bg-[#1c2135] p-4 rounded-2xl border border-[#3b4363] mb-3 last:mb-0">
                    <div className="flex justify-between items-center border-b border-[#3b4363] pb-2 mb-3">
                      <div className="font-bold text-blue-400">พนักงาน: <span className="text-white">{r.cashierName}</span></div>
                      <div className="text-xs text-slate-500">{r.time}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                      <div className="bg-[#24293f] p-2 rounded-lg border border-[#374160]">
                        <span className="text-slate-400 block mb-1">เงินทอนเริ่มกะ</span>
                        <span className="text-white font-bold text-sm">{formatNum(r.floatIn)} ฿</span>
                      </div>
                      <div className="bg-[#24293f] p-2 rounded-lg border border-[#374160]">
                        <span className="text-slate-400 block mb-1">หักทอนกะใหม่</span>
                        <span className="text-blue-400 font-bold text-sm">{formatNum(r.nextFloat)} ฿</span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20 mb-3 flex justify-between items-center">
                      <span className="text-emerald-300 font-bold">ส่งเงินสดจริง</span>
                      <span className="text-emerald-400 font-black text-lg">{formatNum((Number(r.actualCash)||0) - (Number(r.nextFloat)||0))} ฿</span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex justify-between"><span className="text-slate-500">ยอดเงินโอน/QR:</span> <span>{formatNum(r.transferAmount)} ฿</span></div>
                      {(Number(r.expenseAmount) > 0) && (
                         <div className="flex justify-between text-rose-400"><span className="text-rose-500">รายจ่าย ({r.expenseType}):</span> <span>-{formatNum(r.expenseAmount)} ฿</span></div>
                      )}
                      {(Number(r.overAmount) > 0) && <div className="flex justify-between text-amber-400"><span>เงินเกิน:</span> <span>+{formatNum(r.overAmount)} ฿</span></div>}
                      {(Number(r.shortAmount) > 0) && <div className="flex justify-between text-rose-400"><span>เงินขาด:</span> <span>-{formatNum(r.shortAmount)} ฿</span></div>}
                    </div>
                    {r.notes && <div className="mt-3 p-2 bg-[#2d334d] rounded-lg text-[10px] text-slate-400 border border-[#3b4363]">หมายเหตุ: {r.notes}</div>}
                  </div>
                ))}
              </div>
              <button onClick={() => setSummaryPopupInfo(null)} className="w-full mt-4 py-3.5 bg-blue-600 text-white font-bold rounded-xl active:scale-95 transition">ปิดหน้าต่าง</button>
            </div>
          </div>
        )}

        {/* --- Dialog ยืนยันการลบ --- */}
        {confirmDialog.show && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">ยืนยันการลบ?</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex space-x-3">
                <button onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })} className="flex-1 py-3 rounded-xl bg-[#1c2135] text-white border border-[#3b4363]">ยกเลิก</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold">ยืนยัน</button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`absolute top-4 left-4 right-4 p-3 rounded-xl shadow-2xl flex items-center z-50 border backdrop-blur-md transition-all ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <ShieldAlert size={20} className="mr-2" />}
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
        )}

        {/* ================= เมนูหลัก ================= */}
        {currentView === 'menu' && (
          <div className="p-5 pb-10">
            <div className="flex flex-col items-center justify-center mt-6 mb-8">
              <div className="w-20 h-20 bg-[#24293f] rounded-full flex items-center justify-center shadow-lg border border-[#374160] mb-4"><Crown size={40} className="text-[#fcd34d]" /></div>
              <h1 className="text-2xl font-black text-[#fcd34d] tracking-wider">ระบบปิดกะ</h1>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1 uppercase">Shift Management System</p>
            </div>
            <div className="space-y-1">
              <MenuButton title="ปิดกะสาขา 2" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#884fff] to-[#713be5]" onClick={() => handleEnterBranch('สาขา 2')} />
              <MenuButton title="ปิดกะสาขา 3" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#f03b4b] to-[#d62837]" onClick={() => handleEnterBranch('สาขา 3')} />
              <MenuButton title="ปิดกะสาขา 5" subtitle="ลงฟอร์มปิดยอด / เช็คประวัติ" icon={Store} bgClass="bg-gradient-to-r from-[#0ea5e9] to-[#0284c7]" onClick={() => handleEnterBranch('สาขา 5')} />
              <div className="pt-4 mt-4 border-t border-[#2d334d]"></div>
              <button onClick={() => setCurrentView('summary')} className="w-full rounded-[16px] bg-[#2b3040] border border-[#3b4363] p-4 flex items-center justify-center active:scale-95 shadow-lg">
                 <Lock size={20} className="text-[#fcd34d] mr-3" />
                 <span className="text-white font-bold">สรุปยอดรวมทุกสาขา</span>
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
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10">
              <button onClick={() => { setCurrentView('menu'); setIsHistoryUnlocked(false); setPin(''); }} className="p-2 bg-[#24293f] rounded-xl text-white mr-4 border border-[#374160]"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-white flex items-center"><MapPin size={16} className="text-[#60a5fa] mr-2"/> {activeBranch}</h2>
            </div>
            <div className="flex p-4 space-x-3 bg-[#161a2b]">
              <button onClick={() => setBranchTab('form')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'form' ? 'bg-[#2563eb] text-white shadow-lg' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}><FileText size={16} className="mr-2"/> ลงข้อมูล</button>
              <button onClick={() => setBranchTab('history')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'history' ? 'bg-[#2563eb] text-white shadow-lg' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}>
                {isHistoryUnlocked ? <Search size={16} className="mr-2"/> : <Lock size={16} className="mr-2"/>} ประวัติกะ
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              {branchTab === 'form' ? (
                <div className="bg-[#24293f] p-5 rounded-[20px] border border-[#374160] shadow-xl">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2"><label className={labelStyle}>ชื่อพนักงาน</label><input type="text" value={formData.cashierName} onChange={(e) => setFormData({...formData, cashierName: e.target.value})} className={inputStyle} placeholder="ระบุชื่อ..." /></div>
                    <div><label className={labelStyle}>กะ</label><select value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})} className={inputStyle}><option>เช้า</option><option>บ่าย</option><option>ดึก</option></select></div>
                    <div><label className={labelStyle}>เงินทอนเริ่มกะ</label><input type="number" value={formData.floatIn} onChange={(e) => setFormData({...formData, floatIn: e.target.value})} className={inputStyle} placeholder="0" /></div>
                  </div>
                  <div className="bg-[#1c2135] p-4 rounded-xl border border-[#3b4363] mb-4">
                    <h3 className="text-white text-sm font-bold mb-3 flex items-center"><Wallet size={16} className="mr-2 text-yellow-400"/> สรุปยอดเงิน (บาท)</h3>
                    <div className="space-y-3">
                      <div><label className={labelStyle}>เงินสดนับได้จริง</label><input type="number" value={formData.actualCash} onChange={(e) => setFormData({...formData, actualCash: e.target.value})} className={`${inputStyle} border-blue-500/50 bg-blue-900/10 text-blue-300 font-bold text-lg`} placeholder="0" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelStyle}>ทอนกะใหม่</label><input type="number" value={formData.nextFloat} onChange={(e) => setFormData({...formData, nextFloat: e.target.value})} className={inputStyle} placeholder="0" /></div>
                        <div><label className={labelStyle}>ยอดเงินโอน</label><input type="number" value={formData.transferAmount} onChange={(e) => setFormData({...formData, transferAmount: e.target.value})} className={inputStyle} placeholder="0" /></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#1c2135] p-4 rounded-xl border border-[#3b4363] mb-4">
                    <label className={labelStyle}>รายจ่ายในกะ</label>
                    <div className="flex gap-2 mb-3">
                      <select value={formData.expenseType} onChange={(e) => setFormData({...formData, expenseType: e.target.value})} className={`${inputStyle} w-1/2`}><option>ค่าของในร้าน</option><option>เบิกค่าแรง</option><option>อื่นๆ</option></select>
                      <input type="number" value={formData.expenseAmount} onChange={(e) => setFormData({...formData, expenseAmount: e.target.value})} className={`${inputStyle} w-1/2 text-red-400`} placeholder="0" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className={labelStyle}>ยอดเงินเกิน</label><input type="number" value={formData.overAmount} onChange={(e) => setFormData({...formData, overAmount: e.target.value})} className={`${inputStyle} text-yellow-400`} placeholder="0" /></div>
                      <div><label className={labelStyle}>ยอดเงินหาย</label><input type="number" value={formData.shortAmount} onChange={(e) => setFormData({...formData, shortAmount: e.target.value})} className={`${inputStyle} text-red-400`} placeholder="0" /></div>
                    </div>
                  </div>
                  <div className="mb-6"><label className={labelStyle}>หมายเหตุ</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" className={`${inputStyle} resize-none`} placeholder="อธิบายเพิ่มเติม..."></textarea></div>
                  <button onClick={handleSaveShift} className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition"><CheckCircle size={20} className="mr-2 inline-block" /> ยืนยันบันทึกปิดกะ</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isHistoryUnlocked ? (
                    <div className="bg-[#24293f] p-8 rounded-[20px] border border-[#374160] shadow-2xl text-center mt-4">
                      <div className="w-16 h-16 bg-[#1c2135] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363]"><Lock size={30} className="text-[#64748b]" /></div>
                      <h2 className="text-lg font-bold text-white mb-6">รหัสผ่านสำหรับดูประวัติ</h2>
                      <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border border-[#3b4363] text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:border-blue-500 mb-6 font-mono" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('history')} />
                      <button onClick={() => handleLogin('history')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl active:scale-95 transition flex justify-center items-center"><Unlock size={18} className="mr-2" /> ปลดล็อคข้อมูล</button>
                    </div>
                  ) : (
                    <>
                      {historyData.filter(d => d.branch === activeBranch).map((data, index) => (
                         <div key={data.id || index} className="bg-[#24293f] rounded-[20px] p-5 border border-[#374160] shadow-xl w-full mb-6">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center space-x-2 bg-[#2d334d] px-3 py-1.5 rounded-lg border border-[#3b4363]"><Calendar size={14} className="text-pink-400" /><span className="text-[#5eead4] font-bold text-xs">{data.date}</span></div>
                              <div className="flex items-center space-x-2">
                                <div className="text-xs font-bold text-slate-400 mr-2">{data.time}</div>
                                <button onClick={() => openEditModal(data)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 active:scale-90 transition"><Edit2 size={16} /></button>
                                <button onClick={() => handleDeleteRecord(data.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 active:scale-90 transition"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className="bg-[#2d334d] p-4 rounded-xl border border-[#3b4363] mb-3">
                              <div className="text-[#94a3b8] text-[10px] font-bold mb-1 uppercase tracking-widest">ยอดนำส่งสุทธิรวม</div>
                              <div className="text-2xl font-extrabold text-[#fcd34d]">{formatNum(((Number(data.actualCash) || 0) - (Number(data.nextFloat) || 0)) + (Number(data.transferAmount) || 0))} ฿</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                              <div className="bg-[#1c2135] p-2.5 rounded-xl border border-[#3b4363]">
                                <span className="text-slate-400 block mb-1">เงินทอนเริ่มกะ</span>
                                <span className="text-white font-bold">{formatNum(data.floatIn)} ฿</span>
                              </div>
                              <div className="bg-[#1c2135] p-2.5 rounded-xl border border-[#3b4363]">
                                <span className="text-slate-400 block mb-1">ทอนกะใหม่</span>
                                <span className="text-blue-400 font-bold">{formatNum(data.nextFloat)} ฿</span>
                              </div>
                            </div>

                            <div className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363] text-xs grid grid-cols-2 gap-2 text-slate-300">
                              <div><span className="text-slate-500">พนักงาน:</span> {data.cashierName}</div><div><span className="text-slate-500">กะ:</span> {data.shift}</div>
                              <div className="col-span-2 truncate"><span className="text-slate-500">หมายเหตุ:</span> {data.notes || '-'}</div>
                            </div>
                         </div>
                      ))}
                      {historyData.filter(d => d.branch === activeBranch).length === 0 && (
                        <div className="text-center py-20 text-[#94a3b8] text-sm"><Search size={30} className="mx-auto mb-2 opacity-50"/> ไม่มีประวัติกะ</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= สรุปยอดรวม (ตารางแยกสาขา + ป๊อปอัพ) ================= */}
        {currentView === 'summary' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10 shadow-lg">
              <button onClick={() => { setCurrentView('menu'); setIsUnlocked(false); setPin(''); }} className="p-2 bg-[#24293f] rounded-xl text-white mr-4 border border-[#374160]"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-[#fcd34d] flex items-center"><Lock size={16} className="mr-2"/> สรุปยอดรวม (แยกสาขา)</h2>
            </div>
            
            <div className="p-4">
              {!isUnlocked ? (
                <div className="bg-[#24293f] p-8 rounded-[20px] border border-[#374160] shadow-2xl text-center mt-6">
                  <div className="w-16 h-16 bg-[#1c2135] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363]"><Lock size={30} className="text-[#64748b]" /></div>
                  <h2 className="text-lg font-bold text-white mb-6">รหัสผ่านผู้จัดการ</h2>
                  <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border border-[#3b4363] text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:border-blue-500 mb-6 font-mono" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('summary')} />
                  <button onClick={() => handleLogin('summary')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl active:scale-95 transition"><Unlock size={18} className="mr-2 inline-block" /> ปลดล็อคข้อมูล</button>
                </div>
              ) : (
                <div className="pb-10">
                   <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center bg-[#24293f] p-2 rounded-xl border border-[#3b4363] shadow-lg flex-1 mr-3">
                        <Filter size={18} className="text-blue-400 mx-2" />
                        <select value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="bg-transparent text-sm text-white font-bold outline-none w-full appearance-none">
                          <option value="all">ดูทุกวัน (รวมทั้งหมด)</option>
                          {availableDates.map(d => (<option key={d} value={d}>วันที่ {d}</option>))}
                        </select>
                      </div>
                      <button onClick={handleClearAllHistory} className="p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 active:scale-95 transition shadow-lg"><Trash2 size={18}/></button>
                   </div>

                   {summary.groupedData.map((branchData, idx) => (
                     <div key={idx} className="bg-[#24293f] p-4 rounded-[20px] border border-[#3b4363] shadow-xl mb-6">
                        <h4 className="text-[#60a5fa] font-black text-base mb-3 flex items-center pb-3 border-b border-[#3b4363]">
                          <Store size={18} className="mr-2"/> {branchData.branch}
                        </h4>
                        
                        {branchData.hasData ? (
                          <div className="overflow-hidden rounded-xl border border-[#1c2135]">
                            <table className="w-full text-left text-sm bg-[#1c2135]">
                              <thead>
                                <tr className="text-[#94a3b8] bg-[#161a2b] border-b border-[#3b4363]">
                                  <th className="py-3 px-3 font-medium">กะ (คลิกได้)</th>
                                  <th className="py-3 px-3 font-medium text-right">เงินสดส่ง</th>
                                  <th className="py-3 px-3 font-medium text-right">เงินโอน</th>
                                </tr>
                              </thead>
                              <tbody>
                                {branchData.shifts.map((s, sIdx) => (
                                  <tr 
                                    key={sIdx} 
                                    className={`border-b border-[#3b4363]/30 text-white last:border-0 ${s.records.length > 0 ? 'cursor-pointer hover:bg-[#2d334d]/80 transition' : ''}`}
                                    onClick={() => {
                                      if(s.records.length > 0) {
                                        setSummaryPopupInfo({ title: `${branchData.branch} - กะ${s.shift}`, records: s.records });
                                      }
                                    }}
                                  >
                                    <td className="py-3 px-3 text-xs flex items-center gap-1.5">
                                      {s.shift} {s.records.length > 0 && <span className="bg-blue-500/20 text-blue-400 rounded-full p-1"><Info size={12}/></span>}
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono font-bold">{s.cash !== null ? <span className="text-blue-300">{formatNum(s.cash)}</span> : <span className="text-slate-600">-</span>}</td>
                                    <td className="py-3 px-3 text-right font-mono font-bold">{s.transfer !== null ? <span className="text-[#34d399]">{formatNum(s.transfer)}</span> : <span className="text-slate-600">-</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="bg-[#2d334d] border-t border-[#3b4363]">
                                  <td className="py-3 px-3 text-xs text-[#fcd34d] font-bold">รวม</td>
                                  <td className="py-3 px-3 text-right text-[#fcd34d] font-mono font-black">{formatNum(branchData.totalCash)}</td>
                                  <td className="py-3 px-3 text-right text-[#fcd34d] font-mono font-black">{formatNum(branchData.totalTransfer)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-slate-500 text-xs bg-[#1c2135] rounded-xl border border-[#3b4363]">ไม่มีข้อมูลในวันดังกล่าว</div>
                        )}
                     </div>
                   ))}

                   <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 p-5 rounded-[20px] border border-blue-500/30 shadow-2xl mt-8">
                      <div className="text-center mb-4"><div className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mb-1">ยอดรวมสุทธิทุกสาขา</div><div className="text-3xl font-black text-white">{formatNum(summary.grandTotalCash + summary.grandTotalTransfer)} <span className="text-sm font-normal">฿</span></div></div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363]"><div className="text-xs text-slate-400 mb-1">ยอดเงินสดรวม</div><div className="text-lg font-black text-[#60a5fa]">{formatNum(summary.grandTotalCash)}</div></div>
                        <div className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363]"><div className="text-xs text-slate-400 mb-1">ยอดเงินโอนรวม</div><div className="text-lg font-black text-[#34d399]">{formatNum(summary.grandTotalTransfer)}</div></div>
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