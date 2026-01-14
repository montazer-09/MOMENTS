import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  BarChart2, 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  Globe,
  ChevronRight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  ArrowRight,
  SmilePlus,
  Star,
  Sparkles,
  Loader2,
  Lightbulb,
  Ghost,
  Bell
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import confetti from 'canvas-confetti';

import { 
  Moment, 
  MomentType, 
  Priority, 
  EmotionType, 
  Task, 
  ViewState,
  EmotionLog,
  Reflection
} from './types';
import { CATEGORY_CONFIG, EMOTION_ICONS, TRANSLATIONS } from './constants';
import { getMoments, saveMoments, getSettings, saveSettings } from './services/storage';

// --- Gemini AI Setup ---
// Safe initialization for browser environment
const AI_ENDPOINT = "https://ai-worker.lyt740111.workers.dev/";

async function askAI(message: string): Promise<string> {
  const res = await fetch(AI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "No reply";
}

// --- Utility Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const getDaysRemaining = (targetDate: string) => {
  const diff = new Date(targetDate).getTime() - new Date().setHours(0,0,0,0);
  return Math.ceil(diff / (1000 * 3600 * 24));
};

const formatDate = (dateString: string, locale: 'en' | 'ar') => {
  return new Date(dateString).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const triggerConfetti = () => {
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

  const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

  const interval: any = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
  }, 250);
};

// --- Components ---

interface CardProps {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`glass rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-white/50 dark:border-white/10 ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', onClick, className = '', disabled = false }: any) => {
  const baseStyle = "px-4 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:active:scale-100 disabled:opacity-70 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/30",
    secondary: "bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-zinc-800",
    magic: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30 hover:scale-[1.02]"
  };
  
  return (
    <button 
      disabled={disabled}
      onClick={onClick} 
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const ProgressBar = ({ current, total, colorClass = 'bg-primary-500' }: { current: number, total: number, colorClass?: string }) => {
  const percentage = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colorClass} transition-all duration-500 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [view, setView] = useState<ViewState>('dashboard');
  const [selectedMomentId, setSelectedMomentId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [lang, setLang] = useState<'en' | 'ar'>('ar');
  const [notificationPermission, setNotificationPermission] = useState('default');
  
  // Load data on mount
  useEffect(() => {
    setMoments(getMoments());
    const settings = getSettings();
    setTheme(settings.theme);
    setLang(settings.lang);
    
    // Request notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Save data on change
  useEffect(() => {
    saveMoments(moments);
  }, [moments]);

  // Handle Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSettings({ theme, lang });
  }, [theme, lang]);

  // Handle Notifications check
  useEffect(() => {
    if (activeMoments.length > 0 && 'Notification' in window && notificationPermission === 'granted') {
       const upcoming = activeMoments.filter(m => {
         const days = getDaysRemaining(m.date);
         return days === 0 || days === 1;
       });

       upcoming.forEach(m => {
          // Check if we already notified today (simple check)
          const key = `notified-${m.id}-${new Date().toDateString()}`;
          if (!localStorage.getItem(key)) {
             new Notification("MOMENTS", {
                body: `${lang === 'ar' ? 'تذكير' : 'Reminder'}: ${m.title} ${lang === 'ar' ? 'قريب جداً!' : 'is coming up!'}`,
                icon: '/icon.png' // Fallback
             });
             localStorage.setItem(key, 'true');
          }
       });
    }
  }, [moments, notificationPermission]);

  const requestNotificationAccess = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  };

  // Translations helper
  const t = TRANSLATIONS[lang];
  const isRTL = lang === 'ar';

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const toggleLang = () => setLang(prev => prev === 'ar' ? 'en' : 'ar');

  const activeMoments = moments.filter(m => m.status === 'active').sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const completedMoments = moments.filter(m => m.status === 'completed' || m.status === 'archived').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const addMoment = (moment: Moment) => {
    setMoments([...moments, moment]);
    setView('dashboard');
  };

  const updateMoment = (updatedMoment: Moment) => {
    setMoments(moments.map(m => m.id === updatedMoment.id ? updatedMoment : m));
  };

  const deleteMoment = (id: string) => {
    setMoments(moments.filter(m => m.id !== id));
    if (selectedMomentId === id) {
      setSelectedMomentId(null);
      setView('dashboard');
    }
  };

  // --- Sub-Views ---

  const DashboardView = () => {
    const today = new Date();
    const urgentMoments = activeMoments.filter(m => getDaysRemaining(m.date) <= 7 && m.priority === Priority.HIGH);
    const veryUrgentMoments = activeMoments.filter(m => getDaysRemaining(m.date) <= 1);
    const stressScore = urgentMoments.length * 2 + activeMoments.length;
    let vibe = t.chill;
    let vibeColor = 'text-emerald-500';
    if (stressScore > 5) { vibe = t.balanced; vibeColor = 'text-amber-500'; }
    if (stressScore > 10) { vibe = t.hectic; vibeColor = 'text-rose-500'; }

    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold font-arabic">{t.today}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-lg font-arabic">
              {formatDate(today.toISOString(), lang)}
            </p>
          </div>
          <div className="flex items-center gap-4">
             {/* Bell Notification */}
             <div className="relative cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 p-2 rounded-full transition-colors" onClick={requestNotificationAccess}>
                <Bell size={24} className={veryUrgentMoments.length > 0 ? "text-primary-600" : "text-slate-400"} />
                {veryUrgentMoments.length > 0 && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
                )}
             </div>
             
             <div className={`flex flex-col items-end ${vibeColor}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">{t.stressLevel}</span>
              <span className="text-xl font-bold font-arabic">{vibe}</span>
            </div>
          </div>
        </div>
        
