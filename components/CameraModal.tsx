
import React, { useRef, useState } from 'react';
import { X, Camera, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react';

interface CameraModalProps {
  onCapture: (base64: string) => void;
  onCancel: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) {
          onCapture(base64);
        } else {
          setIsProcessing(false);
          alert("画像の読み込みに失敗しました。");
        }
      };
      reader.onerror = () => {
        setIsProcessing(false);
        alert("エラーが発生しました。");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Close Button */}
      <div className="absolute top-0 right-0 p-4 z-20 safe-top">
        <button onClick={onCancel} className="p-3 bg-white/10 text-white rounded-full backdrop-blur-md active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl rounded-[48px] border border-white/10 p-10 shadow-2xl relative z-10 flex flex-col items-center text-center">
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <Loader2 size={56} className="animate-spin text-emerald-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">読み込み中...</h3>
            <p className="text-slate-400 text-sm">画像を解析する準備をしています</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-600 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
              <Camera size={40} className="text-white" />
            </div>

            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">お薬手帳のスキャン</h3>
            <p className="text-slate-400 text-sm mb-10 leading-relaxed">
              ブラウザの制約を回避するため、端末の標準機能を使用して撮影または選択してください。
            </p>

            <div className="w-full space-y-4">
              {/* Camera Button */}
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="w-full py-5 bg-white text-slate-900 rounded-[24px] font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-xl"
              >
                <Camera size={24} />
                <span>今すぐ写真を撮る</span>
              </button>

              {/* Gallery Button */}
              <button 
                onClick={() => galleryInputRef.current?.click()} 
                className="w-full py-5 bg-white/10 text-white rounded-[24px] font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-all border border-white/10"
              >
                <ImageIcon size={22} className="text-emerald-400" />
                <span>ライブラリから選択</span>
              </button>
            </div>

            <div className="mt-12 flex items-start gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-left">
              <AlertCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-400">
                <span className="text-emerald-400 font-bold">ヒント:</span> 名前や用量がはっきり写るように撮影してください。影が入らないように明るい場所がおすすめです。
              </p>
            </div>
          </>
        )}
      </div>

      {/* Native Capture Input (Forces Camera) */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        capture="environment" 
        className="hidden" 
      />
      
      {/* Native File Input (Picker) */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
};
