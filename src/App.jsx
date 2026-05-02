import './index.css';
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

// --- 1. ตั้งค่า Firebase ---
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
let appId = 'boiling-app-v2';

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase init error", e);
}

// --- 2. ข้อมูลตั้งต้น ---
const MENU_ITEMS = [
  { id: '1.5-blue', category: 'น้ำสด 1.5 ลิตร', flavor: 'บลูเบอร์รี่', rate: 16 },
  { id: '1.5-pandan', category: 'น้ำสด 1.5 ลิตร', flavor: 'ใบเตย', rate: 16 },
  { id: '1.5-thai', category: 'น้ำสด 1.5 ลิตร', flavor: 'ชาไทย', rate: 16 },
  { id: '1.5-green', category: 'น้ำสด 1.5 ลิตร', flavor: 'ชาเขียว', rate: 16 },
  { id: '1.5-plain', category: 'น้ำสด 1.5 ลิตร', flavor: 'ไร้กลิ่น', rate: 16 },
  { id: '1.5-fruit', category: 'น้ำสด 1.5 ลิตร', flavor: 'น้ำสดผลไม้', rate: 16 },
  { id: '1.0-blue', category: 'น้ำสด 1.0 ลิตร', flavor: 'บลูเบอร์รี่', rate: 24 },
  { id: '1.0-pandan', category: 'น้ำสด 1.0 ลิตร', flavor: 'ใบเตย', rate: 24 },
  { id: '1.0-thai', category: 'น้ำสด 1.0 ลิตร', flavor: 'ชาไทย', rate: 24 },
  { id: '1.0-plain', category: 'น้ำสด 1.0 ลิตร', flavor: 'ไร้กลิ่น', rate: 24 },
];

const BRANCH_LABELS = [
  { l: 'ทีมต้ม', k: 'team' },
  { l: 'สาขา 1', k: 'branch1' },
  { l: 'สาขา 2', k: 'branch2' },
  { l: 'สาขา 3', k: 'branch3' },
  { l: 'สาขา 4', k: 'branch4' },
  { l: 'สาขา 5', k: 'branch5' } 
];

const initialBottleStock = {
  size15: { oldStock: '', newStock: '', used: '', defects: '' },
  size10: { oldStock: '', newStock: '', used: '', defects: '' }
};

const initialStaffWater = { 
  team: { qty: '', name: '' }, branch1: { qty: '', name: '' }, 
  branch2: { qty: '', name: '' }, branch3: { qty: '', name: '' }, 
  branch4: { qty: '', name: '' }, branch5: { qty: '', name: '' } 
};

