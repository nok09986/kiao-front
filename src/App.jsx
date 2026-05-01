import React, { useState, useEffect } from 'react';
import { Droplets, Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle, Info, X, ChefHat, Users, Box } from 'lucide-react';

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

const WATER_MENU = {
  "💧 น้ำสด 1.5L": ["บลู", "ใบเตย", "ชาไทย", "ชาเขียว", "ไร้กลิ่น", "ผลไม้รวม"],
  "💧 น้ำสด 1.0L": ["บลู", "ใบเตย", "ชาไทย", "ไร้กลิ่น"],
  "🍓 น้ำผลไม้ 1.5L": ["แอปเปิ้ล", "สตอเบอรี่", "องุ่น", "ลิ้นจี่", "สับปะรด", "แคนตาลูป", "โยเกิร์ต"]
};

export default function App() {
  const [currentView, setCurrentView] = useState('menu'); 
  const [activeBranch, setActiveBranch] = useState('');
  const [branchTab, setBranchTab] = useState('form'); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isHistoryUnlocked, setIsHistoryUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const ADMIN_PIN = '5930'; 

  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [isOnline, setIsOnline] = useState(false);
  const [selectedWaterDetail, setSelectedWaterDetail] = useState(null);

  // ฟอร์มบันทึกยอดแบบเดิม (ต้มน้ำ + จ่ายพนักงาน + สต็อกขวด)
  const [formData, setFormData] = useState({
    shift: 'เช้า', 
    submitterName: '', 
    notes: '',
    waterProduction: {}, // { key: { pots, leftover, deducted, maker } }
    employeePayout: '', // ยอดจ่ายพนักงานรวม
    bottleStock: {
       "1.5L": { initial: '', added: '', damaged: '' },
       "1.0L": { initial: '', added: '', damaged: '' }
    }
  });

  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(err => console.error("Auth err:", err));
    onAuthStateChanged(auth, (u) => setIsOnline(!!u));
    if (!db) return;
    const recordsRef = collection(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_factory_records');
    const unsubRec = onSnapshot(recordsRef, (snapshot) => {
      const records = [];
      snapshot.forEach(docSnap => records.push({ id: docSnap.id, ...docSnap.data() }));
      records.sort((a, b) => b.timestamp - a.timestamp);
      setHistoryData(records);
    });
    return () => unsubRec();
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

  const handleWaterInput = (cat, flavor, field, val) => {
    const key = `${cat}|||${flavor}`;
    setFormData(prev => ({
      ...prev,
      waterProduction: { ...prev.waterProduction, [key]: { ...(prev.waterProduction[key] || { pots: '', leftover: '', deducted: '', maker: '' }), [field]: val } }
    }));
  };

  const handleSaveAll = async () => {
    if (!formData.submitterName) return showToast('กรุณากรอกชื่อผู้ส่งยอด', 'error');

    // คำนวณยอดรวมน้ำ
    const waterTotals = { totalPots: 0, totalNetBottles: 0 };
    Object.entries(formData.waterProduction).forEach(([key, data]) => {
      const [cat] = key.split('|||');
      const mult = cat.includes('1.0') ? 24 : 16;
      const p = Number(data.pots) || 0;
      const l = Number(data.leftover) || 0;
      const d = Number(data.deducted) || 0;
      waterTotals.totalPots += p;
      waterTotals.totalNetBottles += (p * mult) + l - d;
    });

    const docId = `FACT-${Date.now()}`;
    const newRecord = {
      ...formData,
      branch: activeBranch, 
      waterTotals,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('th-TH'),
      time: new Date().toTimeString().slice(0, 8),
    };

    try {
      await setDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_factory_records', docId), newRecord);
      showToast(`บันทึกข้อมูลเรียบร้อย`, 'success');
      setFormData({ shift: 'เช้า', submitterName: '', notes: '', waterProduction: {}, employeePayout: '', bottleStock: { "1.5L": { initial: '', added: '', damaged: '' }, "1.0L": { initial: '', added: '', damaged: '' } } });
      setBranchTab('history');
      setIsHistoryUnlocked(true);
    } catch (err) { showToast('เกิดข้อผิดพลาดในการบันทึก', 'error'); }
  };

  const handleDeleteRecord = (id) => {
    setConfirmDialog({
      show: true,
      message: 'ต้องการลบข้อมูลประวัตินี้ใช่หรือไม่?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_factory_records', id));
          showToast('ลบรายการสำเร็จ', 'success');
          setConfirmDialog({ show: false, message: '', onConfirm: null });
        } catch (err) { showToast('ลบข้อมูลไม่สำเร็จ', 'error'); }
      }
    });
  };

  const handleEnterBranch = (branchName) => {
    setActiveBranch(branchName);
    setBranchTab('form');
    setCurrentView('branch');
    setIsHistoryUnlocked(false); 
    setPin('');
  };

  const MenuButton = ({ title, subtitle, bgClass, onClick }) => (
    <button onClick={onClick} className={`w-full rounded-[20px] p-5 flex items-center mb-4 transition-all active:scale-95 shadow-lg ${bgClass}`}>
      <div className="bg-white text-gray-800 p-3 rounded-2xl mr-4 shadow-sm"><Store size={26} /></div>
      <div className="text-left">
        <div className="text-xl font-black text-white leading-tight">{title}</div>
        <div className="text-xs text-white/80 mt-1 font-medium">{subtitle}</div>
      </div>
    </button>
  );

  const inputStyle = "w-full bg-[#1c2135] border border-[#3b4363] rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition text-sm font-bold";
  const labelStyle = "block text-[#94a3b8] text-[10px] font-black uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen bg-[#111526] font-sans flex justify-center pb-10">
      <div className="w-full max-w-md bg-[#161a2b] min-h-screen relative shadow-2xl overflow-x-hidden">
        
        {/* --- MODAL: รายละเอียด --- */}
        {selectedWaterDetail && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-white font-black text-xl flex items-center gap-2"><Droplets className="text-blue-400" /> รายละเอียดการผลิต</h3>
                   <p className="text-slate-400 text-xs mt-1">ยอดรวม {selectedWaterDetail.waterTotals?.totalNetBottles || 0} ขวด</p>
                </div>
                <button onClick={() => setSelectedWaterDetail(null)} className="p-2 bg-[#1c2135] text-slate-400 rounded-full"><X size={20}/></button>
              </div>
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(selectedWaterDetail.waterProduction || {}).map(([key, data]) => {
                  const [cat, flavor] = key.split('|||');
                  const mult = cat.includes('1.0') ? 24 : 16;
                  const p = Number(data.pots) || 0;
                  const l = Number(data.leftover) || 0;
                  const d = Number(data.deducted) || 0;
                  if (p === 0 && l === 0 && d === 0) return null;
                  return (
                    <div key={key} className="bg-[#1c2135] p-3 rounded-2xl border border-[#3b4363]">
                      <div className="text-slate-200 font-black text-sm mb-2 flex justify-between">
                         <span>{cat.split(' ').pop()} {flavor}</span>
                         <span className="text-emerald-400">{(p * mult) + l - d} ขวด</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                        {data.maker && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">โดย: {data.maker}</span>}
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">หม้อ: {p}</span>
                        <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">เศษ: {l}</span>
                        <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">หัก: {d}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* บัญชีขวดใน Modal */}
              <div className="mt-4 pt-4 border-t border-[#3b4363]">
                 <h4 className="text-white text-xs font-black mb-2 flex items-center gap-2"><Box size={14} className="text-amber-400"/> สรุปขวดเปล่า</h4>
                 <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {Object.entries(selectedWaterDetail.bottleStock || {}).map(([size, stock]) => (
                       <div key={size} className="bg-amber-400/5 p-2 rounded-xl border border-amber-400/20">
                          <div className="text-amber-400 font-bold mb-1">ขวด {size}</div>
                          <div className="text-white">คงเหลือ: <span className="text-emerald-400 font-black">{(Number(stock.initial) + Number(stock.added)) - (Number(selectedWaterDetail.waterTotals?.totalNetBottles) || 0) - Number(stock.damaged)}</span></div>
                       </div>
                    ))}
                 </div>
              </div>
              <button onClick={() => setSelectedWaterDetail(null)} className="w-full mt-6 py-4 bg-blue-600 text-white font-black rounded-2xl active:scale-95 transition shadow-lg shadow-blue-900/20">ตกลง</button>
            </div>
          </div>
        )}

        {/* --- UI หลัก --- */}
        {currentView === 'menu' && (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center mt-10 mb-12">
              <div className="w-24 h-24 bg-blue-600/20 rounded-full flex items-center justify-center shadow-2xl border-4 border-blue-600/30 mb-5 animate-pulse"><Droplets size={50} className="text-blue-500" /></div>
              <h1 className="text-3xl font-black text-white tracking-tight">ระบบทีมต้ม</h1>
              <p className="text-[10px] text-blue-400 tracking-[0.3em] mt-2 uppercase font-black">Factory Management</p>
            </div>
            <div className="space-y-1">
              <MenuButton title="ยอดต้มสาขา 1" subtitle="ต้มน้ำ / สต็อกขวด / จ่ายพนักงาน" bgClass="bg-gradient-to-br from-[#1eb882] to-[#0d8a5d]" onClick={() => handleEnterBranch('สาขา 1')} />
              <MenuButton title="ยอดต้มสาขา 2" subtitle="ต้มน้ำ / สต็อกขวด / จ่ายพนักงาน" bgClass="bg-gradient-to-br from-[#884fff] to-[#632dd9]" onClick={() => handleEnterBranch('สาขา 2')} />
              <MenuButton title="ยอดต้มสาขา 3" subtitle="ต้มน้ำ / สต็อกขวด / จ่ายพนักงาน" bgClass="bg-gradient-to-br from-[#f03b4b] to-[#c41e2d]" onClick={() => handleEnterBranch('สาขา 3')} />
              <MenuButton title="ยอดต้มสาขา 4" subtitle="ต้มน้ำ / สต็อกขวด / จ่ายพนักงาน" bgClass="bg-gradient-to-br from-[#f58810] to-[#d66b0a]" onClick={() => handleEnterBranch('สาขา 4')} />
              <MenuButton title="ยอดต้มสาขา 5" subtitle="ต้มน้ำ / สต็อกขวด / จ่ายพนักงาน" bgClass="bg-gradient-to-br from-[#0ea5e9] to-[#0284c7]" onClick={() => handleEnterBranch('สาขา 5')} />
            </div>
            <div className="mt-12 text-center">
               {isOnline ? <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">● ONLINE PRODUCTION</span> : <span className="text-amber-500 text-[10px]">CONNECTING...</span>}
            </div>
          </div>
        )}

        {currentView === 'branch' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10 shadow-lg">
              <button onClick={() => { setCurrentView('menu'); setIsHistoryUnlocked(false); setPin(''); }} className="p-2.5 bg-[#24293f] rounded-2xl text-white mr-4 border border-[#374160] shadow-sm"><ChevronLeft size={22} /></button>
              <h2 className="text-lg font-black text-white flex items-center gap-2"><MapPin size={18} className="text-blue-500"/> {activeBranch}</h2>
            </div>
            
            <div className="flex p-4 gap-3 bg-[#161a2b]">
              <button onClick={() => setBranchTab('form')} className={`flex-1 py-4 rounded-[20px] text-xs font-black flex justify-center items-center transition-all ${branchTab === 'form' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}><FileText size={16} className="mr-2"/> ลงข้อมูล</button>
              <button onClick={() => setBranchTab('history')} className={`flex-1 py-4 rounded-[20px] text-xs font-black flex justify-center items-center transition-all ${branchTab === 'history' ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/30' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}>
                {isHistoryUnlocked ? <Search size={16} className="mr-2"/> : <Lock size={16} className="mr-2"/>} ประวัติ
              </button>
            </div>

            <div className="p-4 pb-20 overflow-y-auto">
              {branchTab === 'form' ? (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                  {/* --- บันทึกพนักงาน --- */}
                  <div className="bg-[#24293f] p-5 rounded-[2.5rem] border border-[#374160] shadow-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><label className={labelStyle}>ชื่อพนักงานทีมต้ม (ผู้ส่ง)</label><input type="text" value={formData.submitterName} onChange={(e) => setFormData({...formData, submitterName: e.target.value})} className={inputStyle} placeholder="ระบุชื่อ..." /></div>
                      <div className="col-span-2"><label className={labelStyle}>กะการทำงาน</label>
                        <div className="flex gap-2">
                           {['เช้า', 'บ่าย', 'ดึก'].map(s => <button key={s} onClick={() => setFormData({...formData, shift: s})} className={`flex-1 py-2.5 rounded-xl font-black text-xs transition-all ${formData.shift === s ? 'bg-blue-600 text-white' : 'bg-[#1c2135] text-slate-500 border border-[#3b4363]'}`}>{s}</button>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- บันทึกยอดน้ำ --- */}
                  <div className="bg-[#24293f] p-5 rounded-[2.5rem] border border-blue-500/20 shadow-xl">
                    <h3 className="text-white text-sm font-black mb-5 flex items-center gap-2"><Droplets size={18} className="text-blue-500"/> บันทึกยอดน้ำที่ผลิตเสร็จ</h3>
                    {Object.entries(WATER_MENU).map(([cat, flavors]) => (
                      <div key={cat} className="mb-8 last:mb-0">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 px-2 bg-blue-500/5 py-1.5 rounded-lg border border-blue-500/10 inline-block">{cat}</div>
                        <div className="space-y-4">
                          {flavors.map(f => {
                            const key = `${cat}|||${f}`;
                            return (
                              <div key={f} className="bg-[#1c2135] p-4 rounded-2xl border border-[#3b4363]">
                                <div className="text-xs text-white font-black mb-3 flex justify-between"><span>{f}</span><span className="text-blue-500">ผลิตได้</span></div>
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                   <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">หม้อ</label><input type="number" placeholder="0" className="w-full bg-[#24293f] p-2 text-center text-sm text-blue-400 rounded-xl outline-none border-2 border-transparent focus:border-blue-500 font-black shadow-inner" value={formData.waterProduction[key]?.pots || ''} onChange={(e) => handleWaterInput(cat, f, 'pots', e.target.value)} /></div>
                                   <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">เศษ (ขวด)</label><input type="number" placeholder="0" className="w-full bg-[#24293f] p-2 text-center text-sm text-amber-400 rounded-xl outline-none border-2 border-transparent focus:border-amber-500 font-black shadow-inner" value={formData.waterProduction[key]?.leftover || ''} onChange={(e) => handleWaterInput(cat, f, 'leftover', e.target.value)} /></div>
                                   <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">หัก (ขวด)</label><input type="number" placeholder="0" className="w-full bg-[#24293f] p-2 text-center text-sm text-red-400 rounded-xl outline-none border-2 border-transparent focus:border-red-500 font-black shadow-inner" value={formData.waterProduction[key]?.deducted || ''} onChange={(e) => handleWaterInput(cat, f, 'deducted', e.target.value)} /></div>
                                </div>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ChefHat size={14} className="text-purple-500/50" /></div>
                                  <input type="text" placeholder="ชื่อพนักงานคนต้มกลิ่นนี้..." className="w-full bg-[#24293f] py-2.5 pl-10 pr-3 text-xs text-purple-300 rounded-xl outline-none border border-transparent focus:border-purple-500/50 font-bold" value={formData.waterProduction[key]?.maker || ''} onChange={(e) => handleWaterInput(cat, f, 'maker', e.target.value)} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* --- จ่ายพนักงาน & สต็อกขวด --- */}
                  <div className="bg-[#24293f] p-5 rounded-[2.5rem] border border-amber-500/20 shadow-xl space-y-6">
                    <div>
                       <h3 className="text-white text-sm font-black mb-4 flex items-center gap-2"><Users size={18} className="text-pink-500"/> ยอดจ่ายน้ำพนักงาน</h3>
                       <div className="relative"><input type="number" value={formData.employeePayout} onChange={(e) => setFormData({...formData, employeePayout: e.target.value})} className={`${inputStyle} pl-10 bg-pink-500/5 border-pink-500/20 text-pink-400`} placeholder="ระบุจำนวนขวด..." /><Users size={16} className="absolute left-3.5 top-3.5 text-pink-500/50" /></div>
                    </div>
                    
                    <div>
                       <h3 className="text-white text-sm font-black mb-4 flex items-center gap-2"><Box size={18} className="text-amber-500"/> บัญชีสต็อกขวดเปล่า</h3>
                       {["1.5L", "1.0L"].map(size => (
                         <div key={size} className="mb-4 last:mb-0 bg-[#1c2135] p-4 rounded-2xl border border-[#3b4363]">
                           <div className="text-xs font-black text-amber-500 mb-3 uppercase tracking-widest">ขวดขนาด {size}</div>
                           <div className="grid grid-cols-3 gap-2">
                             <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">ยกมา</label><input type="number" className="w-full bg-[#24293f] p-2 text-center text-xs text-white rounded-lg outline-none border border-transparent font-bold" value={formData.bottleStock[size].initial} onChange={(e) => setFormData({...formData, bottleStock: {...formData.bottleStock, [size]: {...formData.bottleStock[size], initial: e.target.value}}})} /></div>
                             <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">เบิกใหม่</label><input type="number" className="w-full bg-[#24293f] p-2 text-center text-xs text-emerald-400 rounded-lg outline-none border border-transparent font-bold" value={formData.bottleStock[size].added} onChange={(e) => setFormData({...formData, bottleStock: {...formData.bottleStock, [size]: {...formData.bottleStock[size], added: e.target.value}}})} /></div>
                             <div className="space-y-1"><label className="text-[8px] text-slate-500 font-bold block text-center uppercase">หักเสีย</label><input type="number" className="w-full bg-[#24293f] p-2 text-center text-xs text-red-400 rounded-lg outline-none border border-transparent font-bold" value={formData.bottleStock[size].damaged} onChange={(e) => setFormData({...formData, bottleStock: {...formData.bottleStock, [size]: {...formData.bottleStock[size], damaged: e.target.value}}})} /></div>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>

                  <button onClick={handleSaveAll} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-blue-900/50 flex justify-center items-center active:scale-95 transition-all text-lg tracking-wider mt-4"><CheckCircle size={24} className="mr-3" /> ยืนยันบันทึกยอดต้ม</button>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in">
                  {!isHistoryUnlocked ? (
                    <div className="bg-[#24293f] p-10 rounded-[2.5rem] border border-[#374160] shadow-2xl text-center mt-10">
                      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-500/20"><Lock size={40} className="text-blue-500" /></div>
                      <h2 className="text-xl font-black text-white mb-8">ใส่รหัสเพื่อดูประวัติ</h2>
                      <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border-2 border-[#3b4363] text-white text-center text-4xl tracking-[0.5em] p-5 rounded-2xl focus:outline-none focus:border-blue-500 mb-8 font-black" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('history')} />
                      <button onClick={() => handleLogin('history')} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl active:scale-95 transition-all shadow-xl shadow-blue-900/40 text-lg">ปลดล็อคประวัติ</button>
                    </div>
                  ) : (
                    <>
                      {historyData.filter(d => d.branch === activeBranch).map((data, index) => (
                         <div key={data.id || index} className="bg-[#24293f] rounded-[2.5rem] p-6 border border-[#374160] shadow-xl w-full mb-6 animate-in slide-in-from-bottom-4">
                            <div className="flex justify-between items-center mb-6">
                              <div className="flex items-center space-x-2 bg-[#2d334d] px-4 py-2 rounded-2xl border border-[#3b4363] shadow-inner"><Calendar size={14} className="text-blue-400" /><span className="text-[#60a5fa] font-black text-sm">{data.date}</span></div>
                              <button onClick={() => handleDeleteRecord(data.id)} className="p-2.5 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition active:scale-90"><Trash2 size={18} /></button>
                            </div>

                            <div 
                              onClick={() => setSelectedWaterDetail(data)}
                              className="bg-gradient-to-br from-blue-600/20 to-blue-900/10 p-6 rounded-[2rem] border border-blue-500/30 mb-5 flex justify-between items-center cursor-pointer active:scale-95 transition hover:shadow-lg hover:shadow-blue-500/5 group"
                            >
                               <div>
                                  <div className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">ยอดผลิตสุทธิผลิตได้</div>
                                  <div className="text-5xl font-black text-white flex items-end gap-2 leading-none">
                                     {data.waterTotals?.totalNetBottles || 0} <span className="text-base font-bold text-blue-500 mb-1">ขวด</span>
                                  </div>
                                  <div className="flex gap-3 mt-4">
                                     <div className="text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">หม้อ</div><div className="text-xs text-white font-black">{data.waterTotals?.totalPots || 0}</div></div>
                                     <div className="text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">เศษ</div><div className="text-xs text-amber-500 font-black">{data.waterTotals?.totalLeftover || 0}</div></div>
                                     <div className="text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">หัก</div><div className="text-xs text-red-500 font-black">{data.waterTotals?.totalDeducted || 0}</div></div>
                                  </div>
                               </div>
                               <div className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-2xl group-hover:scale-110 transition-transform duration-300 animate-pulse"><Info size={24}/></div>
                            </div>

                            <div className="bg-pink-500/5 p-4 rounded-2xl border border-pink-500/10 mb-5 flex justify-between items-center">
                               <div className="flex items-center gap-3"><div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-500"><Users size={20}/></div><div className="text-xs font-black text-pink-200">ยอดจ่ายพนักงาน</div></div>
                               <div className="text-xl font-black text-pink-500">{data.employeePayout || 0} <span className="text-xs font-bold">ขวด</span></div>
                            </div>

                            <div className="bg-[#1c2135] p-4 rounded-2xl border border-[#3b4363] text-xs flex justify-between text-slate-300 shadow-inner">
                              <div><span className="text-slate-500 font-bold">ผู้ส่งยอด:</span> <span className="text-white font-black ml-1">{data.submitterName}</span></div>
                              <div className="flex items-center gap-1.5"><Clock size={12} className="text-slate-500"/> <span className="text-white font-black uppercase">{data.shift}</span></div>
                            </div>
                         </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Dialog ยืนยันการลบ --- */}
        {confirmDialog.show && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
              <AlertTriangle size={60} className="text-red-500 mx-auto mb-6 animate-bounce" />
              <h3 className="text-white font-black text-xl mb-3">ยืนยันการลบ?</h3>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })} className="flex-1 py-4 rounded-2xl bg-[#1c2135] text-white font-black active:scale-95 transition-all">ยกเลิก</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black shadow-lg shadow-red-900/30 active:scale-95 transition-all">ลบข้อมูล</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}