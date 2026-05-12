/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, updateDoc, query, orderBy, limit } from 'firebase/firestore';

// --- รหัส Firebase ของคุณ Kiao ---
const firebaseConfig = {
  apiKey: "AIzaSyCfS84jS1Tf7zYaC1tB3PzQUcUwAtKXr24",
  authDomain: "mybranchapp-8cadb.firebaseapp.com",
  projectId: "mybranchapp-8cadb",
  storageBucket: "mybranchapp-8cadb.firebasestorage.app",
  messagingSenderId: "386930800655",
  appId: "1:386930800655:web:2b1d647f7d67c5b96acb7a",
  measurementId: "G-7GL7NFGMTY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ไอคอน ---
const IconClipboard = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14h6"/><path d="M9 10h6"/><path d="M9 18h6"/></svg>;
const IconTrash = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconBox = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconHome = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const IconFileText = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconPen = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>;
const IconEdit = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDownload = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const IconShare = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const IconSearch = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconGift = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>;
const IconBanknote = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" ry="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>;
const IconFlame = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>;
const IconImage = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
const IconMaximize = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>;

const SHIFTS = ["เช้า", "บ่าย", "ดึก"];
const BRANCHES = [1, 2, 3, 4, 5];

const getTodayStr = () => {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const getLocalYMD = (timestamp) => {
  if (!timestamp) return '';
  const d = new Date(timestamp); 
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ============================================================================
// 📦 ฐานข้อมูลสินค้า
// ==========================================
const MAIN_CATEGORIES = {
  "🥤 หมวดหมู่น้ำสด 1.5 ลิตร": ["1.5 บลู", "1.5 เตย", "1.5 ชาไทย", "1.5 ชาเขียว", "1.5 ข้าวญี่ปุ่น", "1.5 ไร้กลิ่น", "1.5 ผลไม้รวม"],
  "🥤 หมวดหมู่น้ำสด 1.0 ลิตร": ["1.0 บลู", "1.0 เตย", "1.0 ชาไทย", "1.0 ไร้กลิ่น", "น้ำ69"],
  "🍓 หมวดหมู่น้ำผลไม้ 1.5": ["แอปเปิ้ล", "สตอเบอรี่", "องุ่น", "ลิ้นจี่", "สับปะรด", "แคนตาลูป", "โยเกิร์ต"],
  "🍯 หมวดหมู่น้ำหวาน - รมควัน": ["Yดาว", "Yแดง", "Yซี", "Yไก่", "Yไอคอ", "น้ำหวานขวด", "น้ำหวานเกลอน", "รมควน", "วีแดง", "วีเขียว", "ไฟเช็ก 10บ.", "ไฟเช็ก 20บ."],
  "🍫 หมวดหมู่ขนม": ["ขนม 5บ.", "ขนม 10บ.", "ขนม 20บ.", "มาม่าซอง", "มาม่าคัพ", "ขนมช็อคโกแลต5บาท"],
  "🧊 เครื่องดื่มตู้โค้ก": [
    "M-150", "ซีวิค", "คาราบาว", "น้ำตาลสด23.", "น้ำดื่ม", "น้ำเปล่า", "มิรินด้า", 
    "ลิปตัน", "สติงค์", "สไปร์", "อิชิตัน", "นมดีมอลค์", "น้ำส้มมินิเมด", "เย็นๆเหลือง", 
    "เพรียวริคุ", "เบอร์ดี้เขียว", "เบอร์ดี้แดง", "เบียร์ช้าง", "เบียร์ลีโอ", "เบียร์สิงห์", 
    "โค้ก13บาท", "โค้ก17", "โค้ก19บาท", "โค้ก1.5 30บ.", "แป๊บซี่11บาท", "แป๊บซี่13", 
    "แป๊บซี่19", "แป๊บซี่30บาท", "แป๊บซี่17 กระป๋อง", "แป๊บซี่17บ.ขวด", "แฟนต้า13", 
    "แฟนต้า16บ."
  ],
  "🍦 หมวดหมู่ไอติม": ["ครั้นชี่ช็อกโก", "ติมช็อคชิป", "ติมท็อปเทน", "ติมนมฮอกไกโด", "ติมฟรุ้ตตี้", "ติมลาวาแท่ง", "ติมหัวใจ", "ติมเรนโบว์", "ติมโอวัลตินแท่ง", "บิ๊กร็อกเป็นเจลลี่", "หมีพูล", "โมจิ", "ไอติมผี"]
};

const BRANCH_2_CATEGORIES = {
  ...MAIN_CATEGORIES,
  "🍫 หมวดหมู่ขนม": ["ขนม 5บ.", "ขนม 10บ.", "ขนม 20บ.", "มาม่าซอง", "มาม่าคัพ"],
  "🧊 เครื่องดื่มตู้โค้ก": [
    "C-vit", "เอ็ม150", "คาลพิสแลคโตะ", "น้ำสี10", "เรดี้แดง", "โออิชิ", "สปอนเซอร์", 
    "ทีพลัส", "สิงห์โซดา", "อิชิตันม่วง", "อิชิตันส้ม", "อิชิตันเหลือง", "กาแฟโรบัสต้า", 
    "กาแฟเนสเอสเปรสโซ", "กาแฟเนสลาเต้", "นม ไวตามิลค์", "นมแลคตาซอย", "แป๊บซี่11", 
    "แป๊บซี่13", "แป๊บซี่17", "แป๊บซี่19", "แป๊บซี่กระป๋อง", "แป๊บซี่กระป๋อง17", 
    "แป๊บซี่1.5ลิตร", "โค้กขวด13", "โค้กขวด19", "โค้ก17", "โค้กกระป๋อง", "แฟนต้า13", 
    "แฟนต้า 16บ.", "คาราบาว", "น้ำดื่ม", "เย็นๆเหลือง", "เพียวริคุ", "เบอร์ดี้แดง", 
    "เบอร์ดี้เขียว", "ช้าง", "ลีโอ", "เบียสิงห์", "น้ำตาลสด", "สติงค์", "ลิปตัน(กระป๋อง)", 
    "ลิปตัน(ขวด)", "ลิปตัน17", "เย็นๆแดง"
  ],
  "🍦 หมวดหมู่ไอติม": ["ไอติม5บ.", "ไอติม10บ.", "ไอติม15บ.", "ไอติม20บ."],
  "🧻 หมวดหมู่ของใช้": ["เเฟ้บ", "น้ำยาปรับผ้านุ่ม", "สบู่นกเเก้ว", "สบู่เดลตอล", "ก.ย.", "เเปรงสีฟัน", "ยาสีฟัน", "แชมพู25บาท", "แชมพู45บาท"]
};

const BRANCH_STOCKS = { "1": MAIN_CATEGORIES, "2": BRANCH_2_CATEGORIES, "3": MAIN_CATEGORIES, "4": MAIN_CATEGORIES, "5": BRANCH_2_CATEGORIES };

const MENU_15 = ["กลิ่นบลู", "กลิ่นใบเตย", "กลิ่นชาไทย", "กลิ่นชาเขียว", "ข้าวญี่ปุ่น", "ไร้กลิ่น", "ไร้กลิ่นผลไม้"];
const MENU_10 = ["กลิ่นบลู", "กลิ่นใบเตย", "กลิ่นชาไทย", "ไร้กลิ่น"];
const MENU_JUICE_15 = ["แอปเปิ้ล", "สตอเบอรี่", "องุ่น", "ลิ้นจี่", "สับปะรด", "แคนตาลูป", "โยเกิร์ต"];
const SYRUP_CATEGORIES = ["🍯 หมวดหมู่น้ำหวาน - รมควัน", "🍫 หมวดหมู่ขนม", "🧊 เครื่องดื่มตู้โค้ก"];

// --- ฟังก์ชันเสริม: บีบอัดรูปภาพ ---
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

// ============================================================================
// 📦 SYSTEM 1: ระบบเช็คสต็อกสินค้า V.2
// ==========================================
function StockApp({ onBack }) {
  const STOCK_BRANCHES = [1, 2, 3, 5]; 
  const [activeTab, setActiveTab] = useState('submit');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [shift, setShift] = useState(SHIFTS[0]);
  const [submitDate, setSubmitDate] = useState(getTodayStr()); 
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState({}); 
  const [history, setHistory] = useState([]);
  
  const [deletingId, setDeletingId] = useState(null);
  const [editSession, setEditSession] = useState(null);
  const [auditSession, setAuditSession] = useState(null);
  const [tempData, setTempData] = useState({}); 
  const [activeModalCat, setActiveModalCat] = useState(null);

  const [filterDate, setFilterDate] = useState(getTodayStr()); 
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearAllPin, setClearAllPin] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'stock_counts'), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }); return () => unsubscribe();
  }, []);

  useEffect(() => { setItemData({}); setActiveCategory(null); }, [selectedBranch]);

  const renderStatus = (remaining, comp) => {
    if (comp === '' || comp === undefined || comp === null) return <span className="text-slate-300 text-[10px]">-</span>;
    const rem = parseFloat(remaining) || 0; const c = parseFloat(comp) || 0; const diff = rem - c;
    if (diff === 0) return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black">✅ ตรง</span>;
    if (diff > 0) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black">⚠️ เกิน +{diff}</span>;
    return <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black">❌ หาย {Math.abs(diff)}</span>;
  };

  const handleInputChange = (category, flavor, field, value) => {
    const key = `${category}|||${flavor}`;
    setItemData(prev => {
      const current = prev[key] || { actual: '', sold: '', remaining: 0 };
      const updated = { ...current, [field]: value };
      updated.remaining = (parseFloat(updated.actual) || 0) - (parseFloat(updated.sold) || 0);
      return { ...prev, [key]: updated };
    });
  };

  const handleModalInput = (category, flavor, field, value) => {
    const key = `${category}|||${flavor}`;
    setTempData(prev => {
      const current = prev[key] || {};
      const updated = { ...current, [field]: value };
      if (field === 'actual' || field === 'sold') {
         updated.remaining = (parseFloat(updated.actual) || 0) - (parseFloat(updated.sold) || 0);
      }
      return { ...prev, [key]: updated };
    });
  };

  const handleSubmit = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงานก่อนค่ะ");
    const finalItems = []; let totalSold = 0;
    Object.entries(itemData).forEach(([key, data]) => {
      if (data.actual !== '' || data.sold !== '') {
        const [category, flavor] = key.split('|||');
        const soldVal = parseFloat(data.sold) || 0;
        totalSold += soldVal;
        finalItems.push({ category, flavor, actual: parseFloat(data.actual) || 0, sold: soldVal, remaining: data.remaining, comp: '' });
      }
    });

    if (finalItems.length === 0) return alert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try {
      await addDoc(collection(db, 'stock_counts'), {
        branch: selectedBranch, staff: staffName, shift, submitDate, totalSold, items: finalItems, isAudited: false, createdAt: Date.now(), timestamp: new Date().toLocaleString('th-TH')
      });
      setItemData({}); setStaffName(''); alert("✅ บันทึกส่งกะเช็คสต็อกสำเร็จ!"); setActiveTab('history');
    } catch (e) { alert("เกิดข้อผิดพลาด"); } finally { setLoading(false); }
  };

  const openEdit = (record) => {
    setEditSession(record); setActiveModalCat(null);
    const initData = {}; 
    (record.items || []).forEach(i => initData[`${i.category}|||${i.flavor}`] = { ...i, actual: i.actual.toString(), sold: i.sold.toString() });
    setTempData(initData);
  };

  const openAudit = (record) => {
    setAuditSession(record); setActiveModalCat(null);
    const initData = {}; 
    (record.items || []).forEach(i => initData[`${i.category}|||${i.flavor}`] = { ...i });
    setTempData(initData);
  };

  const saveEdit = async () => {
    const finalItems = []; let totalSold = 0;
    Object.entries(tempData).forEach(([key, data]) => {
        const [category, flavor] = key.split('|||');
        const soldVal = parseFloat(data.sold) || 0; totalSold += soldVal;
        finalItems.push({ category, flavor, actual: parseFloat(data.actual) || 0, sold: soldVal, remaining: data.remaining, comp: data.comp || '' });
    });
    setLoading(true);
    try {
      await updateDoc(doc(db, 'stock_counts', editSession.id), { items: finalItems, totalSold, timestamp: new Date().toLocaleString('th-TH') + ' (พนักงานแก้ไข)' });
      setEditSession(null); alert("✅ พนักงานแก้ไขยอดสำเร็จ!");
    } catch(err) {} finally { setLoading(false); }
  };

  const saveAudit = async () => {
    const finalItems = [];
    Object.entries(tempData).forEach(([key, data]) => {
        const [category, flavor] = key.split('|||');
        finalItems.push({ category, flavor, actual: data.actual, sold: data.sold, remaining: data.remaining, comp: data.comp !== '' ? parseFloat(data.comp) : '' });
    });
    setLoading(true);
    try {
      await updateDoc(doc(db, 'stock_counts', auditSession.id), { items: finalItems, isAudited: true, timestamp: new Date().toLocaleString('th-TH') + ' (ตรวจแล้ว)' });
      setAuditSession(null); alert("✅ บันทึกการตรวจสอบยอดคอมสำเร็จ! ล็อกบิลเรียบร้อย");
    } catch(err) {} finally { setLoading(false); }
  };

  const handleDelete = async () => { if (!deletingId) return; try { await deleteDoc(doc(db, 'stock_counts', deletingId)); setDeletingId(null); } catch (e) {} };

  const handleClearAll = async () => {
    if (clearAllPin !== '8888') return alert("รหัสผ่านไม่ถูกต้อง!");
    const branchRecords = history.filter(h => h?.branch === selectedBranch);
    if (branchRecords.length === 0) return alert("ไม่มีข้อมูลให้ลบค่ะ");
    if (!window.confirm(`ยืนยันลบประวัติสต็อกทั้งหมดของสาขา ${selectedBranch} จำนวน ${branchRecords.length} รายการ?`)) return;
    setLoading(true);
    try {
        for (const record of branchRecords) await deleteDoc(doc(db, 'stock_counts', record.id));
        alert("ล้างประวัติทั้งหมดเรียบร้อยแล้ว!");
    } catch (err) {} finally { setLoading(false); setIsClearingAll(false); setClearAllPin(''); }
  };

  const handleShareStock = async (record) => {
    let text = `📦 *ส่งกะเช็คสต็อก สาขา ${record?.branch}*\n👤 พนักงาน: ${record?.staff} (กะ${record?.shift})\n📅 ${record?.submitDate || record?.timestamp}\n\n`;
    const grouped = {};
    (record.items || []).forEach(i => { if (!grouped[i.category]) grouped[i.category] = []; grouped[i.category].push(i); });
    Object.keys(grouped).forEach(cat => {
      text += `[ ${cat.replace(/🥤 |🍓 |🍯 |🍫 |🧊 |🍦 |🧻 /g, '')} ]\n`;
      grouped[cat].forEach(i => { text += `- ${i.flavor} | เหลือ: ${i.remaining} | ขาย: ${i.sold}\n`; }); text += `\n`;
    });
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("📋 คัดลอกข้อมูลสต็อกแล้ว! นำไปวางในแชทไลน์ได้เลยค่ะ"); } catch (err) {} document.body.removeChild(textArea);
  };

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white p-8 rounded-[3rem] shadow-xl w-full max-w-sm text-center relative"><button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"><IconHome /></button><div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6"><IconClipboard /></div><h2 className="text-2xl font-black text-slate-800">เช็คสต็อกสินค้า</h2><p className="text-xs text-slate-400 mb-8 uppercase tracking-widest">Stock V.2 System</p><div className="grid grid-cols-2 gap-3">{STOCK_BRANCHES.map(n => <button key={n} onClick={() => setSelectedBranch(n.toString())} className="py-4 border-2 border-teal-400 text-teal-600 rounded-2xl font-bold hover:bg-teal-50 active:scale-95 transition-all">สาขา {n}</button>)}</div></div></div>
    );
  }

  const currentStock = BRANCH_STOCKS[selectedBranch] || {};
  const groupModalData = () => {
    const grouped = {}; Object.keys(tempData).forEach(key => { const [cat, flav] = key.split('|||'); if(!grouped[cat]) grouped[cat] = []; grouped[cat].push({flavor: flav, key}); }); return grouped;
  };

  const filteredHistory = history.filter(h => h && h.branch === selectedBranch && (h.submitDate === filterDate || (!h.submitDate && getLocalYMD(h.createdAt) === filterDate)));

  return (
    <div className="min-h-screen bg-teal-50 pb-32 font-sans">
      <header className="bg-teal-600 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center"><button onClick={onBack} className="p-2 bg-teal-700 rounded-full"><IconHome /></button><span className="font-bold">สต็อก สาขา {selectedBranch}</span><button onClick={() => setSelectedBranch(null)} className="text-[10px] bg-teal-800 px-3 py-1.5 rounded-lg font-bold">เปลี่ยนสาขา</button></header>
      <main className="max-w-md mx-auto p-4">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <button onClick={() => setActiveTab('submit')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'submit' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400'}`}>📝 ส่งกะ</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-teal-500 text-white shadow-md' : 'text-slate-400'}`}>📅 ประวัติ</button>
        </div>

        {activeTab === 'submit' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <div className="flex gap-3">
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">ชื่อพนักงาน</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" /></div>
                 <div className="w-1/3"><label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">กะ</label><select value={shift} onChange={e => setShift(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none">{SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">วันที่ส่งยอด</label><input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none" /></div>
            </div>
            <div className="space-y-2">
              {Object.keys(currentStock).map(cat => (
                <div key={cat} className="space-y-2">
                  <button onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`w-full p-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all ${activeCategory === cat ? 'bg-teal-600 text-white shadow-lg' : 'bg-white text-teal-700 border border-teal-100 shadow-sm'}`}>
                    {cat} <span>{activeCategory === cat ? '▲' : '▼'}</span>
                  </button>
                  {activeCategory === cat && (
                    <div className="space-y-2 p-1 animate-in slide-in-from-top-2">
                      {currentStock[cat].map(flavor => {
                        const key = `${cat}|||${flavor}`; const data = itemData[key] || { actual: '', sold: '', remaining: 0 };
                        return (
                          <div key={flavor} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3"><div className="font-bold text-slate-700 text-sm border-b border-slate-50 pb-2">{flavor}</div>
                            <div className="flex gap-3">
                              <div className="flex-1"><label className="text-[9px] font-bold text-slate-400 block mb-1">นับจริงบนชั้น</label><input type="number" placeholder="0" className="w-full p-2 bg-teal-50 text-center rounded-lg text-sm font-black text-teal-700 border border-transparent focus:border-teal-300 outline-none" value={data.actual} onChange={e => handleInputChange(cat, flavor, 'actual', e.target.value)} /></div>
                              <div className="flex-1"><label className="text-[9px] font-bold text-amber-500 block mb-1">ยอดขายในกะ</label><input type="number" placeholder="0" className="w-full p-2 bg-amber-50 text-center rounded-lg text-sm font-black text-amber-600 border border-transparent focus:border-amber-300 outline-none" value={data.sold} onChange={e => handleInputChange(cat, flavor, 'sold', e.target.value)} /></div>
                              <div className="flex-1"><label className="text-[9px] font-bold text-slate-500 block mb-1">ยอดคงเหลือ</label><div className="w-full p-2 bg-slate-100 text-center rounded-lg text-sm font-black text-slate-600 border border-slate-200">{data.remaining}</div></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleSubmit} disabled={loading} className="w-full p-5 bg-teal-600 text-white rounded-2xl font-black shadow-lg shadow-teal-200 active:scale-95 transition-all text-lg mt-4">{loading ? 'กำลังบันทึก...' : 'ยืนยันบันทึกสต็อกกะนี้'}</button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">📅 เลือกวันที่ดูย้อนหลัง</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none" /></div>
            </div>

            {filteredHistory.length === 0 && <div className="text-center py-10 text-slate-400 font-medium">ไม่มีประวัติเช็คสต็อกในวันที่เลือกค่ะ</div>}
            {filteredHistory.map(record => {
               const hasError = (record.items || []).some(it => it.comp && parseFloat(it.remaining) !== parseFloat(it.comp));
               return (
                <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="font-bold text-slate-800">{record.staff} (กะ{record.shift})</div>
                        <div className="text-[10px] text-slate-400">{record.timestamp}</div>
                    </div>
                    {record.isAudited ? <span className={`px-2 py-1 rounded text-[9px] font-bold ${hasError ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>{hasError ? '⚠️ ยอดไม่ตรง' : '✅ ยอดตรง'}</span> : <span className="bg-amber-100 text-amber-600 px-2 py-1 rounded text-[9px] font-bold">รอเถ้าแก่ตรวจ</span>}
                  </div>
                  <div className="flex gap-2 mb-3">
                    {!record.isAudited && <button onClick={() => openEdit(record)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><IconEdit /></button>}
                    <button onClick={() => openAudit(record)} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${record.isAudited ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100'}`}>
                        {record.isAudited ? '👁️ ดูรายละเอียดบิล' : '🔍 เถ้าแก่ตรวจยอดคอม'}
                    </button>
                    <button onClick={() => setDeletingId(record.id)} className="p-2 text-slate-300 hover:text-red-500"><IconTrash /></button>
                  </div>
                  <button onClick={() => handleShareStock(record)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-700 rounded-xl font-bold text-[11px] border border-teal-100 hover:bg-teal-100"><IconShare /> แชร์ข้อมูล / ส่งไลน์</button>
                </div>
               );
            })}

            {history.filter(h => h?.branch === selectedBranch).length > 0 && (
                <button onClick={() => setIsClearingAll(true)} className="w-full mt-6 p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <IconTrash /> ล้างประวัติทั้งหมด (สาขา {selectedBranch})
                </button>
            )}
          </div>
        )}
      </main>

      {/* Modal พนักงานแก้ */}
      {editSession && (
        <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 animate-in slide-in-from-bottom-4" style={{ zIndex: 100 }}><div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"><div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3"><h3 className="font-black text-lg text-blue-600 flex items-center gap-2"><IconEdit /> พนักงานแก้ไขยอด</h3><button onClick={() => setEditSession(null)} className="p-2 bg-slate-100 text-slate-500 rounded-full"><IconX /></button></div><div className="flex-1 overflow-y-auto pr-2 space-y-2">
              <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-xl mb-2 font-bold">แก้ไขยอดขาย หรือ ยอดนับจริง ได้เลยค่ะ ระบบจะคำนวณยอดเหลือให้ใหม่</div>
              {Object.entries(groupModalData()).map(([cat, items]) => (
                <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <button onClick={() => setActiveModalCat(activeModalCat === cat ? null : cat)} className="w-full bg-slate-50 p-3 text-xs font-bold text-slate-700 flex justify-between">{cat} <span>{activeModalCat === cat ? '▲' : '▼'}</span></button>
                   {activeModalCat === cat && (
                      <div className="p-2 space-y-2 bg-white">
                         {items.map(({flavor, key}) => {
                            const d = tempData[key];
                            return (
                               <div key={flavor} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col gap-2">
                                  <div className="text-[11px] font-bold text-slate-700">{flavor}</div>
                                  <div className="flex gap-2">
                                     <div className="flex-1"><label className="text-[9px] text-slate-500">นับจริง</label><input type="number" className="w-full p-2 bg-white border border-slate-200 rounded text-center text-xs font-bold focus:border-blue-400 outline-none" value={d.actual} onChange={e => handleModalInput(cat, flavor, 'actual', e.target.value)} /></div>
                                     <div className="flex-1"><label className="text-[9px] text-amber-600">ยอดขาย</label><input type="number" className="w-full p-2 bg-amber-50/50 border border-amber-100 rounded text-center text-xs font-bold text-amber-700 focus:border-blue-400 outline-none" value={d.sold} onChange={e => handleModalInput(cat, flavor, 'sold', e.target.value)} /></div>
                                     <div className="flex-1"><label className="text-[9px] text-teal-600">ยอดเหลือ</label><div className="w-full p-2 bg-teal-50 border border-teal-100 rounded text-center text-xs font-black text-teal-700">{d.remaining}</div></div>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   )}
                </div>
              ))}
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 shrink-0"><button onClick={saveEdit} disabled={loading} className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg text-lg transition-all">{loading ? 'กำลังบันทึก...' : 'พนักงานอัปเดตยอด'}</button></div>
        </div></div>
      )}

      {/* Modal เถ้าแก่ตรวจ */}
      {auditSession && (
        <div className="fixed inset-0 bg-slate-900/80 flex flex-col items-center justify-end sm:justify-center p-0 sm:p-4 animate-in slide-in-from-bottom-4" style={{ zIndex: 100 }}><div className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl"><div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3"><h3 className="font-black text-lg text-purple-700 flex items-center gap-2"><IconSearch /> {auditSession.isAudited ? 'รายละเอียดบิล' : 'ตรวจสอบยอดในคอม'}</h3><button onClick={() => setAuditSession(null)} className="p-2 bg-slate-100 text-slate-500 rounded-full"><IconX /></button></div><div className="flex-1 overflow-y-auto pr-2 space-y-2">
              <div className="bg-purple-50 text-purple-800 text-xs p-3 rounded-xl mb-2 font-bold flex justify-between"><span>ผู้ส่ง: {auditSession.staff}</span> <span>ยอดขายรวม: {auditSession.totalSold}</span></div>
              {Object.entries(groupModalData()).map(([cat, items]) => (
                <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                   <button onClick={() => setActiveModalCat(activeModalCat === cat ? null : cat)} className="w-full bg-slate-50 p-3 text-xs font-bold text-slate-700 flex justify-between">{cat} <span>{activeModalCat === cat ? '▲' : '▼'}</span></button>
                   {activeModalCat === cat && (
                      <div className="p-0 bg-white">
                         <table className="w-full text-left border-collapse min-w-[320px]">
                            <thead className="bg-slate-100 text-[9px] text-slate-500"><tr><th className="p-2 w-[35%]">รายการ</th><th className="p-1 text-center w-[15%]">เหลือ</th><th className="p-1 text-center w-[25%] text-purple-700 bg-purple-50">ยอดคอม</th><th className="p-1 text-center w-[25%]">สถานะ</th></tr></thead>
                            <tbody>
                               {items.map(({flavor, key}, idx) => {
                                  const d = tempData[key];
                                  return (
                                     <tr key={flavor} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="p-2 text-[10px] font-bold text-slate-700">{flavor}</td>
                                        <td className="p-1 text-center text-teal-600 font-black text-xs">{d.remaining}</td>
                                        <td className="p-1 text-center bg-purple-50/30">
                                            {auditSession.isAudited ? (
                                                <div className="font-black text-purple-700 text-xs">{d.comp !== '' ? d.comp : '-'}</div>
                                            ) : (
                                                <input type="number" placeholder="-" className="w-full p-1.5 bg-white border border-purple-200 rounded text-center text-xs font-black text-purple-700 focus:border-purple-500 outline-none shadow-sm" value={d.comp || ''} onChange={e => handleModalInput(cat, flavor, 'comp', e.target.value)} />
                                            )}
                                        </td>
                                        <td className="p-1 text-center">{renderStatus(d.remaining, d.comp)}</td>
                                     </tr>
                                  );
                               })}
                            </tbody>
                         </table>
                      </div>
                   )}
                </div>
              ))}
            </div>
            {!auditSession.isAudited && (
              <div className="pt-4 mt-2 border-t border-slate-100 shrink-0"><button onClick={saveAudit} disabled={loading} className="w-full p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg text-lg transition-all">{loading ? 'กำลังบันทึก...' : 'บันทึกตรวจสอบ (ล็อกบิล)'}</button></div>
            )}
        </div></div>
      )}

      {deletingId && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 110 }}><div className="bg-white p-8 rounded-3xl w-full max-w-xs text-center"><div className="text-red-500 mb-2"><IconTrash /></div><h4 className="font-bold text-slate-800 mb-4">ลบประวัตินี้?</h4><div className="flex gap-2"><button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">ยกเลิก</button><button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">ลบเลย</button></div></div></div>)}
      
      {/* Modal ยืนยันล้างประวัติทั้งหมด */}
      {isClearingAll && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6" style={{ zIndex: 110 }}><div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center animate-in zoom-in-95 border-2 border-red-100"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><IconTrash /></div><h3 className="font-black text-xl text-slate-800 mb-2">ล้างประวัติสต็อก?</h3><p className="text-[10px] text-red-500 mb-4 font-bold">* ใส่รหัสผ่านเพื่อยืนยันการลบทั้งหมดของสาขานี้</p><div className="bg-slate-50 p-3 rounded-xl mb-4"><input type="password" placeholder="รหัสผ่าน" value={clearAllPin} onChange={e => setClearAllPin(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-center text-lg font-black outline-none focus:border-red-400 focus:ring-1 ring-red-400" /></div><div className="flex gap-2"><button onClick={() => { setIsClearingAll(false); setClearAllPin(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button onClick={handleClearAll} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black">{loading ? 'กำลังล้าง...' : 'ยืนยันล้าง'}</button></div></div></div>
      )}
    </div>
  );
}