        {/* Notification Banner for Very Urgent */}
        {veryUrgentMoments.length > 0 && (
           <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-xl shadow-lg animate-pulse-slow flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Bell size={20} />
                 <span className="font-bold font-arabic">
                    {lang === 'ar' 
                      ? `لديك ${veryUrgentMoments.length} أحداث قريبة جداً!` 
                      : `You have ${veryUrgentMoments.length} events coming up!`}
                 </span>
              </div>
           </div>
        )}

        {/* Create Action */}
        <button 
          onClick={() => setView('create')}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <PlusCircle size={24} />
            </div>
            <div className="text-start">
              <p className="font-bold text-lg font-arabic">{t.createMoment}</p>
              <p className="text-white/80 text-sm font-arabic">Plan a new event or goal</p>
            </div>
          </div>
          {isRTL ? <ChevronLeft className="group-hover:-translate-x-1 transition-transform"/> : <ChevronRight className="group-hover:translate-x-1 transition-transform"/>}
        </button>

        {/* Upcoming List */}
        <div>
          <h3 className="text-xl font-bold mb-4 font-arabic">{t.upcoming}</h3>
          <div className="space-y-4">
            {activeMoments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
                 <Ghost className="mx-auto mb-2 opacity-50" size={32} />
                <p className="font-arabic">No upcoming moments.</p>
                <p className="text-xs mt-1">Start by creating one!</p>
              </div>
            ) : (
              activeMoments.slice(0, 3).map(moment => {
                const days = getDaysRemaining(moment.date);
                const config = CATEGORY_CONFIG[moment.type];
                const Icon = config.icon;
                const completedTasks = moment.tasks.filter(t => t.isCompleted).length;
                const totalTasks = moment.tasks.length;
                
                let colorRing = 'border-emerald-400';
                if (days < 14) colorRing = 'border-amber-400';
                if (days < 3) colorRing = 'border-rose-400';

                return (
                  <Card 
                    key={moment.id} 
                    className="cursor-pointer group relative overflow-hidden"
                    onClick={() => { setSelectedMomentId(moment.id); setView('details'); }}
                  >
                     <div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'} w-1 h-full ${config.color.replace('bg-', 'bg-')}`} />
                     
                     <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3">
                          <div className={`p-3 rounded-xl ${config.text}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg font-arabic">{moment.title}</h4>
                            <span className="text-xs text-slate-500 font-arabic">{t[moment.type]}</span>
                          </div>
                        </div>
                        <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border-4 ${colorRing} bg-white dark:bg-zinc-800`}>
                          <span className="font-bold text-lg leading-none">{days}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">{t.days}</span>
                        </div>
                     </div>
                     
                     {totalTasks > 0 && (
                       <div className="mt-2">
                         <div className="flex justify-between text-xs text-slate-500 mb-1">
                           <span>{t.taskCompletion}</span>
                           <span>{Math.round((completedTasks/totalTasks)*100)}%</span>
                         </div>
                         <ProgressBar current={completedTasks} total={totalTasks} colorClass={config.color} />
                       </div>
                     )}
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  const CreateMomentView = () => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<MomentType>(MomentType.PERSONAL);
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [tasks, setTasks] = useState<string[]>([]);
    const [newTask, setNewTask] = useState('');
    const [emotion, setEmotion] = useState<EmotionType>(EmotionType.HAPPY);
    const [notes, setNotes] = useState('');
    
    // AI State
    const [isGenerating, setIsGenerating] = useState(false);
    const [magicInput, setMagicInput] = useState('');
    const [showMagicInput, setShowMagicInput] = useState(false);

    const handleSave = () => {
      if (!title || !date) return;
      
      const newMoment: Moment = {
        id: generateId(),
        title,
        date,
        type,
        priority,
        initialEmotion: emotion,
        notes,
        tasks: tasks.map(txt => ({ id: generateId(), text: txt, isCompleted: false })),
        status: 'active',
        createdAt: new Date().toISOString(),
        emotionHistory: [{ id: generateId(), date: new Date().toISOString(), emotion, note: 'Initial feeling' }]
      };
      addMoment(newMoment);
    };

    const addTaskItem = () => {
      if(newTask.trim()) {
        setTasks([...tasks, newTask]);
        setNewTask('');
      }
    };
    
  const res = await fetch("https://ai-worker.lyt740111.workers.dev/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: `
Generate a plan for this life event or goal: "${magicInput}".
Respond ONLY in JSON with:
- title
- type (study, travel, work, personal, goal)
- priority (low, medium, high)
- notes
- tasks (3-6 items)
Language: ${lang === 'ar' ? 'Arabic' : 'English'}.
    `
  })
});

const data = await res.json();

setTitle(data.title);
setType(data.type as MomentType);
setPriority(data.priority as Priority);
setNotes(data.notes);
setTasks(data.tasks);
setShowMagicInput(false);
setMagicInput('');
        
      } catch (e) {
        console.error("AI Generation failed", e);
        // Fallback or alert
        alert(lang === 'ar' ? 'حدث خطأ أثناء التوليد، حاول مرة أخرى' : 'Generation failed, try again');
      } finally {
        setIsGenerating(false);
      }
    };

    return (
      <div className="animate-slide-up pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" className="!p-2" onClick={() => setView('dashboard')}>
            {isRTL ? <ArrowRight /> : <ChevronLeft />}
          </Button>
          <h2 className="text-2xl font-bold font-arabic">{t.createMoment}</h2>
        </div>

        {/* Magic Plan Section */}
        {!showMagicInput ? (
          <Button 
            variant="magic" 
            className="w-full mb-6 font-arabic" 
            onClick={() => setShowMagicInput(true)}
          >
            <Sparkles size={18} />
            {lang === 'ar' ? 'تخطيط ذكي (AI)' : 'Magic Plan (AI)'}
          </Button>
        ) : (
          <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-800 mb-6 animate-fade-in">
             <label className="text-sm font-bold text-violet-700 dark:text-violet-300 font-arabic mb-2 block">
                {lang === 'ar' ? 'ما الذي تخطط له؟' : 'What are you planning?'}
             </label>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: رحلة الصيف، الاستعداد للاختبار...' : 'e.g. Summer trip, Prepare for exams...'}
                  className="flex-1 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-violet-200 dark:border-zinc-700 outline-none font-arabic text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleMagicPlan()}
                />
                <Button variant="magic" onClick={handleMagicPlan} disabled={isGenerating}>
                   {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                </Button>
             </div>
             <button onClick={() => setShowMagicInput(false)} className="text-xs text-slate-400 mt-2 hover:text-slate-600 font-arabic">
                {t.cancel}
             </button>
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.title}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic"
              placeholder={isRTL ? "مثال: رحلة الصيف" : "e.g., Summer Trip"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.date}</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.priority}</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic"
              >
                <option value={Priority.LOW}>{t.low}</option>
                <option value={Priority.MEDIUM}>{t.medium}</option>
                <option value={Priority.HIGH}>{t.high}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(MomentType).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const isSelected = type === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setType(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isSelected ? `${config.text} border-current ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-zinc-950 ring-current` : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-500'}`}
                  >
                    <Icon size={16} />
                    <span className="font-arabic">{t[cat]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.howFeeling}</label>
            <div className="flex justify-between bg-white dark:bg-zinc-800 p-4 rounded-xl border border-slate-200 dark:border-zinc-700">
              {Object.values(EmotionType).map((emo) => {
                const Icon = EMOTION_ICONS[emo];
                const isSelected = emotion === emo;
                return (
                  <button
                    key={emo}
                    onClick={() => setEmotion(emo)}
                    className={`p-2 rounded-full transition-transform ${isSelected ? 'bg-primary-100 text-primary-600 scale-125' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Icon size={28} />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.tasks}</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTaskItem()}
                className="flex-1 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none font-arabic"
                placeholder={t.addTask}
              />
              <Button variant="secondary" onClick={addTaskItem}><PlusCircle size={20}/></Button>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-white/50 dark:bg-white/5 p-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  <span className="font-arabic">{task}</span>
                  <button onClick={() => setTasks(tasks.filter((_, i) => i !== idx))} className="ml-auto text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.notes}</label>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic h-24 resize-none"
             />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="primary" className="flex-1" onClick={handleSave}>{t.save}</Button>
            <Button variant="secondary" onClick={() => setView('dashboard')}>{t.cancel}</Button>
          </div>
        </div>
      </div>
    );
  };
  
  const EditMomentView = () => {
    const moment = moments.find(m => m.id === selectedMomentId);
    if (!moment) return null;

    const [title, setTitle] = useState(moment.title);
    const [date, setDate] = useState(moment.date);
    const [type, setType] = useState<MomentType>(moment.type);
    const [priority, setPriority] = useState<Priority>(moment.priority);
    const [tasks, setTasks] = useState<Task[]>(moment.tasks);
    const [newTask, setNewTask] = useState('');
    const [notes, setNotes] = useState(moment.notes);

    const handleUpdate = () => {
      if (!title || !date) return;
      
      const updatedMoment: Moment = {
        ...moment,
        title,
        date,
        type,
        priority,
        notes,
        tasks
      };
      updateMoment(updatedMoment);
      setView('details');
    };

    const addTaskItem = () => {
      if(newTask.trim()) {
        setTasks([...tasks, { id: generateId(), text: newTask, isCompleted: false }]);
        setNewTask('');
      }
    };
    
    const removeTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
    }

    return (
      <div className="animate-slide-up pb-20">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" className="!p-2" onClick={() => setView('details')}>
            {isRTL ? <ArrowRight /> : <ChevronLeft />}
          </Button>
          <h2 className="text-2xl font-bold font-arabic">{t.edit}</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.title}</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.date}</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.priority}</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic"
              >
                <option value={Priority.LOW}>{t.low}</option>
                <option value={Priority.MEDIUM}>{t.medium}</option>
                <option value={Priority.HIGH}>{t.high}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {Object.values(MomentType).map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config.icon;
                const isSelected = type === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setType(cat)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${isSelected ? `${config.text} border-current ring-2 ring-offset-2 ring-offset-gray-50 dark:ring-offset-zinc-950 ring-current` : 'border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-500'}`}
                  >
                    <Icon size={16} />
                    <span className="font-arabic">{t[cat]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.tasks}</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTaskItem()}
                className="flex-1 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 outline-none font-arabic"
                placeholder={t.addTask}
              />
              <Button variant="secondary" onClick={addTaskItem}><PlusCircle size={20}/></Button>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm bg-white/50 dark:bg-white/5 p-2 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-primary-500"></div>
                  <span className="font-arabic">{task.text}</span>
                  <button onClick={() => removeTask(task.id)} className="ml-auto text-red-400"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
             <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.notes}</label>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full p-4 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 focus:ring-2 focus:ring-primary-500 outline-none font-arabic h-24 resize-none"
             />
          </div>

          <div className="pt-4 flex gap-3">
            <Button variant="primary" className="flex-1" onClick={handleUpdate}>{t.save}</Button>
            <Button variant="secondary" onClick={() => setView('details')}>{t.cancel}</Button>
          </div>
        </div>
      </div>
    );
  };

  const MemoryReflectionView = () => {
    const moment = moments.find(m => m.id === selectedMomentId);
    if (!moment) return null;

    const [rating, setRating] = useState(0);
    const [lessons, setLessons] = useState('');
    const [repeatable, setRepeatable] = useState<boolean | null>(null);
    
    // AI Insight State
    const [aiInsight, setAiInsight] = useState('');
    const [isInsightLoading, setIsInsightLoading] = useState(false);
    
    // Trigger confetti on mount
    useEffect(() => {
       triggerConfetti();
    }, []);

    const handleSaveReflection = () => {
        if (rating === 0) return; // Require rating
        const reflection: Reflection = {
            rating,
            lessons,
            repeatable: !!repeatable,
            completedDate: new Date().toISOString()
        };
        updateMoment({ ...moment, status: 'completed', reflection });
        setView('dashboard');
    };
    
    const getAiInsight = async () => {
      if (!lessons.trim()) return;
      setIsInsightLoading(true);
      try {
        setAiInsight(
  lang === 'ar'
    ? '✨ هذه مساحة للتأمل. سيتم تفعيل الذكاء الاصطناعي لاحقًا عبر الخادم.'
    : '✨ This is a reflection space. AI insights will be enabled later via server.'
);
      } catch (e) {
        console.error("AI Insight failed", e);
      } finally {
        setIsInsightLoading(false);
      }
    };

    return (
        <div className="animate-slide-up pb-20 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                 <Button variant="ghost" className="!p-2" onClick={() => setView('dashboard')}>
                    {isRTL ? <ArrowRight /> : <ChevronLeft />}
                 </Button>
                 <h2 className="text-2xl font-bold font-arabic">{t.reflection}</h2>
            </div>
            
            <Card>
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold font-arabic mb-1">{moment.title}</h3>
                    <p className="text-sm text-slate-500">{formatDate(moment.date, lang)}</p>
                </div>
                
                {/* Rating */}
                <div className="space-y-2 mb-6">
                    <label className="block text-sm font-bold font-arabic text-center mb-2">{t.rating}</label>
                    <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 active:scale-90">
                                <Star 
                                    size={36} 
                                    className={`${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-700"}`} 
                                />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lessons */}
                <div className="space-y-2 mb-6">
                    <label className="font-bold font-arabic text-sm">{t.whatLearned}</label>
                    <textarea 
                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-700 outline-none h-32 resize-none font-arabic focus:ring-2 focus:ring-primary-500"
                        value={lessons}
                        onChange={(e) => setLessons(e.target.value)}
                        placeholder="..."
                    />
                    
                    {/* AI Insight Button */}
                    {lessons.length > 5 && !aiInsight && (
                       <div className="flex justify-end mt-2">
                          <button 
                            onClick={getAiInsight} 
                            disabled={isInsightLoading}
                            className="flex items-center gap-2 text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-3 py-1.5 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                          >
                             {isInsightLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                             {lang === 'ar' ? 'رؤية ذكية' : 'AI Insight'}
                          </button>
                       </div>
                    )}
                    
                    {/* Generated Insight */}
                    {aiInsight && (
                      <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                         <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
                            <Lightbulb size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">Insight</span>
                         </div>
                         <p className="text-sm font-arabic text-slate-700 dark:text-slate-300 italic leading-relaxed">
                            "{aiInsight}"
                         </p>
                      </div>
                    )}
                </div>

                {/* Repeatable */}
                <div className="space-y-2 mb-8">
                     <label className="font-bold font-arabic text-sm">{t.repeat}</label>
                     <div className="flex gap-4">
                        <button 
                            onClick={() => setRepeatable(true)}
                            className={`flex-1 py-3 rounded-xl border font-bold transition-all font-arabic ${repeatable === true ? 'bg-emerald-100 border-emerald-500 text-emerald-700' : 'border-slate-200 dark:border-zinc-700 text-slate-400'}`}
                        >
                            {t.yes}
                        </button>
                        <button 
                            onClick={() => setRepeatable(false)}
                            className={`flex-1 py-3 rounded-xl border font-bold transition-all font-arabic ${repeatable === false ? 'bg-rose-100 border-rose-500 text-rose-700' : 'border-slate-200 dark:border-zinc-700 text-slate-400'}`}
                        >
                            {t.no}
                        </button>
                     </div>
                </div>

                <Button variant="primary" className="w-full" onClick={handleSaveReflection} disabled={rating === 0}>
                    {t.save}
                </Button>
            </Card>
        </div>
    )
  }

  const DetailMomentView = () => {
    const moment = moments.find(m => m.id === selectedMomentId);
    if (!moment) return null;

    const daysLeft = getDaysRemaining(moment.date);
    const config = CATEGORY_CONFIG[moment.type];
    const Icon = config.icon;
    const completedTaskCount = moment.tasks.filter(t => t.isCompleted).length;
    
    // Check if moment is past due date (Memory Mode)
    const isPast = daysLeft < 0 && moment.status === 'active';

    const toggleTask = (taskId: string) => {
      const updatedTasks = moment.tasks.map(t => 
        t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
      );
      updateMoment({ ...moment, tasks: updatedTasks });
    };

    const addEmotionLog = (emo: EmotionType) => {
      const newLog: EmotionLog = {
        id: generateId(),
        date: new Date().toISOString(),
        emotion: emo
      };
      updateMoment({ ...moment, emotionHistory: [...moment.emotionHistory, newLog] });
    };

    const completeMoment = () => {
      // Instead of just completing, go to reflection mode
      setView('memory');
    };

    if (isPast) {
      return (
        <div className="animate-fade-in pb-20 space-y-6">
           <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" className="!p-2" onClick={() => setView('dashboard')}>
              {isRTL ? <ArrowRight /> : <ChevronLeft />}
            </Button>
            <h2 className="text-2xl font-bold font-arabic">{t.reflection}</h2>
          </div>
          
          <div className="text-center p-8 glass rounded-2xl">
             <div className="w-20 h-20 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon size={40} />
             </div>
             <h2 className="text-2xl font-bold mb-2 font-arabic">{moment.title}</h2>
             <p className="text-slate-500">{formatDate(moment.date, lang)}</p>
             <div className="mt-8 space-y-4">
                <Button variant="primary" className="w-full" onClick={completeMoment}>{t.markAsDone} & {t.reflection}</Button>
                <Button variant="secondary" className="w-full" onClick={() => {
                   // Simple logic to extend date by 7 days for postpone
                   const d = new Date(moment.date);
                   d.setDate(d.getDate() + 7);
                   updateMoment({ ...moment, date: d.toISOString().split('T')[0] });
                }}>{t.postpone} (7 {t.days})</Button>
             </div>
          </div>
        </div>
      )
    }

    return (
      <div className="animate-slide-up pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="!p-2" onClick={() => setView('dashboard')}>
            {isRTL ? <ArrowRight /> : <ChevronLeft />}
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="text-slate-600" onClick={() => setView('edit')}><Edit2 size={18}/></Button>
            <Button variant="secondary" className="text-red-500 hover:bg-red-50" onClick={() => deleteMoment(moment.id)}><Trash2 size={18}/></Button>
          </div>
        </div>

        {/* Big Counter */}
        <div className="glass rounded-3xl p-8 text-center relative overflow-hidden border border-white/40 shadow-xl">
           <div className={`absolute top-0 w-full h-2 left-0 ${config.color}`} />
           <Icon className={`mx-auto mb-4 ${config.text.split(' ')[2]}`} size={48} />
           <h1 className="text-3xl font-bold font-arabic mb-1">{moment.title}</h1>
           <p className="text-slate-500 mb-6 font-arabic">{formatDate(moment.date, lang)}</p>
           
           <div className="flex justify-center items-end gap-2 font-bold text-slate-800 dark:text-white">
             <span className="text-6xl tracking-tighter">{Math.max(0, daysLeft)}</span>
             <span className="text-xl pb-2 text-slate-400 font-arabic">{t.daysLeft}</span>
           </div>
        </div>

        {/* Emotion Check-in */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold font-arabic">{t.howFeeling}</h3>
            <button className="text-primary-600 text-sm font-medium flex items-center gap-1">
              <History size={14} /> {t.emotionTrend}
            </button>
          </div>
          <div className="flex justify-between">
              {Object.values(EmotionType).map((emo) => {
                const EmoIcon = EMOTION_ICONS[emo];
                return (
                  <button
                    key={emo}
                    onClick={() => addEmotionLog(emo)}
                    className="p-3 bg-slate-50 dark:bg-zinc-800 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <EmoIcon size={24} className="text-slate-600 dark:text-slate-300" />
                  </button>
                )
              })}
          </div>
        </Card>

        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold font-arabic">{t.tasks}</h3>
            <span className="text-sm text-slate-500">{completedTaskCount}/{moment.tasks.length}</span>
          </div>
          {moment.tasks.length > 0 && <ProgressBar current={completedTaskCount} total={moment.tasks.length} colorClass={config.color} />}
          
          <div className="space-y-2 mt-4">
             {moment.tasks.map((task) => (
               <div 
                  key={task.id} 
                  onClick={() => toggleTask(task.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${task.isCompleted ? 'bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 opacity-60' : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 shadow-sm'}`}
               >
                 <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.isCompleted ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-300'}`}>
                    {task.isCompleted && <CheckCircle2 size={16} />}
                 </div>
                 <span className={`flex-1 font-arabic ${task.isCompleted ? 'line-through' : ''}`}>{task.text}</span>
               </div>
             ))}
             {moment.tasks.length === 0 && <p className="text-center text-slate-400 py-4 font-arabic">No tasks added.</p>}
          </div>
        </div>

        {/* Notes */}
        {moment.notes && (
          <Card>
            <h3 className="font-bold mb-2 font-arabic">{t.notes}</h3>
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-arabic">{moment.notes}</p>
          </Card>
        )}
      </div>
    );
  };

  const StatsView = () => {
    const data = [
      { name: t.study, value: completedMoments.filter(m => m.type === MomentType.STUDY).length, color: '#8b5cf6' },
      { name: t.work, value: completedMoments.filter(m => m.type === MomentType.WORK).length, color: '#64748b' },
      { name: t.personal, value: completedMoments.filter(m => m.type === MomentType.PERSONAL).length, color: '#ec4899' },
      { name: t.travel, value: completedMoments.filter(m => m.type === MomentType.TRAVEL).length, color: '#0ea5e9' },
      { name: t.goal, value: completedMoments.filter(m => m.type === MomentType.GOAL).length, color: '#10b981' },
    ].filter(d => d.value > 0);

    // Prepare Emotion Data
    const emotionData = useMemo(() => {
        const allLogs: any[] = [];
        moments.forEach(m => {
           m.emotionHistory.forEach(log => {
              let score = 3;
              if (log.emotion === EmotionType.HAPPY || log.emotion === EmotionType.EXCITED) score = 5;
              if (log.emotion === EmotionType.WORRIED || log.emotion === EmotionType.STRESSED) score = 1;
              
              allLogs.push({
                 date: new Date(log.date).getTime(),
                 score,
                 label: new Date(log.date).toLocaleDateString()
              });
           });
        });
        return allLogs.sort((a,b) => a.date - b.date);
    }, [moments]);

    return (
      <div className="animate-fade-in pb-20">
         <h2 className="text-2xl font-bold mb-6 font-arabic">{t.stats}</h2>
         
         <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="flex flex-col items-center justify-center py-6">
               <span className="text-4xl font-bold text-primary-600">{moments.length}</span>
               <span className="text-xs uppercase text-slate-500 mt-1 font-arabic">{t.totalMoments}</span>
            </Card>
            <Card className="flex flex-col items-center justify-center py-6">
               <span className="text-4xl font-bold text-emerald-600">{completedMoments.length}</span>
               <span className="text-xs uppercase text-slate-500 mt-1 font-arabic">{t.completed}</span>
            </Card>
         </div>

         {/* Distribution Chart */}
         {data.length > 0 ? (
           <Card className="h-64 mb-8">
              <h3 className="font-bold mb-4 font-arabic">{t.category}</h3>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
           </Card>
         ) : null}
         
         {/* Emotion Line Chart */}
         {emotionData.length > 1 && (
            <Card className="h-64 mb-8">
               <h3 className="font-bold mb-4 font-arabic">{t.emotionalJourney}</h3>
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emotionData}>
                     <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                     <XAxis dataKey="label" hide />
                     <YAxis domain={[0, 6]} hide />
                     <Tooltip />
                     <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4}} />
                  </LineChart>
               </ResponsiveContainer>
            </Card>
         )}

         {/* Empty State */}
         {data.length === 0 && emotionData.length === 0 && (
           <div className="text-center p-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl mb-8">
             <p className="font-arabic">Complete some moments to see statistics!</p>
           </div>
         )}

         {/* Life Log / Memories Section */}
         {completedMoments.length > 0 && (
            <div className="space-y-4">
               <h3 className="font-bold text-xl font-arabic">{t.memories}</h3>
               {completedMoments.map(m => {
                 const config = CATEGORY_CONFIG[m.type];
                 return (
                   <Card key={m.id} className="flex justify-between items-center py-4">
                      <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-full ${config.text} bg-opacity-20`}>
                           <CheckCircle2 size={16} />
                         </div>
                         <div>
                            <p className="font-bold font-arabic text-sm">{m.title}</p>
                            <p className="text-[10px] text-slate-500">{formatDate(m.date, lang)}</p>
                         </div>
                      </div>
                      {m.reflection && (
                         <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                               <Star 
                                  key={i} 
                                  size={12} 
                                  className={i < m.reflection!.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-zinc-800"} 
                               />
                            ))}
                         </div>
                      )}
                   </Card>
                 )
               })}
            </div>
         )}
      </div>
    )
  };

  const SettingsView = () => (
    <div className="animate-fade-in pb-20 space-y-4">
      <h2 className="text-2xl font-bold mb-6 font-arabic">{t.settings}</h2>
      
      <Card className="flex justify-between items-center" onClick={toggleTheme}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          </div>
          <span className="font-bold font-arabic">{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
        </div>
        <div className={`w-12 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary-600' : 'bg-slate-300'}`}>
          <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
        </div>
      </Card>

      <Card className="flex justify-between items-center" onClick={toggleLang}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
            <Globe size={20} />
          </div>
          <span className="font-bold font-arabic">{lang === 'ar' ? 'العربية' : 'English'}</span>
        </div>
        <div className="text-primary-600 text-sm font-bold">Change</div>
      </Card>

      <div className="text-center mt-10 text-slate-400 text-xs">
         <p>MOMENTS v2.0.0</p>
         <p>Designed with ❤️</p>
      </div>
    </div>
  );

  return (
    <div 
      className={`min-h-screen relative overflow-x-hidden ${isRTL ? 'text-right' : 'text-left'}`} 
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-purple-200 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-40 -right-20 w-72 h-72 bg-sky-200 dark:bg-sky-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-20 w-72 h-72 bg-pink-200 dark:bg-pink-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-white/30 dark:bg-black/30 backdrop-blur-sm">
        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {view === 'dashboard' && <DashboardView />}
          {view === 'create' && <CreateMomentView />}
          {view === 'details' && <DetailMomentView />}
          {view === 'edit' && <EditMomentView />}
          {view === 'stats' && <StatsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'memory' && <MemoryReflectionView />}
        </main>

        {/* Bottom Navigation */}
        {view !== 'create' && view !== 'details' && view !== 'memory' && view !== 'edit' && (
          <nav className="fixed bottom-0 left-0 w-full z-50">
            <div className="max-w-md mx-auto p-4">
              <div className="glass rounded-2xl flex justify-around items-center p-3 shadow-lg backdrop-blur-xl bg-white/80 dark:bg-black/80">
                <button onClick={() => setView('dashboard')} className={`p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400'}`}>
                  <LayoutDashboard size={24} />
                </button>
                <button onClick={() => setView('create')} className="p-4 -mt-10 bg-gradient-to-tr from-primary-600 to-indigo-600 text-white rounded-full shadow-xl shadow-primary-500/40 hover:scale-110 transition-transform active:scale-95">
                  <PlusCircle size={28} />
                </button>
                <button onClick={() => setView('stats')} className={`p-3 rounded-xl transition-all ${view === 'stats' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400'}`}>
                  <BarChart2 size={24} />
                </button>
                <button onClick={() => setView('settings')} className={`p-3 rounded-xl transition-all ${view === 'settings' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-slate-400'}`}>
                  <SettingsIcon size={24} />
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
