
import React, { useRef, useState } from 'react';
import { X, Camera, Image as ImageIcon, AlertCircle, Loader2, Check, Trash2 } from 'lucide-react';

interface CameraModalProps {
  onCapture: (base64Images: string[]) => void;
  onCancel: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error('画像の読み込みに失敗しました。'));
    };
    reader.onerror = () => reject(new Error('エラーが発生しました。'));
    reader.readAsDataURL(file);
  });
};

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const newImages = await Promise.all(files.map(fileToBase64));
      setImages(prev => [...prev, ...newImages]);
    } catch (err) {
      alert(err instanceof Error ? err.message : '画像の読み込みに失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="お薬手帳のスキャン" className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200 overflow-y-auto no-scrollbar">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>
      </div>

      {/* Close Button */}
      <div className="absolute top-0 right-0 p-4 z-20 safe-top">
        <button onClick={onCancel} aria-label="閉じる" className="p-3 bg-white/10 text-white rounded-full backdrop-blur-md active:scale-90 transition-transform">
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-sm bg-white/5 backdrop-blur-2xl rounded-[48px] border border-white/10 p-10 shadow-2xl relative z-10 flex flex-col items-center text-center my-auto">
        {isProcessing ? (
          <div className="py-12 flex flex-col items-center">
            <Loader2 size={56} className="animate-spin text-emerald-400 mb-6" />
            <h3 className="text-xl font-bold text-white mb-2">読み込み中...</h3>
            <p className="text-slate-500 text-sm">画像を解析する準備をしています</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-400 to-teal-600 w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
              <Camera size={40} className="text-white" />
            </div>

            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">お薬手帳のスキャン</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              複数ページある場合は続けて撮影・選択できます。撮り終えたら「まとめて解析する」を押してください。
            </p>

            {images.length > 0 && (
              <div className="w-full mb-8">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {images.map((img, i) => (
                    <div key={i} className="relative shrink-0">
                      <img src={`data:image/jpeg;base64,${img}`} alt={`page-${i + 1}`} className="w-16 h-16 object-cover rounded-xl border border-white/10" />
                      <button
                        onClick={() => removeImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-bold mt-2">{images.length}枚 選択中</p>
              </div>
            )}

            <div className="w-full space-y-4">
              {/* Camera Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-5 bg-white text-slate-900 rounded-[24px] font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-xl"
              >
                <Camera size={24} />
                <span>{images.length > 0 ? 'もう1枚撮る' : '今すぐ写真を撮る'}</span>
              </button>

              {/* Gallery Button */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="w-full py-5 bg-white/10 text-white rounded-[24px] font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-all border border-white/10"
              >
                <ImageIcon size={22} className="text-emerald-400" />
                <span>ライブラリから選択(複数可)</span>
              </button>

              {images.length > 0 && (
                <button
                  onClick={() => onCapture(images)}
                  className="w-full py-5 bg-emerald-500 text-white rounded-[24px] font-bold flex items-center justify-center gap-3 active:scale-[0.97] transition-all shadow-xl shadow-emerald-900/30"
                >
                  <Check size={24} />
                  <span>{images.length}枚をまとめて解析する</span>
                </button>
              )}
            </div>

            <div className="mt-10 flex items-start gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-left">
              <AlertCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-slate-500">
                <span className="text-emerald-400 font-bold">ヒント:</span> 名前や用量がはっきり写るように撮影してください。影が入らないように明るい場所がおすすめです。1枚に1種類のお薬が写るように撮影すると読み取り精度が上がります。
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

      {/* Native File Input (Picker, multiple pages at once) */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
      />
    </div>
  );
};