// ============================================================================
// 📝 SYSTEM 2: ระบบสั่งน้ำสด-น้ำผลไม้
// ==========================================
function WaterApp({ onBack }) {
  const [activeTab, setActiveTab] = useState('order_form'); 
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [submitDate, setSubmitDate] = useState(getTodayStr());
  const [receiveRound, setReceiveRound] = useState('รอบ 1');
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [receiveHistoryList, setReceiveHistoryList] = useState([]);
  const [historyType, setHistoryType] = useState('order');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteType, setDeleteType] = useState('order');

  const [items15, setItems15] = useState(MENU_15.map(flavor => ({ flavor, pots: '', bottles: '' })));
  const [items10, setItems10] = useState(MENU_10.map(flavor => ({ flavor, pots: '', bottles: '' })));
  const [itemsJuice15, setItemsJuice15] = useState(MENU_JUICE_15.map(flavor => ({ flavor, pots: '', bottles: '' })));
  const [receiveData, setReceiveData] = useState({});

  const [activeOrderCat, setActiveOrderCat] = useState(0); 
  const [filterDate, setFilterDate] = useState(getTodayStr()); 

  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearAllPin, setClearAllPin] = useState('');

  // ใช้รายชื่อหมวดหมู่ที่ถูกแยกแล้ว
  const waterReceiveCategories = ["🥤 หมวดหมู่น้ำสด 1.5 ลิตร", "🥤 หมวดหมู่น้ำสด 1.0 ลิตร", "🍓 หมวดหมู่น้ำผลไม้ 1.5"];

  useEffect(() => {
    const qOrder = query(collection(db, 'water_requisitions'), orderBy('createdAt', 'desc'), limit(300));
    const unsubOrder = onSnapshot(qOrder, (snapshot) => {
      setHistoryList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }); 
    const qReceive = query(collection(db, 'receive_goods'), orderBy('createdAt', 'desc'), limit(300));
    const unsubReceive = onSnapshot(qReceive, (snapshot) => {
      setReceiveHistoryList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }); 
    return () => { unsubOrder(); unsubReceive(); };
  }, []);

  useEffect(() => { setReceiveData({}); setReceiveRound('รอบ 1'); }, [selectedBranch]);

  const getTotal = (itemsArray, key) => (itemsArray || []).reduce((sum, item) => sum + (parseInt(item[key]) || 0), 0);

  const handleOrderInput = (stateSetter, itemsArray, index, field, value, type) => {
    const newItems = [...itemsArray]; newItems[index][field] = value;
    if (field === 'pots' && value !== '') {
      const multiplier = type === '15' ? 16 : 24; newItems[index]['bottles'] = (parseFloat(value) * multiplier).toString();
    } else if (field === 'pots' && value === '') { newItems[index]['bottles'] = ''; } stateSetter(newItems);
  };

  const handleReceiveInput = (category, flavor, field, value) => {
    const key = `${category}|||${flavor}`;
    setReceiveData(prev => {
      const current = prev[key] || { pots: '', bottles: '', leftover: '', damaged: '' };
      const updated = { ...current, [field]: value };
      if (field === 'pots' && value !== '') {
        if (flavor.includes('1.5') || category.includes('ผลไม้')) { updated.bottles = (parseFloat(value) * 16).toString(); }
        else if (flavor.includes('1.0') || flavor === 'น้ำ69') { updated.bottles = (parseFloat(value) * 24).toString(); }
      } else if (field === 'pots' && value === '') { updated.bottles = ''; }
      return { ...prev, [key]: updated };
    });
  };

  const handleSubmitOrder = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงาน (ผู้สั่ง) ค่ะ");
    const tPots15 = getTotal(items15, 'pots'); const tBottles15 = getTotal(items15, 'bottles');
    const tPots10 = getTotal(items10, 'pots'); const tBottles10 = getTotal(items10, 'bottles');
    const tPotsJuice15 = getTotal(itemsJuice15, 'pots'); const tBottlesJuice15 = getTotal(itemsJuice15, 'bottles');
    if (tPots15 + tBottles15 + tPots10 + tBottles10 + tPotsJuice15 + tBottlesJuice15 === 0) return alert("กรุณากรอกอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try {
      const now = new Date();
      await addDoc(collection(db, 'water_requisitions'), {
        branch: selectedBranch, staffName, submitDate, date: now.toLocaleDateString('th-TH'), time: now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        items15, items10, itemsJuice15, totals: { pots15: tPots15, bottles15: tBottles15, pots10: tPots10, bottles10: tBottles10, potsJuice15: tPotsJuice15, bottlesJuice15: tBottlesJuice15 }, createdAt: Date.now(), timestamp: now.toLocaleString('th-TH')
      });
      setStaffName(''); setItems15(MENU_15.map(flavor => ({ flavor, pots: '', bottles: '' }))); setItems10(MENU_10.map(flavor => ({ flavor, pots: '', bottles: '' }))); setItemsJuice15(MENU_JUICE_15.map(flavor => ({ flavor, pots: '', bottles: '' })));
      alert("✅ ส่งออเดอร์สั่งน้ำสำเร็จ!"); setHistoryType('order'); setActiveTab('history');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSubmitReceive = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงาน (ผู้รับของ) ค่ะ");
    const finalItems = [];
    Object.entries(receiveData).forEach(([key, data]) => {
      if (data.pots || data.bottles || data.leftover || data.damaged) {
        const [category, flavor] = key.split('|||');
        finalItems.push({ category, flavor, pots: data.pots || '', bottles: data.bottles || '', leftover: data.leftover || '', damaged: data.damaged || '' });
      }
    });
    if (finalItems.length === 0) return alert("กรุณากรอกรายการรับน้ำอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try {
      await addDoc(collection(db, 'receive_goods'), { branch: selectedBranch, staffName, submitDate, receiveRound, items: finalItems, timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now() });
      setStaffName(''); setReceiveData({}); setReceiveRound('รอบ 1'); alert("✅ บันทึกรับน้ำลงร้านสำเร็จ!"); setHistoryType('receive'); setActiveTab('history'); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDelete = async () => { 
    if (!deletingId) return; 
    try { await deleteDoc(doc(db, deleteType === 'order' ? 'water_requisitions' : 'receive_goods', deletingId)); } catch (err) { console.error(err); } finally { setDeletingId(null); } 
  };

  const handleClearAll = async () => {
    if (clearAllPin !== '8888') return alert("รหัสผ่านไม่ถูกต้อง!");
    const colName = historyType === 'order' ? 'water_requisitions' : 'receive_goods';
    const list = historyType === 'order' ? historyList : receiveHistoryList;
    const branchRecords = list.filter(r => r && r.branch === selectedBranch && (historyType !== 'receive' || (r.items || []).some(i => i.category.includes('น้ำสด') || i.category.includes('น้ำผลไม้'))));
    
    if (branchRecords.length === 0) return alert("ไม่มีข้อมูลให้ลบค่ะ");
    if (!window.confirm(`ยืนยันลบประวัติ ${historyType==='order'?'สั่งน้ำ':'รับน้ำ'} ทั้งหมดของสาขา ${selectedBranch} จำนวน ${branchRecords.length} รายการ?`)) return;
    setLoading(true);
    try {
        for (const record of branchRecords) await deleteDoc(doc(db, colName, record.id));
        alert("ล้างประวัติทั้งหมดเรียบร้อยแล้ว!");
    } catch (err) { console.error(err); } finally { setLoading(false); setIsClearingAll(false); setClearAllPin(''); }
  };

  const handleShareOrder = async (record) => {
    let text = `📝 *ใบสั่งน้ำ สาขา ${record?.branch}*\n👤 ผู้สั่ง: ${record?.staffName}\n📅 ${record?.submitDate || record?.timestamp}\n\n`;
    const active15 = (record.items15 || []).filter(i => (parseInt(i.pots) || 0) > 0 || (parseInt(i.bottles) || 0) > 0);
    if (active15.length > 0) { text += `[ 💧 น้ำสด 1.5 ลิตร ]\n`; active15.forEach(i => { text += `- ${i.flavor}: ${i.pots && i.pots !== '0' ? i.pots + ' หม้อ ' : ''}${i.bottles && i.bottles !== '0' ? i.bottles + ' ขวด' : ''}\n`; }); text += `\n`; }
    const active10 = (record.items10 || []).filter(i => (parseInt(i.pots) || 0) > 0 || (parseInt(i.bottles) || 0) > 0);
    if (active10.length > 0) { text += `[ 💧 น้ำสด 1.0 ลิตร ]\n`; active10.forEach(i => { text += `- ${i.flavor}: ${i.pots && i.pots !== '0' ? i.pots + ' หม้อ ' : ''}${i.bottles && i.bottles !== '0' ? i.bottles + ' ขวด' : ''}\n`; }); text += `\n`; }
    const activeJuice15 = (record.itemsJuice15 || []).filter(i => (parseInt(i.pots) || 0) > 0 || (parseInt(i.bottles) || 0) > 0);
    if (activeJuice15.length > 0) { text += `[ 🍓 น้ำผลไม้ 1.5 ลิตร ]\n`; activeJuice15.forEach(i => { text += `- ${i.flavor}: ${i.pots && i.pots !== '0' ? i.pots + ' หม้อ ' : ''}${i.bottles && i.bottles !== '0' ? i.bottles + ' ขวด' : ''}\n`; }); text += `\n`; }
    text += `📊 *รวม*\nน้ำสด 1.5L -> ${record?.totals?.pots15 || 0} หม้อ, ${record?.totals?.bottles15 || 0} ขวด\nน้ำสด 1.0L -> ${record?.totals?.pots10 || 0} หม้อ, ${record?.totals?.bottles10 || 0} ขวด\n`;
    if ((record?.totals?.potsJuice15 || 0) > 0 || (record?.totals?.bottlesJuice15 || 0) > 0) { text += `น้ำผลไม้ 1.5L -> ${record?.totals?.potsJuice15 || 0} หม้อ, ${record?.totals?.bottlesJuice15 || 0} ขวด\n`; }
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("📋 คัดลอกข้อความสั่งน้ำแล้ว! กดวางในแชทไลน์ได้เลยค่ะ"); } catch (err) { console.error(err); } document.body.removeChild(textArea);
  };

  const handleShareReceive = async (record) => {
    let text = `📥 *ใบรับน้ำลงร้าน สาขา ${record?.branch}*\n👤 ผู้รับ: ${record?.staffName}\n📅 วันที่ ${record?.submitDate || record?.timestamp} ${record?.receiveRound ? `[${record.receiveRound}]` : ''}\n\n`;
    const waterItems = (record.items || []).filter(i => i.category.includes('น้ำสด') || i.category.includes('น้ำผลไม้'));
    waterItems.forEach(i => {
      text += `- ${i.flavor}: `;
      if(i.pots) text += `${i.pots} หม้อ `;
      if(i.bottles) text += `${i.bottles} ขวด `;
      if(i.leftover) text += `(เศษ ${i.leftover}) `;
      if(i.damaged) text += `[เสีย ${i.damaged}]`;
      text += `\n`;
    });
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("📋 คัดลอกข้อมูลรับน้ำแล้ว! นำไปวางในแชทไลน์ได้เลยค่ะ"); } catch (err) { console.error(err); } document.body.removeChild(textArea);
  };

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white p-8 rounded-[3rem] shadow-xl w-full max-w-sm text-center relative"><button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"><IconHome /></button><div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6"><IconFileText /></div><h2 className="text-2xl font-bold mb-2 text-slate-800">สั่งน้ำ & รับน้ำ</h2><p className="text-sm text-slate-500 mb-8">กรุณาเลือกสาขา</p><div className="grid grid-cols-2 gap-3">{BRANCHES.map(n => <button key={n} onClick={() => setSelectedBranch(n.toString())} className="py-4 border-2 border-indigo-400 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 active:scale-95 transition-all shadow-sm">สาขา {n}</button>)}</div></div></div>
    );
  }

  const orderListForHistory = historyList.filter(h => h && h.branch === selectedBranch && (h.submitDate === filterDate || (!h.submitDate && getLocalYMD(h.createdAt) === filterDate)));
  const receiveListForHistory = receiveHistoryList.filter(h => h && h.branch === selectedBranch && (h.submitDate === filterDate || (!h.submitDate && getLocalYMD(h.createdAt) === filterDate)) && (h.items || []).some(i => i.category.includes('น้ำสด') || i.category.includes('น้ำผลไม้')));

  return (
    <div className="min-h-screen bg-indigo-50 pb-32 font-sans text-slate-800">
      <header className="bg-indigo-600 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center"><button onClick={onBack} className="p-2 bg-indigo-700 rounded-full"><IconHome /></button><span className="font-bold">จัดการน้ำ สาขา {selectedBranch}</span><button onClick={() => setSelectedBranch(null)} className="text-[10px] bg-indigo-800 px-3 py-1.5 rounded-lg font-bold">เปลี่ยนสาขา</button></header>
      <main className="max-w-md mx-auto p-4">
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <button onClick={() => setActiveTab('order_form')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'order_form' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400'}`}>📝 สั่งน้ำ</button>
          <button onClick={() => setActiveTab('receive_form')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'receive_form' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}>📥 รับน้ำ</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400'}`}>📅 ประวัติ</button>
        </div>

        {activeTab === 'order_form' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border-t-4 border-indigo-500 space-y-3">
               <h2 className="text-center font-black text-lg text-indigo-800 mb-2">📝 ฟอร์มสั่งน้ำ</h2>
               <div><label className="text-[11px] font-bold text-slate-500 block mb-1">พนักงาน (ผู้สั่ง)</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:ring-1 ring-indigo-400" /></div>
               <div><label className="text-[11px] font-bold text-slate-500 block mb-1">วันที่สั่ง</label><input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 outline-none focus:ring-1 ring-indigo-400" /></div>
            </div>
            
            {[ { title: "💧 น้ำสด 1.5L (1หม้อ=16ขวด)", data: items15, setter: setItems15, type: '15', color: 'indigo' }, { title: "💧 น้ำสด 1.0L (1หม้อ=24ขวด)", data: items10, setter: setItems10, type: '10', color: 'blue' }, { title: "🍓 น้ำผลไม้ 1.5L (1หม้อ=16ขวด)", data: itemsJuice15, setter: setItemsJuice15, type: '15', color: 'rose' } ].map((cat, idx) => (
              <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <button onClick={() => setActiveOrderCat(activeOrderCat === idx ? null : idx)} className={`w-full p-3 text-center transition-all ${activeOrderCat === idx ? `bg-${cat.color}-100 border-b border-${cat.color}-200` : `bg-${cat.color}-50 hover:bg-${cat.color}-100`}`}>
                   <h3 className={`font-black text-${cat.color}-800 text-sm flex justify-between items-center px-2`}><span>{cat.title}</span> <span>{activeOrderCat === idx ? '▲' : '▼'}</span></h3>
                </button>
                {activeOrderCat === idx && (
                   <div className="p-3 space-y-2 animate-in slide-in-from-top-2">{cat.data.map((item, index) => (<div key={index} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100"><div className="font-bold text-slate-700 text-xs w-[35%]">{item.flavor}</div><div className="flex gap-2 w-[65%]"><input type="number" placeholder="หม้อ" className={`w-1/2 p-2 bg-${cat.color}-50/50 border border-transparent rounded-lg text-center text-sm font-black text-${cat.color}-700 outline-none focus:border-${cat.color}-300`} value={item.pots} onChange={e => handleOrderInput(cat.setter, cat.data, index, 'pots', e.target.value, cat.type)} /><input type="number" placeholder="ขวด" className="w-1/2 p-2 bg-emerald-50 border border-transparent rounded-lg text-center text-sm font-black text-emerald-700 outline-none focus:border-emerald-300" value={item.bottles} onChange={e => handleOrderInput(cat.setter, cat.data, index, 'bottles', e.target.value, cat.type)} /></div></div>))}</div>
                )}
              </div>
            ))}
            <button onClick={handleSubmitOrder} disabled={loading} className="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all mt-4 text-lg">{loading ? 'กำลังบันทึก...' : 'ส่งออเดอร์สั่งน้ำ'}</button>
          </div>
        )}

        {activeTab === 'receive_form' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border-t-4 border-emerald-500 space-y-3">
               <h2 className="text-center font-black text-lg text-emerald-800 mb-2">📥 ฟอร์มรับน้ำลงร้าน</h2>
               <div><label className="text-[11px] font-bold text-slate-500 block mb-1">พนักงาน (ผู้รับ)</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-1 ring-emerald-400" /></div>
               <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">วันที่รับของ</label><input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-1 ring-emerald-400" /></div>
                  <div><label className="text-[11px] font-bold text-slate-500 block mb-1">รอบที่ลงน้ำ</label>
                     <select value={receiveRound} onChange={e => setReceiveRound(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-emerald-700 outline-none focus:ring-1 ring-emerald-400">
                        <option value="รอบ 1">รอบ 1</option>
                        <option value="รอบ 2">รอบ 2</option>
                        <option value="รอบเดียวจบ">รอบเดียวจบ</option>
                     </select>
                  </div>
               </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-700 text-[11px] font-bold text-center">💡 กรอก "หม้อ" ระบบจะแปลงเป็นขวดให้อัตโนมัติ (และกรอกเศษแยกได้เลย)</div>
            {waterReceiveCategories.map((category, idx) => {
              const flavorList = BRANCH_STOCKS[selectedBranch]?.[category] || []; if (flavorList.length === 0) return null; const isJuice = category.includes('ผลไม้');
              return (
                <div key={category} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <button onClick={() => setActiveOrderCat(activeOrderCat === idx ? null : idx)} className={`w-full p-3 text-center transition-all ${activeOrderCat === idx ? `bg-${isJuice?'rose':'blue'}-100 border-b border-${isJuice?'rose':'blue'}-200` : `bg-${isJuice?'rose':'blue'}-50 hover:bg-${isJuice?'rose':'blue'}-100`}`}>
                     <h3 className={`font-black text-${isJuice ? 'rose' : 'blue'}-800 text-sm flex justify-between items-center px-2`}><span>{category}</span> <span>{activeOrderCat === idx ? '▲' : '▼'}</span></h3>
                  </button>
                  {activeOrderCat === idx && (
                     <div className="p-3 space-y-2 animate-in slide-in-from-top-2">{flavorList.map(flavor => { 
                         const key = `${category}|||${flavor}`; 
                         const totalVal = (parseInt(receiveData[key]?.bottles) || 0) + (parseInt(receiveData[key]?.leftover) || 0);
                         return (
                         <div key={flavor} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                           <div className="font-bold text-slate-700 text-[11px] mb-1.5">{flavor}</div>
                           <div className="grid grid-cols-5 gap-1">
                             <input type="number" placeholder="หม้อ" className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-center text-[10px] font-bold text-blue-600 outline-none" value={receiveData[key]?.pots || ''} onChange={e => handleReceiveInput(category, flavor, 'pots', e.target.value)} />
                             <input type="number" placeholder="ขวด" className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-center text-[10px] font-bold text-emerald-600 outline-none" value={receiveData[key]?.bottles || ''} onChange={e => handleReceiveInput(category, flavor, 'bottles', e.target.value)} />
                             <input type="number" placeholder="เศษ" className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-center text-[10px] font-bold text-orange-500 outline-none" value={receiveData[key]?.leftover || ''} onChange={e => handleReceiveInput(category, flavor, 'leftover', e.target.value)} />
                             <div className="flex items-center justify-center bg-indigo-50 border border-indigo-200 rounded-md text-[10px] font-black text-indigo-700">{totalVal > 0 ? totalVal : 'รวม'}</div>
                             <input type="number" placeholder="เสีย" className="w-full p-1.5 bg-white border border-slate-200 rounded-md text-center text-[10px] font-bold text-red-600 outline-none" value={receiveData[key]?.damaged || ''} onChange={e => handleReceiveInput(category, flavor, 'damaged', e.target.value)} />
                           </div>
                         </div>
                     )})}</div>
                  )}
                </div>
              );
            })}
            <button onClick={handleSubmitReceive} disabled={loading} className="w-full p-5 bg-emerald-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all mt-4 text-lg">{loading ? 'กำลังบันทึก...' : 'บันทึกรับน้ำลงร้าน'}</button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
               <button onClick={() => setHistoryType('order')} className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-all ${historyType === 'order' ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>📝 ประวัติสั่งน้ำ</button>
               <button onClick={() => setHistoryType('receive')} className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-all ${historyType === 'receive' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>📥 ประวัติรับน้ำ</button>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
                 <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">📅 เลือกวันที่ดูย้อนหลัง</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none" /></div>
            </div>

            {historyType === 'order' && (
              <>
                {orderListForHistory.length === 0 && <div className="text-center py-10 text-slate-400 font-medium">ไม่มีประวัติการสั่งน้ำในวันที่เลือกค่ะ</div>}
                {orderListForHistory.map((record) => (
                  <div key={record.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 overflow-hidden"><div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3"><div><span className="font-bold text-indigo-800 text-sm">{record?.staffName} (ผู้สั่ง)</span><div className="text-[10px] text-slate-500 mt-1">วันที่ {record?.submitDate || record?.timestamp}</div></div><button onClick={() => { setDeletingId(record.id); setDeleteType('order'); }} className="p-2 bg-red-50 text-red-500 rounded-lg"><IconTrash /></button></div><div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
                      {(record.items15 || []).filter(i=>(parseInt(i.pots)||0)>0||(parseInt(i.bottles)||0)>0).map((it,idx)=><div key={idx} className="text-xs text-slate-700 font-bold mb-1">💧 1.5 {it.flavor}: <span className="text-indigo-600 font-black">{it.pots} หม้อ {it.bottles} ขวด</span></div>)}
                      {(record.items10 || []).filter(i=>(parseInt(i.pots)||0)>0||(parseInt(i.bottles)||0)>0).map((it,idx)=><div key={idx} className="text-xs text-slate-700 font-bold mb-1">💧 1.0 {it.flavor}: <span className="text-blue-600 font-black">{it.pots} หม้อ {it.bottles} ขวด</span></div>)}
                      {(record.itemsJuice15 || []).filter(i=>(parseInt(i.pots)||0)>0||(parseInt(i.bottles)||0)>0).map((it,idx)=><div key={idx} className="text-xs text-slate-700 font-bold mb-1">🍓 ผลไม้ {it.flavor}: <span className="text-rose-600 font-black">{it.pots} หม้อ {it.bottles} ขวด</span></div>)}
                  </div><button onClick={() => handleShareOrder(record)} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100"><IconShare /> คัดลอก / ส่งไลน์</button></div>
                ))}
              </>
            )}

            {historyType === 'receive' && (
              <>
                {receiveListForHistory.length === 0 && <div className="text-center py-10 text-slate-400 font-medium">ไม่มีประวัติการรับน้ำในวันที่เลือกค่ะ</div>}
                {receiveListForHistory.map((record) => (
                  <div key={record.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 overflow-hidden">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                       <div><span className="font-bold text-emerald-800 text-sm">{record?.staffName} (ผู้รับ)</span><div className="text-[10px] text-slate-500 mt-1">วันที่ {record?.submitDate || record?.timestamp} <span className="text-emerald-600 font-bold ml-1">{record?.receiveRound ? `[${record.receiveRound}]` : ''}</span></div></div>
                       <button onClick={() => { setDeletingId(record.id); setDeleteType('receive'); }} className="p-2 bg-red-50 text-red-500 rounded-lg"><IconTrash /></button>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3 space-y-1">
                      {(record.items || []).filter(i => i.category.includes('น้ำสด') || i.category.includes('น้ำผลไม้')).map((it, idx) => (
                         <div key={idx} className="flex justify-between items-center text-[10px] py-1.5 border-b border-slate-200/50 last:border-0"><span className="font-bold text-slate-700 w-1/4">{it.flavor}</span><div className="flex flex-wrap gap-1 text-[9px] w-3/4 justify-end">
                               {it.pots && <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">หม้อ: {it.pots}</span>}
                               {it.bottles && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200">ขวด: {it.bottles}</span>}
                               {it.leftover && <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-orange-600">เศษ: {it.leftover}</span>}
                               {(parseInt(it.bottles)||0) + (parseInt(it.leftover)||0) > 0 && <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 font-black">รวม: {(parseInt(it.bottles)||0) + (parseInt(it.leftover)||0)}</span>}
                               {it.damaged && <span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200">เสีย: {it.damaged}</span>}
                            </div></div>
                      ))}
                    </div>
                    <button onClick={() => handleShareReceive(record)} className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100"><IconShare /> คัดลอก / ส่งไลน์</button>
                  </div>
                ))}
              </>
            )}

            {(historyType === 'order' ? historyList : receiveHistoryList).filter(r => r && r.branch === selectedBranch && (historyType !== 'receive' || (r.items || []).some(i => i.category.includes('น้ำสด') || i.category.includes('น้ำผลไม้')))).length > 0 && (
                <button onClick={() => setIsClearingAll(true)} className="w-full mt-6 p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <IconTrash /> ล้างประวัติ{historyType === 'order' ? 'สั่งน้ำ' : 'รับน้ำ'}ทั้งหมด (สาขา {selectedBranch})
                </button>
            )}
          </div>
        )}
      </main>
      
      {deletingId && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 110 }}><div className="bg-white p-8 rounded-3xl w-full max-w-xs text-center"><div className="text-red-500 mb-2"><IconTrash /></div><h4 className="font-bold text-slate-800 mb-4">ลบประวัตินี้?</h4><div className="flex gap-2"><button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">ยกเลิก</button><button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">ลบ</button></div></div></div>)}
      
      {/* Modal ยืนยันล้างประวัติทั้งหมด */}
      {isClearingAll && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6" style={{ zIndex: 110 }}><div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center animate-in zoom-in-95 border-2 border-red-100"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><IconTrash /></div><h3 className="font-black text-xl text-slate-800 mb-2">ล้างประวัติ{historyType === 'order' ? 'สั่งน้ำ' : 'รับน้ำ'}?</h3><p className="text-[10px] text-red-500 mb-4 font-bold">* ใส่รหัสผ่านเพื่อยืนยันการลบทั้งหมดของสาขานี้</p><div className="bg-slate-50 p-3 rounded-xl mb-4"><input type="password" placeholder="รหัสผ่าน" value={clearAllPin} onChange={e => setClearAllPin(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-center text-lg font-black outline-none focus:border-red-400 focus:ring-1 ring-red-400" /></div><div className="flex gap-2"><button onClick={() => { setIsClearingAll(false); setClearAllPin(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button onClick={handleClearAll} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black">{loading ? 'กำลังล้าง...' : 'ยืนยันล้าง'}</button></div></div></div>
      )}
    </div>
  );
}

// ============================================================================
// 📦 SYSTEM 3 & 7: สต็อกรับ-ตัดเสีย
// ==========================================
function InventoryMovementApp({ onBack }) {
  const [activeTab, setActiveTab] = useState('receive');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [submitDate, setSubmitDate] = useState(getTodayStr());
  const [loading, setLoading] = useState(false);
  const [itemData, setItemData] = useState({});
  const [receiveHistory, setReceiveHistory] = useState([]);
  const [wasteHistory, setWasteHistory] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteType, setDeleteType] = useState('');

  const [filterDate, setFilterDate] = useState(getTodayStr());
  const [filterCategory, setFilterCategory] = useState('ทั้งหมด');
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [clearAllPin, setClearAllPin] = useState('');

  const BRANCH_LIST = [1, 2, 3, 5]; 

  useEffect(() => {
    const qR = query(collection(db, 'receive_goods'), orderBy('createdAt', 'desc'), limit(300));
    const unsubR = onSnapshot(qR, snap => setReceiveHistory(snap.docs.map(d => ({ id: d.id, type: 'receive', ...d.data() }))));
    
    const qW = query(collection(db, 'waste_reports'), orderBy('createdAt', 'desc'), limit(300));
    const unsubW = onSnapshot(qW, snap => setWasteHistory(snap.docs.map(d => ({ id: d.id, type: 'waste', ...d.data() }))));
    
    return () => { unsubR(); unsubW(); };
  }, []);

  useEffect(() => { setItemData({}); setActiveCategory(null); }, [selectedBranch]);

  const handleInput = (category, flavor, field, value) => {
    const key = `${category}|||${flavor}`;
    setItemData(prev => ({ ...prev, [key]: { ...(prev[key] || { bottles: '', damaged: '' }), [field]: value } }));
  };

  const submitReceive = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงานค่ะ");
    const finalItems = [];
    Object.entries(itemData).forEach(([key, data]) => {
      if (data.bottles || data.damaged) { const [category, flavor] = key.split('|||'); finalItems.push({ category, flavor, pots: '', bottles: data.bottles || '', leftover: '', damaged: data.damaged || '' }); }
    });
    if (finalItems.length === 0) return alert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try { await addDoc(collection(db, 'receive_goods'), { branch: selectedBranch, staffName, submitDate, items: finalItems, timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now() }); setItemData({}); setStaffName(''); alert("✅ บันทึกรับของสำเร็จ!"); setActiveTab('history'); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const submitWaste = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงานค่ะ");
    const finalItems = [];
    Object.entries(itemData).forEach(([key, data]) => {
      if (data.bottles) { const [category, flavor] = key.split('|||'); finalItems.push({ category, flavor, pots: '', bottles: data.bottles }); }
    });
    if (finalItems.length === 0) return alert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try { await addDoc(collection(db, 'waste_reports'), { branch: selectedBranch, staffName, submitDate, items: finalItems, timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now() }); setItemData({}); setStaffName(''); alert("✅ บันทึกตัดของเสียสำเร็จ!"); setActiveTab('history'); } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleDelete = async () => { try { await deleteDoc(doc(db, deleteType === 'receive' ? 'receive_goods' : 'waste_reports', deletingId)); } catch (e) { console.error(e); } setDeletingId(null); };

  const handleClearAll = async () => {
    if (clearAllPin !== '8888') return alert("รหัสผ่านไม่ถูกต้อง!");
    const rToClear = receiveHistory.filter(h => h && h.branch === selectedBranch);
    const wToClear = wasteHistory.filter(h => h && h.branch === selectedBranch);
    if (rToClear.length === 0 && wToClear.length === 0) return alert("ไม่มีข้อมูลให้ลบค่ะ");
    if (!window.confirm(`ยืนยันลบประวัติสต็อกรับ/ตัดเสียทั้งหมดของสาขา ${selectedBranch} จำนวน ${rToClear.length + wToClear.length} รายการ?`)) return;
    setLoading(true);
    try {
        for (const record of rToClear) await deleteDoc(doc(db, 'receive_goods', record.id));
        for (const record of wToClear) await deleteDoc(doc(db, 'waste_reports', record.id));
        alert("ล้างประวัติทั้งหมดเรียบร้อยแล้ว!");
    } catch (err) { console.error(err); } finally { setLoading(false); setIsClearingAll(false); setClearAllPin(''); }
  };

  const handleShare = async (record) => {
    const typeName = record.type === 'receive' ? 'รับของลงร้าน' : 'ตัดของเสีย';
    const emoji = record.type === 'receive' ? '📥' : '✂️';
    let text = `${emoji} *ประวัติ${typeName} สาขา ${record?.branch}*\n👤 พนักงาน: ${record?.staffName}\n📅 ${record?.submitDate || record?.timestamp}\n\n`;
    (record.items || []).forEach(i => { text += `- ${i.flavor}: ${i.bottles} ชิ้น ${i.damaged ? `(เสีย ${i.damaged})` : ''}\n`; });
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert(`📋 คัดลอกประวัติ${typeName}แล้ว! นำไปวางในแชทไลน์ได้เลยค่ะ`); } catch (err) { console.error(err); } document.body.removeChild(textArea);
  };

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white p-8 rounded-[3rem] shadow-xl w-full max-w-sm text-center relative"><button onClick={onBack} className="absolute top-6 left-6 text-slate-400"><IconHome /></button><div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><IconBox /></div><h2 className="text-2xl font-black mb-1 text-slate-800">สต็อกรับ-ตัดเสีย</h2><p className="text-xs text-slate-400 mb-8 uppercase tracking-widest">Inventory Control</p><div className="grid grid-cols-2 gap-3">{BRANCH_LIST.map(n => <button key={n} onClick={() => setSelectedBranch(n.toString())} className="py-4 border-2 border-emerald-400 text-emerald-600 rounded-2xl font-bold hover:bg-emerald-50 active:scale-95 transition-all">สาขา {n}</button>)}</div></div></div>
    );
  }

  const currentStock = BRANCH_STOCKS[selectedBranch] || {};
  const receiveCats = Object.keys(currentStock).filter(c => !c.includes('น้ำสด') && !c.includes('ผลไม้') && !c.includes('น้ำหวาน'));
  const wasteCats = Object.keys(currentStock);

  // ฟิลเตอร์ประวัติ
  const combinedHistory = [...receiveHistory, ...wasteHistory].filter(h => h && h.branch === selectedBranch && (h.submitDate === filterDate || (!h.submitDate && getLocalYMD(h.createdAt) === filterDate))).sort((a, b) => b.createdAt - a.createdAt);
  const filteredHistory = combinedHistory.map(record => {
      if (!record) return null;
      if (filterCategory === 'ทั้งหมด') return record;
      const filteredItems = (record.items || []).filter(it => it.category === filterCategory);
      if (filteredItems.length === 0) return null;
      return { ...record, items: filteredItems };
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">
      <header className={`p-4 sticky top-0 z-40 shadow-md flex justify-between items-center text-white ${activeTab === 'receive' ? 'bg-emerald-600' : activeTab === 'waste' ? 'bg-zinc-700' : 'bg-indigo-600'}`}><button onClick={onBack} className="p-2 bg-black/20 rounded-full"><IconHome /></button><span className="font-bold">สาขา {selectedBranch}: {activeTab === 'receive' ? 'รับของ' : activeTab === 'waste' ? 'ตัดของ' : 'ประวัติ'}</span><button onClick={() => setSelectedBranch(null)} className="text-[10px] bg-white/20 px-3 py-1.5 rounded-lg font-bold">เปลี่ยนสาขา</button></header>
      <main className="max-w-md mx-auto p-4">
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 mb-4 shadow-sm">
          <button onClick={() => {setActiveTab('receive'); setItemData({});}} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'receive' ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>📥 รับสินค้า</button>
          <button onClick={() => {setActiveTab('waste'); setItemData({});}} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'waste' ? 'bg-zinc-600 text-white' : 'text-slate-400'}`}>✂️ ตัดเสีย</button>
          <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>📅 ประวัติ</button>
        </div>

        {activeTab !== 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-3">
               <div><label className="text-[10px] font-bold text-slate-400 block mb-1">ชื่อพนักงาน</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" /></div>
               <div><label className="text-[10px] font-bold text-slate-400 block mb-1">วันที่</label><input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none" /></div>
            </div>
            <div className="space-y-2">
              {(activeTab === 'receive' ? receiveCats : wasteCats).map(cat => (
                <div key={cat} className="space-y-2"><button onClick={() => setActiveCategory(activeCategory === cat ? null : cat)} className={`w-full p-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all ${activeCategory === cat ? (activeTab === 'receive' ? 'bg-emerald-500 text-white' : 'bg-zinc-600 text-white') : 'bg-white text-slate-600 border border-slate-200'}`}>{cat} <span>{activeCategory === cat ? '▲' : '▼'}</span></button>
                  {activeCategory === cat && (
                    <div className="grid grid-cols-1 gap-2 p-2 bg-slate-100/50 rounded-2xl">
                      {currentStock[cat].map(flavor => {
                        const key = `${cat}|||${flavor}`;
                        return (
                          <div key={flavor} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm"><span className="text-[11px] font-bold text-slate-700 w-1/2">{flavor}</span><div className="flex gap-2 w-1/2">
                              {activeTab === 'receive' ? ( <><input type="number" placeholder="รับ" className="w-1/2 p-2 bg-emerald-50 text-center rounded-lg text-xs font-bold text-emerald-600 outline-none border border-transparent" value={itemData[key]?.bottles || ''} onChange={e => handleInput(cat, flavor, 'bottles', e.target.value)} /><input type="number" placeholder="เสีย" className="w-1/2 p-2 bg-red-50 text-center rounded-lg text-xs font-bold text-red-600 outline-none border border-transparent" value={itemData[key]?.damaged || ''} onChange={e => handleInput(cat, flavor, 'damaged', e.target.value)} /></>
                              ) : ( <input type="number" placeholder="ตัดทิ้ง" className="w-full p-2 bg-zinc-50 text-center rounded-lg text-xs font-bold text-zinc-600 outline-none border border-transparent" value={itemData[key]?.bottles || ''} onChange={e => handleInput(cat, flavor, 'bottles', e.target.value)} /> )}
                            </div></div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button onClick={activeTab === 'receive' ? submitReceive : submitWaste} disabled={loading} className={`w-full p-5 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all text-lg ${activeTab === 'receive' ? 'bg-emerald-500' : 'bg-zinc-600'}`}>{loading ? 'กำลังบันทึก...' : activeTab === 'receive' ? 'ยืนยันรับของ' : 'ยืนยันส่งยอดตัด'}</button>
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                 <div><label className="text-[10px] font-bold text-slate-400 block mb-1">📅 เลือกวันที่ดูย้อนหลัง</label><input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none" /></div>
                 <div><label className="text-[10px] font-bold text-slate-400 block mb-1">📦 หมวดหมู่</label><select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none"><option value="ทั้งหมด">ทั้งหมด</option>{wasteCats.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
            </div>

            {filteredHistory.length === 0 && <div className="text-center py-10 text-slate-400 font-medium">ไม่มีประวัติในวันที่และหมวดหมู่ที่เลือกค่ะ</div>}
            {filteredHistory.map(record => (
                <div key={record.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 relative overflow-hidden"><div className={`absolute top-0 right-8 px-3 py-1 rounded-b-lg text-[9px] font-bold text-white ${record.type === 'receive' ? 'bg-emerald-500' : 'bg-zinc-600'}`}>{record.type === 'receive' ? '📥 รับของ' : '✂️ ตัดเสีย'}</div><div className="flex justify-between items-start mb-2"><div><div className="text-sm font-black text-slate-800">{record?.staffName}</div><div className="text-[10px] text-slate-400">วันที่ {record?.submitDate || record?.timestamp}</div></div><button onClick={() => { setDeletingId(record.id); setDeleteType(record.type); }} className="p-2 text-slate-300 hover:text-red-500"><IconTrash /></button></div><div className="bg-slate-50 p-2 rounded-xl space-y-1 mb-3">
                    {(record.items || []).map((it, idx) => (<div key={idx} className="flex justify-between text-[10px] font-bold py-1 border-b border-slate-200 last:border-0"><span className="text-slate-600">• {it.flavor}</span><span className={record.type === 'receive' ? 'text-emerald-600' : 'text-red-500'}>{it.bottles} ชิ้น {it.damaged > 0 && `(เสีย ${it.damaged})`}</span></div>))}
                  </div><button onClick={() => handleShare(record)} className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[11px] border ${record.type === 'receive' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'}`}><IconShare /> แชร์ข้อมูล / ส่งไลน์</button></div>
            ))}

            {(receiveHistory.some(h => h && h.branch === selectedBranch) || wasteHistory.some(h => h && h.branch === selectedBranch)) && (
                <button onClick={() => setIsClearingAll(true)} className="w-full mt-6 p-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <IconTrash /> ล้างประวัติทั้งหมด (สาขา {selectedBranch})
                </button>
            )}
          </div>
        )}
      </main>
      {deletingId && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 110 }}><div className="bg-white p-8 rounded-3xl w-full max-w-xs text-center"><div className="text-red-500 mb-2"><IconTrash /></div><h4 className="font-bold text-slate-800 mb-4">ลบประวัติ?</h4><div className="flex gap-2"><button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">ยกเลิก</button><button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">ลบเลย</button></div></div></div>)}
      
      {/* Modal ยืนยันล้างประวัติทั้งหมด */}
      {isClearingAll && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6" style={{ zIndex: 110 }}><div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center animate-in zoom-in-95 border-2 border-red-100"><div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><IconTrash /></div><h3 className="font-black text-xl text-slate-800 mb-2">ล้างประวัติทั้งหมด?</h3><p className="text-[10px] text-red-500 mb-4 font-bold">* ใส่รหัสผ่านเพื่อยืนยันการลบรับ/ตัดของเสีย ทั้งหมดของสาขานี้</p><div className="bg-slate-50 p-3 rounded-xl mb-4"><input type="password" placeholder="รหัสผ่าน" value={clearAllPin} onChange={e => setClearAllPin(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-lg text-center text-lg font-black outline-none focus:border-red-400 focus:ring-1 ring-red-400" /></div><div className="flex gap-2"><button onClick={() => { setIsClearingAll(false); setClearAllPin(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">ยกเลิก</button><button onClick={handleClearAll} disabled={loading} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black">{loading ? 'กำลังล้าง...' : 'ยืนยันล้าง'}</button></div></div></div>
      )}
    </div>
  );
}

