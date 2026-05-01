import React, { useState, useEffect } from 'react';
import { Droplets, Store, Lock, Unlock, CheckCircle, ShieldAlert, FileText, Search, BarChart2, ChevronLeft, Calendar, Clock, MapPin, Trash2, Filter, AlertTriangle, Info, X, ChefHat } from 'lucide-react';

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

// --- รายการกลิ่นน้ำสำหรับทีมต้ม ---
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
  const ADMIN_PIN = '5930'; // รหัสผ่านสำหรับ Manager/ดูประวัติ

  const [confirmDialog, setConfirmDialog] = useState({ show: false, message: '', onConfirm: null });
  const [isOnline, setIsOnline] = useState(false);

  // State สำหรับ Modal จิ้มดูรายละเอียดน้ำ
  const [selectedWaterDetail, setSelectedWaterDetail] = useState(null);

  // ฟอร์มบันทึกยอดต้มน้ำเพียวๆ
  const [formData, setFormData] = useState({
    shift: 'เช้า', 
    submitterName: '', 
    notes: '',
    waterProduction: {} // เก็บข้อมูล { "cat|||flavor": { pots: 0, leftover: 0, deducted: 0, maker: '' } }
  });

  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(err => console.error("Auth err:", err));
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => { setIsOnline(!!u); });
    
    if (!db) return;
    // ใช้ Collection แยกสำหรับทีมต้มโดยเฉพาะ (ไม่ปนกับปิดกะ)
    const recordsRef = collection(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_water_production_records');
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

  const handleWaterInput = (cat, flavor, field, val) => {
    const key = `${cat}|||${flavor}`;
    setFormData(prev => ({
      ...prev,
      waterProduction: { 
        ...prev.waterProduction, 
        [key]: {
          ...(prev.waterProduction[key] || { pots: '', leftover: '', deducted: '', maker: '' }),
          [field]: val
        }
      }
    }));
  };

  const handleSaveProduction = async () => {
    if (!formData.submitterName) {
      showToast('กรุณากรอกชื่อผู้ส่งยอด', 'error');
      return;
    }

    // คำนวณยอดรวมน้ำอัตโนมัติ
    const waterTotals = { totalPots: 0, totalLeftover: 0, totalDeducted: 0, totalNetBottles: 0 };
    Object.entries(formData.waterProduction).forEach(([key, data]) => {
      const [cat] = key.split('|||');
      const mult = cat.includes('1.0') ? 24 : 16; // 1.0L = 24 ขวด, 1.5L = 16 ขวด
      const p = Number(data.pots) || 0;
      const l = Number(data.leftover) || 0;
      const d = Number(data.deducted) || 0;
      
      waterTotals.totalPots += p;
      waterTotals.totalLeftover += l;
      waterTotals.totalDeducted += d;
      waterTotals.totalNetBottles += (p * mult) + l - d;
    });

    if (waterTotals.totalPots === 0 && waterTotals.totalLeftover === 0) {
      showToast('กรุณากรอกข้อมูลน้ำอย่างน้อย 1 รายการ', 'error');
      return;
    }

    const docId = `WATER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newRecord = {
      ...formData,
      branch: activeBranch, 
      waterTotals: waterTotals, // เก็บสถิติสรุป
      timestamp: Date.now(),
      date: new Date().toLocaleDateString('th-TH'),
      time: new Date().toTimeString().slice(0, 8),
    };

    try {
      await setDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_water_production_records', docId), newRecord);
      showToast(`บันทึกยอดต้มน้ำเรียบร้อย`, 'success');
      setFormData({ shift: 'เช้า', submitterName: '', notes: '', waterProduction: {} });
      setBranchTab('history');
      setIsHistoryUnlocked(true); // ปลดล็อคดูประวัติให้เลยเมื่อส่งเสร็จ
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการบันทึก', 'error');
    }
  };

  const handleDeleteRecord = (id) => {
    setConfirmDialog({
      show: true,
      message: 'ต้องการลบข้อมูลประวัติยอดน้ำนี้ใช่หรือไม่?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'artifacts', 'kiao-shop-pos', 'public', 'data', 'kiao_water_production_records', id));
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

  const MenuButton = ({ title, subtitle, icon: Icon, bgClass, onClick }) => (
    <button onClick={onClick} className={`w-full rounded-[16px] p-4 flex items-center mb-4 transition-transform active:scale-95 shadow-lg ${bgClass}`}>
      <div className="bg-white text-gray-800 p-3.5 rounded-xl mr-4 shrink-0 shadow-sm"><Icon size={24} /></div>
      <div className="text-left">
        <div className="text-lg font-bold text-white leading-tight">{title}</div>
        <div className="text-xs text-white/90 mt-1 font-medium">{subtitle}</div>
      </div>
    </button>
  );

  const inputStyle = "w-full bg-[#1c2135] border border-[#3b4363] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition text-sm";
  const labelStyle = "block text-[#94a3b8] text-xs font-medium mb-1.5";

  return (
    <div className="min-h-screen bg-[#111526] font-sans flex justify-center pb-10">
      <div className="w-full max-w-md bg-[#161a2b] min-h-screen relative shadow-2xl overflow-x-hidden">
        
        {/* --- MODAL: จิ้มดูรายละเอียดน้ำ --- */}
        {selectedWaterDetail && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-[2rem] p-5 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                   <h3 className="text-white font-black text-lg flex items-center gap-2"><Droplets className="text-blue-400" /> แจกแจงยอดน้ำ</h3>
                   <p className="text-slate-400 text-[10px] mt-1">ยอดรวม {selectedWaterDetail.waterTotals?.totalNetBottles || 0} ขวด ({selectedWaterDetail.waterTotals?.totalPots || 0} หม้อ)</p>
                </div>
                <button onClick={() => setSelectedWaterDetail(null)} className="p-2 bg-[#1c2135] text-slate-400 rounded-full hover:text-white"><X size={18}/></button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {selectedWaterDetail.waterProduction && Object.entries(selectedWaterDetail.waterProduction).map(([key, data]) => {
                  const [cat, flavor] = key.split('|||');
                  const mult = cat.includes('1.0') ? 24 : 16;
                  const p = Number(data.pots) || 0;
                  const l = Number(data.leftover) || 0;
                  const d = Number(data.deducted) || 0;
                  const maker = data.maker; // ชื่อพนักงานต้ม
                  
                  if (p === 0 && l === 0 && d === 0) return null; // ซ่อนอันที่ไม่ได้กรอก
                  
                  const net = (p * mult) + l - d;

                  return (
                    <div key={key} className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363]">
                      <div className="text-slate-200 font-bold text-xs mb-2 flex justify-between">
                         <span>{cat.replace('หมวดหมู่น้ำสด ', '').replace('หมวดหมู่น้ำผลไม้ ', '')} {flavor}</span>
                         <span className="text-[#34d399] font-black">{net} ขวด</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        {maker && <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 flex items-center"><ChefHat size={10} className="mr-1"/> คนต้ม: {maker}</span>}
                        {p > 0 && <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30">หม้อ: {p} ({p * mult} ขวด)</span>}
                        {l > 0 && <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">เศษ: {l}</span>}
                        {d > 0 && <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">หัก: {d}</span>}
                      </div>
                    </div>
                  )
                })}
                {(!selectedWaterDetail.waterProduction || Object.keys(selectedWaterDetail.waterProduction).length === 0) && (
                   <div className="text-center py-6 text-slate-500 text-sm">ไม่มีข้อมูลแจกแจงในกะนี้</div>
                )}
              </div>
              <button onClick={() => setSelectedWaterDetail(null)} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-95 transition text-sm">ปิดหน้าต่าง</button>
            </div>
          </div>
        )}

        {/* --- Dialog ยืนยันการลบ --- */}
        {confirmDialog.show && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#24293f] border border-[#3b4363] rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-white font-bold text-lg mb-2">ยืนยันการลบข้อมูล</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex space-x-3">
                <button onClick={() => setConfirmDialog({ show: false, message: '', onConfirm: null })} className="flex-1 py-3 rounded-xl bg-[#1c2135] text-white border border-[#3b4363] font-bold">ยกเลิก</button>
                <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg">ลบข้อมูล</button>
              </div>
            </div>
          </div>
        )}

        {/* --- แจ้งเตือน Toast --- */}
        {toast.show && (
          <div className={`absolute top-4 left-4 right-4 p-3 rounded-xl shadow-2xl flex items-center z-50 border backdrop-blur-md transition-all ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-red-500/90 border-red-400 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} className="mr-2" /> : <ShieldAlert size={20} className="mr-2" />}
            <span className="font-semibold text-sm">{toast.message}</span>
          </div>
        )}

        {/* ================= หน้าเมนูหลัก ================= */}
        {currentView === 'menu' && (
          <div className="p-5 pb-10">
            <div className="flex flex-col items-center justify-center mt-6 mb-8">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center shadow-lg border border-blue-500/20 mb-4"><Droplets size={40} className="text-blue-400" /></div>
              <h1 className="text-2xl font-black text-blue-400 tracking-wider">ระบบทีมต้ม</h1>
              <p className="text-[10px] text-slate-400 tracking-[0.2em] mt-1 uppercase font-bold">Water Production</p>
            </div>
            <div className="space-y-1">
              <MenuButton title="ยอดต้มสาขา 1" subtitle="ลงยอดต้มน้ำ / เช็คประวัติ" icon={Droplets} bgClass="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]" onClick={() => handleEnterBranch('สาขา 1')} />
              <MenuButton title="ยอดต้มสาขา 2" subtitle="ลงยอดต้มน้ำ / เช็คประวัติ" icon={Droplets} bgClass="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]" onClick={() => handleEnterBranch('สาขา 2')} />
              <MenuButton title="ยอดต้มสาขา 3" subtitle="ลงยอดต้มน้ำ / เช็คประวัติ" icon={Droplets} bgClass="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]" onClick={() => handleEnterBranch('สาขา 3')} />
              <MenuButton title="ยอดต้มสาขา 4" subtitle="ลงยอดต้มน้ำ / เช็คประวัติ" icon={Droplets} bgClass="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]" onClick={() => handleEnterBranch('สาขา 4')} />
              <MenuButton title="ยอดต้มสาขา 5" subtitle="ลงยอดต้มน้ำ / เช็คประวัติ" icon={Droplets} bgClass="bg-gradient-to-r from-[#1e40af] to-[#1e3a8a]" onClick={() => handleEnterBranch('สาขา 5')} />
            </div>
            <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
             {isOnline ? <span className="text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE</span> : <span className="text-amber-500">CONNECTING...</span>}
             <span>• Production System</span>
            </div>
          </div>
        )}

        {/* ================= หน้าจัดการสาขา ================= */}
        {currentView === 'branch' && (
          <div className="flex flex-col h-full">
            <div className="bg-[#1e2336] p-4 flex items-center border-b border-[#2d334d] sticky top-0 z-10">
              <button onClick={() => { setCurrentView('menu'); setIsHistoryUnlocked(false); setPin(''); }} className="p-2 bg-[#24293f] rounded-xl text-white mr-4 border border-[#374160]"><ChevronLeft size={20} /></button>
              <h2 className="text-lg font-bold text-white flex items-center"><MapPin size={16} className="text-blue-400 mr-2"/> ส่งยอดต้ม {activeBranch}</h2>
            </div>
            <div className="flex p-4 space-x-3 bg-[#161a2b]">
              <button onClick={() => setBranchTab('form')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'form' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}><FileText size={16} className="mr-2"/> ลงยอดต้ม</button>
              <button onClick={() => setBranchTab('history')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex justify-center items-center transition ${branchTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-[#24293f] text-slate-400 border border-[#374160]'}`}>
                {isHistoryUnlocked ? <Search size={16} className="mr-2"/> : <Lock size={16} className="mr-2"/>} ประวัติยอด
              </button>
            </div>

            <div className="p-4 pb-10 overflow-y-auto">
              {branchTab === 'form' ? (
                <div className="space-y-4">
                  {/* --- ข้อมูลคนส่งยอด --- */}
                  <div className="bg-[#24293f] p-5 rounded-[20px] border border-[#374160] shadow-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><label className={labelStyle}>ชื่อผู้ส่งยอดรวม</label><input type="text" value={formData.submitterName} onChange={(e) => setFormData({...formData, submitterName: e.target.value})} className={inputStyle} placeholder="ระบุชื่อพนักงาน..." /></div>
                      <div><label className={labelStyle}>กะการทำงาน</label><select value={formData.shift} onChange={(e) => setFormData({...formData, shift: e.target.value})} className={inputStyle}><option>เช้า</option><option>บ่าย</option><option>ดึก</option></select></div>
                    </div>
                  </div>

                  {/* --- แบบฟอร์มลงยอดน้ำ (หม้อ/เศษ/หัก/ชื่อคนต้ม) --- */}
                  <div className="bg-[#24293f] p-4 rounded-[20px] border border-blue-500/30 shadow-xl">
                    <h3 className="text-white text-sm font-black mb-4 flex items-center gap-2"><Droplets size={18} className="text-blue-400"/> บันทึกยอดน้ำผลิตเสร็จ</h3>
                    {Object.entries(WATER_MENU).map(([cat, flavors]) => (
                      <div key={cat} className="mb-6 last:mb-0">
                        <div className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-2 px-1 bg-blue-900/30 py-1 rounded inline-block">{cat}</div>
                        <div className="grid grid-cols-1 gap-3">
                          {flavors.map(f => {
                            const key = `${cat}|||${f}`;
                            return (
                              <div key={f} className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363]">
                                <div className="text-xs text-slate-200 font-bold mb-2">{f}</div>
                                <div className="flex gap-2 mb-2">
                                   <div className="flex-1"><input type="number" placeholder="หม้อ" className="w-full bg-[#24293f] p-2.5 text-center text-xs text-blue-400 rounded-lg outline-none border border-transparent focus:border-blue-500 font-bold" value={formData.waterProduction[key]?.pots || ''} onChange={(e) => handleWaterInput(cat, f, 'pots', e.target.value)} /></div>
                                   <div className="flex-1"><input type="number" placeholder="เศษ" className="w-full bg-[#24293f] p-2.5 text-center text-xs text-amber-400 rounded-lg outline-none border border-transparent focus:border-amber-500 font-bold" value={formData.waterProduction[key]?.leftover || ''} onChange={(e) => handleWaterInput(cat, f, 'leftover', e.target.value)} /></div>
                                   <div className="flex-1"><input type="number" placeholder="หัก" className="w-full bg-[#24293f] p-2.5 text-center text-xs text-red-400 rounded-lg outline-none border border-transparent focus:border-red-500 font-bold" value={formData.waterProduction[key]?.deducted || ''} onChange={(e) => handleWaterInput(cat, f, 'deducted', e.target.value)} /></div>
                                </div>
                                {/* ช่องใส่ชื่อคนต้ม */}
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none"><ChefHat size={12} className="text-purple-400/50" /></div>
                                  <input type="text" placeholder="ชื่อพนักงานคนต้ม (ถ้ามี)" className="w-full bg-[#24293f] py-2 pl-8 pr-2 text-left text-[11px] text-purple-300 rounded-lg outline-none border border-transparent focus:border-purple-500 font-medium" value={formData.waterProduction[key]?.maker || ''} onChange={(e) => handleWaterInput(cat, f, 'maker', e.target.value)} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-2"><label className={labelStyle}>หมายเหตุเพิ่มเติม (ถ้ามี)</label><textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows="2" className={`${inputStyle} resize-none`} placeholder="อธิบายเพิ่มเติม..."></textarea></div>

                  <button onClick={handleSaveProduction} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center active:scale-95 transition"><CheckCircle size={20} className="mr-2" /> ยืนยันส่งยอดผลิตน้ำ</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* --- หน้าประวัติ --- */}
                  {!isHistoryUnlocked ? (
                    <div className="bg-[#24293f] p-8 rounded-[20px] border border-[#374160] shadow-2xl text-center mt-4">
                      <div className="w-16 h-16 bg-[#1c2135] rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"><Lock size={30} className="text-[#64748b]" /></div>
                      <h2 className="text-lg font-bold text-white mb-6">ยืนยันตัวตนเพื่อดูประวัติ</h2>
                      <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full bg-[#1c2135] border border-[#3b4363] text-white text-center text-3xl tracking-[0.5em] p-4 rounded-xl focus:border-blue-500 mb-6" maxLength={4} placeholder="****" onKeyDown={(e) => e.key === 'Enter' && handleLogin('history')} />
                      <button onClick={() => handleLogin('history')} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl active:scale-95 transition">ปลดล็อคข้อมูล</button>
                    </div>
                  ) : (
                    <>
                      {historyData.filter(d => d.branch === activeBranch).map((data, index) => (
                         <div key={data.id || index} className="bg-[#24293f] rounded-[20px] p-5 border border-[#374160] shadow-xl w-full mb-6">
                            <div className="flex justify-between items-center mb-4">
                              <div className="flex items-center space-x-2 bg-[#2d334d] px-3 py-1.5 rounded-lg border border-[#3b4363]"><Calendar size={14} className="text-blue-400" /><span className="text-[#60a5fa] font-bold text-xs">{data.date}</span></div>
                              <div className="flex items-center space-x-3">
                                <div className="text-xs font-bold text-[#cbd5e1] flex items-center"><Clock size={14} className="mr-1 text-slate-400"/> {data.time}</div>
                                <button onClick={() => handleDeleteRecord(data.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"><Trash2 size={16} /></button>
                              </div>
                            </div>

                            {/* การ์ดสรุปยอดน้ำที่จิ้มได้ */}
                            <div 
                              onClick={() => setSelectedWaterDetail(data)}
                              className="bg-blue-600/10 p-5 rounded-xl border border-blue-500/30 mb-4 flex justify-between items-center cursor-pointer active:scale-95 transition hover:bg-blue-600/20"
                            >
                               <div>
                                  <div className="text-blue-300 text-xs font-bold mb-1">ยอดผลิตสุทธิรวม</div>
                                  <div className="text-4xl font-black text-white flex items-end gap-2">
                                     {data.waterTotals?.totalNetBottles || 0} <span className="text-sm font-bold text-blue-400 mb-1">ขวด</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-2 flex gap-2">
                                    <span className="bg-[#1c2135] px-2 py-1 rounded">หม้อ: {data.waterTotals?.totalPots || 0}</span>
                                    <span className="bg-[#1c2135] px-2 py-1 rounded">เศษ: {data.waterTotals?.totalLeftover || 0}</span>
                                    <span className="bg-[#1c2135] px-2 py-1 rounded">หัก: {data.waterTotals?.totalDeducted || 0}</span>
                                  </div>
                               </div>
                               <div className="bg-blue-500 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20 animate-pulse"><Info size={20}/></div>
                            </div>

                            <div className="bg-[#1c2135] p-3 rounded-xl border border-[#3b4363] text-xs flex justify-between text-slate-300">
                              <div><span className="text-slate-500">ผู้ส่งยอด:</span> <span className="font-bold text-slate-200">{data.submitterName}</span></div>
                              <div><span className="text-slate-500">กะ:</span> <span className="font-bold text-slate-200">{data.shift}</span></div>
                            </div>
                         </div>
                      ))}
                      {historyData.filter(d => d.branch === activeBranch).length === 0 && (
                        <div className="text-center py-20">
                          <div className="bg-[#24293f] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#3b4363]"><Droplets size={30} className="text-[#64748b]" /></div>
                          <p className="text-[#94a3b8] text-sm">ยังไม่มีประวัติยอดต้มน้ำของ {activeBranch}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}