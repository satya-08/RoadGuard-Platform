import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MaintenanceTask, RepairVerification } from '../types';
import { Wrench, CheckCircle, Clock, Upload, ShieldCheck, AlertCircle, Sparkles, FileText } from 'lucide-react';

export const MaintenanceTasksPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification Modal State
  const [activeVerifyTask, setActiveVerifyTask] = useState<MaintenanceTask | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [inspectorNotes, setInspectorNotes] = useState<string>('Pothole cavity filled with hot-mix asphalt and compacted with 8-ton vibratory roller.');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<RepairVerification | null>(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.listMaintenanceTasks();
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.updateTask(taskId, { status: newStatus });
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVerifyTask || !afterFile) return;

    setVerifying(true);
    try {
      const result = await api.verifyRepair(activeVerifyTask.id, afterFile, inspectorNotes);
      setVerifyResult(result);
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Repair verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleFinalApproval = async (verificationId: string, status: string) => {
    try {
      await api.approveVerification(verificationId, status);
      setVerifyResult(null);
      setActiveVerifyTask(null);
      await loadTasks();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono uppercase text-orange-400 tracking-wider flex items-center gap-1.5">
              <Wrench className="w-4 h-4" /> Work Orders & Pavement Operations
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-1">Maintenance Execution & Verification</h1>
            <p className="text-xs text-slate-400">
              Assigned contractor work orders, progress tracking, and post-repair AI optical verification.
            </p>
          </div>
        </div>

        {/* Task Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              No active maintenance work orders assigned. Dispatch a ticket from the Authority Dashboard.
            </div>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
                
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">Work Order</span>
                      <h3 className="text-lg font-bold text-sky-400 font-mono">{t.task_code}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      t.status === 'Closed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      t.status === 'Repair Completed' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                      t.status === 'In Progress' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
                    <p className="text-slate-300 font-semibold">{t.assigned_authority}</p>
                    <p className="text-slate-400 text-[11px]">{t.work_instructions || 'Standard bituminous patching'}</p>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                    <span>Priority: <strong className="text-white">{t.priority_level}</strong></span>
                    <span>Date: {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  {t.status === 'Assigned' && (
                    <button
                      onClick={() => handleUpdateStatus(t.id, 'In Progress')}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded-xl text-xs transition"
                    >
                      Acknowledge & Start Repair (In Progress)
                    </button>
                  )}

                  {(t.status === 'In Progress' || t.status === 'Repair Completed') && (
                    <button
                      onClick={() => {
                        setActiveVerifyTask(t);
                        setAfterFile(null);
                        setAfterPreview(null);
                        setVerifyResult(null);
                      }}
                      className="w-full flex items-center justify-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2 rounded-xl text-xs shadow-lg transition"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Upload Repair Evidence & Run AI Verification</span>
                    </button>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Verification Modal with Before & After AI Comparison */}
        {activeVerifyTask && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-2xl w-full space-y-4 shadow-2xl my-8">
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Post-Repair Optical Verification &mdash; {activeVerifyTask.task_code}</span>
                </h3>
                <button
                  onClick={() => setActiveVerifyTask(null)}
                  className="text-slate-400 hover:text-white text-lg font-bold"
                >
                  &times;
                </button>
              </div>

              {!verifyResult ? (
                <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="text-slate-400 uppercase font-semibold">Upload After-Repair Evidence Photo</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAfterFile(e.target.files[0]);
                          setAfterPreview(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
                    />
                  </div>

                  {afterPreview && (
                    <img
                      src={afterPreview}
                      alt="After Repair"
                      className="w-full h-48 object-cover rounded-xl border border-slate-700"
                    />
                  )}

                  <div>
                    <label className="text-slate-400 uppercase font-semibold">Engineer / Inspector Site Directives</label>
                    <textarea
                      rows={2}
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white mt-1"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveVerifyTask(null)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={verifying}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{verifying ? 'Running YOLO Re-Detection...' : 'Verify Repair with AI'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Verification Results Display */
                <div className="space-y-4 text-xs">
                  
                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl text-center space-y-1 ${
                    verifyResult.verification_status === 'Verification Passed' ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300' :
                    verifyResult.verification_status === 'Verification Failed' ? 'bg-red-950/80 border border-red-500 text-red-300' :
                    'bg-amber-950/80 border border-amber-500 text-amber-300'
                  }`}>
                    <h4 className="text-base font-extrabold uppercase tracking-wide">
                      {verifyResult.verification_status}
                    </h4>
                    <p className="text-xs opacity-90">{verifyResult.ai_recheck_notes}</p>
                  </div>

                  {/* Before vs After Visual Comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 mb-1">Before Repair (Original Defect)</p>
                      <img
                        src={verifyResult.before_image_url}
                        alt="Before"
                        className="w-full h-40 object-cover rounded-xl border border-slate-800"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-emerald-400 mb-1">After Repair (Re-Inference)</p>
                      <img
                        src={verifyResult.annotated_after_url || verifyResult.after_image_url}
                        alt="After"
                        className="w-full h-40 object-cover rounded-xl border border-slate-800"
                      />
                    </div>
                  </div>

                  {/* Telemetry */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Residual Defects Detected:</span>
                      <p className="text-sm font-bold text-white">{verifyResult.defects_count_after}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Verification Timestamp:</span>
                      <p className="text-xs text-slate-300">{new Date(verifyResult.verified_at).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  {/* Authority Approval Actions */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleFinalApproval(verifyResult.id, 'Verification Failed')}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl font-bold"
                    >
                      Reject & Reopen Work Order
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinalApproval(verifyResult.id, 'Verification Passed')}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow"
                    >
                      Approve & Formally Close Grievance
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