// ============================================================================
// 🍯 SYSTEM 6: ระบบใบเบิกน้ำหวาน-รมควัน
// ==========================================
function SyrupRequisitionApp({ onBack }) {
  const [activeTab, setActiveTab] = useState('form');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [staffName, setStaffName] = useState('');
  const [itemData, setItemData] = useState({});
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  
  const [editSession, setEditSession] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'syrup_requisitions'), orderBy('createdAt', 'desc'), limit(300));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistoryList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }); return () => unsubscribe();
  }, []);

  const handleItemChange = (category, flavor, field, value) => {
    const key = `${category}|||${flavor}`;
    setItemData(prev => {
      const current = prev[key] || { amount: '', received: '', missing: '', waste: '', comp: '' };
      return { ...prev, [key]: { ...current, [field]: value } };
    });
  };

  const handleSubmit = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงานค่ะ");
    const finalItems = [];
    Object.entries(itemData).forEach(([key, data]) => {
      if (data.amount && parseInt(data.amount) > 0) { 
        const [category, flavor] = key.split('|||');
        finalItems.push({ category, flavor, amount: parseInt(data.amount), received: '', missing: '', waste: '', comp: '' }); 
      }
    });
    if (finalItems.length === 0) return alert("กรุณากรอกจำนวนเบิกอย่างน้อย 1 รายการค่ะ");
    setLoading(true);
    try {
      await addDoc(collection(db, 'syrup_requisitions'), {
        branch: selectedBranch, staffName, items: finalItems, isAudited: false,
        timestamp: new Date().toLocaleString('th-TH'), createdAt: Date.now()
      });
      setStaffName(''); setItemData({}); alert("✅ บันทึกใบเบิกสำเร็จ!"); setActiveTab('history');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const openEdit = (record) => {
    setEditSession(record); setStaffName(record.staffName);
    const initialData = {}; 
    (record.items || []).forEach(i => { 
        const cat = i.category || '🍯 หมวดหมู่น้ำหวาน - รมควัน';
        const key = `${cat}|||${i.flavor}`;
        initialData[key] = { amount: i.amount || '', received: i.received || '', missing: i.missing || '', waste: i.waste || '', comp: i.comp || '' }; 
    });
    setItemData(initialData); setActiveTab('form');
  };

  const saveEdit = async () => {
    if (!staffName) return alert("กรุณากรอกชื่อพนักงานค่ะ");
    const finalItems = [];
    Object.entries(itemData).forEach(([key, data]) => {
      if (data.amount && parseInt(data.amount) > 0) { 
          const [category, flavor] = key.split('|||');
          finalItems.push({ category, flavor, amount: parseInt(data.amount), received: data.received || '', missing: data.missing || '', waste: data.waste || '', comp: data.comp || '' }); 
      }
    });
    if (finalItems.length === 0) return alert("รายการว่างเปล่าค่ะ");
    setLoading(true);
    try {
      await updateDoc(doc(db, 'syrup_requisitions', editSession.id), {
        staffName, items: finalItems, timestamp: new Date().toLocaleString('th-TH') + ' (แก้ไขรับของ)'
      });
      setEditSession(null); setStaffName(''); setItemData({}); alert("✅ อัปเดตรายการรับของสำเร็จ!"); setActiveTab('history');
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAudit = async (id) => {
    if(!window.confirm('ยืนยันการตรวจสอบ? (พนักงานจะแก้ไขบิลนี้ไม่ได้อีก)')) return;
    try { await updateDoc(doc(db, 'syrup_requisitions', id), { isAudited: true }); alert('ล็อกบิลเรียบร้อยค่ะ 🔒'); } 
    catch(e) { console.error(e); }
  };

  const handleDelete = async (id) => { if (window.confirm("ต้องการลบประวัตินี้ใช่หรือไม่?")) { try { await deleteDoc(doc(db, 'syrup_requisitions', id)); } catch (err) { console.error(err); } } };

  const handleShare = async (record) => {
    let text = `🍯 *ใบเบิกน้ำหวาน-รมควัน สาขา ${record?.branch}*\n👤 ผู้เบิก: ${record?.staffName}\n📅 ${record?.timestamp}\n\n`;
    const grouped = {};
    (record.items || []).forEach(i => {
        const cat = i.category || '🍯 หมวดหมู่น้ำหวาน - รมควัน';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(i);
    });

    Object.keys(grouped).forEach(cat => {
        const cleanCat = cat.replace(/🍯 |🍫 |🧊 |🍦 |🧻 /g, ''); 
        text += `[ ${cleanCat} ]\n`;
        grouped[cat].forEach(i => {
            text += `- ${i.flavor}: เบิก ${i.amount}`;
            if(i.received) text += ` | รับ ${i.received}`;
            if(i.missing) text += ` | ไม่ได้ ${i.missing}`;
            if(i.waste) text += ` | เท ${i.waste}`;
            text += `\n`;
        });
        text += `\n`;
    });
    
    if (navigator.share) { try { await navigator.share({ title: `เบิกน้ำหวาน สาขา ${record.branch}`, text }); return; } catch (err) { } }
    const textArea = document.createElement("textarea"); textArea.value = text; document.body.appendChild(textArea); textArea.select();
    try { document.execCommand('copy'); alert("📋 คัดลอกข้อมูลแล้ว! นำไปกด 'วาง'ในแชทไลน์ได้เลยค่ะ"); } catch (err) { console.error(err); } document.body.removeChild(textArea);
  };

  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6 animate-in fade-in"><div className="bg-white p-8 rounded-[3rem] shadow-xl w-full max-w-sm text-center relative"><button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600"><IconHome /></button><div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6"><IconFlame /></div><h2 className="text-2xl font-bold mb-2 text-slate-800">เบิกน้ำหวาน-รมควัน</h2><p className="text-sm text-slate-500 mb-8">กรุณาเลือกสาขา</p><div className="grid grid-cols-2 gap-3">{BRANCHES.map(n => <button key={n} onClick={() => setSelectedBranch(n.toString())} className="py-4 border-2 border-rose-400 text-rose-600 rounded-2xl font-bold hover:bg-rose-50 active:scale-95 transition-all">สาขา {n}</button>)}</div></div></div>
    );
  }

  const currentBranchStock = BRANCH_STOCKS[selectedBranch] || {};
  const editGrouped = editSession ? Object.keys(itemData).reduce((acc, key) => {
      const [cat, flavor] = key.split('|||');
      if(!acc[cat]) acc[cat] = [];
      acc[cat].push({flavor, key}); return acc;
  }, {}) : {};

  return (
    <div className="min-h-screen bg-rose-50 pb-32 font-sans text-slate-800">
      <header className={`text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center ${editSession ? 'bg-blue-600' : 'bg-rose-600'}`}><button onClick={onBack} className={`p-2 rounded-full ${editSession ? 'bg-blue-700' : 'bg-rose-700'}`}><IconHome /></button><span className="font-bold flex items-center gap-2"><IconFlame /> เบิกน้ำหวาน สาขา {selectedBranch}</span><button onClick={() => {setSelectedBranch(null); setItemData({}); setEditSession(null);}} className={`text-[10px] ${editSession ? 'bg-blue-800' : 'bg-rose-800'} px-3 py-1.5 rounded-lg font-bold`}>เปลี่ยนสาขา</button></header>
      <main className="max-w-md mx-auto p-4">
        {activeTab === 'form' && (
          <div className="space-y-4 animate-in fade-in">
             <div className={`bg-white p-4 rounded-3xl shadow-md border-t-4 ${editSession ? 'border-blue-500' : 'border-rose-500'}`}>
                <h2 className={`text-center font-black text-lg mb-4 ${editSession ? 'text-blue-800' : 'text-rose-800'}`}>{editSession ? '✏️ ฟอร์มรับของเข้าร้าน' : '🍯 ฟอร์มสั่งเบิก'}</h2>
                <div><label className="text-[11px] font-bold text-slate-500 block mb-1">พนักงาน</label><input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="ระบุชื่อพนักงาน..." className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-1 ${editSession ? 'focus:border-blue-400 ring-blue-400' : 'focus:border-rose-400 ring-rose-400'}`} /></div>
             </div>
            
             {editSession ? (
                  <div className="space-y-4">
                    {Object.entries(editGrouped).map(([category, items]) => (
                       <div key={category} className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
                          <div className="bg-blue-100 p-2 font-bold text-blue-800 text-[11px] text-center">{category}</div>
                          <div className="overflow-x-auto">
                             <table className="w-full text-left border-collapse min-w-[400px]">
                                <thead className="bg-slate-50 text-[9px]">
                                   <tr><th className="p-2 w-[25%]">รายการ</th><th className="p-1 text-center border-l border-slate-200 text-rose-600">สั่งเบิก</th><th className="p-1 text-center border-l border-slate-200 text-emerald-600">ลงร้าน</th><th className="p-1 text-center border-l border-slate-200 text-orange-500">ไม่ได้</th><th className="p-1 text-center border-l border-slate-200 text-red-600">ตัดเท</th><th className="p-1 text-center border-l border-slate-200 text-purple-600">ลงคอม</th></tr>
                                </thead>
                                <tbody>
                                   {items.map(({flavor, key}, index) => (
                                      <tr key={flavor} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                         <td className="p-2 text-[10px] font-bold text-slate-700 leading-tight">{flavor}</td>
                                         <td className="p-1 border-l border-slate-100 bg-rose-50/30 text-center font-black text-rose-600 text-xs">{itemData[key].amount}</td>
                                         <td className="p-1 border-l border-slate-100"><input type="number" placeholder="-" className="w-12 p-1.5 text-center text-xs font-bold border border-slate-200 rounded focus:border-blue-400 outline-none" value={itemData[key].received} onChange={e => handleItemChange(category, flavor, 'received', e.target.value)} /></td>
                                         <td className="p-1 border-l border-slate-100"><input type="number" placeholder="-" className="w-12 p-1.5 text-center text-xs font-bold border border-slate-200 rounded focus:border-blue-400 outline-none" value={itemData[key].missing} onChange={e => handleItemChange(category, flavor, 'missing', e.target.value)} /></td>
                                         <td className="p-1 border-l border-slate-100"><input type="number" placeholder="-" className="w-12 p-1.5 text-center text-xs font-bold border border-slate-200 rounded focus:border-blue-400 outline-none" value={itemData[key].waste} onChange={e => handleItemChange(category, flavor, 'waste', e.target.value)} /></td>
                                         <td className="p-1 border-l border-slate-100 bg-purple-50/30"><input type="number" placeholder="-" className="w-12 p-1.5 text-center text-xs font-bold border border-purple-200 rounded focus:border-purple-500 outline-none text-purple-700" value={itemData[key].comp} onChange={e => handleItemChange(category, flavor, 'comp', e.target.value)} /></td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    ))}
                  </div>
               ) : (
                  <div className="space-y-3">
                     {SYRUP_CATEGORIES.map(category => {
                         const flavorList = currentBranchStock[category] || [];
                         if(flavorList.length === 0) return null;
                         return (
                            <div key={category} className="space-y-2">
                               <button type="button" onClick={() => setActiveCategory(activeCategory === category ? null : category)} className={`w-full p-4 rounded-2xl font-bold text-sm text-left flex justify-between items-center transition-all ${activeCategory === category ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-rose-700 border border-rose-200 shadow-sm'}`}>
                                  {category} <span className="text-lg leading-none">{activeCategory === category ? '▲' : '▼'}</span>
                               </button>
                               {activeCategory === category && (
                                  <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden shadow-sm p-2 space-y-1 animate-in slide-in-from-top-2">
                                     {flavorList.map((flavor, index) => {
                                        const key = `${category}|||${flavor}`;
                                        return (
                                           <div key={flavor} className={`flex justify-between items-center p-2 rounded-xl ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                              <span className="text-xs font-bold text-slate-700">{flavor}</span>
                                              <input type="number" placeholder="จำนวน" className="w-24 p-2 text-center text-xs font-black border border-slate-200 rounded-lg focus:border-rose-400 focus:bg-rose-50 outline-none" value={itemData[key]?.amount || ''} onChange={e => handleItemChange(category, flavor, 'amount', e.target.value)} />
                                           </div>
                                        )
                                     })}
                                  </div>
                               )}
                            </div>
                         )
                     })}
                  </div>
               )}
            
            {editSession ? (<div className="flex gap-2 mt-4"><button onClick={() => {setEditSession(null); setStaffName(''); setItemData({}); setActiveTab('history');}} className="flex-1 p-4 bg-slate-300 text-slate-700 rounded-2xl font-black shadow-lg">ยกเลิก</button><button onClick={saveEdit} disabled={loading} className="flex-1 p-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700">{loading ? 'กำลังบันทึก...' : 'อัปเดตการรับของ'}</button></div>) : (<button onClick={handleSubmit} disabled={loading} className="w-full p-5 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 mt-4 text-lg">{loading ? 'กำลังบันทึก...' : 'บันทึกส่งใบเบิก'}</button>)}
          </div>
        )}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in"><div className="bg-rose-800 text-white p-6 rounded-3xl shadow-lg mb-6 text-center"><h2 className="text-xl font-bold flex items-center justify-center gap-2"><IconFlame /> ประวัติเบิก สาขา {selectedBranch}</h2></div>{historyList.filter(b => b && b.branch === selectedBranch).length === 0 && <div className="text-center py-10 text-slate-400 font-medium">ยังไม่มีประวัติใบเบิกค่ะ</div>}
             {historyList.filter(b => b && b.branch === selectedBranch).map((record) => (
               <div key={record.id} className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200"><div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3"><div><span className="font-bold text-rose-800 text-sm">{record?.staffName}</span><div className="text-[10px] text-slate-500 mt-1">ส่งเมื่อ {record?.timestamp}</div>{record?.isAudited && <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded-full">เถ้าแก่ตรวจแล้ว</span>}</div><div className="flex gap-2">
                     {!record.isAudited ? ( <button onClick={() => openEdit(record)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100"><IconEdit /></button>
                     ) : ( <button onClick={() => alert('บิลนี้ถูกล็อกแล้ว ไม่สามารถแก้ไขได้ค่ะ 🔒')} className="p-2 bg-slate-100 text-slate-300 rounded-lg"><IconEdit /></button> )}
                     <button onClick={() => handleDelete(record.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"><IconTrash /></button></div></div>
                 <div className="space-y-1.5 mb-4">
                   {(record.items || []).map((item, idx) => (
                       <div key={idx} className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                           <div className="text-[11px] font-bold text-slate-700 mb-1.5">{item.category ? <span className="text-rose-500 mr-1">[{item.category.replace(/🍯 |🍫 |🧊 /g, '')}]</span> : ''}{item.flavor}</div>
                           <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                              <span className="bg-rose-50 text-rose-700 px-1.5 py-1 rounded flex-1 text-center border border-rose-200">เบิก: {item.amount}</span>
                              {item.received && <span className="bg-emerald-50 text-emerald-700 px-1.5 py-1 rounded flex-1 text-center border border-emerald-200">ลงร้าน: {item.received}</span>}
                              {item.missing && <span className="bg-orange-50 text-orange-700 px-1.5 py-1 rounded flex-1 text-center border border-orange-200">ไม่ได้: {item.missing}</span>}
                              {item.waste && <span className="bg-red-50 text-red-700 px-1.5 py-1 rounded flex-1 text-center border border-red-200">เท: {item.waste}</span>}
                              {item.comp && <span className="bg-purple-50 text-purple-700 px-1.5 py-1 rounded flex-1 text-center border border-purple-200">คอม: {item.comp}</span>}
                           </div>
                       </div>
                   ))}
                 </div>
                 {!record.isAudited && <button onClick={() => handleAudit(record.id)} className="w-full py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[11px] flex items-center justify-center gap-2 hover:bg-emerald-100 transition-all border border-emerald-200 mb-2"><IconSearch /> ตรวจสอบยอด (ล็อกบิล)</button>}
                 <button onClick={() => handleShare(record)} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all border border-rose-100"><IconShare /> คัดลอก / แชร์ส่งทางไลน์</button>
                 </div>
             ))}
          </div>
        )}
      </main>
      {!editSession && (<nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-rose-100 p-2 pb-8 flex justify-around z-40"><button onClick={() => setActiveTab('form')} className={`flex flex-col items-center p-2 flex-1 ${activeTab === 'form' ? 'text-rose-600' : 'text-slate-400'}`}><IconPen /><span className="text-[10px] mt-1 font-bold">ฟอร์มเบิกสินค้า</span></button><button onClick={() => setActiveTab('history')} className={`flex flex-col items-center p-2 flex-1 ${activeTab === 'history' ? 'text-rose-600' : 'text-slate-400'}`}><IconFileText /><span className="text-[10px] mt-1 font-bold">ประวัติใบเบิก</span></button></nav>)}
    </div>
  );
}

// ============================================================================
// 🚀 MAIN PORTAL: หน้ารวมระบบ
// ==========================================
export default function App() {
  const [currentSystem, setCurrentSystem] = useState('menu');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => { 
    if(localStorage.getItem('kiao_auth') === 'true') setIsAuthenticated(true);
    signInAnonymously(auth).catch(err => console.error(err)); 
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '8888') { setIsAuthenticated(true); localStorage.setItem('kiao_auth', 'true'); setError(false); } 
    else { setError(true); setPin(''); }
  };

  const handleLogout = () => {
    if(window.confirm('ต้องการออกจากระบบ (ล็อกหน้าจอ) ใช่หรือไม่?')) { setIsAuthenticated(false); localStorage.removeItem('kiao_auth'); setCurrentSystem('menu'); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black font-sans">
        <div className="bg-white/10 p-8 rounded-[2.5rem] shadow-2xl backdrop-blur-md border border-white/20 w-full max-w-xs text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-slate-900"><span className="text-3xl">🔒</span></div>
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-2 tracking-wider">m&n Kc</h2>
          <p className="text-slate-400 text-[11px] mb-8 font-medium">กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="รหัสผ่าน..." className={`w-full p-4 text-center text-xl font-black rounded-2xl outline-none transition-all ${error ? 'bg-red-500/20 border-2 border-red-500 text-white placeholder-red-300/50' : 'bg-slate-800/50 border border-white/10 text-white focus:border-amber-400 focus:bg-slate-800'}`} autoFocus />
            {error && <p className="text-red-400 text-[10px] font-bold">รหัสผ่านไม่ถูกต้อง ลองใหม่นะคะ!</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-900 p-4 rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-lg mt-2">เข้าสู่ระบบ</button>
          </form>
        </div>
      </div>
    );
  }

  if (currentSystem === 'stock') return <StockApp onBack={() => setCurrentSystem('menu')} />;
  if (currentSystem === 'water') return <WaterApp onBack={() => setCurrentSystem('menu')} />;
  if (currentSystem === 'inventory') return <InventoryMovementApp onBack={() => setCurrentSystem('menu')} />;
  if (currentSystem === 'syrup') return <SyrupRequisitionApp onBack={() => setCurrentSystem('menu')} />;
  if (currentSystem === 'transfer') return <TransferApp onBack={() => setCurrentSystem('menu')} />;
  if (currentSystem === 'redeem') return <RedeemApp onBack={() => setCurrentSystem('menu')} />;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black font-sans relative">
      <div className="text-center mb-6 animate-in slide-in-from-bottom-4">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md border border-white/20 shadow-2xl"><span className="text-3xl text-amber-400">👑</span></div>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500 mb-1 tracking-wider drop-shadow-md">m&n Kc</h1>
        <p className="text-slate-400 font-medium text-[10px] tracking-widest uppercase">Super App Management</p>
      </div>
      <div className="w-full max-w-sm space-y-3 animate-in fade-in zoom-in-95 duration-500 pb-20">
        <button onClick={() => setCurrentSystem('stock')} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform"><IconClipboard /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">ระบบเช็คสต็อก V.2</h2><p className="text-teal-200 text-[9px] mt-0.5 font-medium">ส่งกะ / นับของ / ตรวจยอด / เคลียร์ประวัติ</p></div></div></button>
        <button onClick={() => setCurrentSystem('water')} className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform"><IconFileText /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">สั่งน้ำ & รับน้ำ (รวม)</h2><p className="text-indigo-200 text-[9px] mt-0.5 font-medium">ฟอร์มสั่ง / ฟอร์มรับ / แยกประวัติชัดเจน</p></div></div></button>
        
        <button onClick={() => setCurrentSystem('syrup')} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform"><IconFlame /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">ระบบเบิกน้ำหวาน-รมควัน</h2><p className="text-rose-200 text-[9px] mt-0.5 font-medium">แยกเบิกหมวดน้ำหวานโดยเฉพาะ</p></div></div></button>
        
        <button onClick={() => setCurrentSystem('inventory')} className="w-full bg-gradient-to-r from-emerald-500 to-teal-700 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform"><IconBox /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">สต็อกรับ-ตัดเสีย (รวม)</h2><p className="text-emerald-200 text-[9px] mt-0.5 font-medium">รับสินค้า / แจ้งตัดเสีย ทุกหมวดหมู่</p></div></div></button>
        <button onClick={() => setCurrentSystem('transfer')} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform"><IconBanknote /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">ระบบส่งยอดโอน</h2><p className="text-amber-200 text-[9px] mt-0.5 font-medium">ส่งยอด / โซนล็อกรหัสดูสรุปยอด</p></div></div></button>
        <button onClick={() => setCurrentSystem('redeem')} className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 p-1 rounded-2xl shadow-lg active:scale-95 transition-all group"><div className="bg-slate-900/40 backdrop-blur-sm p-3.5 rounded-[0.85rem] flex items-center gap-4 border border-white/10"><div className="w-10 h-10 bg-white shadow-lg rounded-xl flex items-center justify-center text-fuchsia-600 group-hover:scale-110 transition-transform"><IconGift /></div><div className="text-left"><h2 className="text-base font-black text-white leading-tight">บันทึกแลกฟรี</h2><p className="text-fuchsia-200 text-[9px] mt-0.5 font-medium">โปรโมชั่น / สะสมแต้ม / แนบหลักฐาน</p></div></div></button>
      </div>
      
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40">
         <button onClick={handleLogout} className="bg-slate-800/80 backdrop-blur-md border border-slate-700 text-slate-400 px-6 py-2 rounded-full text-xs font-bold hover:text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all flex items-center gap-2 shadow-lg">
            <IconX /> ออกจากระบบ (ล็อกหน้าจอ)
         </button>
      </div>
    </div>
  );
}