const App = () => {
  // --- 3. State Management ---
  const [activeView, setActiveView] = useState('menu'); 
  const [user, setUser] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [dialog, setDialog] = useState({ isOpen: false, message: '', onConfirm: null, isAlert: false, requirePin: false });
  const [pinInput, setPinInput] = useState('');

  const [staffName, setStaffName] = useState(() => localStorage.getItem('boilingStaffName') || '');
  
  const initialFormData = MENU_ITEMS.reduce((acc, item) => ({ ...acc, [item.id]: { pots: '', bottles: '', remainders: '', defects: '', defectReason: '' } }), {});
  const [formData, setFormData] = useState(initialFormData);
  
  const [savedRecords, setSavedRecords] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]); 
  const [bottleStock, setBottleStock] = useState(initialBottleStock);
  const [staffWater, setStaffWater] = useState(initialStaffWater);

  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [summaryDate, setSummaryDate] = useState('today');
  const [historyFilterDate, setHistoryFilterDate] = useState(''); 
  const [expandedCat, setExpandedCat] = useState({});
  const [editingRecord, setEditingRecord] = useState(null); 

  // --- 4. Firebase Authentication & Sync ---
  useEffect(() => {
    if (!auth) return;
    signInAnonymously(auth).catch(err => console.error("Auth err:", err));
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsOnline(!!u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const recordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'boiling_records');
      const unsubRec = onSnapshot(recordsRef, (snapshot) => {
        const records = [];
        snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
        records.sort((a, b) => b.timestamp - a.timestamp);
        setSavedRecords(records);
      });

      const historyRef = collection(db, 'artifacts', appId, 'public', 'data', 'boiling_history');
      const unsubHist = onSnapshot(historyRef, (snapshot) => {
        const hist = [];
        snapshot.forEach(doc => hist.push({ id: doc.id, ...doc.data() }));
        hist.sort((a, b) => b.timestamp - a.timestamp);
        setHistoryRecords(hist);
      });

      const settingsRef = collection(db, 'artifacts', appId, 'public', 'data', 'shared_settings');
      const unsubSet = onSnapshot(settingsRef, (snapshot) => {
        snapshot.forEach(docSnap => {
          if (docSnap.id === 'bottleStock') {
             const data = docSnap.data();
             setBottleStock(data?.size15 ? data : initialBottleStock);
          }
          if (docSnap.id === 'staffWater') {
             const data = docSnap.data();
             setStaffWater(data ? data : initialStaffWater);
          }
        });
      });
      return () => { unsubRec(); unsubSet(); unsubHist(); };
    } catch (err) { console.error("Sync error:", err); }
  }, [user]);

  useEffect(() => { localStorage.setItem('boilingStaffName', staffName); }, [staffName]);

  // --- 5. Dialog ---
  const showAlert = (message) => setDialog({ isOpen: true, message, isAlert: true, onConfirm: null, requirePin: false });
  const showConfirm = (message, onConfirm, requirePin = false) => {
    setPinInput('');
    setDialog({ isOpen: true, message, isAlert: false, onConfirm, requirePin });
  };
  const closeDialog = () => {
    setDialog({ ...dialog, isOpen: false });
    setPinInput('');
  };

  const getQty = (val) => typeof val === 'object' ? (val?.qty || '') : (val || '');
  const getName = (val) => typeof val === 'object' ? (val?.name || '') : '';

  // --- 6. Handlers ---
  const handleInputChange = (id, field, value) => {
    if (field === 'defectReason' || value === '' || /^\d+$/.test(value)) {
      setFormData(prev => {
        const updated = { ...prev[id], [field]: value };
        if (field === 'pots') {
          const item = MENU_ITEMS.find(i => i.id === id);
          updated.bottles = value !== '' ? (parseInt(value, 10) * item.rate).toString() : '';
        }
        return { ...prev, [id]: updated };
      });
    }
  };

  const handleSaveRecord = async () => {
    if (!user || !db) return showAlert("รอเชื่อมต่อออนไลน์สักครู่ครับ");
    if (!staffName.trim()) return showAlert("กรุณาพิมพ์ชื่อพนักงานก่อนบันทึก");

    let hasData = false;
    try {
      for (const item of MENU_ITEMS) {
        const row = formData[item.id];
        const p = parseInt(row.pots) || 0; const b = parseInt(row.bottles) || 0;
        const r = parseInt(row.remainders) || 0; const d = parseInt(row.defects) || 0;

        if (p > 0 || b > 0 || r > 0 || d > 0) {
          if (d > 0 && !row.defectReason) {
            return showAlert(`⚠️ กรุณาระบุ "เหตุผลที่หักน้ำ" ของรายการ ${item.flavor} ด้วยครับ`);
          }

          hasData = true;
          const net = b + r - d; 
          const recordId = Date.now().toString() + Math.floor(Math.random()*1000);
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_records', recordId), {
            timestamp: Date.now(), staff: staffName, category: item.category, flavor: item.flavor,
            rate: item.rate, pots: p, bottles: b, remainders: r, defects: d, defectReason: row.defectReason || '', net: net
          });
        }
      }
      if (!hasData) return showAlert("กรุณากรอกยอดผลิตอย่างน้อย 1 รายการ");
      
      setFormData(initialFormData);
      showAlert("✅ จัดเก็บข้อมูลขึ้นระบบออนไลน์เรียบร้อยแล้ว");
      setActiveView('menu');
    } catch (err) { showAlert("เกิดข้อผิดพลาดในการบันทึก"); }
  };

  const recalcTotals = (records) => {
    return records.reduce((acc, curr) => ({
      pots: acc.pots + (parseInt(curr.pots) || 0), 
      bottles: acc.bottles + (parseInt(curr.bottles) || 0), 
      remainders: acc.remainders + (parseInt(curr.remainders) || 0), 
      defects: acc.defects + (parseInt(curr.defects) || 0), 
      net: acc.net + (parseInt(curr.net) || 0)
    }), { pots: 0, bottles: 0, remainders: 0, defects: 0, net: 0 });
  };

  const handleDeleteRecord = (record, isHistory = false, historyId = null) => {
    if (!user || !db) return;
    showConfirm("คุณต้องการลบรายการนี้ใช่หรือไม่?", async (pin) => {
      if (pin !== '5930') return showAlert("❌ รหัสผ่านไม่ถูกต้อง!");
      try {
        if (isHistory) {
          const histDoc = historyRecords.find(h => h.id === historyId);
          const newRecs = histDoc.records.filter(r => r.id !== record.id);
          const newTotals = recalcTotals(newRecs);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_history', historyId), { records: newRecs, totals: newTotals });
        } else {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_records', record.id.toString()));
        }
        showAlert("🗑️ ลบรายการเรียบร้อย");
      } catch(e) { showAlert("เกิดข้อผิดพลาดในการลบ"); }
    }, true);
  };

  const openEditModal = (record, isHistory = false, historyId = null) => {
    showConfirm("คุณต้องการเข้าสู่โหมดแก้ไขข้อมูลนี้ใช่หรือไม่?", (pin) => {
      if (pin !== '5930') return showAlert("❌ รหัสผ่านไม่ถูกต้อง!");
      setEditingRecord({ ...record, isHistory, historyId });
    }, true);
  };

  const handleSaveEdit = async () => {
    const p = parseInt(editingRecord.pots) || 0;
    const b = parseInt(editingRecord.bottles) || 0;
    const r = parseInt(editingRecord.remainders) || 0;
    const d = parseInt(editingRecord.defects) || 0;
    const net = b + r - d;
    const updatedRec = { ...editingRecord, pots: p, bottles: b, remainders: r, defects: d, net };

    try {
      if (editingRecord.isHistory) {
        const histDoc = historyRecords.find(h => h.id === editingRecord.historyId);
        const newRecs = histDoc.records.map(rec => rec.id === updatedRec.id ? updatedRec : rec);
        const newTotals = recalcTotals(newRecs);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_history', editingRecord.historyId), { records: newRecs, totals: newTotals });
      } else {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_records', updatedRec.id.toString()), updatedRec);
      }
      setEditingRecord(null);
      showAlert("✅ แก้ไขข้อมูลเรียบร้อย");
    } catch(e) { showAlert("เกิดข้อผิดพลาดในการแก้ไข"); }
  };

  const handleBottleStockChange = (size, field, value) => {
    if (value === '' || /^\d+$/.test(value)) {
      setBottleStock(prev => ({ ...prev, [size]: { ...prev?.[size], [field]: value } }));
    }
  };

  const handleSaveBottleStock = async () => {
    if (!user || !db) return showAlert("รอเชื่อมต่อออนไลน์");
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_settings', 'bottleStock'), bottleStock);
    showAlert("📦 อัปเดตสต๊อกขวดขึ้นระบบเรียบร้อย");
  };

  const handleStaffWaterChange = (branchKey, field, value) => {
    setStaffWater(prev => ({
      ...prev,
      [branchKey]: {
        ...(typeof prev[branchKey] === 'object' ? prev[branchKey] : { qty: prev[branchKey]||'', name: '' }),
        [field]: value
      }
    }));
  };

  const handleSaveStaffWater = async () => {
    // 🔥 แก้บั๊ก: ตรวจสอบว่าถ้าใส่จำนวนขวด ต้องระบุชื่อด้วย
    for (let b of BRANCH_LABELS) {
      const qty = parseInt(getQty(staffWater[b.k]), 10) || 0;
      const name = getName(staffWater[b.k]).trim();
      if (qty > 0 && !name) {
         return showAlert(`⚠️ กรุณาระบุ "ชื่อคนเบิก/หมายเหตุ" สำหรับ ${b.l} ให้ครบถ้วนด้วยครับ`);
      }
    }
    
    if (!user || !db) return showAlert("รอเชื่อมต่อออนไลน์");
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_settings', 'staffWater'), staffWater);
    showAlert("🥤 อัปเดตยอดเบิกน้ำขึ้นระบบเรียบร้อย");
  };

  const handleCloseDay = () => {
    // เช็คก่อนปิดกะว่ายอดน้ำพนักงานระบุชื่อครบไหม
    for (let b of BRANCH_LABELS) {
      const qty = parseInt(getQty(staffWater[b.k]), 10) || 0;
      const name = getName(staffWater[b.k]).trim();
      if (qty > 0 && !name) {
         showAlert(`⚠️ ไม่สามารถปิดยอดได้!\nกรุณาระบุ "ชื่อคนเบิก" สำหรับ ${b.l} ในระบบเบิกน้ำพนักงานก่อนครับ`);
         return;
      }
    }

    showConfirm("⚠️ ยืนยันการปิดยอดประจำวัน?\n\nระบบจะสรุปข้อมูลของวันนี้เก็บเข้า 'ประวัติย้อนหลัง' และล้างกระดานเพื่อเริ่มวันพรุ่งนี้", async (pin) => {
      if (pin !== '5930') {
        showAlert("❌ รหัสผ่านไม่ถูกต้อง! ไม่สามารถปิดยอดได้");
        return;
      }
      if (!user || !db) return;

      const currentTotals = recalcTotals(savedRecords);
      const currentStaffWaterTotal = BRANCH_LABELS.reduce((sum, b) => sum + (parseInt(getQty(staffWater?.[b.k]), 10) || 0), 0);

      if (savedRecords.length > 0 || currentStaffWaterTotal > 0 || currentTotals.net > 0) {
         const archiveId = Date.now().toString();
         const archiveData = {
           timestamp: Date.now(),
           dateString: new Date().toLocaleDateString('th-TH'),
           records: savedRecords, 
           bottleStock: bottleStock,
           staffWater: staffWater,
           totals: currentTotals,
           staffWaterTotal: currentStaffWaterTotal
         };
         await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_history', archiveId), archiveData);
      }

      for (const r of savedRecords) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_records', r.id.toString()));
      }
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_settings', 'bottleStock'), initialBottleStock);
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'shared_settings', 'staffWater'), initialStaffWater);
      
      showAlert("✨ ปิดยอดและเก็บบันทึกลงแฟ้มประวัติเรียบร้อยครับ");
      setActiveView('menu');
    }, true); 
  };

  const handleClearAllHistoryRecords = () => {
    showConfirm("⚠️ คำเตือน: คุณต้องการล้างแฟ้มประวัติย้อนหลัง 'ทั้งหมด' ใช่หรือไม่?\n(ข้อมูลจะไม่สามารถกู้คืนได้)", async (pin) => {
      if (pin !== '5930') {
        showAlert("❌ รหัสผ่านไม่ถูกต้อง!");
        return;
      }
      if (!user || !db) return;
      try {
        for (const h of historyRecords) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'boiling_history', h.id.toString()));
        }
        setHistoryFilterDate('');
        showAlert("🗑️ ล้างประวัติย้อนหลังทั้งหมดเรียบร้อยแล้ว");
      } catch(e) { showAlert("เกิดข้อผิดพลาดในการล้างประวัติ"); }
    }, true);
  };

  const calculateRowNet = (id) => (parseInt(formData[id]?.bottles) || 0) + (parseInt(formData[id]?.remainders) || 0) - (parseInt(formData[id]?.defects) || 0);

  const displayedRecords = summaryDate === 'today' ? savedRecords : (historyRecords.find(h => h.id === summaryDate)?.records || []);
  const displayedTotals = summaryDate === 'today' ? recalcTotals(savedRecords) : (historyRecords.find(h => h.id === summaryDate)?.totals || {pots:0, bottles:0, remainders:0, defects:0, net:0});
  
  const displayedBottleStock = summaryDate === 'today' ? bottleStock : (historyRecords.find(h => h.id === summaryDate)?.bottleStock || initialBottleStock);
  const displayedStaffWater = summaryDate === 'today' ? staffWater : (historyRecords.find(h => h.id === summaryDate)?.staffWater || initialStaffWater);
  const displayedStaffWaterTotal = summaryDate === 'today' 
     ? BRANCH_LABELS.reduce((sum, b) => sum + (parseInt(getQty(staffWater?.[b.k]), 10) || 0), 0)
     : (historyRecords.find(h => h.id === summaryDate)?.staffWaterTotal || 0);

  const groupedSummaryMap = {};
  displayedRecords.forEach(r => {
    if (!groupedSummaryMap[r.category]) groupedSummaryMap[r.category] = [];
    const existing = groupedSummaryMap[r.category].find(x => x.flavor === r.flavor);
    if (existing) {
       existing.pots += parseInt(r.pots)||0;
       existing.bottles += parseInt(r.bottles)||0;
       existing.remainders += parseInt(r.remainders)||0;
       existing.defects += parseInt(r.defects)||0;
       existing.net += parseInt(r.net)||0;
    } else {
       groupedSummaryMap[r.category].push({...r, pots: parseInt(r.pots)||0, bottles: parseInt(r.bottles)||0, remainders: parseInt(r.remainders)||0, defects: parseInt(r.defects)||0, net: parseInt(r.net)||0});
    }
  });

  const defectReasonsMap = { 'หักลงร้านของชำ': 0, 'หักให้พี่เอ็ม': 0, 'หักเพราะมีลูกค้าซื้อ': 0 };
  displayedRecords.forEach(r => {
    if (r.defects > 0 && r.defectReason) {
      if (defectReasonsMap[r.defectReason] !== undefined) defectReasonsMap[r.defectReason] += parseInt(r.defects);
    }
  });

  const parseNum = (val) => parseInt(val, 10) || 0;
  const stockMath = (stock) => {
    const oldS = parseNum(stock?.oldStock);
    const newS = parseNum(stock?.newStock);
    const used = parseNum(stock?.used);
    const def = parseNum(stock?.defects);
    const totalIn = oldS + newS;
    const totalOut = used + def;
    const net = totalIn - totalOut;
    return { oldS, newS, used, def, totalIn, totalOut, net };
  };

  const s15 = stockMath(displayedBottleStock?.size15);
  const s10 = stockMath(displayedBottleStock?.size10);

  const toggleCategory = (cat) => {
    setExpandedCat(prev => ({...prev, [cat]: !prev[cat]}));
  };

  const ViewHeader = ({ title }) => (
    <div className="bg-slate-900 p-4 sticky top-0 z-10 shadow-md flex items-center justify-between border-b border-slate-700">
      <button onClick={() => setActiveView('menu')} className="text-blue-400 font-bold flex items-center gap-1 hover:text-blue-300">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
        กลับเมนู
      </button>
      <h2 className="text-white font-bold text-lg">{title}</h2>
      <div className="w-20"></div>
    </div>
  );

  const DetailPopup = ({ records, onClose, title, isHistory = false, historyId = null }) => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-[2rem] shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-indigo-400">📝</span> {title}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-700/50 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        
        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-3 flex-1">
          {(!records || records.length === 0) ? (
            <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-2xl">ไม่มีข้อมูลการผลิต</div>
          ) : (
            records.map(r => (
              <div key={r.id} className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-inner relative">
                
                <div className="absolute top-3 right-3 flex gap-1.5">
                   <button onClick={() => openEditModal(r, isHistory, historyId)} className="p-1.5 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors">
                     ✏️
                   </button>
                   <button onClick={() => handleDeleteRecord(r, isHistory, historyId)} className="p-1.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-colors">
                     🗑️
                   </button>
                </div>

                <div className="flex justify-between items-center mb-3 border-b border-slate-700/50 pb-2 pr-16">
                  <div className="font-bold text-indigo-300 text-sm">{r.flavor} <span className="text-[10px] text-slate-500 font-normal">({r.category.replace('น้ำสด ','')})</span></div>
                  <div className="text-emerald-400 font-black text-base">+{r.net}</div>
                </div>
                <div className="flex justify-between items-center text-xs mb-3">
                  <div className="text-slate-300 flex items-center gap-1.5"><span className="text-slate-500">👨‍🍳 พนักงาน:</span> <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{r.staff}</span></div>
                  <div className="text-slate-500">{new Date(r.timestamp).toLocaleTimeString('th-TH').slice(0, 5)} น.</div>
                </div>
                <div className="flex gap-2 text-[10px] font-bold">
                  {parseInt(r.pots) > 0 && <span className="bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded border border-indigo-500/20">หม้อ: {r.pots}</span>}
                  {parseInt(r.remainders) > 0 && <span className="bg-amber-500/10 text-amber-400 px-2 py-1 rounded border border-amber-500/20">เศษ: {r.remainders}</span>}
                  {parseInt(r.defects) > 0 && <span className="bg-rose-500/10 text-rose-400 px-2 py-1 rounded border border-rose-500/20">หัก: {r.defects} {r.defectReason ? `(${r.defectReason})` : ''}</span>}
                </div>
              </div>
            ))
          )}
        </div>
        <button onClick={onClose} className="w-full mt-5 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-indigo-900/40">ปิดหน้าต่าง</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-10 selection:bg-blue-500/30 overflow-x-hidden">
      
      {dialog.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-3 text-center">{dialog.isAlert ? 'แจ้งเตือน' : 'ยืนยันการดำเนินการ'}</h3>
            <p className="text-slate-300 mb-6 text-center whitespace-pre-line text-sm">{dialog.message}</p>
            {dialog.requirePin && (
              <div className="mb-6">
                <input 
                  type="password" inputMode="numeric" placeholder="ใส่รหัสผ่าน (PIN) เพื่อยืนยัน" 
                  value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-slate-600 rounded-xl text-center text-xl text-white outline-none focus:border-amber-500 tracking-widest"
                  autoFocus
                />
              </div>
            )}
            <div className="flex justify-center gap-3">
              {!dialog.isAlert && (
                <button onClick={closeDialog} className="px-5 py-2.5 bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-600 transition-colors w-full">ยกเลิก</button>
              )}
              <button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(pinInput); closeDialog(); }} className={`px-5 py-2.5 text-white rounded-xl font-bold transition-colors w-full ${dialog.isAlert ? 'bg-blue-600 hover:bg-blue-500' : 'bg-amber-600 hover:bg-amber-500'}`}>
                {dialog.isAlert ? 'ตกลง' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal แก้ไขตัวเลข --- */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
           <div className="bg-slate-800 border border-slate-600 rounded-[2rem] shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-5">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">✏️ แก้ไขข้อมูล: <span className="text-indigo-400">{editingRecord.flavor}</span></h3>
               <button onClick={() => setEditingRecord(null)} className="p-2 text-slate-400"><X size={20}/></button>
             </div>
             <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                <div><label className="block text-slate-400 mb-1">หม้อ</label><input type="number" className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 text-center font-bold" value={editingRecord.pots} onChange={e => setEditingRecord({...editingRecord, pots: e.target.value})} /></div>
                <div><label className="block text-slate-400 mb-1 text-emerald-400">ขวด</label><input type="number" className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 text-center font-bold" value={editingRecord.bottles} onChange={e => setEditingRecord({...editingRecord, bottles: e.target.value})} /></div>
                <div><label className="block text-slate-400 mb-1 text-amber-400">เศษ</label><input type="number" className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 text-center font-bold" value={editingRecord.remainders} onChange={e => setEditingRecord({...editingRecord, remainders: e.target.value})} /></div>
                <div><label className="block text-slate-400 mb-1 text-rose-400">หักเสีย</label><input type="number" className="w-full bg-slate-900 border border-slate-600 p-2.5 rounded-xl text-white outline-none focus:border-indigo-500 text-center font-bold" value={editingRecord.defects} onChange={e => setEditingRecord({...editingRecord, defects: e.target.value})} /></div>
                {parseInt(editingRecord.defects) > 0 && (
                  <div className="col-span-2">
                    <label className="block text-rose-400 mb-1">เหตุผลการหัก</label>
                    <select className="w-full p-2.5 bg-slate-900 border border-rose-800 text-rose-300 rounded-xl outline-none" value={editingRecord.defectReason || ''} onChange={e => setEditingRecord({...editingRecord, defectReason: e.target.value})}>
                        <option value="">- เลือกเหตุผล -</option>
                        <option value="หักลงร้านของชำ">ลงร้านของชำ</option>
                        <option value="หักให้พี่เอ็ม">ให้พี่เอ็ม</option>
                        <option value="หักเพราะมีลูกค้าซื้อ">ลูกค้าซื้อ</option>
                    </select>
                  </div>
                )}
             </div>
             <button onClick={handleSaveEdit} className="w-full py-3.5 bg-amber-600 text-white font-bold rounded-xl active:scale-95 transition">บันทึกการแก้ไข</button>
           </div>
        </div>
      )}

      {/* --- ป๊อปอัพหน้ารวม --- */}
      {showSummaryPopup && <DetailPopup title="รายละเอียดคนต้ม" records={displayedRecords} onClose={() => setShowSummaryPopup(false)} isHistory={summaryDate !== 'today'} historyId={summaryDate !== 'today' ? summaryDate : null} />}
      
      {/* --- ป๊อปอัพหน้าประวัติย้อนหลัง --- */}
      {selectedHistory && <DetailPopup title={`คนต้มวันที่ ${selectedHistory.dateString}`} records={selectedHistory.records} onClose={() => setSelectedHistory(null)} isHistory={true} historyId={selectedHistory.id} />}

      {activeView === 'menu' && (
        <div className="max-w-md mx-auto min-h-screen flex flex-col p-5 animate-in fade-in duration-500">
          <div className="text-center mt-6 mb-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-800/80 rounded-full border border-slate-700 flex items-center justify-center mb-4 shadow-lg shadow-black/50">
              <span className="text-4xl">👑</span>
            </div>
            <h1 className="text-3xl font-black text-amber-400 tracking-wide mb-1 drop-shadow-md">m&n Kc</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest">TEAM BOILING APP MANAGEMENT</p>
          </div>
          <div className="mb-6 flex gap-2 items-center bg-slate-800 border border-slate-700 rounded-xl overflow-hidden px-3 shadow-inner">
             <span className="text-slate-400">👤</span>
            <input 
              type="text" placeholder="พิมพ์ชื่อพนักงานผู้ใช้งาน..." 
              value={staffName} onChange={(e) => setStaffName(e.target.value)}
              className="w-full bg-transparent text-white p-3 outline-none font-medium placeholder-slate-500"
            />
          </div>
          <div className="flex flex-col gap-3.5 w-full">
            <button onClick={() => setActiveView('input')} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 p-4 rounded-2xl shadow-lg flex items-center gap-4 text-white hover:scale-[1.02] active:scale-95 transition-all">
              <div className="bg-white text-emerald-600 p-2.5 rounded-xl shadow-sm">📝</div>
              <div className="text-left">
                <div className="text-[17px] font-bold">ระบบบันทึกต้มน้ำ</div>
                <div className="text-[11px] text-emerald-100 font-medium">บันทึกยอดผลิต / ระบุเหตุผลการหัก</div>
              </div>
            </button>
            <button onClick={() => setActiveView('stock')} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-lg flex items-center gap-4 text-white hover:scale-[1.02] active:scale-95 transition-all">
              <div className="bg-white text-indigo-600 p-2.5 rounded-xl shadow-sm">📦</div>
              <div className="text-left">
                <div className="text-[17px] font-bold">จัดการสต๊อกขวดเปล่า</div>
                <div className="text-[11px] text-indigo-100 font-medium">เบิกขวด / ใช้ไป / สรุปคงเหลือ 1.5, 1.0</div>
              </div>
            </button>
            <button onClick={() => setActiveView('staff')} className="w-full bg-gradient-to-r from-rose-500 to-red-600 p-4 rounded-2xl shadow-lg flex items-center gap-4 text-white hover:scale-[1.02] active:scale-95 transition-all">
              <div className="bg-white text-rose-600 p-2.5 rounded-xl shadow-sm">🥤</div>
              <div className="text-left">
                <div className="text-[17px] font-bold">ระบบเบิกน้ำพนักงาน</div>
                <div className="text-[11px] text-rose-100 font-medium">แยกเบิกน้ำแต่ละสาขา ระบุชื่อได้</div>
              </div>
            </button>
            <button onClick={() => { setActiveView('summary'); setSummaryDate('today'); }} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg flex items-center gap-4 text-white hover:scale-[1.02] active:scale-95 transition-all">
              <div className="bg-white text-orange-600 p-2.5 rounded-xl shadow-sm">📊</div>
              <div className="text-left">
                <div className="text-[17px] font-bold">ยอดผลิตสะสมรายวัน</div>
                <div className="text-[11px] text-orange-100 font-medium">ดูยอดรวม ย้อนหลัง เช็คคนต้มได้</div>
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => { setActiveView('history'); setHistoryFilterDate(''); }} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 text-slate-300 hover:bg-slate-700 active:scale-95 transition-all">
                <div className="text-2xl">📅</div>
                <div className="text-sm font-bold text-white">ประวัติแบบการ์ด</div>
              </button>
              
              <button onClick={handleCloseDay} className="w-full bg-slate-800 border border-amber-900/50 p-3 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 text-amber-300 hover:bg-slate-700 active:scale-95 transition-all relative overflow-hidden">
                <div className="absolute inset-0 bg-amber-500/10"></div>
                <div className="text-2xl relative z-10">🔒</div>
                <div className="text-sm font-bold text-amber-400 relative z-10">ปิดยอดประจำวัน</div>
              </button>
            </div>
          </div>
          <div className="mt-8 flex justify-center items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
             {isOnline ? <span className="text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE</span> : <span className="text-amber-500">CONNECTING...</span>}
             <span>• Version 4.2 (Super Pro)</span>
          </div>
        </div>
      )}

      {/* --- ส่วนระบบกรอกข้อมูล --- */}
      {activeView === 'input' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <ViewHeader title="ระบบบันทึกต้มน้ำ" />
          <div className="max-w-4xl mx-auto p-2 sm:p-4 mt-2 space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center text-sm">
                <span className="text-slate-300 font-bold">ตารางกรอกยอดผลิต</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">ผู้บันทึก: {staffName || '-'}</span>
              </div>
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-800 text-slate-400">
                    <tr>
                      <th className="p-1.5 pl-2 font-normal">สินค้า</th>
                      <th className="p-1.5 text-center w-10 sm:w-14">หม้อ</th>
                      <th className="p-1.5 text-center w-12 sm:w-16 text-emerald-400">ขวด</th>
                      <th className="p-1.5 text-center w-10 sm:w-14 text-amber-400">เศษ</th>
                      <th className="p-1.5 text-center w-16 sm:w-20 text-rose-400">หัก/เหตุผล</th>
                      <th className="p-1.5 text-center text-white bg-slate-700 w-12 sm:w-16">สุทธิ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {MENU_ITEMS.map((item, index) => {
                      const isNewCat = index === 0 || MENU_ITEMS[index - 1].category !== item.category;
                      return (
                        <React.Fragment key={item.id}>
                          {isNewCat && (<tr><td colSpan="6" className="bg-slate-700/50 p-1.5 px-2 text-indigo-300 font-bold text-[10px] sm:text-xs">{item.category}</td></tr>)}
                          <tr className="hover:bg-slate-700/30">
                            <td className="p-1.5 pl-2 font-bold text-slate-200 text-[11px] sm:text-sm leading-tight">{item.flavor}</td>
                            <td className="p-0.5 align-top pt-1.5"><input type="text" inputMode="numeric" className="w-full p-1.5 text-center bg-slate-900 border border-slate-600 rounded text-white focus:border-indigo-500 outline-none text-xs sm:text-sm font-bold" value={formData[item.id]?.pots || ''} onChange={(e) => handleInputChange(item.id, 'pots', e.target.value)} /></td>
                            <td className="p-0.5 align-top pt-1.5"><input type="text" inputMode="numeric" className="w-full p-1.5 text-center bg-slate-900 border border-slate-600 rounded text-white focus:border-indigo-500 outline-none text-xs sm:text-sm font-bold" value={formData[item.id]?.bottles || ''} onChange={(e) => handleInputChange(item.id, 'bottles', e.target.value)} /></td>
                            <td className="p-0.5 align-top pt-1.5"><input type="text" inputMode="numeric" className="w-full p-1.5 text-center bg-slate-900 border border-slate-600 rounded text-white focus:border-indigo-500 outline-none text-xs sm:text-sm font-bold" value={formData[item.id]?.remainders || ''} onChange={(e) => handleInputChange(item.id, 'remainders', e.target.value)} /></td>
                            <td className="p-0.5 align-top pt-1.5">
                              <input type="text" inputMode="numeric" className="w-full p-1.5 text-center bg-rose-900/30 border border-rose-800 text-rose-300 rounded outline-none text-xs sm:text-sm font-bold" value={formData[item.id]?.defects || ''} onChange={(e) => handleInputChange(item.id, 'defects', e.target.value)} placeholder="0" />
                              {parseInt(formData[item.id]?.defects) > 0 && (
                                <div className="mt-1 pb-1">
                                  <select className="w-full p-1 text-[10px] sm:text-xs bg-slate-900 border border-rose-800 text-rose-300 rounded outline-none" value={formData[item.id]?.defectReason || ''} onChange={(e) => handleInputChange(item.id, 'defectReason', e.target.value)}>
                                    <option value="">- เลือกเหตุผล -</option>
                                    <option value="หักลงร้านของชำ">ลงร้านของชำ</option>
                                    <option value="หักให้พี่เอ็ม">ให้พี่เอ็ม</option>
                                    <option value="หักเพราะมีลูกค้าซื้อ">ลูกค้าซื้อ</option>
                                  </select>
                                </div>
                              )}
                            </td>
                            <td className="p-1.5 text-center font-bold text-white bg-slate-700/50 align-top pt-2.5">{calculateRowNet(item.id) || '-'}</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-800/80 border-t border-slate-700 flex justify-end">
                <button onClick={handleSaveRecord} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-900/50 active:scale-95 transition-all">
                  💾 บันทึกและส่งยอด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ส่วนระบบสต๊อก --- */}
      {activeView === 'stock' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <ViewHeader title="จัดการสต๊อกขวดเปล่า" />
          <div className="max-w-xl mx-auto p-4 mt-2 space-y-4">
            {[ { size: '1.5 ลิตร', key: 'size15', color: 'indigo' }, { size: '1.0 ลิตร', key: 'size10', color: 'amber' } ].map(s => (
              <div key={s.key} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
                <h3 className={`font-bold text-${s.color}-400 mb-3 text-lg border-b border-slate-700 pb-2 flex items-center justify-between`}>
                  <span>📦 ขวด {s.size}</span>
                  <span className="text-white bg-slate-700 px-3 py-1 rounded-lg text-sm">คงเหลือ: <span className={`text-${s.color}-400 ml-1`}>{s.key === 'size15' ? s15.net : s10.net}</span></span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><label className="block text-slate-400 mb-1">เก่าเหลือยกมา</label><input type="text" inputMode="numeric" value={bottleStock?.[s.key]?.oldStock || ''} onChange={(e) => handleBottleStockChange(s.key, 'oldStock', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" /></div>
                  <div><label className="block text-slate-400 mb-1">เบิกมาใหม่</label><input type="text" inputMode="numeric" value={bottleStock?.[s.key]?.newStock || ''} onChange={(e) => handleBottleStockChange(s.key, 'newStock', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" /></div>
                  <div><label className="block text-slate-400 mb-1">ใช้ไปวันนี้</label><input type="text" inputMode="numeric" value={bottleStock?.[s.key]?.used || ''} onChange={(e) => handleBottleStockChange(s.key, 'used', e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500" /></div>
                  <div><label className="block text-rose-400 mb-1">เสียหาย/เคลม</label><input type="text" inputMode="numeric" value={bottleStock?.[s.key]?.defects || ''} onChange={(e) => handleBottleStockChange(s.key, 'defects', e.target.value)} className="w-full p-2.5 bg-rose-900/20 border border-rose-800 rounded-xl text-rose-300 outline-none focus:border-rose-500" /></div>
                </div>
              </div>
            ))}
            <button onClick={handleSaveBottleStock} className="w-full p-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              ☁️ อัปเดตสต๊อกขวดขึ้นออนไลน์
            </button>
          </div>
        </div>
      )}

      {/* --- ระบบพนักงาน (เบิกน้ำแบบระบุชื่อได้) --- */}
      {activeView === 'staff' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <ViewHeader title="ระบบเบิกน้ำพนักงาน" />
          <div className="max-w-xl mx-auto p-4 mt-2 space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl">
               <div className="space-y-4">
                  {BRANCH_LABELS.map(b => (
                    <div key={b.k} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                      <label className="block text-slate-300 mb-2 font-bold border-b border-slate-700/50 pb-1">{b.l}</label>
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" value={getQty(staffWater?.[b.k])} onChange={e => handleStaffWaterChange(b.k, 'qty', e.target.value)} className="w-24 p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-center font-bold text-rose-400 outline-none focus:border-rose-500" placeholder="จำนวน" />
                        <input type="text" value={getName(staffWater?.[b.k])} onChange={e => handleStaffWaterChange(b.k, 'name', e.target.value)} className="flex-1 p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-sm text-white outline-none focus:border-rose-500" placeholder="ชื่อคนเบิก / หมายเหตุ" />
                      </div>
                    </div>
                  ))}
               </div>
               <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center bg-slate-900/50 p-4 rounded-xl shadow-inner">
                 <span className="text-slate-300 font-bold">ยอดเบิกรวมทั้งหมด</span>
                 <span className="text-3xl font-black text-rose-500">{displayedStaffWaterTotal}</span>
               </div>
            </div>
            <button onClick={handleSaveStaffWater} className="w-full p-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
              ☁️ อัปเดตยอดเบิกน้ำขึ้นออนไลน์
            </button>
          </div>
        </div>
      )}

      {/* --- ส่วนสรุปยอด (อัปเดตเพิ่มยอดรวม หม้อ ขวด เศษ หัก ในการ์ดด้วย) --- */}
      {activeView === 'summary' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <ViewHeader title="ยอดผลิตสะสมรายวัน" />
          <div className="max-w-4xl mx-auto p-3 sm:p-4 mt-2 space-y-5">

            <div className="flex items-center bg-slate-800 p-3 rounded-2xl border border-slate-600 shadow-lg">
               <span className="text-slate-400 mr-3 ml-2">📅 ดูยอด:</span>
               <select value={summaryDate} onChange={(e) => setSummaryDate(e.target.value)} className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold p-2.5 rounded-xl outline-none flex-1 appearance-none shadow-inner">
                 <option value="today">วันนี้ (กำลังดำเนินการ)</option>
                 {historyRecords.map(h => <option key={h.id} value={h.id}>วันที่ {h.dateString}</option>)}
               </select>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
              <div 
                className="p-4 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold flex justify-between items-center cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowSummaryPopup(true)}
              >
                 <span>📊 สรุปยอดแยกตามหมวดหมู่</span>
                 <span className="bg-white/20 px-3 py-1 rounded-lg text-xs flex items-center gap-1">👆 จิ้มเพื่อดูคนต้ม</span>
              </div>
              
              <div className="p-2 sm:p-4 space-y-3">
                 {Object.keys(groupedSummaryMap).length === 0 ? (
                   <div className="text-center text-slate-500 py-10 bg-slate-900/50 rounded-xl">ไม่มีข้อมูลในวันที่เลือก</div>
                 ) : (
                   Object.keys(groupedSummaryMap).map(catName => (
                     <div key={catName} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
                        <div 
                          className="p-3 bg-slate-800/80 flex justify-between items-center cursor-pointer hover:bg-slate-700/80 transition-colors border-b border-slate-700/50"
                          onClick={() => toggleCategory(catName)}
                        >
                          <span className="text-indigo-400 font-bold text-sm">{catName}</span>
                          <span className="text-slate-500 text-xl font-mono">{expandedCat[catName] ? '−' : '+'}</span>
                        </div>
                        
                        {expandedCat[catName] && (
                          <div className="overflow-x-auto animate-in slide-in-from-top-2">
                             <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="bg-slate-900/80 text-slate-500 text-[10px] sm:text-xs">
                                  <tr>
                                    <th className="p-2 pl-4">รสชาติ</th>
                                    <th className="p-2 text-center w-10 sm:w-14">หม้อ</th>
                                    <th className="p-2 text-center w-12 sm:w-16">ขวด</th>
                                    <th className="p-2 text-center text-amber-500/70 w-10 sm:w-14">เศษ</th>
                                    <th className="p-2 text-center text-rose-500/70 w-10 sm:w-14">หัก</th>
                                    <th className="p-2 text-center text-white bg-slate-800 w-14 sm:w-16">สุทธิ</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                   {groupedSummaryMap[catName].map((s,i) => (
                                      <tr key={i} className="hover:bg-slate-800/30">
                                        <td className="p-2 pl-4 text-slate-300 font-bold">{s.flavor}</td>
                                        <td className="p-2 text-center font-bold text-slate-400">{s.pots||'-'}</td>
                                        <td className="p-2 text-center font-bold text-slate-400">{s.bottles||'-'}</td>
                                        <td className="p-2 text-center font-bold text-amber-400/80">{s.remainders||'-'}</td>
                                        <td className="p-2 text-center font-bold text-rose-400/80">{s.defects||'-'}</td>
                                        <td className="p-2 text-center font-bold text-emerald-400 bg-slate-800/50">{s.net||'-'}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                        )}
                     </div>
                   ))
                 )}
              </div>

              {/* อัปเดตตารางสรุปรวมด้านล่างสุดของหน้ายอดผลิตสะสม ให้เห็น หม้อ ขวด เศษ หัก ชัดๆ ครับ */}
              <div className="bg-slate-900 border-t border-slate-700 p-4">
                 <div className="flex justify-between items-center mb-3">
                    <div className="text-sm font-bold text-amber-400">รวมสุทธิทั้งหมด:</div>
                    <div className="text-3xl font-black text-amber-400">{displayedTotals.net} <span className="text-sm font-normal text-slate-500">ขวด</span></div>
                 </div>
                 <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-700/50 pt-3">
                    <div className="bg-slate-800/80 p-2 rounded-lg"><div className="text-[10px] text-slate-500 mb-1">หม้อรวม</div><div className="font-bold text-white text-sm">{displayedTotals.pots}</div></div>
                    <div className="bg-slate-800/80 p-2 rounded-lg"><div className="text-[10px] text-slate-500 mb-1">ขวดรวม</div><div className="font-bold text-emerald-400 text-sm">{displayedTotals.bottles}</div></div>
                    <div className="bg-slate-800/80 p-2 rounded-lg"><div className="text-[10px] text-slate-500 mb-1">เศษรวม</div><div className="font-bold text-amber-400 text-sm">{displayedTotals.remainders}</div></div>
                    <div className="bg-slate-800/80 p-2 rounded-lg"><div className="text-[10px] text-slate-500 mb-1">หักรวม</div><div className="font-bold text-rose-400 text-sm">{displayedTotals.defects}</div></div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
                 <h3 className="text-indigo-400 font-bold mb-3 border-b border-slate-700 pb-2">📦 รายละเอียดสต๊อกขวด</h3>
                 <div className="mb-4">
                   <h4 className="text-white font-bold text-sm mb-2 bg-indigo-500/20 p-1.5 rounded text-indigo-300">ขนาด 1.5 ลิตร</h4>
                   <div className="space-y-1.5 text-xs sm:text-sm pl-2">
                     <div className="flex justify-between text-slate-400">
                       <span>เก่า ({s15.oldS}) + ใหม่ ({s15.newS})</span>
                       <span className="text-emerald-400 font-bold">รับรวม {s15.totalIn}</span>
                     </div>
                     <div className="flex justify-between text-slate-400">
                       <span>ใช้ไป ({s15.used}) + เสีย ({s15.def})</span>
                       <span className="text-rose-400 font-bold">หักรวม {s15.totalOut}</span>
                     </div>
                     <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-700/50 mt-1">
                       <span className="font-bold">คงเหลือสุทธิ</span>
                       <span className="text-indigo-400 font-black text-base">{s15.net}</span>
                     </div>
                   </div>
                 </div>
                 <div>
                   <h4 className="text-white font-bold text-sm mb-2 bg-amber-500/20 p-1.5 rounded text-amber-300">ขนาด 1.0 ลิตร</h4>
                   <div className="space-y-1.5 text-xs sm:text-sm pl-2">
                     <div className="flex justify-between text-slate-400">
                       <span>เก่า ({s10.oldS}) + ใหม่ ({s10.newS})</span>
                       <span className="text-emerald-400 font-bold">รับรวม {s10.totalIn}</span>
                     </div>
                     <div className="flex justify-between text-slate-400">
                       <span>ใช้ไป ({s10.used}) + เสีย ({s10.def})</span>
                       <span className="text-rose-400 font-bold">หักรวม {s10.totalOut}</span>
                     </div>
                     <div className="flex justify-between text-slate-200 pt-1 border-t border-slate-700/50 mt-1">
                       <span className="font-bold">คงเหลือสุทธิ</span>
                       <span className="text-amber-400 font-black text-base">{s10.net}</span>
                     </div>
                   </div>
                 </div>
               </div>

               <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col h-full">
                 <h3 className="text-rose-400 font-bold mb-3 border-b border-slate-700 pb-2">🥤 ยอดจ่ายน้ำแยกสาขา</h3>
                 <div className="space-y-2 text-sm mt-1 flex-1">
                    {BRANCH_LABELS.map(b => {
                      const val = parseNum(getQty(displayedStaffWater?.[b.k]));
                      const n = getName(displayedStaffWater?.[b.k]);
                      return (
                        <div key={b.k} className="flex justify-between items-center text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                          <div>
                             <div className="text-xs">{b.l}</div>
                             {n && <div className="text-[10px] text-slate-500">{n}</div>}
                          </div>
                          <span className={`font-bold text-base ${val > 0 ? 'text-white' : 'text-slate-600'}`}>{val || '0'}</span>
                        </div>
                      )
                    })}
                 </div>
                 <div className="flex justify-between items-center text-slate-200 pt-3 border-t border-slate-700 mt-4 bg-slate-900 p-3 rounded-xl border border-rose-900/30 shadow-inner">
                    <span className="font-bold text-base text-rose-100">รวมทั้งหมด</span>
                    <span className="text-3xl font-black text-rose-500 drop-shadow-md">{displayedStaffWaterTotal}</span>
                 </div>
               </div>

               <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col h-full">
                 <h3 className="text-amber-400 font-bold mb-3 border-b border-slate-700 pb-2">📉 สรุปเหตุผลที่หักน้ำ</h3>
                 <div className="space-y-2 text-sm mt-1 flex-1">
                    {Object.entries(defectReasonsMap).map(([reason, qty]) => (
                      <div key={reason} className="flex justify-between items-center text-slate-300 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                        <span>{reason}</span>
                        <span className={`font-bold text-base ${qty > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{qty || '0'}</span>
                      </div>
                    ))}
                 </div>
                 <div className="flex justify-between items-center text-slate-200 pt-3 border-t border-slate-700 mt-4 bg-slate-900 p-3 rounded-xl border border-amber-900/30 shadow-inner">
                    <span className="font-bold text-base text-amber-100">หักรวมทั้งหมด</span>
                    <span className="text-3xl font-black text-amber-500 drop-shadow-md">{displayedTotals.defects}</span>
                 </div>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* --- ส่วนประวัติย้อนหลังแบบการ์ด --- */}
      {activeView === 'history' && (
        <div className="animate-in slide-in-from-right-8 duration-300">
          <ViewHeader title="ประวัติย้อนหลังแบบการ์ด" />
          <div className="max-w-2xl mx-auto p-4 mt-2 space-y-6">
            
            <div className="flex justify-between items-center bg-slate-800 p-3 rounded-2xl border border-slate-600 shadow-lg">
               <div className="flex items-center flex-1 mr-3">
                 <span className="text-slate-400 mr-3 ml-2">📅 วันที่:</span>
                 <select 
                   value={historyFilterDate} 
                   onChange={(e) => setHistoryFilterDate(e.target.value)} 
                   className="bg-slate-900 border border-slate-700 text-indigo-400 font-bold p-2.5 rounded-xl outline-none flex-1 appearance-none shadow-inner"
                 >
                   <option value="">-- กรุณาเลือกวันที่ --</option>
                   {historyRecords.map(h => <option key={h.id} value={h.id}>{h.dateString}</option>)}
                 </select>
               </div>
               <button onClick={handleClearAllHistoryRecords} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 active:scale-95 transition shadow-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
               </button>
            </div>

            {historyRecords.length === 0 ? (
              <div className="text-center text-slate-500 py-10 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">ยังไม่มีแฟ้มประวัติย้อนหลังในระบบ</div>
            ) : historyFilterDate === '' ? (
              <div className="text-center text-indigo-300 py-16 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed animate-pulse">👆 กรุณากดเลือกวันที่ด้านบน เพื่อดูประวัติครับ</div>
            ) : (
              historyRecords.filter(h => h.id === historyFilterDate).map(hist => {
                
                const histDefectsMap = { 'หักลงร้านของชำ': 0, 'หักให้พี่เอ็ม': 0, 'หักเพราะมีลูกค้าซื้อ': 0 };
                let totalHistDefects = 0;
                (hist.records || []).forEach(r => {
                  if (r.defects > 0 && r.defectReason) {
                    if (histDefectsMap[r.defectReason] !== undefined) histDefectsMap[r.defectReason] += parseInt(r.defects);
                    totalHistDefects += parseInt(r.defects);
                  }
                });

                const s15Hist = stockMath(hist.bottleStock?.size15);
                const s10Hist = stockMath(hist.bottleStock?.size10);

                return (
                  <div 
                    key={hist.id} 
                    className="bg-slate-800 border border-slate-600 rounded-2xl p-5 shadow-2xl cursor-pointer hover:ring-2 ring-indigo-500 transition-all active:scale-[0.99] group"
                    onClick={() => setSelectedHistory(hist)}
                  >
                     <div className="flex justify-between items-center border-b-2 border-slate-700 pb-3 mb-4">
                       <div className="font-bold text-xl text-emerald-400">📅 {hist.dateString}</div>
                       <div className="text-xs text-slate-400 font-bold bg-slate-900 px-3 py-1.5 rounded-full">ปิดยอด: {new Date(hist.timestamp).toLocaleTimeString('th-TH')}</div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                       <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl border border-amber-900/30 shadow-inner flex flex-col justify-center">
                         <div className="text-slate-400 mb-1 font-bold text-xs">ยอดผลิตสุทธิรวม</div>
                         <div className="text-3xl font-black text-amber-400 drop-shadow mb-3">{hist.totals?.net || 0} <span className="text-sm font-normal text-slate-500">ขวด</span></div>
                         <div className="grid grid-cols-4 gap-1.5 text-center pt-3 border-t border-slate-700/50">
                           <div className="bg-slate-800/80 p-1.5 rounded-lg"><div className="text-[10px] text-slate-500 mb-0.5">หม้อ</div><div className="font-bold text-white text-sm">{hist.totals?.pots || 0}</div></div>
                           <div className="bg-slate-800/80 p-1.5 rounded-lg"><div className="text-[10px] text-slate-500 mb-0.5">ขวด</div><div className="font-bold text-emerald-400 text-sm">{hist.totals?.bottles || 0}</div></div>
                           <div className="bg-slate-800/80 p-1.5 rounded-lg"><div className="text-[10px] text-slate-500 mb-0.5">เศษ</div><div className="font-bold text-amber-400 text-sm">{hist.totals?.remainders || 0}</div></div>
                           <div className="bg-slate-800/80 p-1.5 rounded-lg"><div className="text-[10px] text-slate-500 mb-0.5">หัก</div><div className="font-bold text-rose-400 text-sm">{hist.totals?.defects || 0}</div></div>
                         </div>
                       </div>
                       
                       <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 rounded-xl border border-rose-900/30 shadow-inner flex flex-col justify-center">
                         <div className="text-slate-400 mb-1 font-bold text-xs">ยอดจ่ายพนักงานรวม</div>
                         <div className="text-3xl font-black text-rose-400 drop-shadow mb-2">{hist.staffWaterTotal || 0} <span className="text-sm font-normal text-slate-500">ขวด</span></div>
                         <div className="text-xs text-slate-500 mt-auto pt-3 border-t border-slate-700/50">เบิกแจกจ่ายรายสาขาอยู่ด้านล่าง</div>
                       </div>
                     </div>

                     <div className="space-y-5 border-t border-dashed border-slate-600 pt-4">
                       
                       <div>
                         <div className="text-indigo-400 font-bold mb-3 flex items-center gap-1.5 text-sm uppercase tracking-wider"><span>📊</span> บัญชีสต๊อกขวดเปล่าย้อนหลัง</div>
                         <div className="space-y-3">
                           <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-900/20">
                             <div className="text-indigo-300 text-xs font-bold mb-2 border-b border-indigo-900/30 pb-1">ขวดขนาด 1.5 ลิตร</div>
                             <div className="grid grid-cols-2 gap-y-2 text-[11px] sm:text-xs">
                               <div className="flex justify-between pr-2 border-r border-slate-700"><span className="text-slate-500">เก่าเหลือยกมา:</span> <span className="text-white font-bold">{s15Hist.oldS}</span></div>
                               <div className="flex justify-between pl-2"><span className="text-slate-500">เบิกมาใหม่:</span> <span className="text-emerald-400 font-bold">{s15Hist.newS}</span></div>
                               <div className="flex justify-between pr-2 border-r border-slate-700 bg-indigo-500/5 rounded"><span className="text-indigo-200">ยอดรวมรับ:</span> <span className="text-indigo-300 font-black">{s15Hist.totalIn}</span></div>
                               <div className="flex justify-between pl-2"><span className="text-slate-500">ใช้ไปวันนี้:</span> <span className="text-amber-400 font-bold">{s15Hist.used}</span></div>
                               <div className="flex justify-between pr-2 border-r border-slate-700"><span className="text-rose-400">หักเสียหาย:</span> <span className="text-rose-400 font-bold">{s15Hist.def}</span></div>
                               <div className="flex justify-between pl-2 bg-emerald-500/5 rounded"><span className="text-emerald-300">คงเหลือสุทธิ:</span> <span className="text-emerald-400 font-black">{s15Hist.net}</span></div>
                             </div>
                           </div>
                           <div className="bg-slate-900/60 p-3 rounded-xl border border-indigo-900/20">
                             <div className="text-amber-300 text-xs font-bold mb-2 border-b border-amber-900/30 pb-1">ขวดขนาด 1.0 ลิตร</div>
                             <div className="grid grid-cols-2 gap-y-2 text-[11px] sm:text-xs">
                               <div className="flex justify-between pr-2 border-r border-slate-700"><span className="text-slate-500">เก่าเหลือยกมา:</span> <span className="text-white font-bold">{s10Hist.oldS}</span></div>
                               <div className="flex justify-between pl-2"><span className="text-slate-500">เบิกมาใหม่:</span> <span className="text-emerald-400 font-bold">{s10Hist.newS}</span></div>
                               <div className="flex justify-between pr-2 border-r border-slate-700 bg-amber-500/5 rounded"><span className="text-amber-200">ยอดรวมรับ:</span> <span className="text-amber-300 font-black">{s10Hist.totalIn}</span></div>
                               <div className="flex justify-between pl-2"><span className="text-slate-500">ใช้ไปวันนี้:</span> <span className="text-amber-400 font-bold">{s10Hist.used}</span></div>
                               <div className="flex justify-between pr-2 border-r border-slate-700"><span className="text-rose-400">หักเสียหาย:</span> <span className="text-rose-400 font-bold">{s10Hist.def}</span></div>
                               <div className="flex justify-between pl-2 bg-emerald-500/5 rounded"><span className="text-emerald-300">คงเหลือสุทธิ:</span> <span className="text-emerald-400 font-black">{s10Hist.net}</span></div>
                             </div>
                           </div>
                         </div>
                       </div>

                       <div>
                         <div className="text-rose-400 font-bold mb-2 flex items-center gap-1.5 text-sm"><span>🥤</span> เบิกน้ำแจกแจงตามสาขา</div>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                           {BRANCH_LABELS.map(b => {
                             const val = parseNum(getQty(hist.staffWater?.[b.k]));
                             const n = getName(hist.staffWater?.[b.k]);
                             return (
                               <div key={b.k} className="bg-slate-900/80 p-2.5 rounded-lg flex justify-between items-center border border-slate-700/50">
                                  <div>
                                     <div className="text-slate-400 text-xs">{b.l}</div>
                                     {n && <div className="text-[10px] text-slate-500">{n}</div>}
                                  </div>
                                  <span className={`font-bold ${val > 0 ? 'text-white' : 'text-slate-600'}`}>{val || 0}</span>
                               </div>
                             )
                           })}
                         </div>
                       </div>

                       <div>
                         <div className="text-amber-400 font-bold mb-2 flex items-center gap-1.5 text-sm"><span>📉</span> สรุปเหตุผลที่หักน้ำ (รวม {totalHistDefects} ขวด)</div>
                         <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                           {Object.entries(histDefectsMap).map(([reason, qty]) => (
                             <div key={reason} className="bg-slate-900/80 p-2.5 rounded-lg flex justify-between border border-slate-700/50">
                               <span className="text-slate-400 truncate pr-2 text-xs">{reason.replace('หัก', '')}</span><span className={`font-bold ${qty > 0 ? 'text-amber-400' : 'text-slate-600'}`}>{qty}</span>
                             </div>
                           ))}
                         </div>
                       </div>

                     </div>
                     <div className="bg-indigo-500/10 p-2.5 text-center text-xs text-indigo-300 font-bold group-hover:bg-indigo-500/20 transition-colors rounded-xl mt-4">
                        👆 แตะที่การ์ดนี้ เพื่อดู/แก้ไขรายละเอียดการต้มของพนักงานแต่ละคน
                     </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default App;